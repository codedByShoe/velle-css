import { define, Controller } from "./velle.js"

// <div data-toggle-class="closed"> toggles the "closed" class on itself.
define("toggle-class", class extends Controller {
  toggle() {
    this.element.classList.toggle(this.#toggleClass)
  }

  add() {
    this.element.classList.add(this.#toggleClass)
  }

  remove() {
    this.element.classList.remove(this.#toggleClass)
  }

  get #toggleClass() {
    return this.element.getAttribute("data-toggle-class")
  }
})
