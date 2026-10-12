package docs

import (
	"bytes"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
	texttemplate "text/template"

	"github.com/codedbyshoe/velle-css/internal/registry"
)

// SiteURL is where the GitHub Pages workflow publishes the docs. llms.txt links to it.
const SiteURL = "https://codedbyshoe.github.io/velle-css/"

// markdownPage is one Markdown document written next to the HTML docs (see llmstxt.org).
type markdownPage struct {
	File        string
	Title       string
	Description string
	Body        string
}

// buildLLMs writes llms.txt (an index of Markdown pages), llms-full.txt (every page in one
// file) and the Markdown pages themselves: a guide, the tokens, the utilities and one per
// component.
func buildLLMs(fsys fs.FS, reg *registry.Registry, out, version string, tokens []TokenFile, utilities []UtilitySection) error {
	guide, err := guideMarkdown(version)
	if err != nil {
		return err
	}
	pages := []markdownPage{
		{File: "guide.md", Title: "Guide", Description: "Install, load order, markup conventions and the JavaScript runtime's data attributes", Body: guide},
		{File: "tokens.md", Title: "Tokens", Description: "Design tokens: colors, typography, sizes, borders, shadows, animations", Body: tokensMarkdown(tokens)},
		{File: "utilities.md", Title: "Utilities", Description: "Utility classes for layout, spacing, typography and color", Body: utilitiesMarkdown(utilities)},
	}

	components := map[string][]markdownPage{}
	for _, name := range reg.Names() {
		c := reg.Components[name]
		body, err := componentMarkdown(fsys, reg, c)
		if err != nil {
			return err
		}
		components[c.Category] = append(components[c.Category], markdownPage{File: c.Name + ".md", Title: c.Title, Description: c.Description, Body: body})
	}

	var index, full strings.Builder
	intro := "# velle-css\n\n" +
		"> Language and framework agnostic CSS components: plain CSS with design tokens and utilities, a small dependency-free JavaScript runtime driven by data attributes, and a Go CLI that copies only the components you use into your project.\n\n" +
		"Version " + version + ". Components are styled with BEM-style classes (`.btn`, `.btn--primary`, `.card__header`) and customized through CSS custom properties. " +
		"Interactive components read `data-NAME`, `data-NAME-target` and `data-NAME-action` attributes; the guide explains the syntax. Each component page lists its classes, variables, attributes, actions, events and HTML examples.\n"
	index.WriteString(intro)
	full.WriteString(intro)

	index.WriteString("\n## Docs\n\n")
	for _, p := range pages {
		fmt.Fprintf(&index, "- [%s](%s%s): %s\n", p.Title, SiteURL, p.File, p.Description)
		full.WriteString("\n" + p.Body)
		if err := write(filepath.Join(out, p.File), []byte(p.Body)); err != nil {
			return err
		}
	}

	for _, category := range Categories {
		index.WriteString("\n## " + category + "\n\n")
		for _, p := range components[category] {
			fmt.Fprintf(&index, "- [%s](%s%s): %s\n", p.Title, SiteURL, p.File, p.Description)
			full.WriteString("\n" + p.Body)
			if err := write(filepath.Join(out, p.File), []byte(p.Body)); err != nil {
				return err
			}
		}
	}

	index.WriteString("\n## Optional\n\n")
	fmt.Fprintf(&index, "- [Full reference](%sllms-full.txt): every page above in one file\n", SiteURL)
	fmt.Fprintf(&index, "- [Source](%s): registry/components/<name>/ holds each component's CSS, JavaScript, metadata and examples\n", Repository)

	if err := write(filepath.Join(out, "llms.txt"), []byte(index.String())); err != nil {
		return err
	}
	return write(filepath.Join(out, "llms-full.txt"), []byte(full.String()))
}

func guideMarkdown(version string) (string, error) {
	t, err := texttemplate.ParseFS(embedded, "templates/guide.md")
	if err != nil {
		return "", err
	}
	var b bytes.Buffer
	if err := t.Execute(&b, struct{ Version string }{version}); err != nil {
		return "", err
	}
	return b.String(), nil
}

