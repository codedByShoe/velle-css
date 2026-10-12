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
- `.keyfilter`: for key events only. Accepts a–z, 0–9, enter, tab, esc, space, up, down, left, right, home, end, page_up and page_down, optionally prefixed with `ctrl+`, `meta+`, `alt+` or `shift+`.
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

`Controller` provides `this.element`, `connect()`, `disconnect()`, `target(name)`, `targets(name)`, `hasTarget(name)`, `data(key)`, `hasData(key)` and `dispatch(type, detail)`. The runtime also exports `observe(selector, { connect, disconnect })` and `debounce(fn, wait)`.

## Adapters

Some components wrap a third-party library (Chart.js, flatpickr, Tiptap, maska, SortableJS). velle ships the controller and theme but not the library: install it with npm or map it in an import map, as each adapter's page shows. Adapters are not part of `dist/velle.js` or `dist/velle.css`; with the bundles, load them from `dist/adapters/`.

## Coming from css-zero

velle-css is a port of css-zero without Rails or Hotwire. Use `data-tabs` instead of `data-controller="tabs"`, `data-tabs-action="click->select"` instead of `data-action="click->tabs#select"`, `data-tabs-index="1"` instead of `data-tabs-index-value="1"`, and `data-confirm` instead of `data-turbo-confirm`.
