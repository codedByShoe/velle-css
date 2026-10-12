package cli

import (
	"bytes"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	velle "github.com/codedbyshoe/velle-css"
)

func run(t *testing.T, dir string, args ...string) (int, string, string) {
	t.Helper()
	var stdout, stderr bytes.Buffer
	app := &App{FS: velle.Registry(), Dir: dir, Version: "test", Stdout: &stdout, Stderr: &stderr}
	code := app.Run(args)
	return code, stdout.String(), stderr.String()
}

func exists(t *testing.T, path string) bool {
	t.Helper()
	_, err := os.Stat(path)
	return err == nil
}

func TestInitCopiesCoreFiles(t *testing.T) {
	dir := t.TempDir()
	code, out, errOut := run(t, dir, "init")
	if code != 0 {
		t.Fatalf("init exited %d: %s", code, errOut)
	}

	for _, f := range []string{"velle.json", "assets/css/velle/reset.css", "assets/css/velle/variables.css", "assets/css/velle/tokens/colors.css", "assets/css/velle/base.css", "assets/css/velle/utilities.css"} {
		if !exists(t, filepath.Join(dir, f)) {
			t.Errorf("%s was not created", f)
		}
	}

	want, _ := fs.ReadFile(velle.Registry(), "core/reset.css")
	got, _ := os.ReadFile(filepath.Join(dir, "assets/css/velle/reset.css"))
	if !bytes.Equal(got, want) {
		t.Error("reset.css content differs from the registry")
	}
	if !strings.Contains(out, `<link rel="stylesheet" href="/assets/css/velle/main.css">`) || !strings.Contains(out, `<script type="module" src="/assets/js/velle/main.js"></script>`) {
		t.Errorf("init should print the entry tags, got:\n%s", out)
	}

	css, _ := os.ReadFile(filepath.Join(dir, "assets/css/velle/main.css"))
	wantCSS := `@import url("reset.css");
@import url("variables.css");
@import url("base.css");
@import url("utilities.css");`
	if !strings.Contains(string(css), wantCSS) {
		t.Errorf("main.css should import the core in load order, got:\n%s", css)
	}
	if !exists(t, filepath.Join(dir, "assets/js/velle/main.js")) {
		t.Error("main.js was not created")
	}
}

func TestInitWithCustomDirectories(t *testing.T) {
	dir := t.TempDir()
	if code, _, errOut := run(t, dir, "init", "--css-dir", "./static/css", "--js-dir", "static/js", "--images-dir", "static/img"); code != 0 {
		t.Fatalf("init exited %d: %s", code, errOut)
	}
	if !exists(t, filepath.Join(dir, "static/css/reset.css")) {
		t.Error("custom css dir was not used")
	}

	config, _ := os.ReadFile(filepath.Join(dir, "velle.json"))
	if !strings.Contains(string(config), `"cssDir": "static/css"`) {
		t.Errorf("velle.json should store the cleaned directory, got %s", config)
	}

	if code, _, _ := run(t, dir, "init", "--css-dir", "other"); code == 0 {
		t.Error("init with new directories should fail when velle.json exists")
	}
	if code, _, errOut := run(t, dir, "init"); code != 0 {
		t.Errorf("re-running init without flags should succeed: %s", errOut)
	}
}

func TestInitRejectsDirectoriesOutsideTheProject(t *testing.T) {
	for _, bad := range []string{"../css", "/etc/css"} {
		if code, _, _ := run(t, t.TempDir(), "init", "--css-dir", bad); code == 0 {
			t.Errorf("init --css-dir %s should fail", bad)
		}
	}
}

func TestAddRequiresInit(t *testing.T) {
	code, _, errOut := run(t, t.TempDir(), "add", "button")
	if code == 0 || !strings.Contains(errOut, "velle init") {
		t.Errorf("add without init should ask for init, got %d %q", code, errOut)
	}
}

