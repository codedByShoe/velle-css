// Package build produces the dist/ directory: full CSS and JS bundles plus the individual
// files laid out flat, ready to be served from GitHub through a CDN.
package build

import (
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/codedbyshoe/velle-css/internal/registry"
)

const license = "velle-css %s | MIT License | https://github.com/codedbyshoe/velle-css\n" +
	"Based on css-zero by Lázaro Nixon (https://github.com/lazaronixon/css-zero)"

// tokenFiles lists the token stylesheets in the order variables.css imports them.
var tokenFiles = []string{
	"core/tokens/animations.css",
	"core/tokens/borders.css",
	"core/tokens/colors.css",
	"core/tokens/effects.css",
	"core/tokens/filters.css",
	"core/tokens/sizes.css",
	"core/tokens/transforms.css",
	"core/tokens/transitions.css",
	"core/tokens/typography.css",
}

// ComponentFiles returns the files of the given kind from every component that is neither an
// adapter nor an extension, sorted by file name. Component stylesheets must load in
// alphabetical order, as they did in css-zero. Adapters and extensions are left out because
// the bundles must not depend on third-party libraries.
func ComponentFiles(reg *registry.Registry, kind registry.FileKind) []string {
	return files(reg, kind, func(c *registry.Component) bool { return c.Library == nil && !c.Extension })
}

// AdapterFiles returns the files of the given kind from every adapter, sorted by file name.
func AdapterFiles(reg *registry.Registry, kind registry.FileKind) []string {
	return files(reg, kind, func(c *registry.Component) bool { return c.Library != nil })
}

// ExtensionFiles returns the files of the given kind from every extension, sorted by file name.
func ExtensionFiles(reg *registry.Registry, kind registry.FileKind) []string {
	return files(reg, kind, func(c *registry.Component) bool { return c.Extension })
}

func files(reg *registry.Registry, kind registry.FileKind, include func(*registry.Component) bool) []string {
	var files []string
	for _, name := range reg.Names() {
		c := reg.Components[name]
		if !include(c) {
			continue
		}
		for _, f := range c.Files {
			if registry.Kind(f) == kind {
				files = append(files, c.FilePath(f))
			}
		}
	}
	sort.Slice(files, func(i, j int) bool { return path.Base(files[i]) < path.Base(files[j]) })
	return files
}

// CSS returns the full stylesheet: reset, tokens, base, every component, then utilities.
func CSS(fsys fs.FS, reg *registry.Registry, version string) (string, error) {
	files := append([]string{"core/reset.css"}, tokenFiles...)
	files = append(files, "core/base.css")
	files = append(files, ComponentFiles(reg, registry.KindCSS)...)
	files = append(files, "core/utilities.css")

	var b strings.Builder
	fmt.Fprintf(&b, "/*!\n * %s\n */\n", strings.ReplaceAll(fmt.Sprintf(license, version), "\n", "\n * "))
	for _, f := range files {
		data, err := fs.ReadFile(fsys, f)
		if err != nil {
			return "", err
		}
		fmt.Fprintf(&b, "\n/* %s */\n%s", f, strings.TrimRight(string(data), "\n")+"\n")
	}
	return b.String(), nil
}

var (
	stimulusImport = regexp.MustCompile(`(?m)^import \{([^}]*)\} from "@hotwired/stimulus"\n`)
	defaultExport  = regexp.MustCompile(`(?m)^export default class `)
)

