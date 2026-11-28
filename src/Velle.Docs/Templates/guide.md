# Velle (`Velle.Blazor`) Guide

`Velle.Blazor` is a **Blazor Static SSR** component library built on plain CSS design tokens, utility classes, and [Alpine.js (CSP build)](https://alpinejs.dev/advanced/csp) for lightweight client-side interactivity — no Blazor Server SignalR circuit or WebAssembly runtime required.

## Install `Velle.Blazor`

Install `Velle.Blazor` v{{ blazor_version }} from [NuGet.org](https://www.nuget.org/packages/Velle.Blazor/{{ blazor_version }}):

```sh
dotnet add package Velle.Blazor --version {{ blazor_version }}
```

Import the namespace in `Components/_Imports.razor`:

```razor
@using Velle.Blazor
```

Add `<VelleStyles />` in `Components/App.razor` (set `IncludeDatepicker="true"` when using `VelleDatepicker` and `IncludeEditor="true"` when using `VelleEditor`) and ensure `Program.cs` calls `app.MapStaticAssets()`:

```razor
<head>
    ...
    <VelleStyles IncludeDatepicker="true" IncludeEditor="true" />
    <HeadOutlet />
</head>
<body>
    <Routes />
    <script src="@Assets["_framework/blazor.web.js"]"></script>
</body>
```

No manual JavaScript `<script>` tag is required: `blazor.web.js` automatically discovers and executes `_content/Velle.Blazor/Velle.Blazor.lib.module.js`.

## Alpine.js CSP & Enhanced Navigation

In `afterWebStarted(blazor)`, `Velle.Blazor.lib.module.js`:

1. Reuses `window.Alpine` if already loaded, or exposes Velle's bundled Alpine.js CSP build on `window.Alpine`.
2. Registers `velleDialog`, `velleTabs`, and `velleDatepicker`.
3. Dispatches `velle:before-start` on `window` with `{ detail: { Alpine } }` before calling `Alpine.start()` so consumer apps can register their own CSP-safe components or stores.
4. Listens to Blazor's `enhancedload` event and dispatches `velle-enhanced-load` on `window` so mounted dialogs, tabs, and datepickers re-sync with server-patched DOM state.

```js
window.addEventListener("velle:before-start", ({ detail: { Alpine } }) => {
  Alpine.data("myCounter", () => ({
    count: 0,
    increment() { this.count++ },
  }))
})
```

## Static Web Asset Paths

- `_content/Velle.Blazor/Velle.Blazor.lib.module.js` — automatic Blazor JS initializer
- `_content/Velle.Blazor/css/velle.css` — reset, tokens, base styles, component classes, and utilities
- `_content/Velle.Blazor/css/datepicker.css` — Velle theme for Flatpickr
- `_content/Velle.Blazor/js/datepicker.js` — Alpine datepicker behavior (lazy-loads Flatpickr)
- `_content/Velle.Blazor/lib/alpine/alpine-csp.min.js` — bundled Alpine.js CSP build
- `_content/Velle.Blazor/lib/flatpickr/flatpickr.min.css` & `flatpickr.min.js` — bundled Flatpickr assets

## Styling Conventions

- Components use BEM-style classes (`.btn`, `.btn--primary`, `.card__header`, `.input`).
- Customize components via CSS custom properties (for example `--btn-background`) rather than overriding internal rules.
- Mark decorative icons `aria-hidden="true"` and give icon-only buttons an `aria-label`.

---

## Legacy CLI (`Velle.Tool`) & `velle.js` Runtime

Existing framework-agnostic users can still install `Velle.Tool` v{{ version }} from [NuGet.org](https://www.nuget.org/packages/Velle.Tool/{{ version }}):

```sh
dotnet new tool-manifest  # if needed
dotnet tool install Velle.Tool --version {{ version }}
dotnet tool run velle init
dotnet tool run velle add button dialog
dotnet tool run velle list
```

### Legacy custom controllers (`velle.js`)

```html
<div data-counter>
  <output data-counter-target="output"></output>
  <button data-counter-action="increment">Add to cart</button>
</div>

<nav data-cart data-cart-count="0" data-cart-action="velle:counter:change@window->refresh">
  <span class="badge" data-cart-target="badge"></span>
  <span data-cart-target="total"></span>
</nav>
```

```js
// @ts-check
import { define, controller } from "./velle.js"

define("counter", class extends controller({
  targets: { output: HTMLElement },
  values: { count: 0 },
}) {
  connect() {
    this.countChanged()
  }

  increment() {
    this.count++
  }

  countChanged() {
    const { output } = this.$
    if (output) output.textContent = String(this.count)
    this.dispatch("change", { count: this.count })
  }
})

define("cart", class extends controller({
  targets: { badge: HTMLElement, total: HTMLElement },
  values: { count: 0, url: "/cart/total" },
}) {
  connect() {
    this.on(document, "visibilitychange", () => this.#loadTotal())
    this.countChanged()
  }

  /** @param {CustomEvent<{ count: number }>} event */
  refresh(event) {
    this.count = event.detail.count
  }

  countChanged() {
    const { badge } = this.$
    if (badge) badge.textContent = String(this.count)
    this.#loadTotal()
  }

  async #loadTotal() {
    try {
      const response = await fetch(this.url, { signal: this.signal })
      const { total } = this.$
      if (total) total.textContent = await response.text()
    } catch (error) {
      if (!this.signal.aborted) throw error
    }
  }
})
```
