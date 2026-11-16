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

const newHelp = "Usage: velle new controller [--overwrite] NAME\n\nCreates a controller of your own and imports it in main.js.\n\nOptions:\n"

const controllerTemplate = `// @ts-check
import { define, controller } from "./velle.js"

define("%s", class extends controller({
  targets: {},
  values: {},
}) {
  connect() {}
})
`

const jsconfigFile = "jsconfig.json"

const jsconfig = `{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "module": "esnext",
    "target": "es2022",
    "moduleResolution": "bundler"
  }
}
`

var (
	controllerName = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)
	definedName    = regexp.MustCompile(`define\("([a-z0-9-]+)"`)
)

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
	name := positional[1]
	if !controllerName.MatchString(name) {
		return fmt.Errorf("invalid controller name %q: use lowercase letters, digits, dashes and underscores, starting with a letter", name)
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

	target := path.Join(config.JSDir, name+".js")
	if target == config.JSEntry {
		return fmt.Errorf("%q is the JavaScript entry file; choose another name", name)
	}
	attribute := strings.ReplaceAll(name, "_", "-")
	taken, err := a.takenNames(reg)
	if err != nil {
		return err
	}
	if taken[attribute] {
		return fmt.Errorf("%q is already used by velle; choose another name", name)
	}

	if err := a.copyRuntime(config, false); err != nil {
		return err
	}
	if err := a.writeFile(target, fmt.Appendf(nil, controllerTemplate, attribute), *overwrite); err != nil {
		return err
	}

	if config.JSEntry == "" {
		fmt.Fprintf(a.Stdout, "\nScripts:\n\n  <script type=\"module\" src=\"/%s\"></script>\n", target)
	} else if err := a.importAfterBlock(jsEntry(config.JSEntry), target, knownFiles(reg)); err != nil {
		return err
	}

	if _, err := os.Stat(filepath.Join(a.Dir, jsconfigFile)); err == nil {
		a.status("exists", jsconfigFile)
	} else if !errors.Is(err, fs.ErrNotExist) {
		return err
	} else if err := a.writeFile(jsconfigFile, []byte(jsconfig), false); err != nil {
		return err
	}

	fmt.Fprintf(a.Stdout, "\nAdd data-%s to an element to connect it.\n", attribute)
	return nil
}

// takenNames returns the runtime's name and every name a shipped behavior is installed or
// defined under, in the dashed form attributes use.
func (a *App) takenNames(reg *registry.Registry) (map[string]bool, error) {
	taken := map[string]bool{strings.TrimSuffix(path.Base(registry.RuntimeFile), ".js"): true}
	for _, c := range reg.Components {
		for _, f := range c.Files {
			if registry.Kind(f) != registry.KindJS {
				continue
			}
			taken[strings.ReplaceAll(strings.TrimSuffix(f, ".js"), "_", "-")] = true
			source, err := fs.ReadFile(a.FS, c.FilePath(f))
			if err != nil {
				return nil, err
			}
			for _, m := range definedName.FindAllSubmatch(source, -1) {
				taken[string(m[1])] = true
			}
		}
	}
	return taken, nil
}

// importAfterBlock adds an import of target to the part of the entry that belongs to the
// user, after the managed block, unless the entry already imports it.
func (a *App) importAfterBlock(e *entry, target string, known func(string) bool) error {
	destination := filepath.Join(a.Dir, filepath.FromSlash(e.path))
	existing, err := os.ReadFile(destination)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	if _, _, _, found := cutBlock(string(existing), e.begin, e.end); !found {
		if err := a.updateEntry(e, nil, known); err != nil {
			return err
		}
		if existing, err = os.ReadFile(destination); err != nil {
			return err
		}
	}

	specifier, err := e.specifier(target)
	if err != nil {
		return err
	}
	content := string(existing)
	for _, line := range strings.Split(content, "\n") {
		if m := e.parse.FindStringSubmatch(line); m != nil && m[1] == specifier {
			a.status("identical", e.path)
			return nil
		}
	}

	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	if err := os.WriteFile(destination, []byte(content+e.line(specifier)+"\n"), 0o644); err != nil {
		return err
	}
	a.status("update", e.path)
	return nil
}