func TestAddCopiesComponentsAndDependencies(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")

	code, out, errOut := run(t, dir, "add", "dropdown", "tabs", "upload_preview")
	if code != 0 {
		t.Fatalf("add exited %d: %s", code, errOut)
	}

	for _, f := range []string{
		"assets/css/velle/popover.css", "assets/js/velle/interest.js", // dropdown -> popover
		"assets/css/velle/menu.css", "assets/js/velle/menu.js", // dropdown -> menu
		"assets/css/velle/button.css", "assets/css/velle/icons.css", // menu -> button -> icons
		"assets/css/velle/tabs.css", "assets/js/velle/tabs.js",
		"assets/js/velle/velle.js", // runtime
		"assets/js/velle/upload_preview.js", "assets/images/velle/avatar.svg",
	} {
		if !exists(t, filepath.Join(dir, f)) {
			t.Errorf("%s was not created", f)
		}
	}

	if strings.Contains(out, "<script") || strings.Contains(out, "<link") {
		t.Errorf("with entries, add should not ask for tags, got:\n%s", out)
	}

	css, _ := os.ReadFile(filepath.Join(dir, "assets/css/velle/main.css"))
	want := `@import url("reset.css");
@import url("variables.css");
@import url("base.css");
@import url("avatar.css");
@import url("button.css");
@import url("icons.css");
@import url("menu.css");
@import url("popover.css");
@import url("tabs.css");
@import url("utilities.css");`
	if !strings.Contains(string(css), want) {
		t.Errorf("main.css should list components alphabetically between base and utilities, got:\n%s", css)
	}

	js, _ := os.ReadFile(filepath.Join(dir, "assets/js/velle/main.js"))
	for _, want := range []string{`import "./interest.js"`, `import "./menu.js"`, `import "./tabs.js"`, `import "./upload_preview.js"`} {
		if !strings.Contains(string(js), want) {
			t.Errorf("main.js is missing %s:\n%s", want, js)
		}
	}
}

func TestAddKeepsExistingFiles(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "add", "button")

	target := filepath.Join(dir, "assets/css/velle/button.css")
	if err := os.WriteFile(target, []byte("/* customized */"), 0o644); err != nil {
		t.Fatal(err)
	}

	_, out, _ := run(t, dir, "add", "button")
	if !strings.Contains(out, "skip") {
		t.Errorf("second add should skip the customized file, got:\n%s", out)
	}
	if !strings.Contains(out, "identical") {
		t.Errorf("second add should report unchanged files as identical, got:\n%s", out)
	}
	if got, _ := os.ReadFile(target); string(got) != "/* customized */" {
		t.Error("customized file was overwritten without --overwrite")
	}

	_, out, _ = run(t, dir, "add", "--overwrite", "button")
	if !strings.Contains(out, "overwrite") {
		t.Errorf("--overwrite should replace the file, got:\n%s", out)
	}
	if got, _ := os.ReadFile(target); string(got) == "/* customized */" {
		t.Error("--overwrite did not replace the file")
	}
}

func TestAddAll(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	if code, _, errOut := run(t, dir, "add", "--all"); code != 0 {
		t.Fatalf("add --all exited %d: %s", code, errOut)
	}
	if !exists(t, filepath.Join(dir, "assets/js/velle/confirm.js")) {
		t.Error("add --all did not copy confirm.js")
	}
	if code, _, _ := run(t, dir, "add", "--all", "button"); code == 0 {
		t.Error("--all with names should fail")
	}
}

func TestAddErrors(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")

	if code, _, errOut := run(t, dir, "add", "nope"); code == 0 || !strings.Contains(errOut, "unknown component") {
		t.Errorf("unknown component: got %d %q", code, errOut)
	}
	if code, _, _ := run(t, dir, "add"); code == 0 {
		t.Error("add without names should fail")
	}
	if exists(t, filepath.Join(dir, "assets/js/velle/velle.js")) {
		t.Error("failed adds should not write files")
	}
}

func TestList(t *testing.T) {
	code, out, _ := run(t, t.TempDir(), "list")
	if code != 0 {
		t.Fatalf("list exited %d", code)
	}
	for _, want := range []string{"Elements", "button", "Overlays", "dialog", "chart", "(needs chart.js)"} {
		if !strings.Contains(out, want) {
			t.Errorf("list output is missing %q", want)
		}
	}
}

func TestVersionAndUnknownCommand(t *testing.T) {
	if _, out, _ := run(t, t.TempDir(), "version"); out != "velle test\n" {
		t.Errorf("version printed %q", out)
	}
	if code, _, _ := run(t, t.TempDir(), "frobnicate"); code != 2 {
		t.Errorf("unknown command should exit 2, got %d", code)
	}
	if code, _, _ := run(t, t.TempDir(), "add", "--help"); code != 0 {
		t.Errorf("--help should exit 0, got %d", code)
	}
}

