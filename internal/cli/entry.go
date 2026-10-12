package cli

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// An entry is a stylesheet or script that imports every installed velle file, so a page
// only needs one <link> and one <script>. velle owns a marked block in it and rewrites the
// block in load order; everything outside the block belongs to the user.
type entry struct {
	path  string // project-relative, e.g. assets/css/velle/main.css
	begin string
	end   string
	line  func(specifier string) string
	parse *regexp.Regexp
	rank  func(file string) int
	isCSS bool
}

const (
	beginText = "velle:begin — managed by the velle CLI, which keeps these imports in load order. Add your own below velle:end."
	endText   = "velle:end"
)

var (
	cssImport = regexp.MustCompile(`^\s*@import\s+url\(\s*["']?([^"')]+?)["']?\s*\)\s*;\s*$`)
	jsImport  = regexp.MustCompile(`^\s*import\s+["']([^"']+)["']\s*;?\s*$`)
)

func cssEntry(p string) *entry {
	return &entry{
		path:  p,
		begin: "/* " + beginText + " */",
		end:   "/* " + endText + " */",
		line:  func(s string) string { return fmt.Sprintf("@import url(%q);", s) },
		parse: cssImport,
		isCSS: true,
		// reset, then tokens, then base, then components alphabetically, then utilities:
		// components override the base styles and utilities override components.
		rank: func(file string) int {
			switch path.Base(file) {
			case "reset.css":
				return 0
			case "variables.css":
				return 1
			case "base.css":
				return 2
			case "utilities.css":
				return 4
			default:
				return 3
			}
		},
	}
}

func jsEntry(p string) *entry {
	return &entry{
		path:  p,
		begin: "// " + beginText,
		end:   "// " + endText,
		line:  func(s string) string { return fmt.Sprintf("import %q", s) },
		parse: jsImport,
		rank:  func(string) int { return 0 },
	}
}

// specifier returns how the entry refers to a project-relative file.
func (e *entry) specifier(target string) (string, error) {
	rel, err := filepath.Rel(filepath.FromSlash(path.Dir(e.path)), filepath.FromSlash(target))
	if err != nil {
		return "", err
	}
	rel = filepath.ToSlash(rel)
	if !e.isCSS && !strings.HasPrefix(rel, "../") {
		rel = "./" + rel // module specifiers must be relative or absolute
	}
	return rel, nil
}

// update adds imports for the given project-relative files to the entry's managed block,
// creating the file or the block if needed. known reports whether an imported file is one
// velle manages; other imports in the block are kept after velle's.
func (a *App) updateEntry(e *entry, files []string, known func(string) bool) error {
	destination := filepath.Join(a.Dir, filepath.FromSlash(e.path))
	existing, err := os.ReadFile(destination)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	content := strings.ReplaceAll(string(existing), "\r\n", "\n")

	before, block, after, found := cutBlock(content, e.begin, e.end)
	if !found {
		before, after = "", content
		if e.isCSS && strings.HasPrefix(after, "@charset") {
			// @charset must stay first.
			if i := strings.Index(after, "\n"); i >= 0 {
				before, after = after[:i+1], after[i+1:]
			}
		}
	}

	imports := map[string]bool{}
	var other []string
	for _, line := range strings.Split(block, "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		if m := e.parse.FindStringSubmatch(line); m != nil && known(path.Base(m[1])) {
			imports[m[1]] = true
		} else {
			other = append(other, line)
		}
	}
	for _, f := range files {
		s, err := e.specifier(f)
		if err != nil {
			return err
		}
		imports[s] = true
	}

	sorted := make([]string, 0, len(imports))
	for s := range imports {
		sorted = append(sorted, s)
	}
	sort.Slice(sorted, func(i, j int) bool {
		ri, rj := e.rank(sorted[i]), e.rank(sorted[j])
		if ri != rj {
			return ri < rj
		}
		return path.Base(sorted[i]) < path.Base(sorted[j])
	})

	lines := []string{e.begin}
	for _, s := range sorted {
		lines = append(lines, e.line(s))
	}
	lines = append(lines, other...)
	lines = append(lines, e.end)

	if after != "" && !strings.HasPrefix(after, "\n") {
		after = "\n" + after
	}
	updated := before + strings.Join(lines, "\n") + "\n" + after
	if !found && content == "" {
		updated = strings.Join(lines, "\n") + "\n"
	}

	if updated == content {
		a.status("identical", e.path)
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(destination, []byte(updated), 0o644); err != nil {
		return err
	}
	if existing == nil {
		a.status("create", e.path)
	} else {
		a.status("update", e.path)
	}

	if e.isCSS && hasRulesBefore(before) {
		fmt.Fprintf(a.Stderr, "velle: warning: %s has CSS before the velle block; @import only works before other rules, so move the block to the top\n", e.path)
	}
	return nil
}

// cutBlock splits content around the managed block, which runs from the begin marker line
// through the end marker line.
func cutBlock(content, begin, end string) (before, block, after string, found bool) {
	start := strings.Index(content, begin)
	if start < 0 {
		return content, "", "", false
	}
	rest := content[start+len(begin):]
	stop := strings.Index(rest, end)
	if stop < 0 {
		return content, "", "", false
	}
	after = strings.TrimPrefix(rest[stop+len(end):], "\n")
	return content[:start], rest[:stop], after, true
}

var commentPattern = regexp.MustCompile(`(?s)/\*.*?\*/`)

// hasRulesBefore reports whether CSS text contains anything other than comments,
// @charset, @import and @layer statements, which would make later @imports invalid.
func hasRulesBefore(css string) bool {
	for _, line := range strings.Split(commentPattern.ReplaceAllString(css, ""), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "@charset") || strings.HasPrefix(line, "@import") || (strings.HasPrefix(line, "@layer") && strings.HasSuffix(line, ";")) {
			continue
		}
		return true
	}
	return false
}
