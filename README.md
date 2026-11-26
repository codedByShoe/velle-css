# velle-css

Language and framework agnostic CSS components. Plain CSS with design tokens and utilities, a small dependency-free JavaScript runtime for interactive pieces, and a .NET tool that copies selected assets into your project.

**Documentation:** https://codedbyshoe.github.io/velle-css/ (built and published by the GitHub Pages workflow). To browse it locally, run `dotnet run --project src/Velle.Docs` and open `docs/index.html`. For AI assistants, the docs also publish [llms.txt](https://codedbyshoe.github.io/velle-css/llms.txt) (an index of Markdown pages) and [llms-full.txt](https://codedbyshoe.github.io/velle-css/llms-full.txt) (everything in one file).

## Blazor prototype

`Velle.Blazor` provides `VelleDialog` and `VelleTabs` for .NET 10 Blazor Web Apps using static SSR. From the repository root, run `dotnet run --project samples/Velle.Blazor.Sample`, open the URL printed in the terminal, and select **Dialog and Tabs**. The Settings tab contains a form that posts with enhanced navigation and displays server validation inside the dialog.

The repository uses the .NET 10 SDK from `.dotnet/` when available, with an installed .NET 10 SDK as the fallback. To set up a fresh checkout, use [Microsoft’s .NET install script](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-install-script) with `--channel 10.0 --install-dir .dotnet` on macOS or Linux, or `-Channel 10.0 -InstallDir .dotnet` on Windows. You can invoke the local SDK directly with `./.dotnet/dotnet` or `.\.dotnet\dotnet.exe`.

To try a package install, run `dotnet pack src/Velle.Blazor -o /tmp/velle-packages`. Add `Velle.Blazor` version `0.1.0-alpha.1` to a Blazor Web App using that directory as a local NuGet source. Import `Velle.Blazor` in `_Imports.razor` and add the stylesheet in `App.razor`:

```razor
<link rel="stylesheet" href="@Assets["_content/Velle.Blazor/velle.css"]" />
```

The app's Blazor script loads the library initializer, which starts the bundled Alpine.js CSP build. Give each dialog and tab group a unique `Id`. The [sample page](samples/Velle.Blazor.Sample/Components/Pages/Prototype.razor) shows how to supply the tab content and use the dialog's `Open` parameter to reopen it after server validation.

### Blazor Datepicker

Open **Datepicker** in the sample to try an enhanced form that binds the selected date to a server-side `DateOnly`. Add these styles after `velle.css` in a consuming app:

```razor
<link rel="stylesheet" href="@Assets["_content/Velle.Blazor/vendor/flatpickr-4.6.13.min.css"]" />
<link rel="stylesheet" href="@Assets["_content/Velle.Blazor/datepicker.css"]" />
```

Use `VelleDatepicker` with a unique `Id`, a `Label`, and the form property's `Name` (such as `Input.Date`). Set `Value` to the submitted format, which is `yyyy-MM-dd` for dates, `yyyy-MM-dd HH:mm` for `Type="datetime"`, and `HH:mm` for `Type="time"`. The calendar modes `range` and `multiple` submit a single string of dates separated by ` to ` and `, ` respectively. The package loads Flatpickr locally when the component mounts. See the [Datepicker sample](samples/Velle.Blazor.Sample/Components/Pages/Datepicker.razor).

Run the browser checks with `npm ci`, `npx playwright install chromium --only-shell`, and `npm run test:blazor`.

## Install the .NET tool

From this checkout, build the `Velle.Tool` package for a local NuGet feed.

```sh
dotnet pack src/Velle.Tool -c Release -o bin/nuget
```

From the consuming project directory, create a tool manifest if the repository doesn't already have one. Use the absolute path to the feed you just built.

```sh
dotnet new tool-manifest
dotnet tool install Velle.Tool --version 0.3.1 --source /path/to/velle-css/bin/nuget
dotnet tool run velle init
dotnet tool run velle add button dialog
```

Commit the tool manifest so teammates can restore it with `dotnet tool restore --add-source /path/to/velle-css/bin/nuget`. If you use the checkout's local .NET 10 SDK, put its `.dotnet` directory on your PATH before running the tool in another repository.

### CLI overview

```sh
velle init                # writes velle.json, copies core styles, and creates main.css and main.js
velle add button dialog   # copies components and their dependencies, and imports them
velle add --all           # installs every component
velle new controller cart # creates and imports a controller
velle list                # lists available components
velle version             # shows the tool version
```

Prefix these commands with `dotnet tool run` when using the local tool. Use `--` after `velle` to forward options such as `--help`, as in `dotnet tool run velle -- add --help`. The tool installs the registry's CSS and `velle.js` behaviors. The `Velle.Blazor` NuGet package above provides the Razor components and their Alpine.js behaviors.

