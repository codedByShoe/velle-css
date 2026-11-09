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
		"assets/js/velle/velle.js", "assets/js/velle/velle.d.ts", // runtime and its types
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

func TestAddWarnsAboutAnOlderRuntime(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "add", "tabs")
	runtime := filepath.Join(dir, "assets/js/velle/velle.js")

	if _, _, errOut := run(t, dir, "add", "tabs"); strings.Contains(errOut, "warning") {
		t.Errorf("a current runtime should not warn, got %q", errOut)
	}

	older := "export function define() {}\nexport class Controller {}\n"
	if err := os.WriteFile(runtime, []byte(older), 0o644); err != nil {
		t.Fatal(err)
	}

	_, _, errOut := run(t, dir, "add", "tabs")
	if !strings.Contains(errOut, "does not export") || !strings.Contains(errOut, "controllerFor") {
		t.Errorf("expected a warning naming the missing exports, got %q", errOut)
	}
	if got, _ := os.ReadFile(runtime); string(got) != older {
		t.Error("the warning must not replace the runtime")
	}

	if _, _, errOut := run(t, dir, "add", "--overwrite", "tabs"); strings.Contains(errOut, "warning") {
		t.Errorf("--overwrite should replace the runtime without warning, got %q", errOut)
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

func TestNewControllerRequiresInit(t *testing.T) {
	code, _, errOut := run(t, t.TempDir(), "new", "controller", "cart")
	if code == 0 || !strings.Contains(errOut, "velle init") {
		t.Errorf("new without init should ask for init, got %d %q", code, errOut)
	}
}

func TestNewControllerWritesFileAndRuntime(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")

	code, _, errOut := run(t, dir, "new", "controller", "cart")
	if code != 0 {
		t.Fatalf("new exited %d: %s", code, errOut)
	}

	got, _ := os.ReadFile(filepath.Join(dir, "assets/js/velle/cart.js"))
	want := `// @ts-check
import { define, controller } from "./velle.js"

define("cart", class extends controller({
  targets: {},
  values: {},
}) {
  connect() {}
})
`
	if string(got) != want {
		t.Errorf("unexpected controller file:\n%s", got)
	}

	// velle init does not install the runtime, and the controller imports it.
	for _, f := range []string{"assets/js/velle/velle.js", "assets/js/velle/velle.d.ts"} {
		if !exists(t, filepath.Join(dir, f)) {
			t.Errorf("%s was not created", f)
		}
	}
}

func TestNewControllerImportsAfterTheManagedBlock(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "add", "tabs")
	entry := filepath.Join(dir, "assets/js/velle/main.js")

	run(t, dir, "new", "controller", "cart")
	first, _ := os.ReadFile(entry)
	end := strings.Index(string(first), "velle:end")
	imported := strings.Index(string(first), `import "./cart.js"`)
	if end < 0 || imported < end {
		t.Fatalf("the import belongs after velle:end:\n%s", first)
	}

	run(t, dir, "new", "controller", "cart")
	second, _ := os.ReadFile(entry)
	if string(second) != string(first) {
		t.Errorf("creating the same controller twice changed the entry:\n%s", second)
	}

	run(t, dir, "add", "dialog")
	third, _ := os.ReadFile(entry)
	if strings.Count(string(third), `import "./cart.js"`) != 1 || strings.Index(string(third), `import "./cart.js"`) < strings.Index(string(third), "velle:end") {
		t.Errorf("velle add should leave the user's import alone:\n%s", third)
	}
}

func TestNewControllerKeepsExistingFiles(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "new", "controller", "cart")

	target := filepath.Join(dir, "assets/js/velle/cart.js")
	if err := os.WriteFile(target, []byte("// customized"), 0o644); err != nil {
		t.Fatal(err)
	}

	_, out, _ := run(t, dir, "new", "controller", "cart")
	if !strings.Contains(out, "skip") {
		t.Errorf("a second new should skip the customized file, got:\n%s", out)
	}
	if got, _ := os.ReadFile(target); string(got) != "// customized" {
		t.Error("customized file was overwritten without --overwrite")
	}

	for _, args := range [][]string{{"new", "--overwrite", "controller", "cart"}, {"new", "controller", "cart", "--overwrite"}} {
		if err := os.WriteFile(target, []byte("// customized"), 0o644); err != nil {
			t.Fatal(err)
		}
		if code, _, errOut := run(t, dir, args...); code != 0 {
			t.Fatalf("%v exited %d: %s", args, code, errOut)
		}
		if got, _ := os.ReadFile(target); string(got) == "// customized" {
			t.Errorf("%v did not replace the file", args)
		}
	}
}

