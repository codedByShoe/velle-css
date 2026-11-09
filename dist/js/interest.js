import { define, Controller } from "./velle.js"

// Shows the popover named by data-interest-for while the pointer hovers the element.
define("interest", class extends Controller {
  connect() {
    this.on(this.element, "mouseenter", this.#show)
    this.on(this.element, "mouseleave", this.#hide)
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
