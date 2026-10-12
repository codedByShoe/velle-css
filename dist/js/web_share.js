import { define, Controller } from "./velle.js"

// Prefix for the names of shared files, e.g. "my_application_x1y2z3.jpg".
const APPLICATION_NAME = "my_application"

define("web-share", class extends Controller {
  connect() {
    this.element.hidden = !navigator.canShare
  }

  async share() {
    try {
      await navigator.share(await this.#getShareData())
    } catch {}
  }

  async #getShareData() {
    const data = { title: this.data("title") ?? "", text: this.data("text") ?? "" }

    if (this.data("url")) {
      data.url = this.data("url")
    }

    if (this.data("file")) {
      data.files = [await this.#getFileObject()]
    }

    return data
  }

  async #getFileObject() {
    const response = await fetch(this.data("file"))
    const blob = await response.blob()
    const randomPrefix = `${APPLICATION_NAME}_${Math.random().toString(36).slice(2)}`
    const fileName = `${randomPrefix}.${blob.type.split('/').pop()}`

    return new File([ blob ], fileName, { type: blob.type })
  }
})
