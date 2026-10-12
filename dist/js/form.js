import { define, Controller, debounce } from "./velle.js"

define("form", class extends Controller {
  constructor(element, name) {
    super(element, name)
    this.debouncedSubmit = debounce(this.debouncedSubmit.bind(this), this.#debounceTimeout)
  }

  submit(event) {
    const submitter = event?.params?.submitter

    if (submitter) {
      this.element.requestSubmit(this.#find(submitter))
    } else {
      this.element.requestSubmit()
    }
  }

  debouncedSubmit(event) {
    this.submit(event)
  }

  disableSubmitWhenInvalid() {
    const submit = this.target("submit")

    if (this.element.checkValidity()) {
      submit.removeAttribute("disabled")
    } else {
      submit.toggleAttribute("disabled", true)
    }
  }

  select(event) {
    event.target.select()
  }

  reset() {
    this.element.reset()
  }

  cancel() {
    this.target("cancel")?.click()
  }

  #find(id) {
    return document.getElementById(id) || this.#notFound(id)
  }

  #notFound(id) {
    throw new Error(`Submitter with ID "${id}" not found`)
  }

  get #debounceTimeout() {
    return this.hasData("debounce") ? Number(this.data("debounce")) : 300
  }
})
