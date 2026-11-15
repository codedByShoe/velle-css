import { Controller } from "@hotwired/stimulus"

// Shows the popover named by data-interest-for-value while the pointer hovers the element.
export default class extends Controller {
  static values = { for: String }

  connect() {
    this.element.addEventListener("mouseenter", this.#show)
    this.element.addEventListener("mouseleave", this.#hide)
  }

  disconnect() {
    this.element.removeEventListener("mouseenter", this.#show)
    this.element.removeEventListener("mouseleave", this.#hide)
  }

  #show = () => {
    this.#forElement?.showPopover({ source: this.element })
  }

  #hide = () => {
    this.#forElement?.hidePopover()
  }

  get #forElement() {
    return document.getElementById(this.forValue)
  }
}
