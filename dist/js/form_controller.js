import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "submit", "cancel" ]
  static values = { debounce: { type: Number, default: 300 } }

  initialize() {
    this.debouncedSubmit = debounce(this.debouncedSubmit.bind(this), this.debounceValue)
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
    const submit = this.submitTarget

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
    if (this.hasCancelTarget) this.cancelTarget.click()
  }

  #find(id) {
    return document.getElementById(id) || this.#notFound(id)
  }

  #notFound(id) {
    throw new Error(`Submitter with ID "${id}" not found`)
  }
}

// Trailing-edge debounce.
function debounce(fn, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), wait)
  }
}
