import { define, Controller } from "./velle.js"

define("flash", class extends Controller {
  connect() {
    this.element.showPopover()
  }

  hide() {
    this.element.hidePopover()
  }
})
