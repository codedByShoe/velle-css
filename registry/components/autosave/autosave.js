import { define, Controller } from "./velle.js"

const AUTOSAVE_INTERVAL = 3000

define("autosave", class extends Controller {
  #timer

  disconnect() {
    this.#dirty && this.#save()
  }

  change() {
    !this.#dirty && this.#scheduleSave()
  }

  #save() {
    this.#resetTimer()
    this.#submit()
  }

  #scheduleSave() {
    this.#timer = setTimeout(() => this.#save(), AUTOSAVE_INTERVAL)
  }

  #resetTimer() {
    clearTimeout(this.#timer)
    this.#timer = null
  }

  async #submit() {
    this.#toggleSaving(true)

    try {
      const response = await this.#performRequest()
      this.dispatch(response.ok ? "success" : "error", { response })
    } catch (error) {
      this.dispatch("error", { error })
    } finally {
      this.#toggleSaving(false)
    }
  }

  #toggleSaving(saving) {
    this.element.ariaBusy = saving
    const submit = this.target("submit")
    if (submit) submit.disabled = saving
  }

  #performRequest() {
    const url = new URL(this.#action, location.href)
    const options = { method: this.#method, headers: this.#headers, credentials: "same-origin" }

    if (this.#method === "GET") {
      new FormData(this.element).forEach((value, key) => url.searchParams.append(key, value))
    } else {
      options.body = new FormData(this.element)
    }

    return fetch(url, options)
  }

  get #method() {
    return this.element.method.toUpperCase()
  }

  get #action() {
    return this.element.action
  }

  get #headers() {
    const headers = { "Accept": "text/html, application/xhtml+xml", "X-Requested-With": "XMLHttpRequest" }
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken
    return headers
  }

  get #dirty() {
    return !!this.#timer
  }
})
