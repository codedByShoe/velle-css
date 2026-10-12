import { define, Controller } from "./velle.js"

define("context-menu", class extends Controller {
  show({ clientX, clientY }) {
    const content = this.target("content")
    content.style.insetInlineStart = `${clientX}px`
    content.style.insetBlockStart  = `${clientY}px`
    content.showPopover()
  }

  hide({ target }) {
    const content = this.target("content")
    !content.contains(target) && content.hidePopover()
  }
})
