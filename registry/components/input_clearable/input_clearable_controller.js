import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "input" ]

  clear() {
    const input = this.inputTarget
    input.value = ""
    input.focus()
  }
}