// JS returns a single ES module: application.js followed by every controller, each wrapped in
// its own block so their top-level names cannot clash and registered under its identifier.
// The module exports the application, and imports Stimulus once for all of them.
func JS(fsys fs.FS, reg *registry.Registry, version string) (string, error) {
	files := append([]string{registry.ApplicationFile}, ComponentFiles(reg, registry.KindJS)...)
	names := map[string]bool{}
	var body strings.Builder
	for _, f := range files {
		data, err := fs.ReadFile(fsys, f)
		if err != nil {
			return "", err
		}
		source := string(data)
		for _, m := range stimulusImport.FindAllStringSubmatch(source, -1) {
			for _, name := range strings.Split(m[1], ",") {
				names[strings.TrimSpace(name)] = true
			}
		}
		if strings.Count(source, "import ") != len(stimulusImport.FindAllString(source, -1)) {
			return "", fmt.Errorf("%s: only `import { … } from \"@hotwired/stimulus\"` is supported", f)
		}
		source = stimulusImport.ReplaceAllString(source, "")

		if f == registry.ApplicationFile {
			body.WriteString("\n" + strings.TrimLeft(source, "\n"))
			continue
		}
		identifier, ok := registry.Identifier(f)
		if !ok || len(defaultExport.FindAllString(source, -1)) != 1 {
			return "", fmt.Errorf("%s: a bundled file must be a controller with one `export default class`", f)
		}
		source = strings.TrimLeft(defaultExport.ReplaceAllString(source, "const controller = class "), "\n")
		fmt.Fprintf(&body, "\n// %s\n{\n%sapplication.register(%q, controller)\n}\n", f, source, identifier)
	}

	imports := make([]string, 0, len(names))
	for name := range names {
		imports = append(imports, name)
	}
	sort.Strings(imports)

	var b strings.Builder
	fmt.Fprintf(&b, "/*!\n * %s\n */\n\n", strings.ReplaceAll(fmt.Sprintf(license, version), "\n", "\n * "))
	fmt.Fprintf(&b, "import { %s } from %q\n", strings.Join(imports, ", "), registry.Stimulus.Package)
	b.WriteString(body.String())
	return b.String(), nil
}

// Extension returns an extension script rewritten to import the application from the bundle
// one directory up (dist/velle.js), so it uses the bundle's application.
func Extension(fsys fs.FS, file string) ([]byte, error) {
	data, err := fs.ReadFile(fsys, file)
	if err != nil {
		return nil, err
	}
	source := string(data)
	if !strings.Contains(source, `from "./application.js"`) {
		return nil, fmt.Errorf("%s: extensions must import the application from \"./application.js\"", file)
	}
	return []byte(strings.ReplaceAll(source, `from "./application.js"`, `from "../velle.js"`)), nil
}

// Dist writes the dist directory.
func Dist(fsys fs.FS, reg *registry.Registry, out, version string) error {
	if err := os.RemoveAll(out); err != nil {
		return err
	}

	css, err := CSS(fsys, reg, version)
	if err != nil {
		return err
	}
	js, err := JS(fsys, reg, version)
	if err != nil {
		return err
	}
	if err := write(filepath.Join(out, "velle.css"), []byte(css)); err != nil {
		return err
	}
	if err := write(filepath.Join(out, "velle.js"), []byte(js)); err != nil {
		return err
	}
	copies := map[string]string{registry.ApplicationFile: "js/application.js"}
	for _, f := range registry.CoreFiles {
		copies[f] = path.Join("css", strings.TrimPrefix(f, "core/"))
	}
	for _, name := range reg.Names() {
		c := reg.Components[name]
		for _, f := range c.Files {
			dir := map[registry.FileKind]string{registry.KindCSS: "css", registry.KindJS: "js", registry.KindImage: "images"}[registry.Kind(f)]
			copies[c.FilePath(f)] = path.Join(dir, f)
		}
	}

	for _, f := range ExtensionFiles(reg, registry.KindJS) {
		data, err := Extension(fsys, f)
		if err != nil {
			return err
		}
		if err := write(filepath.Join(out, "extensions", path.Base(f)), data); err != nil {
			return err
		}
	}

	for source, target := range copies {
		data, err := fs.ReadFile(fsys, source)
		if err != nil {
			return err
		}
		if err := write(filepath.Join(out, filepath.FromSlash(target)), data); err != nil {
			return err
		}
	}
	return nil
}

func write(name string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(name), 0o755); err != nil {
		return err
	}
	return os.WriteFile(name, data, 0o644)
}