func TestNewControllerOverwriteLeavesTheRuntimeAlone(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "new", "controller", "cart")

	runtime := filepath.Join(dir, "assets/js/velle/velle.js")
	original, _ := os.ReadFile(runtime)
	customized := append([]byte("// customized\n"), original...)
	if err := os.WriteFile(runtime, customized, 0o644); err != nil {
		t.Fatal(err)
	}

	run(t, dir, "new", "controller", "--overwrite", "cart")
	if got, _ := os.ReadFile(runtime); string(got) != string(customized) {
		t.Error("--overwrite must only apply to the controller file")
	}
}

func TestNewControllerWritesJSConfigOnce(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "new", "controller", "cart")

	target := filepath.Join(dir, "jsconfig.json")
	got, _ := os.ReadFile(target)
	for _, want := range []string{`"checkJs": true`, `"strict": true`, `"module": "esnext"`, `"target": "es2022"`, `"moduleResolution": "bundler"`} {
		if !strings.Contains(string(got), want) {
			t.Errorf("jsconfig.json is missing %s:\n%s", want, got)
		}
	}

	if err := os.WriteFile(target, []byte("{}"), 0o644); err != nil {
		t.Fatal(err)
	}
	run(t, dir, "new", "controller", "--overwrite", "other")
	if got, _ := os.ReadFile(target); string(got) != "{}" {
		t.Error("an existing jsconfig.json must never be replaced")
	}
}

func TestNewControllerNames(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")

	for _, args := range [][]string{
		{"new"},
		{"new", "controller"},
		{"new", "widget", "cart"},
		{"new", "controller", "a", "b"},
		{"new", "controller", "../evil"},
		{"new", "controller", "Cart"},
		{"new", "controller", "velle"},          // the runtime
		{"new", "controller", "main"},           // the entry
		{"new", "controller", "tabs"},           // a shipped component
		{"new", "controller", "local-time"},     // shipped as local_time.js
		{"new", "controller", "confirm-dialog"}, // defined by confirm.js
	} {
		if code, _, _ := run(t, dir, args...); code == 0 {
			t.Errorf("%v should fail", args)
		}
	}
	if exists(t, filepath.Join(dir, "assets/js/velle/velle.js")) {
		t.Error("rejected names should not write files")
	}

	if code, _, errOut := run(t, dir, "new", "controller", "shopping_cart"); code != 0 {
		t.Fatalf("new exited %d: %s", code, errOut)
	}
	got, _ := os.ReadFile(filepath.Join(dir, "assets/js/velle/shopping_cart.js"))
	if !strings.Contains(string(got), `define("shopping-cart"`) {
		t.Errorf("attribute names use dashes, got:\n%s", got)
	}
}

func TestNewControllerWithCustomEntry(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init", "--js-entry", "app/app.js")
	run(t, dir, "new", "controller", "cart")

	js, _ := os.ReadFile(filepath.Join(dir, "app/app.js"))
	if !strings.Contains(string(js), `import "../assets/js/velle/cart.js"`) {
		t.Errorf("imports should be relative to the entry, got:\n%s", js)
	}
}

func TestNewControllerWithEntriesTurnedOff(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init", "--js-entry", "none")
	_, out, _ := run(t, dir, "new", "controller", "cart")

	if exists(t, filepath.Join(dir, "assets/js/velle/main.js")) {
		t.Error("an entry that is turned off should not be created")
	}
	if !strings.Contains(out, `<script type="module" src="/assets/js/velle/cart.js"></script>`) {
		t.Errorf("without an entry, new should print the tag, got:\n%s", out)
	}
}

func TestNewControllerRestoresAMissingBlock(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	entry := filepath.Join(dir, "assets/js/velle/main.js")
	if err := os.WriteFile(entry, []byte("console.log(1)"), 0o644); err != nil {
		t.Fatal(err)
	}

	run(t, dir, "new", "controller", "cart")

	got, _ := os.ReadFile(entry)
	if !strings.Contains(string(got), "console.log(1)") || strings.Index(string(got), `import "./cart.js"`) < strings.Index(string(got), "velle:end") {
		t.Errorf("unexpected entry:\n%s", got)
	}
}

