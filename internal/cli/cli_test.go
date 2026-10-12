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
	if !strings.Contains(out, `<link rel="stylesheet" href="/assets/css/velle/reset.css">`) {
		t.Errorf("init should print the link tags, got:\n%s", out)
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

	if !strings.Contains(out, `<script type="module" src="/assets/js/velle/tabs.js"></script>`) {
		t.Errorf("add should print script tags, got:\n%s", out)
	}
	if !(strings.Index(out, "button.css\">") < strings.Index(out, "icons.css\">") && strings.Index(out, "icons.css\">") < strings.Index(out, "menu.css\">")) {
		t.Errorf("stylesheets should be listed alphabetically:\n%s", out)
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

	if code, _, errOut := run(t, dir, "add", "lexxy"); code == 0 || !strings.Contains(errOut, "not available yet") {
		t.Errorf("deferred component: got %d %q", code, errOut)
	}
	if code, _, errOut := run(t, dir, "add", "sound"); code == 0 || !strings.Contains(errOut, "removed") {
		t.Errorf("removed component: got %d %q", code, errOut)
	}
	if code, _, errOut := run(t, dir, "add", "nope"); code == 0 || !strings.Contains(errOut, "unknown component") {
		t.Errorf("unknown component: got %d %q", code, errOut)
	}
	if code, _, _ := run(t, dir, "add"); code == 0 {
		t.Error("add without names should fail")
	}
	if exists(t, filepath.Join(dir, "assets/js")) {
		t.Error("failed adds should not write files")
	}
}

func TestList(t *testing.T) {
	code, out, _ := run(t, t.TempDir(), "list")
	if code != 0 {
		t.Fatalf("list exited %d", code)
	}
	for _, want := range []string{"Elements", "button", "Overlays", "dialog", "Not available yet", "lexxy", "Removed from css-zero", "sound", "chart", "(needs chart.js)"} {
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
