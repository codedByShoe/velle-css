// Package cli implements the velle command: it copies core styles and components from the
// embedded registry into a project.
package cli

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"

	"github.com/codedbyshoe/velle-css/internal/registry"
)

// ConfigFile is the name of the project configuration file written by `velle init`.
const ConfigFile = "velle.json"

// Config says where velle installs files, relative to the project root.
type Config struct {
	CSSDir    string `json:"cssDir"`
	JSDir     string `json:"jsDir"`
	ImagesDir string `json:"imagesDir"`
	// CSSEntry and JSEntry are the stylesheet and module that import every installed file,
	// so a page needs only one <link> and one <script>. An empty value turns the entry off;
	// velle then prints the tags to add instead.
	CSSEntry string `json:"cssEntry"`
	JSEntry  string `json:"jsEntry"`
}

// Default entry file names, created inside cssDir and jsDir.
const (
	defaultCSSEntry = "main.css"
	defaultJSEntry  = "main.js"
)

// DefaultConfig is used by `velle init` when no flags are given.
var DefaultConfig = Config{
	CSSDir:    "assets/css/velle",
	JSDir:     "assets/js/velle",
	ImagesDir: "assets/images/velle",
}

// App holds everything a command needs, so tests can run commands against a temp dir.
type App struct {
	FS      fs.FS  // the registry
	Dir     string // the project root
	Version string
	Stdout  io.Writer
	Stderr  io.Writer
}

const usage = `velle installs velle-css styles and components into your project.

Usage:
  velle init [--css-dir DIR] [--js-dir DIR] [--images-dir DIR] [--css-entry FILE] [--js-entry FILE]
  velle add [--overwrite] COMPONENT...
  velle add --all [--overwrite]
  velle list
  velle version

Commands:
  init      Write velle.json, copy the core styles (reset, tokens, base, utilities) and
            create main.css and main.js, which import everything velle installs.
  add       Copy components and their dependencies and import them in main.css and main.js.
            Existing files are kept unless --overwrite is given.
  list      Show the available components.
  version   Print the version.

Run "velle <command> --help" for the options of a command.
`

// Run executes the command line and returns the process exit code.
func (a *App) Run(args []string) int {
	if len(args) == 0 {
		fmt.Fprint(a.Stderr, usage)
		return 2
	}

	var err error
	switch args[0] {
	case "init":
		err = a.init(args[1:])
	case "add":
		err = a.add(args[1:])
	case "list":
		err = a.list(args[1:])
	case "version", "--version", "-v":
		fmt.Fprintf(a.Stdout, "velle %s\n", a.Version)
	case "help", "--help", "-h":
		fmt.Fprint(a.Stdout, usage)
	default:
		fmt.Fprintf(a.Stderr, "velle: unknown command %q\n\n%s", args[0], usage)
		return 2
	}

	if errors.Is(err, flag.ErrHelp) {
		return 0
	}
	if err != nil {
		fmt.Fprintf(a.Stderr, "velle: %v\n", err)
		return 1
	}
	return 0
}

func (a *App) flagSet(name, help string) *flag.FlagSet {
	set := flag.NewFlagSet(name, flag.ContinueOnError)
	set.SetOutput(a.Stderr)
	set.Usage = func() {
		fmt.Fprint(a.Stderr, help)
		set.PrintDefaults()
	}
	return set
}

