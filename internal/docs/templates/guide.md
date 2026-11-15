# velle-css guide

velle-css is a set of plain CSS components with design tokens and utility classes, plus [Stimulus](https://stimulus.hotwired.dev) controllers for the interactive pieces. It works with any backend or framework: write HTML with the documented classes and data attributes.

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

The controllers import `{{.Stimulus.Package}}`, which velle does not ship. With a bundler, `npm install {{.Stimulus.Package}}@{{.Stimulus.Version}}`. Without one, map it in an import map before any module script:

```html
<script type="importmap">{ "imports": { "{{.Stimulus.Package}}": "{{.Stimulus.ESM}}" } }</script>
```

Or use the release bundles from a CDN, with the same import map (they contain every component except the adapters):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v{{.Version}}/dist/velle.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v{{.Version}}/dist/velle.js"></script>
```

When loading stylesheets yourself, use this order: `reset.css`, `variables.css`, `base.css`, the component stylesheets in alphabetical order, then `utilities.css`.

## Using the JavaScript without the CSS

The controllers work on any markup and don't need velle's stylesheets:

```sh
velle init --js           # writes velle.json and main.js, and no styles
velle add tabs menu       # copies only their JavaScript
velle new controller cart # or start a controller of your own
```

Without the CLI, `dist/js/` holds `application.js` and every controller on its own, and `dist/velle.js` is all of them in one module. Neither loads any CSS. Controllers expose state through ARIA and standard attributes such as `aria-selected`, `hidden` and `open`. A few also use class names or need a particular layout; each of those component pages says what it expects, and `velle add` prints the same note.

## Writing markup

- Components use BEM-style classes: a block (`.btn`), modifiers (`.btn--primary`), and elements (`.card__header`).
- Customize a component through its CSS custom properties (for example `--btn-background`) rather than overriding its rules.
- Prefer native elements: `<dialog>`, `<details>`, the `popover` attribute, and `commandfor`/`command` buttons.
- Mark decorative icons `aria-hidden="true"` and give icon-only buttons an `aria-label`.

## JavaScript

Every interactive component is a Stimulus controller in a file named after it, such as `tabs_controller.js`, which exports the controller class. `application.js` starts the Stimulus application, and `main.js` imports both and registers each controller under its identifier:

```js
import { application } from "./application.js"
import TabsController from "./tabs_controller.js"
application.register("tabs", TabsController)
```

`velle add` writes those lines for you. If your project already starts a Stimulus application, export it from `application.js` instead, or register the controllers wherever you register your own; Stimulus loaders that look for `*_controller.js` files pick them up as they are.

The markup is standard Stimulus (see the [Stimulus reference](https://stimulus.hotwired.dev/reference/controllers)):

- `data-controller="NAME"`: connects a controller. Separate several names with spaces.
- `data-NAME-target="x"`: names an element inside it that the controller uses.
- `data-action="event->NAME#method"`: connects events to the controller's actions, for example `keydown.ctrl+enter->form#submit` or `click@document->context-menu#hide`.
- `data-NAME-OPTION-value="value"`: an option read from the controller's element.
- `data-NAME-PARAM-param="value"`: a value passed to an action as `event.params.PARAM`.

Controllers dispatch bubbling events named `NAME:EVENT` from their element:

```js
document.addEventListener("tabs:change", event => console.log(event.detail.index))
```

## Writing your own controllers

`velle new controller cart` creates `cart_controller.js` to start from and registers it in `main.js`.

This example has a counter and a cart badge that follows it:

```html
<div data-controller="counter">
  <output data-counter-target="output"></output>
  <button data-action="counter#increment">Add to cart</button>
</div>

<nav data-controller="cart" data-cart-count-value="0" data-action="counter:change@window->cart#refresh">
  <span class="badge" data-cart-target="badge"></span>
  <span data-cart-target="total"></span>
</nav>
```

```js
// counter_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "output" ]
  static values = { count: Number }

  increment() {
    this.countValue++
  }

  countValueChanged() {
    this.outputTarget.textContent = this.countValue
    this.dispatch("change", { detail: { count: this.countValue } })
  }
}
```

```js
// cart_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "badge", "total" ]
  static values = { count: Number, url: { type: String, default: "/cart/total" } }

  connect() {
    this.requests = new AbortController()
    this.loadTotal()
  }

  disconnect() {
    this.requests.abort()
  }

  refresh({ detail: { count } }) {
    this.countValue = count
    this.loadTotal()
  }

  countValueChanged() {
    this.badgeTarget.textContent = this.countValue
  }

  async loadTotal() {
    try {
      const response = await fetch(this.urlValue, { signal: this.requests.signal })
      this.totalTarget.textContent = await response.text()
    } catch (error) {
      if (!this.requests.signal.aborted) throw error
    }
  }
}
```

**Values.** `countValueChanged()` runs when the controller connects and whenever `data-cart-count-value` changes, whoever changed it, so it is the one place to render from. State lives in attributes, so CSS can read it directly:

```css
[data-cart-count-value="0"] .badge { display: none }
```

**Talking to other controllers.** An action can listen for any event, so the cart follows the counter's `dispatch()` with `data-action="counter:change@window->cart#refresh"`.

**Reaching a controller from outside.** `application.getControllerForElementAndIdentifier(element, "cart")` returns the connected instance, or `null`, for htmx hooks and inline scripts.

**Several controllers on one element.** List them in one attribute: `<form data-controller="form autosave">`.

**Saved copies of the page.** Libraries that keep a copy of the page, such as htmx for its history, save whatever your controllers have added to it. If `connect()` builds markup that it would build again on the restored copy, define `beforeSnapshot()` to remove it and return a function that puts it back. The htmx extension calls it on every connected controller that has one.

## Extensions

Extensions connect velle's controllers to other tools. They are optional, are installed only by name (`velle add htmx`), and stay out of the bundles. Without the CLI, use the copy that matches how you load velle so it uses the same application: `dist/extensions/` with the `dist/velle.js` bundle, or `dist/js/` next to `dist/js/application.js`.

## Adapters

Some components wrap a third-party library (Chart.js, flatpickr, Tiptap, maska, SortableJS). velle ships the controller and theme but not the library: install it with npm or map it in an import map, as each adapter's page shows. Adapters are not part of `dist/velle.js` or `dist/velle.css`. With the bundle, load the controller from `dist/js/` and register it with the application the bundle exports:

```js
import { application } from "https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v{{.Version}}/dist/velle.js"
import ChartController from "https://cdn.jsdelivr.net/gh/codedbyshoe/velle-css@v{{.Version}}/dist/js/chart_controller.js"
application.register("chart", ChartController)
```

## Coming from css-zero

velle-css is a port of css-zero without Rails or Turbo. The controllers are Stimulus controllers, as in css-zero, so most markup carries over. Use `data-confirm` instead of `data-turbo-confirm`, and put `data-controller="local-time"` with `data-local-time-format-value` on each `<time>` instead of a root around them. Each component page lists its targets, values and actions.
