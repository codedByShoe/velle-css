import { define, Controller } from "./velle.js"

// Shows the popover named by data-interest-for while the pointer hovers the element.
define("interest", class extends Controller {
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
    return document.getElementById(this.data("for"))
  }
})
