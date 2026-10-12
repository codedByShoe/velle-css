import { define, Controller } from "./velle.js"

define("tabs", class extends Controller {
  connect() {
    this.#showCurrentTab()
  }

  select({ target }) {
    this.#index = this.targets("button").indexOf(target.closest(`[data-tabs-target~="button"]`))
    this.#showCurrentTab()
  }

  prev() {
    if (this.#index > 0) {
      this.#index--
      this.#showCurrentTab()
      this.#focusCurrentButton()
    }
  }

  next() {
    if (this.#index < this.#lastIndex) {
      this.#index++
      this.#showCurrentTab()
      this.#focusCurrentButton()
    }
  }

  #showCurrentTab() {
    const index = this.#index

    this.targets("button").forEach((it, i) => {
      it.ariaSelected = i === index
      it.tabIndex = i === index ? 0 : -1
    })

    this.targets("tab").forEach((it, i) => {
      it.hidden = i !== index
    })

    this.dispatch("change", { index })
  }

  #focusCurrentButton() {
    this.targets("button")[this.#index].focus()
  }

  get #index() {
    return Number(this.data("index")) || 0
  }

  set #index(value) {
    this.element.setAttribute("data-tabs-index", value)
  }

  get #lastIndex() {
    return this.targets("tab").length - 1
  }
})
