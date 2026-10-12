import { define, Controller } from "./velle.js"

define("dialog", class extends Controller {
  show() {
    this.element.show()
  }

  showModal() {
    this.element.showModal()
  }

  close() {
    this.element.close()
  }

  closeOnClickOutside({ target }) {
    target.nodeName === "DIALOG" && this.close()
  }
})
