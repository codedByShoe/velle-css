import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "input" ]

  reveal() {
    const input = this.inputTarget
    this.element.classList.toggle("input--revealed")
    input.type = input.type === "text" ? "password" : "text"
  }
}
