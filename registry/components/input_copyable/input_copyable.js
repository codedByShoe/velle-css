import { define, Controller } from "./velle.js"

define("input-copyable", class extends Controller {
  async copy() {
    this.#reset()
    this.#writeToClipboard()
  }

  async #writeToClipboard() {
    try {
      await navigator.clipboard.writeText(this.target("input").value)
      this.element.classList.add("input--copied")
    } catch {}
  }

  #reset() {
    this.element.classList.remove("input--copied")
    this.#forceReflow()
  }

  #forceReflow() {
    this.element.offsetWidth
  }
})