func (a *App) init(args []string) error {
	set := a.flagSet("init", "Usage: velle init [options]\n\nWrites velle.json and copies the core styles.\n\nOptions:\n")
	cssDir := set.String("css-dir", DefaultConfig.CSSDir, "directory for stylesheets")
	jsDir := set.String("js-dir", DefaultConfig.JSDir, "directory for JavaScript")
	imagesDir := set.String("images-dir", DefaultConfig.ImagesDir, "directory for images")
	cssEntryFlag := set.String("css-entry", "", "stylesheet that imports everything (default <css-dir>/"+defaultCSSEntry+"; \"none\" to turn off)")
	jsEntryFlag := set.String("js-entry", "", "module that imports everything (default <js-dir>/"+defaultJSEntry+"; \"none\" to turn off)")
	overwrite := set.Bool("overwrite", false, "replace core files that already exist")
	if err := set.Parse(args); err != nil {
		return err
	}
	if set.NArg() > 0 {
		return fmt.Errorf("init takes no arguments, got %q", set.Args())
	}

	config, err := a.readConfig()
	switch {
	case err == nil:
		explicit := false
		set.Visit(func(f *flag.Flag) {
			explicit = explicit || strings.HasSuffix(f.Name, "-dir") || strings.HasSuffix(f.Name, "-entry")
		})
		if explicit {
			return fmt.Errorf("%s already exists; edit it to change directories or entries", ConfigFile)
		}
		a.status("exists", ConfigFile)
	case errors.Is(err, fs.ErrNotExist):
		config = Config{
			CSSDir:    *cssDir,
			JSDir:     *jsDir,
			ImagesDir: *imagesDir,
			CSSEntry:  entryFlag(*cssEntryFlag, path.Join(*cssDir, defaultCSSEntry)),
			JSEntry:   entryFlag(*jsEntryFlag, path.Join(*jsDir, defaultJSEntry)),
		}
		if err := config.normalize(); err != nil {
			return err
		}
		if err := a.writeConfig(config); err != nil {
			return err
		}
	default:
		return err
	}

	for _, file := range registry.CoreFiles {
		target := path.Join(config.CSSDir, strings.TrimPrefix(file, "core/"))
		if err := a.copy(file, target, *overwrite); err != nil {
			return err
		}
	}

	reg, err := registry.Load(a.FS)
	if err != nil {
		return err
	}
	var core []string
	for _, name := range []string{"reset.css", "variables.css", "base.css", "utilities.css"} {
		core = append(core, path.Join(config.CSSDir, name))
	}
	if err := a.updateEntries(config, reg, core, nil); err != nil {
		return err
	}

	if config.CSSEntry != "" || config.JSEntry != "" {
		fmt.Fprintf(a.Stdout, "\nAdd these to your <head> once; velle add keeps them up to date:\n\n")
		if config.CSSEntry != "" {
			fmt.Fprintf(a.Stdout, "  <link rel=\"stylesheet\" href=\"/%s\">\n", config.CSSEntry)
		}
		if config.JSEntry != "" {
			fmt.Fprintf(a.Stdout, "  <script type=\"module\" src=\"/%s\"></script>\n", config.JSEntry)
		}
	}
	if config.CSSEntry == "" {
		fmt.Fprintf(a.Stdout, "\nAdd the core styles to your <head>, in this order:\n\n")
		for _, name := range []string{"reset.css", "variables.css", "base.css"} {
			fmt.Fprintf(a.Stdout, "  <link rel=\"stylesheet\" href=\"/%s/%s\">\n", config.CSSDir, name)
		}
		fmt.Fprintf(a.Stdout, "  <!-- component stylesheets go here -->\n")
		fmt.Fprintf(a.Stdout, "  <link rel=\"stylesheet\" href=\"/%s/utilities.css\">\n", config.CSSDir)
	}
	fmt.Fprintf(a.Stdout, "\nThen add components with: velle add button dialog …\n")
	return nil
}

// entryFlag turns an init flag value into a config entry: unset uses the default, "none"
// turns the entry off.
func entryFlag(value, fallback string) string {
	switch value {
	case "":
		return fallback
	case "none":
		return ""
	default:
		return value
	}
}

