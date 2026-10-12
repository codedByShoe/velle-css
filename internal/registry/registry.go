// Package registry loads the component metadata stored in registry/components/*/component.json
// and resolves which files a set of components needs.
package registry

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"
)

// Component describes one installable component. It is the single source of truth for the
// CLI, the docs generator and the dist bundles.
type Component struct {
	Name         string      `json:"name"`
	Title        string      `json:"title"`
	Category     string      `json:"category"`
	Description  string      `json:"description"`
	Files        []string    `json:"files"`
	Dependencies []string    `json:"dependencies"`
	Classes      []Option    `json:"classes"`
	Variables    []Variable  `json:"variables"`
	Attributes   []Attribute `json:"attributes"`
	Actions      []Option    `json:"actions"`
	Events       []Option    `json:"events"`
	Notes        []string    `json:"notes"`
	Examples     []Example   `json:"examples"`
	// Library is set for adapters: components that wrap a third-party library. The library
	// is not shipped or bundled; the consumer installs it.
	Library *Library `json:"library"`
}

// Library describes the third-party package an adapter imports.
type Library struct {
	// Package is the npm package name, which is also the bare module specifier the
	// adapter imports, e.g. "flatpickr".
	Package string `json:"package"`
	// Version is the version the adapter was written and tested against.
	Version  string `json:"version"`
	Homepage string `json:"homepage"`
	License  string `json:"license"`
	// ESM is a CDN URL of the package's ES module build, for import maps.
	ESM string `json:"esm"`
	// Stylesheet is the package's own stylesheet path inside the package, if it has one.
	Stylesheet string `json:"stylesheet"`
	// Modules are other packages the adapter imports, all at Version. Libraries split
	// into several packages (like Tiptap) list them here.
	Modules []Module `json:"modules"`
}

// Module is an extra package an adapter imports, with the CDN URL of its ES module build.
type Module struct {
	Package string `json:"package"`
	ESM     string `json:"esm"`
}

// Imports maps every package the adapter imports to its CDN build, for import maps.
func (l *Library) Imports() map[string]string {
	imports := map[string]string{l.Package: l.ESM}
	for _, m := range l.Modules {
		imports[m.Package] = m.ESM
	}
	return imports
}

// Packages returns the npm packages to install, pinned to Version, primary package first.
func (l *Library) Packages() []string {
	packages := []string{l.Package + "@" + l.Version}
	for _, m := range l.Modules {
		packages = append(packages, m.Package+"@"+l.Version)
	}
	return packages
}

// StylesheetURL returns a CDN URL for the library's stylesheet, or "" if it has none.
func (l *Library) StylesheetURL() string {
	if l.Stylesheet == "" {
		return ""
	}
	return "https://cdn.jsdelivr.net/npm/" + l.Package + "@" + l.Version + "/" + l.Stylesheet
}

// Option is a named thing with a description: a class, an action or an event.
type Option struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// Variable is a CSS custom property a component reads.
type Variable struct {
	Name        string `json:"name"`
	Default     string `json:"default"`
	Description string `json:"description"`
}

// Attribute is an HTML attribute a component's JavaScript reads.
type Attribute struct {
	Name        string `json:"name"`
	Element     string `json:"element"`
	Description string `json:"description"`
}

// Example is an HTML snippet in the component's examples directory.
type Example struct {
	File        string `json:"file"`
	Title       string `json:"title"`
	Description string `json:"description"`
	// Frame renders the example inside an iframe; used for full-page layouts.
	Frame bool `json:"frame"`
	// Height is the iframe height in CSS units when Frame is set.
	Height string `json:"height"`
	// Requires lists other components the example uses on top of the component's own
	// dependencies, e.g. a breadcrumb example that opens a dropdown.
	Requires []string `json:"requires"`
}

// Core files copied by `velle init`, relative to the registry root, in load order.
var CoreFiles = []string{
	"core/reset.css",
	"core/variables.css",
	"core/tokens/animations.css",
	"core/tokens/borders.css",
	"core/tokens/colors.css",
	"core/tokens/effects.css",
	"core/tokens/filters.css",
	"core/tokens/sizes.css",
	"core/tokens/transforms.css",
	"core/tokens/transitions.css",
	"core/tokens/typography.css",
	"core/base.css",
	"core/utilities.css",
}

// RuntimeFile is the shared JavaScript runtime every behavior imports.
const RuntimeFile = "js/velle.js"

// Registry is the set of all components.
type Registry struct {
	FS         fs.FS
	Components map[string]*Component
}

// Load reads every components/*/component.json from fsys.
func Load(fsys fs.FS) (*Registry, error) {
	paths, err := fs.Glob(fsys, "components/*/component.json")
	if err != nil {
		return nil, err
	}

	r := &Registry{FS: fsys, Components: map[string]*Component{}}
	for _, p := range paths {
		data, err := fs.ReadFile(fsys, p)
		if err != nil {
			return nil, err
		}

		var c Component
		decoder := json.NewDecoder(strings.NewReader(string(data)))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&c); err != nil {
			return nil, fmt.Errorf("%s: %w", p, err)
		}

		if dir := path.Base(path.Dir(p)); c.Name != dir {
			return nil, fmt.Errorf("%s: name %q does not match directory %q", p, c.Name, dir)
		}
		r.Components[c.Name] = &c
	}

	return r, nil
}

// Names returns all component names, sorted.
func (r *Registry) Names() []string {
	names := make([]string, 0, len(r.Components))
	for name := range r.Components {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// Resolve returns the requested components plus all of their dependencies, with every
// dependency ordered before the components that need it.
func (r *Registry) Resolve(names []string) ([]*Component, error) {
	var ordered []*Component
	state := map[string]int{} // 0 = unseen, 1 = visiting, 2 = done

	var visit func(name string, chain []string) error
	visit = func(name string, chain []string) error {
		c, ok := r.Components[name]
		if !ok {
			if len(chain) > 0 {
				return fmt.Errorf("unknown component %q (required by %q)", name, chain[len(chain)-1])
			}
			return fmt.Errorf("unknown component %q; run `velle list` to see what is available", name)
		}

		switch state[name] {
		case 1:
			return fmt.Errorf("dependency cycle: %s -> %s", strings.Join(chain, " -> "), name)
		case 2:
			return nil
		}

		state[name] = 1
		for _, dep := range c.Dependencies {
			if err := visit(dep, append(chain, name)); err != nil {
				return err
			}
		}
		state[name] = 2
		ordered = append(ordered, c)
		return nil
	}

	for _, name := range names {
		if err := visit(name, nil); err != nil {
			return nil, err
		}
	}

	return ordered, nil
}

// FilePath returns the registry path of one of a component's files.
func (c *Component) FilePath(file string) string {
	return path.Join("components", c.Name, file)
}

// ExamplePath returns the registry path of one of a component's examples.
func (c *Component) ExamplePath(file string) string {
	return path.Join("components", c.Name, "examples", file)
}

// HasJS reports whether the component ships JavaScript.
func (c *Component) HasJS() bool {
	for _, f := range c.Files {
		if Kind(f) == KindJS {
			return true
		}
	}
	return false
}

// FileKind says where a file is installed.
type FileKind int

const (
	KindCSS FileKind = iota
	KindJS
	KindImage
)

// Kind classifies a file by its extension.
func Kind(file string) FileKind {
	switch path.Ext(file) {
	case ".css":
		return KindCSS
	case ".js":
		return KindJS
	default:
		return KindImage
	}
}
