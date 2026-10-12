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

// ComponentFiles returns the files of the given kind from every component that is not an
// adapter, sorted by file name. Component stylesheets must load in alphabetical order, as
// they did in css-zero. Adapters are left out because the bundles must not depend on
// third-party libraries.
func ComponentFiles(reg *registry.Registry, kind registry.FileKind) []string {
	return files(reg, kind, false)
}

// AdapterFiles returns the files of the given kind from every adapter, sorted by file name.
func AdapterFiles(reg *registry.Registry, kind registry.FileKind) []string {
	return files(reg, kind, true)
}

func files(reg *registry.Registry, kind registry.FileKind, adapters bool) []string {
	var files []string
	for _, name := range reg.Names() {
		c := reg.Components[name]
		if (c.Library != nil) != adapters {
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

var runtimeImport = regexp.MustCompile(`(?m)^import \{[^}]*\} from "\./velle\.js"\n`)

// JS returns a single ES module: the runtime followed by every behavior, each wrapped in its
// own block so their top-level names cannot clash.
func JS(fsys fs.FS, reg *registry.Registry, version string) (string, error) {
	runtime, err := fs.ReadFile(fsys, registry.RuntimeFile)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	fmt.Fprintf(&b, "/*!\n * %s\n */\n\n", strings.ReplaceAll(fmt.Sprintf(license, version), "\n", "\n * "))
	b.Write(runtime)

	for _, f := range ComponentFiles(reg, registry.KindJS) {
		data, err := fs.ReadFile(fsys, f)
		if err != nil {
			return "", err
		}
		source := string(data)
		if strings.Count(source, "import ") != len(runtimeImport.FindAllString(source, -1)) {
			return "", fmt.Errorf("%s: only `import { … } from \"./velle.js\"` is supported", f)
		}
		source = runtimeImport.ReplaceAllString(source, "")
		fmt.Fprintf(&b, "\n// %s\n{\n%s}\n", f, source)
	}
	return b.String(), nil
}

// Adapter returns an adapter script rewritten to import the runtime from the bundle one
// directory up (dist/velle.js), so adapters share the bundle's runtime.
func Adapter(fsys fs.FS, file string) ([]byte, error) {
	data, err := fs.ReadFile(fsys, file)
	if err != nil {
		return nil, err
	}
	source := string(data)
	if !strings.Contains(source, `from "./velle.js"`) {
		return nil, fmt.Errorf("%s: adapters must import the runtime from \"./velle.js\"", file)
	}
	return []byte(strings.ReplaceAll(source, `from "./velle.js"`, `from "../velle.js"`)), nil
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

	copies := map[string]string{registry.RuntimeFile: "js/velle.js"}
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

	for _, kind := range []registry.FileKind{registry.KindCSS, registry.KindJS} {
		for _, f := range AdapterFiles(reg, kind) {
			data, err := fs.ReadFile(fsys, f)
			if kind == registry.KindJS {
				data, err = Adapter(fsys, f)
			}
			if err != nil {
				return err
			}
			if err := write(filepath.Join(out, "adapters", path.Base(f)), data); err != nil {
				return err
			}
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