func TestAddAvatarInstallsPlaceholder(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "add", "avatar")
	if !exists(t, filepath.Join(dir, "assets/images/velle/avatar.svg")) {
		t.Error("velle add avatar should install the avatar.svg placeholder")
	}
}

func TestEntryKeepsUserContentAndIsIdempotent(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")

	entry := filepath.Join(dir, "assets/css/velle/main.css")
	original, _ := os.ReadFile(entry)
	custom := string(original) + "\n.my-class { color: red; }\n"
	if err := os.WriteFile(entry, []byte(custom), 0o644); err != nil {
		t.Fatal(err)
	}

	run(t, dir, "add", "button")
	first, _ := os.ReadFile(entry)
	if !strings.Contains(string(first), ".my-class { color: red; }") {
		t.Errorf("user CSS after the block was lost:\n%s", first)
	}
	if strings.Index(string(first), `button.css`) > strings.Index(string(first), `utilities.css`) {
		t.Errorf("button.css must be imported before utilities.css:\n%s", first)
	}

	_, out, _ := run(t, dir, "add", "button")
	second, _ := os.ReadFile(entry)
	if string(second) != string(first) {
		t.Errorf("adding the same component twice changed the entry:\n%s\n---\n%s", first, second)
	}
	if !strings.Contains(out, "identical  assets/css/velle/main.css") {
		t.Errorf("unchanged entries should be reported as identical, got:\n%s", out)
	}
}

func TestEntryWarnsAboutRulesBeforeTheBlock(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	entry := filepath.Join(dir, "assets/css/velle/main.css")
	original, _ := os.ReadFile(entry)
	if err := os.WriteFile(entry, append([]byte("body { margin: 0; }\n"), original...), 0o644); err != nil {
		t.Fatal(err)
	}
	_, _, errOut := run(t, dir, "add", "button")
	if !strings.Contains(errOut, "@import only works before other rules") {
		t.Errorf("expected a warning about rules before the block, got %q", errOut)
	}
}

func TestCustomEntryPaths(t *testing.T) {
	dir := t.TempDir()
	if code, _, errOut := run(t, dir, "init", "--css-entry", "app/styles.css", "--js-entry", "app/app.js"); code != 0 {
		t.Fatalf("init exited %d: %s", code, errOut)
	}
	run(t, dir, "add", "tabs")

	css, _ := os.ReadFile(filepath.Join(dir, "app/styles.css"))
	if !strings.Contains(string(css), `@import url("../assets/css/velle/tabs.css");`) {
		t.Errorf("imports should be relative to the entry, got:\n%s", css)
	}
	js, _ := os.ReadFile(filepath.Join(dir, "app/app.js"))
	if !strings.Contains(string(js), `import "../assets/js/velle/tabs.js"`) {
		t.Errorf("imports should be relative to the entry, got:\n%s", js)
	}

	if code, _, _ := run(t, t.TempDir(), "init", "--css-entry", "styles.scss"); code == 0 {
		t.Error("a non-.css entry should be rejected")
	}
}

func TestEntriesTurnedOff(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init", "--css-entry", "none", "--js-entry", "none")
	_, out, _ := run(t, dir, "add", "tabs")

	if exists(t, filepath.Join(dir, "assets/css/velle/main.css")) || exists(t, filepath.Join(dir, "assets/js/velle/main.js")) {
		t.Error("entries that are turned off should not be created")
	}
	if !strings.Contains(out, `<link rel="stylesheet" href="/assets/css/velle/tabs.css">`) || !strings.Contains(out, `<script type="module" src="/assets/js/velle/tabs.js"></script>`) {
		t.Errorf("without entries, add should print the tags, got:\n%s", out)
	}
}

func TestOlderConfigGetsDefaultEntries(t *testing.T) {
	dir := t.TempDir()
	config := `{ "cssDir": "assets/css/velle", "jsDir": "assets/js/velle", "imagesDir": "assets/images/velle" }`
	if err := os.WriteFile(filepath.Join(dir, "velle.json"), []byte(config), 0o644); err != nil {
		t.Fatal(err)
	}
	run(t, dir, "add", "tabs")
	if !exists(t, filepath.Join(dir, "assets/css/velle/main.css")) || !exists(t, filepath.Join(dir, "assets/js/velle/main.js")) {
		t.Error("a velle.json without entry keys should use the default entries")
	}
}
