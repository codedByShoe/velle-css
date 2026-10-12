// Package docs generates the static documentation site from the registry: one page per
// component with live examples, their source and tables of every option.
package docs

import (
	"bufio"
	"bytes"
	"embed"
	"encoding/json"
	"html/template"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/codedbyshoe/velle-css/internal/build"
	"github.com/codedbyshoe/velle-css/internal/registry"
)

//go:embed templates assets
var embedded embed.FS

// Repository is the GitHub repository the docs link to.
const Repository = "https://github.com/codedbyshoe/velle-css"

// Categories in navigation order.
var Categories = []string{"Elements", "Forms", "Overlays", "Layout", "Behaviors"}

// Site holds what every page needs.
type Site struct {
	Version  string
	Repo     string
	Nav      []NavGroup
	Registry *registry.Registry
	// ImportMap maps every adapter's library to its CDN build, so adapter demos work
	// without a bundler.
	ImportMap template.HTML
}

type NavGroup struct {
	Title string
	Links []NavLink
}

type NavLink struct {
	Title string
	Href  string
}

// Page is the data passed to a page template.
type Page struct {
	Site      *Site
	Title     string
	Href      string
	Component *ComponentPage
	Tokens    []TokenFile
	Utilities []UtilitySection
}

type ComponentPage struct {
	*registry.Component
	Dependencies []NavLink
	HasCSS       bool
	HasJS        bool
	Examples     []ExamplePage
	// Stylesheets and Scripts are adapter files the page loads on top of the bundles.
	Stylesheets []string
	Scripts     []string
	// ImportMapEntry is the import map snippet shown in an adapter's install instructions.
	ImportMapEntry string
}

type ExamplePage struct {
	registry.Example
	// Uses links to the other components the example needs (its requires).
	Uses     []NavLink
	ID       string
	HTML     template.HTML
	Code     string
	FrameDoc string
}

type TokenFile struct {
	Title    string
	File     string
	Sections []TokenSection
}

type TokenSection struct {
	Title  string
	Tokens []Token
}

type Token struct {
	Name    string
	Value   string
	Comment string
	Color   bool
	// Swatch is the inline style of a color preview. The name is checked against
	// declaration, so it is safe to mark as CSS.
	Swatch template.CSS
}

type UtilitySection struct {
	Title string
	Rules []UtilityRule
}

type UtilityRule struct {
	Class        string
	Declarations string
}

// Build writes the documentation site into out. css and js are the dist bundles, which the
// site itself uses.
func Build(fsys fs.FS, reg *registry.Registry, out, version, css, js string) error {
	if err := os.RemoveAll(out); err != nil {
		return err
	}

	importMap, err := importMap(reg)
	if err != nil {
		return err
	}
	site := &Site{Version: version, Repo: Repository, Registry: reg, Nav: navigation(reg), ImportMap: importMap}

	pages := map[string]Page{
		"index.html":      {Title: "Introduction"},
		"javascript.html": {Title: "JavaScript"},
	}

	tokens, err := tokenFiles(fsys)
	if err != nil {
		return err
	}
	pages["tokens.html"] = Page{Title: "Tokens", Tokens: tokens}

	utilities, err := utilitySections(fsys)
	if err != nil {
		return err
	}
	pages["utilities.html"] = Page{Title: "Utilities", Utilities: utilities}

	for _, name := range reg.Names() {
		component, err := componentPage(fsys, reg, reg.Components[name])
		if err != nil {
			return err
		}
		pages[name+".html"] = Page{Title: component.Title, Component: component}
	}

	for href, page := range pages {
		page.Site, page.Href = site, href
		templateName := strings.TrimSuffix(href, ".html")
		if page.Component != nil {
			templateName = "component"
		}
		if err := render(filepath.Join(out, href), templateName, page); err != nil {
			return err
		}
	}

	if err := copyAssets(out); err != nil {
		return err
	}
	for _, kind := range []registry.FileKind{registry.KindCSS, registry.KindJS} {
		for _, f := range build.AdapterFiles(reg, kind) {
			data, err := fs.ReadFile(fsys, f)
			if kind == registry.KindJS {
				data, err = build.Adapter(fsys, f)
			}
			if err != nil {
				return err
			}
			if err := write(filepath.Join(out, "assets", "adapters", filepath.Base(f)), data); err != nil {
				return err
			}
		}
	}
	if err := write(filepath.Join(out, "assets", "velle.css"), []byte(css)); err != nil {
		return err
	}
	if err := write(filepath.Join(out, "assets", "velle.js"), []byte(js)); err != nil {
		return err
	}
	avatar, err := fs.ReadFile(fsys, "components/avatar/avatar.svg")
	if err != nil {
		return err
	}
	if err := write(filepath.Join(out, "assets", "images", "avatar.svg"), avatar); err != nil {
		return err
	}
	// GitHub Pages: serve files as they are, without Jekyll processing.
	return write(filepath.Join(out, ".nojekyll"), nil)
}

