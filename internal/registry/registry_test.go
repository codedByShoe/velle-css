package registry_test

import (
	"io/fs"
	"path"
	"regexp"
	"sort"
	"strings"
	"testing"

	velle "github.com/codedbyshoe/velle-css"
	"github.com/codedbyshoe/velle-css/internal/cssinfo"
	"github.com/codedbyshoe/velle-css/internal/registry"
)

func load(t *testing.T) *registry.Registry {
	t.Helper()
	r, err := registry.Load(velle.Registry())
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func read(t *testing.T, fsys fs.FS, name string) string {
	t.Helper()
	data, err := fs.ReadFile(fsys, name)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

// allCSS returns the text of every stylesheet in the registry.
func allCSS(t *testing.T, r *registry.Registry) string {
	t.Helper()
	var b strings.Builder
	err := fs.WalkDir(r.FS, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && path.Ext(p) == ".css" {
			b.WriteString(read(t, r.FS, p))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return b.String()
}

// componentCSS returns the CSS of a component and its dependencies.
func componentCSS(t *testing.T, r *registry.Registry, c *registry.Component) string {
	t.Helper()
	resolved, err := r.Resolve([]string{c.Name})
	if err != nil {
		t.Fatal(err)
	}
	var b strings.Builder
	for _, dep := range resolved {
		for _, f := range dep.Files {
			if registry.Kind(f) == registry.KindCSS {
				b.WriteString(read(t, r.FS, dep.FilePath(f)))
			}
		}
	}
	return b.String()
}

func TestComponentsLoad(t *testing.T) {
	r := load(t)
	if len(r.Components) == 0 {
		t.Fatal("no components loaded")
	}
}

func TestRequiredFields(t *testing.T) {
	categories := map[string]bool{"Elements": true, "Forms": true, "Overlays": true, "Layout": true, "Behaviors": true}
	for _, c := range load(t).Components {
		if c.Title == "" || c.Description == "" {
			t.Errorf("%s: title and description are required", c.Name)
		}
		if !categories[c.Category] {
			t.Errorf("%s: unknown category %q", c.Name, c.Category)
		}
		if len(c.Examples) == 0 {
			t.Errorf("%s: at least one example is required", c.Name)
		}
		if len(c.Files) == 0 && len(c.Dependencies) == 0 {
			t.Errorf("%s: has no files and no dependencies", c.Name)
		}
	}
}

func TestFilesExist(t *testing.T) {
	r := load(t)
	for _, c := range r.Components {
		for _, f := range c.Files {
			if _, err := fs.Stat(r.FS, c.FilePath(f)); err != nil {
				t.Errorf("%s: file %s: %v", c.Name, f, err)
			}
		}
		for _, e := range c.Examples {
			if _, err := fs.Stat(r.FS, c.ExamplePath(e.File)); err != nil {
				t.Errorf("%s: example %s: %v", c.Name, e.File, err)
			}
		}
	}
	for _, f := range append(registry.CoreFiles, registry.RuntimeFile) {
		if _, err := fs.Stat(r.FS, f); err != nil {
			t.Errorf("core file %s: %v", f, err)
		}
	}
}

func TestEveryFileIsListed(t *testing.T) {
	r := load(t)
	for _, c := range r.Components {
		listed := map[string]bool{"component.json": true, "examples": true}
		for _, f := range c.Files {
			listed[f] = true
		}
		entries, err := fs.ReadDir(r.FS, path.Join("components", c.Name))
		if err != nil {
			t.Fatal(err)
		}
		for _, e := range entries {
			if !listed[e.Name()] {
				t.Errorf("%s: %s is in the directory but not in files", c.Name, e.Name())
			}
		}

		examples := map[string]bool{}
		for _, e := range c.Examples {
			examples[e.File] = true
		}
		files, _ := fs.ReadDir(r.FS, path.Join("components", c.Name, "examples"))
		for _, e := range files {
			if !examples[e.Name()] {
				t.Errorf("%s: example %s is not listed in component.json", c.Name, e.Name())
			}
		}
	}
}

func TestFileNamesAreUnique(t *testing.T) {
	// Files are installed flat into the css/js/images directories, so names must not clash.
	seen := map[string]string{}
	for _, f := range registry.CoreFiles {
		seen[path.Base(f)] = "core"
	}
	seen[path.Base(registry.RuntimeFile)] = "runtime"
	seen["main.css"] = "the default CSS entry"
	seen["main.js"] = "the default JS entry"

	r := load(t)
	for _, name := range r.Names() {
		for _, f := range r.Components[name].Files {
			if owner, ok := seen[f]; ok {
				t.Errorf("%s: %s is also provided by %s", name, f, owner)
			}
			seen[f] = name
		}
	}
}

func TestDependenciesResolve(t *testing.T) {
	r := load(t)
	for _, name := range r.Names() {
		resolved, err := r.Resolve([]string{name})
		if err != nil {
			t.Errorf("%s: %v", name, err)
			continue
		}
		if resolved[len(resolved)-1].Name != name {
			t.Errorf("%s: should be resolved last, got %s", name, resolved[len(resolved)-1].Name)
		}
		position := map[string]int{}
		for i, c := range resolved {
			position[c.Name] = i
		}
		for _, c := range resolved {
			for _, dep := range c.Dependencies {
				if position[dep] >= position[c.Name] {
					t.Errorf("%s: dependency %s must come before %s", name, dep, c.Name)
				}
			}
		}
	}
}

func TestResolveErrors(t *testing.T) {
	r := load(t)
	if _, err := r.Resolve([]string{"nope"}); err == nil || !strings.Contains(err.Error(), "unknown component") {
		t.Errorf("unknown component: got %v", err)
	}
	if _, err := r.Resolve([]string{"dropdown", "nope"}); err == nil || !strings.Contains(err.Error(), `unknown component "nope"`) {
		t.Errorf("unknown component after a valid one: got %v", err)
	}
}

func TestAdapters(t *testing.T) {
	r := load(t)
	adapters := 0
	for _, c := range r.Components {
		lib := c.Library
		if lib == nil {
			continue
		}
		adapters++
		if lib.Package == "" || lib.Version == "" || lib.Homepage == "" || lib.License == "" || lib.ESM == "" {
			t.Errorf("%s: library needs package, version, homepage, license and esm", c.Name)
		}
		for pkg, esm := range lib.Imports() {
			if pkg == "" || esm == "" {
				t.Errorf("%s: every library module needs package and esm", c.Name)
			}
			if !strings.Contains(esm, pkg+"@"+lib.Version) {
				t.Errorf("%s: esm URL %q does not pin %s@%s", c.Name, esm, pkg, lib.Version)
			}
		}
		if !c.HasJS() {
			t.Errorf("%s: an adapter must ship JavaScript", c.Name)
		}
		imports := false
		for _, f := range c.Files {
			if registry.Kind(f) == registry.KindJS && strings.Contains(read(t, r.FS, c.FilePath(f)), `from "`+lib.Package+`"`) {
				imports = true
			}
		}
		if !imports {
			t.Errorf("%s: no file imports %q", c.Name, lib.Package)
		}
	}
	if adapters == 0 {
		t.Error("expected at least one adapter")
	}

	// The bundles leave adapters out, so nothing that goes into them may depend on one.
	for _, c := range r.Components {
		if c.Library != nil {
			continue
		}
		resolved, err := r.Resolve([]string{c.Name})
		if err != nil {
			t.Fatal(err)
		}
		for _, dep := range resolved {
			if dep.Library != nil {
				t.Errorf("%s depends on the adapter %s", c.Name, dep.Name)
			}
		}
	}
}

func TestDocumentedClassesExist(t *testing.T) {
	r := load(t)
	for _, c := range r.Components {
		classes := cssinfo.Classes(componentCSS(t, r, c))
		for _, o := range c.Classes {
			if !classes[o.Name] {
				t.Errorf("%s: documented class %q is not defined in its CSS", c.Name, o.Name)
			}
		}
	}
}

func TestDocumentedVariablesExist(t *testing.T) {
	r := load(t)
	for _, c := range r.Components {
		css := cssinfo.Strip(componentCSS(t, r, c))
		for _, v := range c.Variables {
			if !strings.Contains(css, v.Name) {
				t.Errorf("%s: documented variable %s is not used in its CSS", c.Name, v.Name)
			}
		}
	}
}

func TestDocumentedClassesAreComplete(t *testing.T) {
	// Every class a component's own CSS defines should be documented, so the docs show all options.
	r := load(t)
	for _, c := range r.Components {
		if c.Library != nil {
			// Adapter stylesheets theme the library's own markup (e.g. .flatpickr-day).
			continue
		}
		documented := map[string]bool{}
		for _, o := range c.Classes {
			documented[o.Name] = true
		}
		for _, f := range c.Files {
			if registry.Kind(f) != registry.KindCSS {
				continue
			}
			for class := range cssinfo.Classes(read(t, r.FS, c.FilePath(f))) {
				if !documented[class] && !borrowed(r, c, class) {
					t.Errorf("%s: class %q from %s is not documented", c.Name, class, f)
				}
			}
		}
	}
}

// borrowed reports whether a class used in a component's CSS belongs to another component
// (for example .btn inside avatar.css or .icon inside badge.css).
func borrowed(r *registry.Registry, self *registry.Component, class string) bool {
	for _, c := range r.Components {
		if c == self {
			continue
		}
		for _, o := range c.Classes {
			if o.Name == class {
				return true
			}
		}
	}
	return false
}

func TestExampleClassesExist(t *testing.T) {
	r := load(t)
	classes := cssinfo.Classes(allCSS(t, r))
	for _, c := range r.Components {
		for _, e := range c.Examples {
			for _, class := range cssinfo.HTMLClasses(read(t, r.FS, c.ExamplePath(e.File))) {
				if !classes[class] {
					t.Errorf("%s/%s: class %q is not defined in any stylesheet", c.Name, e.File, class)
				}
			}
		}
	}
}

var idPattern = regexp.MustCompile(`\sid="([^"]+)"`)

func TestExampleIDsAreUniquePerPage(t *testing.T) {
	r := load(t)
	reserved := map[string]bool{"header": true, "sidebar": true, "main": true}
	for _, c := range r.Components {
		seen := map[string]string{}
		for _, e := range c.Examples {
			for _, m := range idPattern.FindAllStringSubmatch(read(t, r.FS, c.ExamplePath(e.File)), -1) {
				id := m[1]
				if reserved[id] && !e.Frame {
					t.Errorf("%s/%s: id %q is reserved for layouts and only allowed in framed examples", c.Name, e.File, id)
				}
				if other, ok := seen[id]; ok && !e.Frame {
					t.Errorf("%s: id %q is used in both %s and %s", c.Name, id, other, e.File)
				}
				if !e.Frame {
					seen[id] = e.File
				}
			}
		}
	}
}

var (
	actionAttribute = regexp.MustCompile(`\sdata-([a-z-]+)-action="([^"]*)"`)
	actionPattern   = regexp.MustCompile(`^(?:([^.@\s]+?)(?:\.([^@\s]+?))?(?:@(window|document))?->)?(\w+)((?::\w+)*)$`)
	keyNames        = regexp.MustCompile(`^(?:[a-z0-9]|enter|tab|esc|space|up|down|left|right|home|end|page_up|page_down)$`)
)

func TestExampleActionsAreValid(t *testing.T) {
	r := load(t)
	actions := map[string]map[string]bool{}
	for _, c := range r.Components {
		for _, a := range c.Actions {
			controller := strings.ReplaceAll(c.Name, "_", "-")
			if actions[controller] == nil {
				actions[controller] = map[string]bool{}
			}
			actions[controller][a.Name] = true
		}
	}

	for _, c := range r.Components {
		for _, e := range c.Examples {
			html := read(t, r.FS, c.ExamplePath(e.File))
			for _, m := range actionAttribute.FindAllStringSubmatch(html, -1) {
				controller, value := m[1], m[2]
				for _, descriptor := range strings.Fields(value) {
					parts := actionPattern.FindStringSubmatch(descriptor)
					if parts == nil {
						t.Errorf("%s/%s: invalid action %q", c.Name, e.File, descriptor)
						continue
					}
					if !actions[controller][parts[4]] {
						t.Errorf("%s/%s: %q is not a documented action of %s", c.Name, e.File, parts[4], controller)
					}
					for _, option := range strings.Split(strings.TrimPrefix(parts[5], ":"), ":") {
						if option != "" && option != "prevent" && option != "stop" && option != "self" {
							t.Errorf("%s/%s: unknown action option %q", c.Name, e.File, option)
						}
					}
					if filter := parts[2]; filter != "" {
						for _, key := range strings.Split(filter, "+") {
							if key != "ctrl" && key != "meta" && key != "alt" && key != "shift" && !keyNames.MatchString(key) {
								t.Errorf("%s/%s: unknown key filter %q", c.Name, e.File, key)
							}
						}
					}
				}
			}
		}
	}
}

// usesESMSh reports whether p is the component.json of an adapter that imports its
// library from esm.sh.
func usesESMSh(r *registry.Registry, p string) bool {
	for _, c := range r.Components {
		if c.Library == nil || p != "components/"+c.Name+"/component.json" {
			continue
		}
		for _, esm := range c.Library.Imports() {
			if strings.HasPrefix(esm, "https://esm.sh/") {
				return true
			}
		}
	}
	return false
}

func TestNoFrameworkLeftovers(t *testing.T) {
	forbidden := regexp.MustCompile(`(?i)turbo|stimulus|hotwired|data-controller|data-action=|lexxy|field_with_errors|esm\.sh|authenticity_token|data-turbo`)
	r := load(t)
	err := fs.WalkDir(r.FS, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || path.Ext(p) == ".svg" {
			return err
		}
		content := read(t, r.FS, p)
		if p == "components/confirm/component.json" || p == "components/form/component.json" || p == "components/input/component.json" {
			// These docs explain what replaced the Turbo-specific behavior.
			return nil
		}
		if usesESMSh(r, p) {
			// An adapter whose library is served from esm.sh on purpose (not a leftover pin).
			content = strings.ReplaceAll(content, "esm.sh", "")
		}
		if loc := forbidden.FindStringIndex(content); loc != nil {
			t.Errorf("%s: contains %q", p, content[loc[0]:loc[1]])
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestNoRelativeAssetURLs(t *testing.T) {
	relative := regexp.MustCompile(`url\(\s*["']?(?:[a-z0-9_-]+/)*[a-z0-9_-]+\.(?:svg|png|jpg|webp)`)
	r := load(t)
	err := fs.WalkDir(r.FS, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || path.Ext(p) != ".css" {
			return err
		}
		if m := relative.FindString(read(t, r.FS, p)); m != "" {
			t.Errorf("%s: relative asset reference %s", p, m)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestJavaScriptImportsOnlyTheRuntime(t *testing.T) {
	importPattern := regexp.MustCompile(`(?m)^\s*import\b.*$`)
	r := load(t)
	for _, c := range r.Components {
		for _, f := range c.Files {
			if registry.Kind(f) != registry.KindJS {
				continue
			}
			for _, line := range importPattern.FindAllString(read(t, r.FS, c.FilePath(f)), -1) {
				line = strings.TrimSpace(line)
				if strings.HasSuffix(line, `from "./velle.js"`) {
					continue
				}
				if c.Library != nil && importsLibrary(line, c.Library) {
					continue
				}
				t.Errorf("%s/%s: only ./velle.js (and an adapter's own library) may be imported, got %s", c.Name, f, line)
			}
		}
	}
}

func importsLibrary(line string, lib *registry.Library) bool {
	for pkg := range lib.Imports() {
		if strings.HasSuffix(line, `from "`+pkg+`"`) {
			return true
		}
	}
	return false
}

func TestControllersMatchComponentNames(t *testing.T) {
	definePattern := regexp.MustCompile(`define\("([a-z-]+)"`)
	r := load(t)
	var names []string
	for _, c := range r.Components {
		for _, f := range c.Files {
			if registry.Kind(f) != registry.KindJS {
				continue
			}
			for _, m := range definePattern.FindAllStringSubmatch(read(t, r.FS, c.FilePath(f)), -1) {
				names = append(names, m[1])
			}
		}
	}
	sort.Strings(names)
	for i := 1; i < len(names); i++ {
		if names[i] == names[i-1] {
			t.Errorf("controller %q is defined twice", names[i])
		}
	}
}

var (
	defineName   = regexp.MustCompile(`define\("([a-z-]+)"`)
	rootSelector = regexp.MustCompile(`\[data-([a-z-]+)\]`)
	dataAttr     = regexp.MustCompile(`\sdata-([a-z-]+)`)
)

// TestExamplesOnlyUseInstalledComponents checks that everything an example uses is
// installed by `velle add <component>` (the component and its dependencies, plus the core
// styles) or is listed in the example's "requires". Otherwise copying an example from the
// docs into a project would break.
func TestExamplesOnlyUseInstalledComponents(t *testing.T) {
	r := load(t)

	var core strings.Builder
	for _, f := range registry.CoreFiles {
		core.WriteString(read(t, r.FS, f))
	}
	coreClasses := cssinfo.Classes(core.String())

	// Map each behavior's root attribute (data-tabs, data-local-time, …) to its component.
	roots := map[string]string{}
	for _, c := range r.Components {
		for _, f := range c.Files {
			if registry.Kind(f) != registry.KindJS {
				continue
			}
			js := read(t, r.FS, c.FilePath(f))
			for _, m := range defineName.FindAllStringSubmatch(js, -1) {
				roots[m[1]] = c.Name
			}
			for _, m := range rootSelector.FindAllStringSubmatch(js, -1) {
				roots[m[1]] = c.Name
			}
		}
	}

	for _, c := range r.Components {
		for _, e := range c.Examples {
			for _, name := range e.Requires {
				if _, ok := r.Components[name]; !ok {
					t.Errorf("%s/%s: requires unknown component %q", c.Name, e.File, name)
				}
			}

			resolved, err := r.Resolve(append([]string{c.Name}, e.Requires...))
			if err != nil {
				t.Errorf("%s/%s: %v", c.Name, e.File, err)
				continue
			}
			installed := map[string]bool{}
			var css strings.Builder
			for _, dep := range resolved {
				installed[dep.Name] = true
				for _, f := range dep.Files {
					if registry.Kind(f) == registry.KindCSS {
						css.WriteString(read(t, r.FS, dep.FilePath(f)))
					}
				}
			}
			classes := cssinfo.Classes(css.String())

			html := read(t, r.FS, c.ExamplePath(e.File))
			for _, class := range cssinfo.HTMLClasses(html) {
				if !classes[class] && !coreClasses[class] {
					t.Errorf("%s/%s: class %q is not installed by `velle add %s`; add the component that defines it to the dependencies or to the example's requires", c.Name, e.File, class, c.Name)
				}
			}
			for _, m := range dataAttr.FindAllStringSubmatch(html, -1) {
				if owner, ok := roots[m[1]]; ok && !installed[owner] {
					t.Errorf("%s/%s: data-%s needs the %s component; add it to the dependencies or to the example's requires", c.Name, e.File, m[1], owner)
				}
			}
		}
	}
}
