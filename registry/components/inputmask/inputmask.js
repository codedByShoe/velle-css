import { define, Controller } from "./velle.js"
import { MaskInput } from "maska"

// Adapter for maska (https://beholdr.github.io/maska/). Install maska yourself; see the docs.
// The mask itself is configured with maska's own data-maska* attributes.
define("inputmask", class extends Controller {
  connect() {
    this.mask = new MaskInput(this.element)
  }

  disconnect() {
    this.mask.destroy()
  }
})