// updateEntries imports the given project-relative files in the configured entries.
func (a *App) updateEntries(config Config, reg *registry.Registry, stylesheets, scripts []string) error {
	known := map[string]bool{}
	for _, f := range registry.CoreFiles {
		known[path.Base(f)] = true
	}
	for _, c := range reg.Components {
		for _, f := range c.Files {
			known[f] = true
		}
	}
	isKnown := func(name string) bool { return known[name] }

	if config.CSSEntry != "" {
		if err := a.updateEntry(cssEntry(config.CSSEntry), stylesheets, isKnown); err != nil {
			return err
		}
	}
	if config.JSEntry != "" {
		if err := a.updateEntry(jsEntry(config.JSEntry), scripts, isKnown); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) add(args []string) error {
	set := a.flagSet("add", "Usage: velle add [options] COMPONENT...\n\nCopies components and their dependencies into your project.\n\nOptions:\n")
	overwrite := set.Bool("overwrite", false, "replace files that already exist")
	all := set.Bool("all", false, "add every available component")
	if err := set.Parse(args); err != nil {
		return err
	}

	config, err := a.readConfig()
	if errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("%s not found; run `velle init` first", ConfigFile)
	}
	if err != nil {
		return err
	}

	reg, err := registry.Load(a.FS)
	if err != nil {
		return err
	}

	names := set.Args()
	if *all {
		if len(names) > 0 {
			return errors.New("use either --all or component names, not both")
		}
		names = reg.Names()
	}
	if len(names) == 0 {
		return errors.New("name at least one component; run `velle list` to see them")
	}

	components, err := reg.Resolve(names)
	if err != nil {
		return err
	}

	hasJS := false
	for _, c := range components {
		hasJS = hasJS || c.HasJS()
	}
	if hasJS {
		if err := a.copy(registry.RuntimeFile, path.Join(config.JSDir, path.Base(registry.RuntimeFile)), *overwrite); err != nil {
			return err
		}
	}

	var stylesheets, scripts []string
	for _, c := range components {
		for _, file := range c.Files {
			var dir string
			switch registry.Kind(file) {
			case registry.KindCSS:
				dir = config.CSSDir
				stylesheets = append(stylesheets, path.Join(dir, file))
			case registry.KindJS:
				dir = config.JSDir
				scripts = append(scripts, path.Join(dir, file))
			default:
				dir = config.ImagesDir
			}
			if err := a.copy(c.FilePath(file), path.Join(dir, file), *overwrite); err != nil {
				return err
			}
		}
	}

	if err := a.updateEntries(config, reg, stylesheets, scripts); err != nil {
		return err
	}

	if len(stylesheets) > 0 && config.CSSEntry == "" {
		// css-zero loaded component stylesheets in alphabetical order and some rules rely on
		// it (e.g. .btn after .avatar), so keep that order.
		sort.Slice(stylesheets, func(i, j int) bool { return path.Base(stylesheets[i]) < path.Base(stylesheets[j]) })
		fmt.Fprintf(a.Stdout, "\nStylesheets, between base.css and utilities.css. Keep all component\nstylesheets in alphabetical order:\n\n")
		for _, s := range stylesheets {
			fmt.Fprintf(a.Stdout, "  <link rel=\"stylesheet\" href=\"/%s\">\n", s)
		}
	}
	if len(scripts) > 0 && config.JSEntry == "" {
		fmt.Fprintf(a.Stdout, "\nScripts:\n\n")
		for _, s := range scripts {
			fmt.Fprintf(a.Stdout, "  <script type=\"module\" src=\"/%s\"></script>\n", s)
		}
	}

	for _, c := range components {
		if c.Library != nil {
			a.printLibrary(c)
		}
	}
	return nil
}

// printLibrary explains how to install the third-party library an adapter needs.
func (a *App) printLibrary(c *registry.Component) {
	lib := c.Library
	fmt.Fprintf(a.Stdout, "\n%s needs %s %s, which velle does not install. Either:\n\n", c.Name, lib.Package, lib.Version)
	fmt.Fprintf(a.Stdout, "  • with a bundler:   npm install %s@%s\n", lib.Package, lib.Version)
	if lib.Stylesheet != "" {
		fmt.Fprintf(a.Stdout, "                      and import \"%s/%s\" before %s.css\n", lib.Package, lib.Stylesheet, c.Name)
	}
	fmt.Fprintf(a.Stdout, "  • without a build:  add it to your import map (before any module script):\n\n")
	fmt.Fprintf(a.Stdout, "      <script type=\"importmap\">{ \"imports\": { \"%s\": \"%s\" } }</script>\n", lib.Package, lib.ESM)
	if url := lib.StylesheetURL(); url != "" {
		fmt.Fprintf(a.Stdout, "      <link rel=\"stylesheet\" href=\"%s\">  <!-- before %s.css -->\n", url, c.Name)
	}
}