func importMap(reg *registry.Registry) (template.HTML, error) {
	imports := map[string]string{}
	for _, name := range reg.Names() {
		if lib := reg.Components[name].Library; lib != nil {
			for pkg, esm := range lib.Imports() {
				imports[pkg] = esm
			}
		}
	}
	if len(imports) == 0 {
		return "", nil
	}
	data, err := json.MarshalIndent(map[string]any{"imports": imports}, "  ", "  ")
	if err != nil {
		return "", err
	}
	// The JSON comes from component.json files in this repository; json.Marshal escapes
	// <, > and & so it cannot close the script element.
	return template.HTML(`<script type="importmap">` + "\n  " + string(data) + "\n  </script>"), nil
}

// importMapEntry is the import map an adapter's install instructions show: one line for a
// single package, one line per package otherwise.
func importMapEntry(lib *registry.Library) (string, error) {
	if len(lib.Modules) == 0 {
		return `<script type="importmap">
  { "imports": { "` + lib.Package + `": "` + lib.ESM + `" } }
</script>`, nil
	}
	data, err := json.MarshalIndent(map[string]any{"imports": lib.Imports()}, "  ", "  ")
	if err != nil {
		return "", err
	}
	return "<script type=\"importmap\">\n  " + string(data) + "\n</script>", nil
}

func navigation(reg *registry.Registry) []NavGroup {
	nav := []NavGroup{{Title: "Getting started", Links: []NavLink{
		{Title: "Introduction", Href: "index.html"},
		{Title: "JavaScript", Href: "javascript.html"},
		{Title: "Tokens", Href: "tokens.html"},
		{Title: "Utilities", Href: "utilities.html"},
	}}}

	for _, category := range Categories {
		group := NavGroup{Title: category}
		for _, name := range reg.Names() {
			if c := reg.Components[name]; c.Category == category {
				group.Links = append(group.Links, NavLink{Title: c.Title, Href: c.Name + ".html"})
			}
		}
		sort.Slice(group.Links, func(i, j int) bool { return group.Links[i].Title < group.Links[j].Title })
		nav = append(nav, group)
	}
	return nav
}

var demoAttribute = regexp.MustCompile(` data-demo-[a-z-]+="[^"]*"`)

func componentPage(fsys fs.FS, reg *registry.Registry, c *registry.Component) (*ComponentPage, error) {
	page := &ComponentPage{Component: c}

	for _, dep := range c.Dependencies {
		page.Dependencies = append(page.Dependencies, NavLink{Title: reg.Components[dep].Title, Href: dep + ".html"})
	}
	for _, f := range c.Files {
		page.HasCSS = page.HasCSS || registry.Kind(f) == registry.KindCSS
		page.HasJS = page.HasJS || registry.Kind(f) == registry.KindJS
	}

	if lib := c.Library; lib != nil {
		if url := lib.StylesheetURL(); url != "" {
			page.Stylesheets = append(page.Stylesheets, url)
		}
		for _, f := range c.Files {
			switch registry.Kind(f) {
			case registry.KindCSS:
				page.Stylesheets = append(page.Stylesheets, "assets/adapters/"+f)
			case registry.KindJS:
				page.Scripts = append(page.Scripts, "assets/adapters/"+f)
			}
		}
		entry, err := importMapEntry(lib)
		if err != nil {
			return nil, err
		}
		page.ImportMapEntry = entry
	}

	for _, e := range c.Examples {
		data, err := fs.ReadFile(fsys, c.ExamplePath(e.File))
		if err != nil {
			return nil, err
		}
		source := strings.TrimSpace(string(data))
		example := ExamplePage{
			Example: e,
			ID:      "example-" + strings.TrimSuffix(e.File, ".html"),
			Code:    demoAttribute.ReplaceAllString(source, ""),
		}
		for _, name := range e.Requires {
			example.Uses = append(example.Uses, NavLink{Title: reg.Components[name].Title, Href: name + ".html"})
		}
		if e.Frame {
			var doc bytes.Buffer
			if err := frameTemplate.ExecuteTemplate(&doc, "frame", template.HTML(source)); err != nil {
				return nil, err
			}
			example.FrameDoc = doc.String()
		} else {
			example.HTML = template.HTML(source)
		}
		page.Examples = append(page.Examples, example)
	}
	return page, nil
}

