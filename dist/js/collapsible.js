import { define, Controller } from "./velle.js"

define("collapsible", class extends Controller {
  open() {
    this.target("details").open = true
  }

  close() {
    this.target("details").open = false
  }

  toggle() {
    this.target("details").open ? this.close() : this.open()
  }
})
