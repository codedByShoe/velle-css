import { define, Controller } from "./velle.js"

define("input-revealable", class extends Controller {
  reveal() {
    const input = this.target("input")
    this.element.classList.toggle("input--revealed")
    input.type = input.type === "text" ? "password" : "text"
  }
})
