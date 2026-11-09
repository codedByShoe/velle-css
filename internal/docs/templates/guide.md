# velle-css guide

velle-css is a set of plain CSS components with design tokens and utility classes, plus a small dependency-free JavaScript runtime (`velle.js`) for the interactive pieces. It works with any backend or framework: write HTML with the documented classes and data attributes.

## Install

With the Go CLI, which copies only the components you use into your project:

```sh
go install github.com/codedbyshoe/velle-css/cmd/velle@latest
velle init                # writes velle.json, copies the core styles, creates main.css and main.js
velle add button dialog   # copies components and their dependencies, and imports them
velle add --all           # every component
velle list                # what is available
```

Then the layout needs two tags:

```html
<link rel="stylesheet" href="/assets/css/velle/main.css">
<script type="module" src="/assets/js/velle/main.js"></script>
```

Or use the release bundles from a CDN (they contain every component except the adapters):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v{{.Version}}/dist/velle.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v{{.Version}}/dist/velle.js"></script>
```

When loading stylesheets yourself, use this order: `reset.css`, `variables.css`, `base.css`, the component stylesheets in alphabetical order, then `utilities.css`.

## Writing markup

- Components use BEM-style classes: a block (`.btn`), modifiers (`.btn--primary`), and elements (`.card__header`).
- Customize a component through its CSS custom properties (for example `--btn-background`) rather than overriding its rules.
- Prefer native elements: `<dialog>`, `<details>`, the `popover` attribute, and `commandfor`/`command` buttons.
- Mark decorative icons `aria-hidden="true"` and give icon-only buttons an `aria-label`.

## JavaScript runtime

Every interactive component is an ES module that imports `./velle.js`. It connects plain data attributes to a controller and works on markup added at any time (server-rendered pages, htmx swaps, client frameworks). Nothing needs to be re-initialized.

Each behavior has a name, such as `tabs`, and reads these attributes:

- `data-NAME`: marks the root element. Each root gets its own controller instance.
- `data-NAME-target="x"`: names an element inside the root that the behavior uses. Separate several names with spaces.
- `data-NAME-action="..."`: connects events to the behavior's actions. It can sit on the root or anything inside it.
- `data-NAME-OPTION="value"`: an option read from the root.
- `data-NAME-PARAM-param="value"`: a value passed to an action as `event.params.PARAM`.

A target or action always belongs to the closest root with the same name.

Action syntax: `[event[.keyfilter][@document|@window]->]action[:prevent][:stop][:self]`. Separate several actions with spaces.

- `event`: any DOM event name. When omitted, the element's default event is used: click for buttons and links, input for inputs and textareas, change for selects, submit for forms, toggle for `<details>`.
- `.keyfilter`: for key events only. Accepts any single character, or enter, tab, esc, space, up, down, left, right, home, end, page_up and page_down, optionally prefixed with `ctrl+`, `meta+`, `alt+` or `shift+`.
- `@document` / `@window`: listen there instead of on the element.
- `:prevent`, `:stop`, `:self`: call `preventDefault()`, call `stopPropagation()`, or run only when the event target is the element itself.

```html
<textarea data-form-action="keydown.ctrl+enter->submit keydown.meta+enter->submit"></textarea>
```

Behaviors dispatch bubbling `CustomEvent`s named `velle:NAME:EVENT` from the root element:

```js
document.addEventListener("velle:tabs:change", event => console.log(event.detail.index))
```

Write your own behavior with the same runtime:

```js
import { define, Controller } from "./velle.js"

// <div data-counter data-counter-start="5">
//   <output data-counter-target="count"></output>
//   <button data-counter-action="increment">+1</button>
// </div>
define("counter", class extends Controller {
  #count = 0

  connect() {
    this.#count = Number(this.data("start")) || 0
    this.#render()
  }

  increment() {
    this.#count++
    this.#render()
    this.dispatch("change", { count: this.#count })
  }

  #render() {
    this.target("count").textContent = this.#count
  }
})
```

`Controller` provides `this.element`, `connect()`, `disconnect()`, `target(name)`, `targets(name)`, `hasTarget(name)`, `data(key)`, `hasData(key)`, `dispatch(type, detail)`, `$`, `$$`, `on(target, type, listener, options)` and `signal`. The runtime also exports `controller({ targets, values })`, `controllerFor(element, name)`, `observe(selector, { connect, disconnect })` and `debounce(fn, wait)`.

## Writing your own controllers

Use `controller({ targets, values })` as the base class for behavior specific to your app. `velle new controller cart` creates a file to start from and imports it in `main.js`.

This example has a counter and a cart badge that follows it:

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

**Targets.** `targets` maps each name to the element class you expect. `this.$.total` is the first match or `null`, `this.$$.total` is an array, and an undeclared name is a type error.

**Values.** `values` maps each name to its default, and the default's type decides how the attribute is parsed: numbers, strings, booleans (present means true, `"false"` means false), or JSON for arrays and objects. `this.count` reads `data-cart-count` and assigning to it writes the attribute; `showMonths` maps to `data-NAME-show-months`. Names the controller already uses, such as `data`, `element`, `target` and `action`, throw an error.

**Callbacks.** `countChanged(value, oldValue)` runs after the attribute changes, whoever changed it. It runs asynchronously and never during `connect()`, so call it from `connect()` to render the initial state.

**Styling.** State lives in attributes, so CSS can read it directly:

```css
[data-cart-count="0"] .badge { display: none }
```

**Cleanup.** `this.on(target, type, listener, options)` adds a listener that is removed when the controller disconnects. `this.signal` aborts at the same moment; pass it to `fetch(url, { signal: this.signal })` or anything else that accepts one.

**Talking to other controllers.** Actions accept any event name, so one controller can listen for another's `dispatch()` with `data-cart-action="velle:counter:change@window->refresh"`.

**Reaching a controller from outside.** `controllerFor(element, name)` returns the connected instance or `null`, for htmx hooks and inline scripts. Its result is a plain `Controller` to the type checker, so annotate it to use your own properties:

```js
import { controllerFor } from "./velle.js"

/** @type {any} */
const cart = controllerFor(document.querySelector("[data-cart]"), "cart")
if (cart) cart.count = 0
```

**Several controllers on one element.** Each name gets its own instance, and an action goes to the controller its attribute names:

```html
<form data-form data-autosave data-form-action="keydown.ctrl+enter->submit">
```

**Editor setup.** `velle.d.ts` sits next to `velle.js`, and `velle new controller` writes this `jsconfig.json` at the project root unless you already have one. Start a file with `// @ts-check` to see errors for that file in any editor that uses TypeScript.

```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "module": "esnext",
    "target": "es2022",
    "moduleResolution": "bundler"
  }
}
```
## Adapters

Some components wrap a third-party library (Chart.js, flatpickr, Tiptap, maska, SortableJS). velle ships the controller and theme but not the library: install it with npm or map it in an import map, as each adapter's page shows. Adapters are not part of `dist/velle.js` or `dist/velle.css`; with the bundles, load them from `dist/adapters/`.

## Coming from css-zero

velle-css is a port of css-zero without Rails or Hotwire. Use `data-tabs` instead of `data-controller="tabs"`, `data-tabs-action="click->select"` instead of `data-action="click->tabs#select"`, `data-tabs-index="1"` instead of `data-tabs-index-value="1"`, and `data-confirm` instead of `data-turbo-confirm`.