func (a *App) list(args []string) error {
	set := a.flagSet("list", "Usage: velle list\n\nShows the available components.\n")
	if err := set.Parse(args); err != nil {
		return err
	}
	if set.NArg() > 0 {
		return fmt.Errorf("list takes no arguments, got %q", set.Args())
	}

	reg, err := registry.Load(a.FS)
	if err != nil {
		return err
	}

	byCategory := map[string][]*registry.Component{}
	width := 0
	for _, name := range reg.Names() {
		c := reg.Components[name]
		byCategory[c.Category] = append(byCategory[c.Category], c)
		width = max(width, len(name))
	}

	for _, category := range []string{"Elements", "Forms", "Overlays", "Layout", "Behaviors"} {
		fmt.Fprintf(a.Stdout, "%s\n", category)
		for _, c := range byCategory[category] {
			description := c.Description
			if c.Library != nil {
				description += " (needs " + c.Library.Package + ")"
			}
			fmt.Fprintf(a.Stdout, "  %-*s  %s\n", width, c.Name, description)
		}
		fmt.Fprintln(a.Stdout)
	}

	return nil
}

// copy writes a registry file to a project-relative target path.
func (a *App) copy(source, target string, overwrite bool) error {
	data, err := fs.ReadFile(a.FS, source)
	if err != nil {
		return err
	}

	destination := filepath.Join(a.Dir, filepath.FromSlash(target))
	existing, err := os.ReadFile(destination)
	switch {
	case err == nil && bytes.Equal(existing, data):
		a.status("identical", target)
		return nil
	case err == nil && !overwrite:
		a.status("skip", target+" (exists; use --overwrite to replace)")
		return nil
	case err != nil && !errors.Is(err, fs.ErrNotExist):
		return err
	}

	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(destination, data, 0o644); err != nil {
		return err
	}

	if existing != nil {
		a.status("overwrite", target)
	} else {
		a.status("create", target)
	}
	return nil
}

func (a *App) status(action, target string) {
	fmt.Fprintf(a.Stdout, "%12s  %s\n", action, target)
}

func (a *App) readConfig() (Config, error) {
	data, err := os.ReadFile(filepath.Join(a.Dir, ConfigFile))
	if err != nil {
		return Config{}, err
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return Config{}, fmt.Errorf("%s: %w", ConfigFile, err)
	}

	// A velle.json without entry keys (written before entries existed) gets the default
	// entries; an explicit "" keeps an entry turned off.
	var keys map[string]json.RawMessage
	if err := json.Unmarshal(data, &keys); err != nil {
		return Config{}, fmt.Errorf("%s: %w", ConfigFile, err)
	}
	if _, ok := keys["cssEntry"]; !ok && config.CSSDir != "" {
		config.CSSEntry = path.Join(config.CSSDir, defaultCSSEntry)
	}
	if _, ok := keys["jsEntry"]; !ok && config.JSDir != "" {
		config.JSEntry = path.Join(config.JSDir, defaultJSEntry)
	}

	if err := config.normalize(); err != nil {
		return Config{}, fmt.Errorf("%s: %w", ConfigFile, err)
	}
	return config, nil
}

func (a *App) writeConfig(config Config) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(a.Dir, ConfigFile), append(data, '\n'), 0o644); err != nil {
		return err
	}
	a.status("create", ConfigFile)
	return nil
}

// normalize cleans the paths and checks that they stay inside the project.
func (c *Config) normalize() error {
	for _, field := range []struct {
		name     string
		value    *string
		optional bool
		ext      string
	}{
		{"cssDir", &c.CSSDir, false, ""},
		{"jsDir", &c.JSDir, false, ""},
		{"imagesDir", &c.ImagesDir, false, ""},
		{"cssEntry", &c.CSSEntry, true, ".css"},
		{"jsEntry", &c.JSEntry, true, ".js"},
	} {
		if *field.value == "" {
			if field.optional {
				continue
			}
			return fmt.Errorf("%s is required", field.name)
		}
		cleaned := path.Clean(filepath.ToSlash(*field.value))
		if filepath.IsAbs(*field.value) || path.IsAbs(cleaned) || cleaned == ".." || strings.HasPrefix(cleaned, "../") {
			return fmt.Errorf("%s must be a path inside the project, got %q", field.name, *field.value)
		}
		if field.ext != "" && path.Ext(cleaned) != field.ext {
			return fmt.Errorf("%s must be a %s file, got %q", field.name, field.ext, *field.value)
		}
		*field.value = cleaned
	}
	return nil
}
