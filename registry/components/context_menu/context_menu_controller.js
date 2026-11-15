import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "content" ]

  show({ clientX, clientY }) {
    const content = this.contentTarget
    content.style.insetInlineStart = `${clientX}px`
    content.style.insetBlockStart  = `${clientY}px`
    content.showPopover()
  }

  hide({ target }) {
    const content = this.contentTarget
    !content.contains(target) && content.hidePopover()
  }
}
