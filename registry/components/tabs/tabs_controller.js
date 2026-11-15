import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "button", "tab" ]
  static values = { index: Number }

  select({ currentTarget }) {
    this.indexValue = this.buttonTargets.indexOf(currentTarget)
  }

  prev() {
    if (this.indexValue > 0) {
      this.indexValue--
      this.#focusCurrentButton()
    }
  }

  next() {
    if (this.indexValue < this.#lastIndex) {
      this.indexValue++
      this.#focusCurrentButton()
    }
  }

  indexValueChanged() {
    const index = this.indexValue

    this.buttonTargets.forEach((it, i) => {
      it.ariaSelected = String(i === index)
      it.tabIndex = i === index ? 0 : -1
    })

    this.tabTargets.forEach((it, i) => {
      it.hidden = i !== index
    })

    this.dispatch("change", { detail: { index } })
  }

  #focusCurrentButton() {
    this.buttonTargets[this.indexValue].focus()
  }

  get #lastIndex() {
    return this.tabTargets.length - 1
  }
}
