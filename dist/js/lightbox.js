import { define, Controller } from "./velle.js"

define("lightbox", class extends Controller {
  show(event, link) {
    this.target("dialog").showModal()
    this.#set(link)
  }

  close() {
    this.target("dialog").close()
  }

  reset() {
    this.target("zoomedImage").src = ""
    this.target("download").href = ""
    this.target("share")?.setAttribute("data-web-share-file", "")
  }

  #set(link) {
    this.target("zoomedImage").src = link.href
    this.target("download").href = link.getAttribute("data-lightbox-url")
    this.target("share")?.setAttribute("data-web-share-file", link.getAttribute("data-lightbox-url"))
  }
})
