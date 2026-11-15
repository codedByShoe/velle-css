import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "dependee", "dependant" ]

  connect() {
    this.#checkDependee()
  }

  check({ target }) {
    target === this.#dependee ? this.#checkDependants() : this.#checkDependee()
  }

  #checkDependants() {
    this.#dependants.forEach(it => it.checked = this.#dependee.checked)
  }

  #checkDependee() {
    this.#dependee.checked = this.#allChecked
    this.#dependee.indeterminate = this.#indeterminate
  }

  get #dependee() {
    return this.dependeeTarget
  }

  get #dependants() {
    return this.dependantTargets
  }

  get #indeterminate() {
    return this.#atLeastOneChecked && !this.#allChecked
  }

  get #atLeastOneChecked() {
    return this.#dependants.length > 0 && this.#dependants.some(it => it.checked)
  }

  get #allChecked() {
    return this.#dependants.length > 0 && this.#dependants.every(it => it.checked)
  }
}
