# velle-css

Language and framework agnostic CSS components. Plain CSS with design tokens and utilities, a small dependency-free JavaScript runtime for the interactive pieces, and a Go CLI that copies only what you use into your project.

**Documentation:** https://codedbyshoe.github.io/velle-css/ (built and published by the GitHub Pages workflow). To browse it locally, run `go run ./cmd/docsgen` and open `docs/index.html`.

## Install

### With the CLI

```sh
go install github.com/codedbyshoe/velle-css/cmd/velle@latest

velle init                # writes velle.json, copies the core styles, creates main.css and main.js
velle add button dialog   # copies components plus everything they depend on, and imports them
velle add --all           # or every component
velle list                # what is available
```

`velle init` uses `assets/css/velle`, `assets/js/velle` and `assets/images/velle`. Change them with `--css-dir`, `--js-dir` and `--images-dir`, or edit `velle.json`. `velle add` never replaces a file you changed unless you pass `--overwrite`.

Your layout only needs two tags:

```html
<link rel="stylesheet" href="/assets/css/velle/main.css">
<script type="module" src="/assets/js/velle/main.js"></script>
```

`main.css` and `main.js` are entry files the CLI maintains: each `velle add` adds imports to a block between `velle:begin` and `velle:end` and keeps it in load order (reset, tokens, base, components alphabetically, utilities). Anything you add after `velle:end` is yours. Point `cssEntry`/`jsEntry` in `velle.json` at other files, or set them to `""` to manage the tags yourself.

### From GitHub

Use the bundles from a release through jsDelivr:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v0.1.0/dist/velle.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v0.1.0/dist/velle.js"></script>
```

Or copy individual files from `dist/css`, `dist/js` and `dist/images`. They are the same files the CLI installs.

## Use

The entry files handle load order. If you load files yourself, use this order: `reset.css`, `variables.css`, `base.css`, the component stylesheets **in alphabetical order** (a few rules rely on it), then `utilities.css`. Load each behavior you use as a module, e.g. `<script type="module" src="/assets/js/velle/dialog.js">`.

```html
<button type="button" class="btn btn--primary" commandfor="welcome" command="show-modal">Open</button>

<dialog id="welcome" class="dialog" data-dialog data-dialog-action="click->closeOnClickOutside">
  <div class="dialog__content">Hello!</div>
</dialog>
```

Interactive components use data attributes (`data-tabs`, `data-tabs-target="button"`, `data-tabs-action="select"`) handled by `velle.js`, a ~300-line runtime with no dependencies. It picks up markup added at any time, so it works with server-rendered pages, htmx, or markup from a client framework. See the JavaScript page in the docs.

## Adapters

`chart`, `datepicker`, `inputmask` and `sortable` wrap Chart.js, flatpickr, maska and SortableJS. velle ships the adapter (controller and theme) but not the library: install it with npm or map it in an import map; `velle add` and each docs page show how. Adapters are left out of `dist/velle.js`/`dist/velle.css`; with the bundles, load them from `dist/adapters/`.

## Development

```text
registry/                  source of truth, embedded into the CLI
  core/                    reset, tokens, base, utilities
  js/velle.js              shared JavaScript runtime
  components/<name>/       CSS/JS, component.json (metadata) and examples/*.html
cmd/velle                  the CLI
cmd/docsgen                builds dist/ and docs/
internal/                  registry loader, CLI, bundler, docs generator
dist/                      generated; committed (the CDN serves it)
docs/                      generated; not committed (built by the Pages workflow)
```

After changing anything in `registry/`:

```sh
go run ./cmd/docsgen   # rebuild dist/ and docs/
go test ./...          # validates metadata, examples, bundles and the CLI
```

The tests check that every documented class and CSS variable exists, that every class used in an example is defined, that example actions are valid, that no Hotwire/Rails leftovers remain, and that the committed `dist/` is current.

To release, bump `Version` in `embed.go`, rebuild, commit and tag `vX.Y.Z`.

## Credit
- [css-zero](https://github.com/lazaronixon/css-zero), this project is basically a language agnostic port of css-zero which is a rails specific project.
- [Lucide](https://lucide.dev), This project contains Lucide icons

## License

MIT. See [LICENSE](LICENSE). Includes work from css-zero © 2024 Nixon (MIT) and icons from [Lucide](https://lucide.dev) (ISC).