To use only the JavaScript, run `velle init --js`. `velle add` then copies each behavior without its styles and prints what it expects from your CSS. Without the CLI, `dist/js/velle.js` is the runtime alone and `dist/velle.js` is the runtime with every behavior.

`velle init` uses `wwwroot/velle/css`, `wwwroot/velle/js`, and `wwwroot/velle/images` in a Blazor or ASP.NET Core project. Run it from the project directory, including when the tool manifest is at the solution root. For other directories, the defaults are `assets/css/velle`, `assets/js/velle`, and `assets/images/velle`. Existing `velle.json` files keep their paths. Set new paths with `--css-dir`, `--js-dir`, and `--images-dir`, or edit `velle.json`. `velle add` preserves modified files unless you pass `--overwrite`.

Use the tags printed by `velle init`. A new Blazor project's layout uses the following URLs.

```html
<link rel="stylesheet" href="/velle/css/main.css">
<script type="module" src="/velle/js/main.js"></script>
```

`main.css` and `main.js` are entry files the CLI maintains: each `velle add` adds imports to a block between `velle:begin` and `velle:end` and keeps it in load order (reset, tokens, base, components alphabetically, utilities). Anything you add after `velle:end` is yours. Point `cssEntry`/`jsEntry` in `velle.json` at other files, or set them to `""` to manage the tags yourself.

When upgrading a project that previously ran `velle add htmx`, remove its `htmx.js` import or script tag and delete the copied Velle module.

### From GitHub

Use the bundles from a release through jsDelivr:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v0.3.1/dist/velle.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v0.3.1/dist/velle.js"></script>
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

Interactive components use data attributes (`data-tabs`, `data-tabs-target="button"`, `data-tabs-action="select"`) handled by `velle.js`, a runtime of under 400 lines with no dependencies. It picks up server-rendered markup and markup added by a client framework. The accompanying `velle.d.ts` file gives you checked targets and values in plain JavaScript with `// @ts-check`. See the JavaScript page in the docs.

## Adapters

`chart`, `datepicker`, `editor`, `inputmask` and `sortable` wrap Chart.js, flatpickr, Tiptap, maska and SortableJS. velle ships the adapter (controller and theme) but not the library: install it with npm or map it in an import map; `velle add` and each docs page show how. Adapters are left out of `dist/velle.js`/`dist/velle.css`; with the bundles, load them from `dist/adapters/`.

## Development

```text
registry/                  source of truth, embedded into the CLI
  core/                    reset, tokens, base, utilities
  js/velle.js              shared JavaScript runtime
  js/velle.d.ts            its type declarations
  components/<name>/       CSS/JS, component.json (metadata) and examples/*.html
src/Velle.Tool             the C# CLI packaged as a .NET tool
src/Velle.Docs             the C# generator for dist/ and docs/
  Assets/                  static documentation assets
  Templates/               HTML and Markdown templates
src/Shared                 registry loader used by the C# CLI and generator
dist/                      generated; committed (the CDN serves it)
docs/                      generated; not committed (built by the Pages workflow)
```

After changing anything in `registry/`:

```sh
dotnet run --project src/Velle.Docs  # rebuild dist/ and docs/
npm test                            # validates metadata, examples, and browser behavior
npm run typecheck
npm run test:docs                    # verifies the full dist tree and generated docs
npm run test:tool                    # packs and restores the .NET tool
```

Use `dotnet run --project src/Velle.Docs -- --root /path/to/output` to generate both directories elsewhere.

### Prepare a release

Set `Version` in `src/VelleVersion.props` for the generator and CLI and update the README's versioned examples to match. Regenerate the distribution and commit `dist/` with the version changes.

```sh
dotnet run --project src/Velle.Docs -c Release
```

Before the first publish, create the `nuget` environment in GitHub and add the `NUGET_USER` environment secret with your NuGet.org profile name. Create a [NuGet Trusted Publishing policy](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing) for owner `codedbyshoe`, repository `velle-css`, workflow `release.yml`, and environment `nuget`. Give the policy permission to publish `Velle.Tool`.

Tag the release commit `vX.Y.Z`, matching the package version, and push the tag. The release workflow runs the test suites, verifies the bundles, and publishes `Velle.Tool` to NuGet.org. GitHub Pages builds the site from `main`.

## Credit
- [css-zero](https://github.com/lazaronixon/css-zero), this project is basically a language agnostic port of css-zero which is a rails specific project.
- [Lucide](https://lucide.dev), This project contains Lucide icons

## License

MIT. See [LICENSE](LICENSE). Includes work from css-zero © 2024 Nixon (MIT) and icons from [Lucide](https://lucide.dev) (ISC).
