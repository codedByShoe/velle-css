package docs_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	velle "github.com/codedbyshoe/velle-css"
	"github.com/codedbyshoe/velle-css/internal/docs"
	"github.com/codedbyshoe/velle-css/internal/registry"
)

func TestBuild(t *testing.T) {
	fsys := velle.Registry()
	reg, err := registry.Load(fsys)
	if err != nil {
		t.Fatal(err)
	}

	out := t.TempDir()
	if err := docs.Build(fsys, reg, out, "test", "/* css */", "// js"); err != nil {
		t.Fatal(err)
	}

	pages := []string{"index.html", "javascript.html", "tokens.html", "utilities.html"}
	for _, name := range reg.Names() {
		pages = append(pages, name+".html")
	}

	for _, page := range pages {
		data, err := os.ReadFile(filepath.Join(out, page))
		if err != nil {
			t.Errorf("%s was not generated", page)
			continue
		}
		html := string(data)
		if strings.Contains(html, "ZgotmplZ") {
			t.Errorf("%s contains a value html/template rejected (ZgotmplZ)", page)
		}
		if !strings.Contains(html, `href="`+page+`" aria-current="page"`) {
			t.Errorf("%s does not mark itself as the current page in the navigation", page)
		}
	}

	button, _ := os.ReadFile(filepath.Join(out, "button.html"))
	for _, want := range []string{"velle add button", "--btn-background", ".btn--primary", `class="btn btn--primary"`} {
		if !strings.Contains(string(button), want) {
			t.Errorf("button.html is missing %q", want)
		}
	}

	for _, asset := range []string{"assets/velle.css", "assets/velle.js", "assets/docs.css", "assets/docs.js", "assets/images/avatar.svg", "assets/images/landscape-1.svg", ".nojekyll"} {
		if _, err := os.Stat(filepath.Join(out, asset)); err != nil {
			t.Errorf("%s was not written", asset)
		}
	}
}
