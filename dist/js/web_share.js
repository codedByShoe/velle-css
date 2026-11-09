import { define, controller } from "./velle.js"

// Prefix for the names of shared files, e.g. "my_application_x1y2z3.jpg".
const APPLICATION_NAME = "my_application"

define("web-share", class extends controller({ values: { title: "", text: "", url: "", file: "" } }) {
  connect() {
    this.element.hidden = !navigator.canShare
  }

  async share() {
    try {
      await navigator.share(await this.#getShareData())
    } catch {}
  }

  async #getShareData() {
    const data = { title: this.title, text: this.text }

    if (this.url) {
      data.url = this.url
    }

    if (this.file) {
      data.files = [await this.#getFileObject()]
    }

    return data
  }

  async #getFileObject() {
    const response = await fetch(this.file)
    const blob = await response.blob()
    const randomPrefix = `${APPLICATION_NAME}_${Math.random().toString(36).slice(2)}`
    const fileName = `${randomPrefix}.${blob.type.split('/').pop()}`

    return new File([ blob ], fileName, { type: blob.type })
  }
})
