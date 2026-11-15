package cli

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/codedbyshoe/velle-css/internal/registry"
)

const newHelp = "Usage: velle new controller [--overwrite] NAME\n\nCreates a Stimulus controller of your own and registers it in main.js.\n\nOptions:\n"

const controllerTemplate = `import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = []
  static values = {}

  connect() {}
}
`

var controllerName = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)

func (a *App) newCommand(args []string) error {
	set := a.flagSet("new", newHelp)
	overwrite := set.Bool("overwrite", false, "replace the controller file if it already exists")

	// flag stops at the first positional argument; keep going so --overwrite works after the name.
	var positional []string
	for rest := args; ; rest = set.Args()[1:] {
		if err := set.Parse(rest); err != nil {
			return err
		}
		if set.NArg() == 0 {
			break
		}
		positional = append(positional, set.Arg(0))
	}
	if len(positional) != 2 || positional[0] != "controller" {
		return errors.New("usage: velle new controller [--overwrite] NAME")
	}
	name := strings.TrimSuffix(strings.ReplaceAll(positional[1], "-", "_"), "_controller")
	if !controllerName.MatchString(name) {
		return fmt.Errorf("invalid controller name %q: use lowercase letters, digits, dashes and underscores, starting with a letter", positional[1])
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

	target := path.Join(config.JSDir, name+registry.ControllerSuffix)
	identifier, _ := registry.Identifier(target)
	if taken(reg)[identifier] {
		return fmt.Errorf("%q is already used by velle; choose another name", identifier)
	}

	if _, err := a.copyApplication(config, false); err != nil {
		return err
	}
	if err := a.writeFile(target, []byte(controllerTemplate), *overwrite); err != nil {
		return err
	}

	if config.JSEntry == "" {
		a.printRegistrations([]string{path.Join(config.JSDir, path.Base(registry.ApplicationFile)), target})
	} else if err := a.registerAfterBlock(jsEntry(config.JSEntry), config, target, knownFiles(reg)); err != nil {
		return err
	}

	fmt.Fprintf(a.Stdout, "\nAdd data-controller=\"%s\" to an element to connect it.\n", identifier)
	return nil
}

// taken returns every identifier a shipped controller is registered under.
func taken(reg *registry.Registry) map[string]bool {
	identifiers := map[string]bool{}
	for _, c := range reg.Components {
		for _, f := range c.Files {
			if identifier, ok := registry.Identifier(f); ok {
				identifiers[identifier] = true
			}
		}
	}
	return identifiers
}

// registerAfterBlock imports the controller in target and registers it, in the part of the
// entry that belongs to the user, after the managed block, unless the entry already imports
// it. The block imports the application the controller is registered with.
func (a *App) registerAfterBlock(e *entry, config Config, target string, known func(string) bool) error {
	if err := a.updateEntry(e, []string{path.Join(config.JSDir, path.Base(registry.ApplicationFile))}, known); err != nil {
		return err
	}
	destination := filepath.Join(a.Dir, filepath.FromSlash(e.path))
	existing, err := os.ReadFile(destination)
	if err != nil {
		return err
	}

	specifier, err := e.specifier(target)
	if err != nil {
		return err
	}
	content := string(existing)
	for _, line := range strings.Split(content, "\n") {
		if m := jsImport.FindStringSubmatch(line); m != nil && m[1] == specifier {
			a.status("identical", e.path)
			return nil
		}
	}

	identifier, _ := registry.Identifier(target)
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	if strings.HasSuffix(content, e.end+"\n") {
		content += "\n" // updateEntry keeps a blank line between the block and what follows
	}
	content += controllerImport(identifier, specifier) + "\n" + controllerRegistration(identifier) + "\n"
	if err := os.WriteFile(destination, []byte(content), 0o644); err != nil {
		return err
	}
	a.status("update", e.path)
	return nil
}