var (
	bannerLine  = regexp.MustCompile(`^\s*\*\s+(.+?)\s*$`)
	declaration = regexp.MustCompile(`^\s*(--[\w-]+)\s*:\s*(.+?);\s*(?:/\*\s*(.*?)\s*\*/)?\s*$`)
	colorName   = regexp.MustCompile(`^--([a-z]+)-\d+$`)
)

func tokenFiles(fsys fs.FS) ([]TokenFile, error) {
	titles := map[string]string{
		"colors.css": "Colors", "sizes.css": "Sizes", "typography.css": "Typography", "borders.css": "Borders",
		"effects.css": "Effects", "filters.css": "Filters", "transforms.css": "Transforms",
		"transitions.css": "Transitions", "animations.css": "Animations",
	}
	order := []string{"colors.css", "typography.css", "sizes.css", "borders.css", "effects.css", "filters.css", "transforms.css", "transitions.css", "animations.css"}

	var files []TokenFile
	for _, name := range order {
		data, err := fs.ReadFile(fsys, "core/tokens/"+name)
		if err != nil {
			return nil, err
		}

		file := TokenFile{Title: titles[name], File: name}
		var current *TokenSection
		scanner := bufio.NewScanner(bytes.NewReader(data))
		for scanner.Scan() {
			line := scanner.Text()
			if m := bannerLine.FindStringSubmatch(line); m != nil && !strings.HasPrefix(strings.TrimSpace(line), "*/") && !strings.Contains(m[1], "****") {
				file.Sections = append(file.Sections, TokenSection{Title: m[1]})
				current = &file.Sections[len(file.Sections)-1]
				continue
			}
			m := declaration.FindStringSubmatch(line)
			if m == nil {
				continue
			}
			token := Token{Name: m[1], Value: m[2], Comment: m[3]}
			if name == "colors.css" {
				token.Color = true
				token.Swatch = template.CSS("background: var(" + token.Name + ")")
				if palette := colorName.FindStringSubmatch(token.Name); palette != nil && (current == nil || current.Title != palette[1]) {
					file.Sections = append(file.Sections, TokenSection{Title: palette[1]})
					current = &file.Sections[len(file.Sections)-1]
				}
			}
			if current == nil {
				file.Sections = append(file.Sections, TokenSection{})
				current = &file.Sections[len(file.Sections)-1]
			}
			current.Tokens = append(current.Tokens, token)
		}
		files = append(files, file)
	}
	return files, nil
}

var utilityRule = regexp.MustCompile(`^\.((?:[\w-]|\\@)+)\s*\{\s*(.*?)\s*\}\s*$`)

func utilitySections(fsys fs.FS) ([]UtilitySection, error) {
	data, err := fs.ReadFile(fsys, "core/utilities.css")
	if err != nil {
		return nil, err
	}

	var sections []UtilitySection
	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		line := scanner.Text()
		if m := bannerLine.FindStringSubmatch(line); m != nil && !strings.Contains(m[1], "****") {
			sections = append(sections, UtilitySection{Title: m[1]})
			continue
		}
		if m := utilityRule.FindStringSubmatch(line); m != nil && len(sections) > 0 {
			last := &sections[len(sections)-1]
			last.Rules = append(last.Rules, UtilityRule{Class: strings.ReplaceAll(m[1], `\`, ""), Declarations: m[2]})
		}
	}
	return sections, nil
}

var frameTemplate = template.Must(template.ParseFS(embedded, "templates/frame.html"))

var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

func pageTemplate(name string) *template.Template {
	return template.Must(template.New("layout.html").Funcs(template.FuncMap{
		"join": strings.Join,
		"slug": func(s string) string {
			return strings.Trim(slugPattern.ReplaceAllString(strings.ToLower(s), "-"), "-")
		},
	}).ParseFS(embedded, "templates/layout.html", "templates/"+name+".html"))
}

func render(target, name string, page Page) error {
	var b bytes.Buffer
	if err := pageTemplate(name).ExecuteTemplate(&b, "layout.html", page); err != nil {
		return err
	}
	return write(target, b.Bytes())
}

func copyAssets(out string) error {
	return fs.WalkDir(embedded, "assets", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		data, err := embedded.ReadFile(p)
		if err != nil {
			return err
		}
		return write(filepath.Join(out, filepath.FromSlash(p)), data)
	})
}

func write(name string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(name), 0o755); err != nil {
		return err
	}
	return os.WriteFile(name, data, 0o644)
}