func TestInitHeadlessInstallsNoStyles(t *testing.T) {
	dir := t.TempDir()
	code, out, errOut := run(t, dir, "init", "--js")
	if code != 0 {
		t.Fatalf("init exited %d: %s", code, errOut)
	}
	if exists(t, filepath.Join(dir, "assets/css")) {
		t.Error("a headless init must not create a CSS directory")
	}
	if !exists(t, filepath.Join(dir, "assets/js/velle/main.js")) {
		t.Error("a headless init should create main.js")
	}
	if strings.Contains(out, "stylesheet") {
		t.Errorf("a headless init should not mention stylesheets:\n%s", out)
	}
}

func TestInitHeadlessRejectsStyleFlags(t *testing.T) {
	for _, flag := range []string{"--css-dir=x", "--css-entry=x.css", "--images-dir=x"} {
		if code, _, errOut := run(t, t.TempDir(), "init", "--js", flag); code == 0 || !strings.Contains(errOut, "headless") {
			t.Errorf("%s: exited %d, stderr %q", flag, code, errOut)
		}
	}
}

func TestInitCannotMakeAnExistingProjectHeadless(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	if code, _, _ := run(t, dir, "init", "--js"); code == 0 {
		t.Error("init --js should fail once velle.json exists")
	}
}

func TestAddHeadlessCopiesOnlyJavaScript(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init", "--js")
	code, out, errOut := run(t, dir, "add", "tabs", "button", "resizable", "avatar")
	if code != 0 {
		t.Fatalf("add exited %d: %s", code, errOut)
	}
	for _, file := range []string{"tabs.js", "resizable.js", "velle.js", "velle.d.ts"} {
		if !exists(t, filepath.Join(dir, "assets/js/velle", file)) {
			t.Errorf("%s was not installed", file)
		}
	}
	if exists(t, filepath.Join(dir, "assets/css")) || exists(t, filepath.Join(dir, "assets/images")) {
		t.Error("a headless add must not install styles or images")
	}
	if !strings.Contains(out, "button (styles only") {
		t.Errorf("add should say that button has nothing to install:\n%s", out)
	}
	if !strings.Contains(out, "resizable: ") {
		t.Errorf("add should say what resizable expects from the project's CSS:\n%s", out)
	}
	entry, err := os.ReadFile(filepath.Join(dir, "assets/js/velle/main.js"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(entry), "tabs.js") {
		t.Errorf("main.js should import tabs.js:\n%s", entry)
	}
}

func TestAddHeadlessAdapterDoesNotMentionItsStylesheet(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init", "--js")
	_, out, _ := run(t, dir, "add", "datepicker")
	if strings.Contains(out, "datepicker.css") {
		t.Errorf("a headless project has no datepicker.css:\n%s", out)
	}
	if !strings.Contains(out, "flatpickr.min.css") {
		t.Errorf("the library's own stylesheet is still needed:\n%s", out)
	}
}

func TestNewControllerInAHeadlessProject(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init", "--js")
	if code, _, errOut := run(t, dir, "new", "controller", "cart"); code != 0 {
		t.Fatalf("new controller exited %d: %s", code, errOut)
	}
	if !exists(t, filepath.Join(dir, "assets/js/velle/velle.js")) || exists(t, filepath.Join(dir, "assets/css")) {
		t.Error("expected the runtime and no styles")
	}
}

func TestExtensionsAreOnlyInstalledByName(t *testing.T) {
	dir := t.TempDir()
	run(t, dir, "init")
	run(t, dir, "add", "--all")
	if exists(t, filepath.Join(dir, "assets/js/velle/htmx.js")) {
		t.Error("add --all must not install extensions")
	}
	if code, _, errOut := run(t, dir, "add", "htmx"); code != 0 {
		t.Fatalf("add htmx exited %d: %s", code, errOut)
	}
	if !exists(t, filepath.Join(dir, "assets/js/velle/htmx.js")) {
		t.Error("add htmx did not install the extension")
	}
	if _, out, _ := run(t, dir, "list"); !strings.Contains(out, "Extensions") || !strings.Contains(out, "htmx") {
		t.Errorf("list should show extensions:\n%s", out)
	}
}
