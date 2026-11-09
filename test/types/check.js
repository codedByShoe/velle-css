// @ts-check
// Compile-time checks for velle.d.ts, run by `npm run typecheck`. An expected error that
// does not occur is itself an error, so each one proves the line below it is rejected.
import { define, controller, controllerFor, Controller, prepareSnapshot } from "../../dist/js/velle.js"

define("typed", class extends controller({
  targets: { button: HTMLButtonElement },
  values: { index: 0, label: "", open: false, items: [ 1 ] },
}) {
  connect() {
    // @ts-expect-error a number value cannot hold a string
    this.index = "x"

    // @ts-expect-error nope is not a declared target
    this.$.nope

    // @ts-expect-error nope is not a declared target
    this.$$.nope

    // @ts-expect-error only buttons fit, so $$.button is neither any nor Element[]
    this.$$.button.push(/** @type {HTMLElement} */ (this.element))

    /** @type {HTMLButtonElement[]} */
    const buttons = this.$$.button
    buttons.forEach(button => button.disabled = true)

    const first = this.$.button
    if (first) first.disabled = true

    this.index = 3
    this.label = "text"
    this.open = true
    this.items.push(2)

    this.on(this.element, "keydown", event => event.key)
    fetch("/", { signal: this.signal })
  }
})

define("empty", class extends controller({ targets: {}, values: {} }) {
  connect() {}
})

define("plain", class extends Controller {
  connect() {
    /** @type {Element | null} */
    const one = this.$.anything
    /** @type {Element[]} */
    const many = this.$$.anything
    this.dispatch("ready", { one, many, first: this.target("x"), all: this.targets("x") })
  }
})

/** @type {Controller | null} */
export const found = controllerFor(document.body, "plain")

define("snapshots", class extends controller({}) {
  beforeSnapshot() {
    return () => {}
  }
})

/** @type {() => void} */
export const undo = prepareSnapshot()
