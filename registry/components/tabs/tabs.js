// @ts-check
import { define, controller } from "./velle.js"

define("tabs", class extends controller({
  targets: { button: HTMLElement, tab: HTMLElement },
  values: { index: 0 },
}) {
  connect() {
    this.indexChanged()
  }

  /** @param {Event & { target: Element }} event */
  select({ target }) {
    this.index = this.$$.button.indexOf(/** @type {HTMLElement} */ (target.closest(`[data-tabs-target~="button"]`)))
  }

  prev() {
    if (this.index > 0) {
      this.index--
      this.#focusCurrentButton()
    }
  }

  next() {
    if (this.index < this.#lastIndex) {
      this.index++
      this.#focusCurrentButton()
    }
  }

  indexChanged() {
    const index = this.index

    this.$$.button.forEach((it, i) => {
      it.ariaSelected = String(i === index)
      it.tabIndex = i === index ? 0 : -1
    })

    this.$$.tab.forEach((it, i) => {
      it.hidden = i !== index
    })

    this.dispatch("change", { index })
  }

  #focusCurrentButton() {
    this.$$.button[this.index].focus()
  }

  get #lastIndex() {
    return this.$$.tab.length - 1
  }
})
