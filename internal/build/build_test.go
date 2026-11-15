package build_test

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	velle "github.com/codedbyshoe/velle-css"
	"github.com/codedbyshoe/velle-css/internal/build"
	"github.com/codedbyshoe/velle-css/internal/registry"
)

func TestBundles(t *testing.T) {
	fsys := velle.Registry()
	reg, err := registry.Load(fsys)
	if err != nil {
		t.Fatal(err)
	}

	css, err := build.CSS(fsys, reg, "test")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(css, "@import") {
		t.Error("the CSS bundle must inline the tokens instead of importing them")
	}
	order := []string{"core/reset.css", "core/tokens/colors.css", "core/base.css", "components/avatar/avatar.css", "components/button/button.css", "core/utilities.css"}
	last := -1
	for _, file := range order {
		i := strings.Index(css, "/* "+file+" */")
		if i <= last {
			t.Errorf("%s is missing or out of order in the CSS bundle", file)
		}
		last = i
	}

	js, err := build.JS(fsys, reg, "test")
	if err != nil {
		t.Fatal(err)
	}
	if n := strings.Count(js, `from "@hotwired/stimulus"`); n != 1 {
		t.Errorf("the JS bundle should import Stimulus once, got %d imports", n)
	}
	if !strings.Contains(js, "export const application = Application.start()") {
		t.Error("the JS bundle should start and export the application")
	}
	for _, f := range build.ComponentFiles(reg, registry.KindJS) {
		identifier, _ := registry.Identifier(f)
		if !strings.Contains(js, "// "+f+"\n{") || !strings.Contains(js, `application.register("`+identifier+`", controller)`) {
			t.Errorf("%s is missing from the JS bundle", f)
		}
	}
	if strings.Contains(js, "export default") {
		t.Error("the JS bundle must register its controllers, not export them")
	}
}

// TestCommittedDistIsCurrent fails when dist/ was not regenerated after a registry change.
// Run `go run ./cmd/docsgen` to fix it.
func TestCommittedDistIsCurrent(t *testing.T) {
	fsys := velle.Registry()
	reg, err := registry.Load(fsys)
	if err != nil {
		t.Fatal(err)
	}

	out := t.TempDir()
	if err := build.Dist(fsys, reg, out, velle.Version); err != nil {
		t.Fatal(err)
	}

	committed := filepath.Join("..", "..", "dist")
	err = filepath.WalkDir(out, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		rel, _ := filepath.Rel(out, p)
		want, _ := os.ReadFile(p)
		got, err := os.ReadFile(filepath.Join(committed, rel))
		if err != nil || string(got) != string(want) {
			t.Errorf("dist/%s is out of date; run `go run ./cmd/docsgen`", filepath.ToSlash(rel))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDistShipsExtensionsOutsideTheBundle(t *testing.T) {
	fsys := velle.Registry()
	reg, err := registry.Load(fsys)
	if err != nil {
		t.Fatal(err)
	}
	out := t.TempDir()
	if err := build.Dist(fsys, reg, out, "test"); err != nil {
		t.Fatal(err)
	}

	bundle, err := os.ReadFile(filepath.Join(out, "velle.js"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(bundle), "extensions/htmx/htmx.js") || strings.Contains(string(bundle), "htmx:beforeHistorySave") {
		t.Error("the JS bundle must leave extensions out")
	}

	// One copy for each application, so an extension never starts a second one.
	for file, want := range map[string]string{"extensions/htmx.js": `from "../velle.js"`, "js/htmx.js": `from "./application.js"`} {
		data, err := os.ReadFile(filepath.Join(out, filepath.FromSlash(file)))
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(data), want) {
			t.Errorf("%s should import the runtime with %s", file, want)
		}
	}
}
