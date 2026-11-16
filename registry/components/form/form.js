import { define, controller, debounce } from "./velle.js"

define("form", class extends controller({
  targets: { submit: HTMLElement, cancel: HTMLElement },
  values: { debounce: 300 },
}) {
  constructor(element, name) {
    super(element, name)
    this.debouncedSubmit = debounce(this.debouncedSubmit.bind(this), this.debounce)
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
    const submit = this.$.submit

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
    this.$.cancel?.click()
  }

  #find(id) {
    return document.getElementById(id) || this.#notFound(id)
  }

  #notFound(id) {
    throw new Error(`Submitter with ID "${id}" not found`)
  }
})
