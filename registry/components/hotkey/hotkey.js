import { define, Controller } from "./velle.js"

define("hotkey", class extends Controller {
  click(event) {
    if (this.#isClickable && !this.#shouldIgnore(event)) {
      event.preventDefault(); this.element.click()
    }
  }

  focus(event) {
    if (this.#isClickable && !this.#shouldIgnore(event)) {
      event.preventDefault(); this.element.focus()
    }
  }

  #shouldIgnore(event) {
    return event.defaultPrevented || event.target.closest("input, textarea")
  }

  get #isClickable() {
    return getComputedStyle(this.element).pointerEvents !== "none"
  }
})
