import { define, Controller } from "./velle.js"

define("input-clearable", class extends Controller {
  clear() {
    const input = this.target("input")
    input.value = ""
    input.focus()
  }
})
