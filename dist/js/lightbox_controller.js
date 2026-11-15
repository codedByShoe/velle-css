import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "dialog", "zoomedImage", "download", "share" ]

  show({ currentTarget }) {
    this.dialogTarget.showModal()
    this.#set(currentTarget)
  }

  close() {
    this.dialogTarget.close()
  }

  reset() {
    this.zoomedImageTarget.src = ""
    this.downloadTarget.href = ""
    if (this.hasShareTarget) this.shareTarget.setAttribute("data-web-share-file-value", "")
  }

  #set(link) {
    this.zoomedImageTarget.src = link.href
    this.downloadTarget.href = link.getAttribute("data-lightbox-url")
    if (this.hasShareTarget) this.shareTarget.setAttribute("data-web-share-file-value", link.getAttribute("data-lightbox-url"))
  }
}
