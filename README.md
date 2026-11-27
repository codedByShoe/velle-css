# Velle.Blazor

A **Blazor Static SSR** component library built on plain CSS design tokens and [Alpine.js (CSP build)](https://alpinejs.dev/advanced/csp) for lightweight client-side interactivity — no Blazor Server SignalR circuit or WebAssembly runtime required.

> **Status:** Active transition. This repository is migrating from its original framework-agnostic CSS/JS toolkit (`velle-css`) into the `Velle.Blazor` Razor Class Library. Core CSS tokens and stylesheets are still generated from `registry/` into `dist/` while components are ported to Razor components.

---

## How It Works

`Velle.Blazor` is designed specifically for **ASP.NET Core Blazor Web Apps using Static Server-Side Rendering (Static SSR)** with enhanced navigation and enhanced form handling:

1. **Server-rendered semantic HTML:** Every component renders accessible, styled HTML on the server using Velle's plain CSS classes and design tokens.
2. **Automatic Blazor JS initializer:** Blazor's `blazor.web.js` automatically discovers and runs `wwwroot/Velle.Blazor.lib.module.js` (`afterWebStarted`). You do not need to add a `<script>` tag for Velle or Alpine.js.
3. **CSP-safe client interactivity:** The initializer registers Velle's Alpine.js components using the **Alpine.js CSP build** (no `unsafe-eval`), handling modal dialogs, keyboard tab navigation, and lazy-loaded pickers entirely in the browser.
4. **Enhanced navigation & form sync:** Blazor's enhanced navigation and `EditForm Enhance` patch the DOM in place without full page reloads. The initializer listens to Blazor's `enhancedload` event and dispatches a `velle-enhanced-load` window event so mounted Alpine components re-sync with server-updated attributes and form values (for example, keeping a dialog open after server-side validation fails, preserving tab state, or rebuilding Flatpickr inputs and tearing them down cleanly on navigation).

---

## Getting Started

### Prerequisites

- **.NET 10 SDK** (Blazor Web App with Static SSR, `app.MapStaticAssets()`, and `blazor.web.js`).

### 1. Install the package (local preview)

`Velle.Blazor` is currently in alpha (`0.1.0-alpha.1`) and can be packed locally from this repository:

```sh
dotnet pack src/Velle.Blazor -o /tmp/velle-packages
```

Add the package to a Blazor Web App using that directory as a local NuGet source:

```sh
dotnet add package Velle.Blazor --version 0.1.0-alpha.1 --source /tmp/velle-packages
```

### 2. Import the namespace

Add `Velle.Blazor` to `Components/_Imports.razor`:

```razor
@using Velle.Blazor
```

### 3. Add stylesheets in `Components/App.razor`

Drop `<VelleStyles />` into `<head>` (set `IncludeDatepicker="true"` if you use `VelleDatepicker`). It uses ASP.NET Core's `@Assets[...]` automatically for fingerprinted URLs:

```razor
<head>
    ...
    <VelleStyles IncludeDatepicker="true" />
    <HeadOutlet />
</head>
<body>
    <Routes />
    <script src="@Assets["_framework/blazor.web.js"]"></script>
</body>
```

If you prefer explicit `<link>` tags instead of `<VelleStyles />`:

```razor
<link rel="stylesheet" href="@Assets["_content/Velle.Blazor/css/velle.css"]" />
<link rel="stylesheet" href="@Assets["_content/Velle.Blazor/lib/flatpickr/flatpickr.min.css"]" />
<link rel="stylesheet" href="@Assets["_content/Velle.Blazor/css/datepicker.css"]" />
```

Make sure `Program.cs` maps static assets:

```csharp
app.MapStaticAssets();
app.MapRazorComponents<App>();
```

No extra JavaScript `<script>` tags are required — `blazor.web.js` automatically loads `_content/Velle.Blazor/Velle.Blazor.lib.module.js`.

---

## Components

Give each interactive component instance a unique `Id` so ARIA relationships and enhanced DOM patches stay stable across navigation and form posts. All components support `Class` and arbitrary HTML attributes via `AdditionalAttributes` (merging `class` cleanly without overwriting base Velle classes).

### `VelleStyles`

Renders fingerprinted `<link rel="stylesheet">` tags for Velle CSS assets inside `<head>`.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `IncludeDatepicker` | `bool` | `false` | Also includes Flatpickr's base CSS and Velle's datepicker theme. |

### `VelleDialog`

Renders a trigger button and a native `<dialog>` modal managed by Alpine.js, synchronized with server state via `Open`.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `Id` | `string` | Yes | — | Unique DOM `id` for the `<dialog>` element (`aria-controls` and title ID). |
| `Title` | `string` | Yes | — | Heading rendered inside the dialog (`aria-labelledby`). |
| `TriggerText` | `string?` | No | `null` | Text for the default trigger button (ignored when `Trigger` is set). Omit both to control solely via `Open`. |
| `TriggerClass` | `string?` | No | `null` | Extra CSS classes merged onto the default trigger button alongside `btn`. |
| `Trigger` | `RenderFragment?` | No | `null` | Custom trigger markup rendered inside the Alpine scope (add `x-on:click="show"` to open). |
| `Open` | `bool` | No | `false` | Keeps the dialog open on render (e.g. set to `true` in `OnInvalidSubmit` to show validation errors). |
| `ShowCloseButton` | `bool` | No | `true` | Renders the default close button when `Footer` is not set. |
| `CloseText` | `string` | No | `"Close"` | Label for the default close button. |
| `Footer` | `RenderFragment?` | No | `null` | Custom footer markup replacing the default close button (use `x-on:click="close"` or `<form method="dialog">`). |
| `Class` | `string?` | No | `null` | Extra CSS classes merged onto `<dialog>` alongside `dialog`. |
| `ChildContent` | `RenderFragment?` | No | `null` | Body content rendered inside the dialog. |
| `AdditionalAttributes` | `Dictionary<string, object>?` | No | `null` | Extra HTML attributes splatted onto `<dialog>`. |

```razor
<VelleDialog Id="profile-dialog" Title="Edit profile" TriggerText="Edit profile" Open="dialogOpen">
    <EditForm Model="Input!" FormName="profile" Enhance
              OnInvalidSubmit="() => dialogOpen = true" OnValidSubmit="SaveProfile"
              class="flex flex-col gap">
        <DataAnnotationsValidator />
        <label for="display-name">Display name</label>
        <input id="display-name" class="input" name="Input.Name" value="@Input!.Name" />
        <ValidationMessage For="() => Input!.Name" />
        <button type="submit" class="btn btn--primary">Save</button>
    </EditForm>
</VelleDialog>
```

### `VelleTabs`

Renders a WAI-ARIA tablist and panels with keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`) and enhanced-load state synchronization. `VelleTabs` accepts `Items` directly rather than child tab components because Static SSR renders child components after their parent; passing `Items` guarantees the `role="tablist"` header and `role="tabpanel"` bodies render in a single deterministic server pass.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `Id` | `string` | Yes | — | Unique base `id` used to generate tab and panel IDs. |
| `Label` | `string` | Yes | — | Accessible label (`aria-label`) for the tablist. |
| `Items` | `IReadOnlyList<VelleTab>` | Yes | `[]` | Tab definitions (`new VelleTab(Label, RenderFragment)`). |
| `SelectedIndex` | `int` | No | `0` | Zero-based initially selected tab index (clamped to valid bounds). |
| `Class` | `string?` | No | `null` | Extra CSS classes merged onto the root container alongside `tabs`. |
| `AdditionalAttributes` | `Dictionary<string, object>?` | No | `null` | Extra HTML attributes splatted onto the root container. |

```razor
<VelleTabs Id="account-tabs" Label="Account sections" Items="Tabs" />

@code {
    private IReadOnlyList<VelleTab> Tabs =>
    [
        new("Overview", @<p>Account summary.</p>),
        new("Settings", @<p>Profile preferences.</p>)
    ];
}
```

### `VelleDatepicker`

Renders a labeled date/time input enhanced with a locally bundled [Flatpickr](https://flatpickr.js.org/) instance (lazy-loaded on mount). Integrates with Blazor Static SSR `EditForm` and cascading `EditContext` to automatically format typed model values (`DateOnly`, `DateTime`, `DateTimeOffset`, `TimeOnly`), apply validation CSS classes and `aria-invalid="true"`, and clean up the calendar DOM on enhanced navigation.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `Name` | `string` | Yes | — | Form field name bound on POST (e.g. `Input.Date`). |
| `Label` | `string` | Yes | — | Visible `<label>` text associated with the picker input. |
| `Id` | `string?` | No | Derived from `Name` | Unique DOM `id` for the input (defaults to a deterministic slug of `Name`, e.g. `Input.Date` → `input-date`). |
| `For` | `Expression<Func<object?>>?` | No | `null` | Model property expression (e.g. `() => Input!.Date`) for automatic wire formatting and `EditContext` validation state. |
| `Value` | `string?` | No | `null` | Explicit initial value in submitted wire format; overrides `For` when provided. |
| `Placeholder` | `string?` | No | `null` | Placeholder text for the input. |
| `Type` | `VelleDatepickerType` | No | `VelleDatepickerType.Date` | Picker kind: `Date`, `DateTime`, or `Time`. |
| `Mode` | `VelleDatepickerMode` | No | `VelleDatepickerMode.Single` | Selection mode: `Single`, `Range`, or `Multiple`. |
| `DisabledDates` | `IReadOnlyList<string>` | No | `[]` | ISO date strings (`yyyy-MM-dd`) disabled in the calendar. |
| `ShowMonths` | `int` | No | `1` | Number of months displayed side by side. |
| `DateFormat` | `string` | No | `"F d, Y"` | Human-readable display format for `VelleDatepickerType.Date` (Flatpickr tokens). |
| `DateTimeFormat` | `string` | No | `"F d, Y H:i"` | Human-readable display format for `VelleDatepickerType.DateTime`. |
| `Class` | `string?` | No | `null` | Extra CSS classes merged onto `<input>` alongside `input` and `EditContext` classes. |
| `WrapperClass` | `string?` | No | `null` | Extra CSS classes merged onto the outer wrapper `<div>`. |
| `AdditionalAttributes` | `Dictionary<string, object>?` | No | `null` | Extra HTML attributes splatted onto `<input>` (e.g. `required`, `disabled`, `aria-describedby`). |

**Submitted value formats:**
- `VelleDatepickerType.Date` → `yyyy-MM-dd` (binds directly to `DateOnly` / `DateOnly?`)
- `VelleDatepickerType.DateTime` → `yyyy-MM-dd HH:mm`
- `VelleDatepickerType.Time` → `HH:mm`
- `VelleDatepickerMode.Range` → dates joined by `" to "`
- `VelleDatepickerMode.Multiple` → dates joined by `", "`

```razor
<EditForm Model="Input!" FormName="appointment" Enhance OnValidSubmit="Save" class="flex flex-col gap">
    <DataAnnotationsValidator />
    <VelleDatepicker Id="appointment-date"
                     Name="Input.Date"
                     Label="Appointment date"
                     For="() => Input!.Date" />
    <ValidationMessage For="() => Input!.Date" />
    <button type="submit" class="btn btn--primary">Save date</button>
</EditForm>
```

See the full working examples in [Prototype.razor](samples/Velle.Blazor.Sample/Components/Pages/Prototype.razor) and [Datepicker.razor](samples/Velle.Blazor.Sample/Components/Pages/Datepicker.razor).

---

## Extending Alpine.js

`Velle.Blazor.lib.module.js` exposes its Alpine.js instance on `window.Alpine` (or reuses an existing `window.Alpine` if your app loads Alpine itself without calling `Alpine.start()` twice). When Velle starts Alpine, it dispatches a `velle:before-start` event on `window` right before `Alpine.start()` so you can register your own CSP-safe components or stores:

```js
window.addEventListener("velle:before-start", ({ detail: { Alpine } }) => {
  Alpine.data("myCounter", () => ({
    count: 0,
    increment() { this.count++ },
  }))
})
```

---

## Styling & Project Structure

`velle.css` includes Velle's CSS reset, design tokens (`--color-*`, `--size-*`, `--text-*`, `--rounded-*`, `--shadow-*`), base element styles, component classes (`btn`, `btn--primary`, `btn--plain`, `input`, `dialog`, `tabs`), and layout utilities (`flex`, `flex-col`, `gap`, `font-semibold`).

Static web assets in `Velle.Blazor` follow standard ASP.NET Core Razor Class Library conventions:

```text
Velle.slnx                              solution file (src/, samples/, test/)
Directory.Build.props                   shared .NET 10, nullability, and package metadata
global.json                             .NET 10 SDK pinning (.dotnet/ or system SDK)
src/Velle.Blazor/
  Velle.Blazor.csproj                   Razor Class Library (Microsoft.NET.Sdk.Razor)
  _Imports.razor                        library-wide Razor usings
  Components/
    VelleDialog.razor
    VelleTabs.razor
    VelleTab.cs
    VelleDatepicker.razor
    VelleDatepickerType.cs
    VelleDatepickerMode.cs
    VelleStyles.razor
  Internal/
    AttributeUtilities.cs               class merging, attribute filtering, stable ID helper
  wwwroot/
    Velle.Blazor.lib.module.js          Blazor JS initializer (required at wwwroot/ root)
    css/                                linked from dist/ (velle.css, datepicker.css)
    js/                                 component behavior modules (datepicker.js)
    lib/                                vendored third-party libraries (alpine/, flatpickr/)
samples/Velle.Blazor.Sample/            Static SSR sample app demonstrating components
test/Velle.Blazor.Tests/                xUnit + bUnit Static SSR component unit tests
test/blazor/                            Playwright end-to-end tests for Blazor SSR & Alpine
```

Vendor assets under `wwwroot/lib/` use versionless filenames (`alpine-csp.min.js`, `flatpickr.min.css`, `flatpickr.min.js`) because ASP.NET Core's `MapStaticAssets()` and `@Assets[...]` automatically fingerprint files for cache busting. Exact vendored versions are tracked in [src/Velle.Blazor/wwwroot/lib/README.md](src/Velle.Blazor/wwwroot/lib/README.md).

---

## Local Development & Testing

### .NET SDK setup

The repository pins `.NET 10` in `global.json` and checks `.dotnet/` first, falling back to a globally installed .NET 10 SDK. To install a local SDK into `.dotnet/`:

- **macOS / Linux:** run [Microsoft's dotnet-install script](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-install-script) with `--channel 10.0 --install-dir .dotnet`
- **Windows:** run `dotnet-install.ps1 -Channel 10.0 -InstallDir .dotnet`

### Run the sample app

```sh
dotnet run --project samples/Velle.Blazor.Sample
```

Open the URL printed in the terminal to explore **Dialog and Tabs** (`/prototype`) and **Datepicker** (`/datepicker`).

### Build and run tests

```sh
# Build the full solution
dotnet build

# Run C# / bUnit component tests
dotnet test

# Pack Velle.Blazor locally
dotnet pack src/Velle.Blazor -o /tmp/velle-packages

# Run Blazor Static SSR + Alpine Playwright browser tests (first-time setup)
npm ci
npx playwright install chromium --only-shell
npm run test:blazor
```

### Editing CSS styles

Until styles are moved directly into `src/Velle.Blazor`, component CSS and design tokens still originate in `registry/` and are compiled into `dist/` (which `Velle.Blazor.csproj` links into `wwwroot/css/`):

```sh
dotnet run --project src/Velle.Docs   # rebuild dist/ (and legacy docs/) from registry/
npm test                              # registry/JS tests
npm run test:docs                     # verify dist/ and generated docs
npm run test:tool                     # verify legacy Velle.Tool CLI
```

---

## Legacy Framework-Agnostic Assets & CLI

Before pivoting to Blazor Static SSR, this repository distributed a framework-agnostic CSS/JS registry via a .NET CLI tool (`Velle.Tool`), static CDN bundles (`dist/`), and a static documentation site (`src/Velle.Docs`, published at https://codedbyshoe.github.io/velle-css/).

Those projects (`registry/`, `dist/`, `src/Velle.Tool`, and `src/Velle.Docs`) remain in the repository during the transition while styles and components are migrated into `Velle.Blazor`.

- Existing `Velle.Tool` users can still install v0.3.1 from [NuGet.org](https://www.nuget.org/packages/Velle.Tool/0.3.1):
  ```sh
  dotnet new tool-manifest
  dotnet tool install Velle.Tool --version 0.3.1
  dotnet tool run velle init
  dotnet tool run velle add button dialog
  ```
- Version management for `Velle.Tool` and `Velle.Docs` lives in `src/VelleVersion.props`.

---

## Credit

- [css-zero](https://github.com/lazaronixon/css-zero) — Velle's CSS design tokens and component styles originated as a port of `css-zero`.
- [Lucide](https://lucide.dev) — Icons.
- [Alpine.js](https://alpinejs.dev) and [Flatpickr](https://flatpickr.js.org) — Bundled browser behavior libraries.

## License

MIT. See [LICENSE](LICENSE). Includes work from css-zero © 2024 Nixon (MIT), icons from [Lucide](https://lucide.dev) (ISC), Alpine.js (MIT), and Flatpickr (MIT).
