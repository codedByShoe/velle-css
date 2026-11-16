import { define, Controller } from "./velle.js"

define("autoselect", class extends Controller {
  connect() {
    this.#autoselect && this.element.select()
  }

  get #autoselect() {
    return this.element.autofocus
  }
})