func componentMarkdown(fsys fs.FS, reg *registry.Registry, c *registry.Component) (string, error) {
	var b strings.Builder
	fmt.Fprintf(&b, "# %s\n\n%s\n\nCategory: %s. Install with `velle add %s`.", c.Title, c.Description, c.Category, c.Name)
	if len(c.Dependencies) > 0 {
		fmt.Fprintf(&b, " Also installs: %s.", strings.Join(c.Dependencies, ", "))
	}
	fmt.Fprintf(&b, " Files: %s.\n", strings.Join(c.Files, ", "))

	if lib := c.Library; lib != nil {
		entry, err := importMapEntry(lib)
		if err != nil {
			return "", err
		}
		fmt.Fprintf(&b, "\n## Third-party library\n\nThis component is an adapter for %s (%s, %s license), which velle does not ship. Install version %s with `npm install %s`, or map it in an import map placed before any module script:\n\n```html\n%s\n```\n",
			lib.Package, lib.Homepage, lib.License, lib.Version, strings.Join(lib.Packages(), " "), entry)
		if url := lib.StylesheetURL(); url != "" {
			fmt.Fprintf(&b, "\nAlso load the library's stylesheet before %s.css: %s\n", c.Name, url)
		}
	}

	if len(c.Classes) > 0 {
		b.WriteString("\n## Classes\n\n")
		for _, o := range c.Classes {
			fmt.Fprintf(&b, "- `.%s`: %s\n", o.Name, o.Description)
		}
	}
	if len(c.Variables) > 0 {
		b.WriteString("\n## CSS variables\n\n")
		for _, v := range c.Variables {
			fmt.Fprintf(&b, "- `%s` (default `%s`): %s\n", v.Name, v.Default, v.Description)
		}
	}
	if len(c.Attributes) > 0 {
		b.WriteString("\n## Attributes\n\n")
		for _, a := range c.Attributes {
			fmt.Fprintf(&b, "- `%s` on %s: %s\n", a.Name, a.Element, a.Description)
		}
	}
	if len(c.Actions) > 0 {
		b.WriteString("\n## Actions\n\n")
		for _, o := range c.Actions {
			fmt.Fprintf(&b, "- `%s`: %s\n", o.Name, o.Description)
		}
	}
	if len(c.Events) > 0 {
		b.WriteString("\n## Events\n\n")
		for _, o := range c.Events {
			fmt.Fprintf(&b, "- `%s`: %s\n", o.Name, o.Description)
		}
	}
	if len(c.Notes) > 0 {
		b.WriteString("\n## Notes\n\n")
		for _, n := range c.Notes {
			fmt.Fprintf(&b, "- %s\n", n)
		}
	}

	if len(c.Examples) > 0 {
		b.WriteString("\n## Examples\n")
		for _, e := range c.Examples {
			data, err := fs.ReadFile(fsys, c.ExamplePath(e.File))
			if err != nil {
				return "", err
			}
			fmt.Fprintf(&b, "\n### %s\n\n", e.Title)
			if e.Description != "" {
				b.WriteString(e.Description + "\n\n")
			}
			if len(e.Requires) > 0 {
				fmt.Fprintf(&b, "Also needs `velle add %s`.\n\n", strings.Join(e.Requires, " "))
			}
			fmt.Fprintf(&b, "```html\n%s\n```\n", demoAttribute.ReplaceAllString(strings.TrimSpace(string(data)), ""))
		}
	}
	return b.String(), nil
}

func tokensMarkdown(files []TokenFile) string {
	var b strings.Builder
	b.WriteString("# Tokens\n\nDesign tokens are CSS custom properties defined on :root by variables.css. Use them in your own CSS, e.g. `padding: var(--size-4)`.\n")
	for _, f := range files {
		fmt.Fprintf(&b, "\n## %s (%s)\n", f.Title, f.File)
		for _, s := range f.Sections {
			if s.Title != "" {
				fmt.Fprintf(&b, "\n### %s\n", s.Title)
			}
			b.WriteString("\n")
			for _, t := range s.Tokens {
				fmt.Fprintf(&b, "- `%s: %s`", t.Name, t.Value)
				if t.Comment != "" {
					b.WriteString(" (" + t.Comment + ")")
				}
				b.WriteString("\n")
			}
		}
	}
	return b.String()
}

func utilitiesMarkdown(sections []UtilitySection) string {
	var b strings.Builder
	b.WriteString("# Utilities\n\nUtility classes from utilities.css, which loads last so it overrides component styles.\n")
	for _, s := range sections {
		fmt.Fprintf(&b, "\n## %s\n\n", s.Title)
		for _, r := range s.Rules {
			fmt.Fprintf(&b, "- `.%s` { %s }\n", r.Class, r.Declarations)
		}
	}
	return b.String()
}
