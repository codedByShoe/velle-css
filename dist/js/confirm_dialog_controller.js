import { Controller } from "@hotwired/stimulus"

// Asks for confirmation before a form submits or a link is followed:
//
//   <form data-confirm="Are you sure?" data-confirm-text="This cannot be undone.">
//   <button type="submit" data-confirm="Delete this item?">
//   <a href="/logout" data-confirm="Sign out?">
//
// The question is shown in the <dialog data-controller="confirm-dialog"> on the page. When there is no
// such dialog the browser's native confirm() is used instead.

const DEFAULT_CONFIRM_TEXT = "This action cannot be undone and may have permanent consequences."

const confirmed = new WeakSet()
let confirmDialog = null

export default class extends Controller {
  static targets = [ "title", "text" ]
  static values = { defaultText: String }

  #resolve = null

  connect() {
    confirmDialog = this
    this.element.addEventListener("close", this.#submit)
  }

  disconnect() {
    this.element.removeEventListener("close", this.#submit)
    if (confirmDialog === this) confirmDialog = null
  }

  confirm(message, text) {
    this.titleTarget.textContent = message
    this.textTarget.textContent  = text || this.defaultTextValue || DEFAULT_CONFIRM_TEXT
    this.element.returnValue = ""
    this.element.showModal()
    return new Promise(resolve => (this.#resolve = resolve))
  }

  #submit = () => {
    this.#resolve?.(this.element.returnValue === "confirm")
    this.#resolve = null
  }
}

function ask(message, text) {
  return confirmDialog ? confirmDialog.confirm(message, text) : Promise.resolve(window.confirm(message))
}

window.addEventListener("submit", event => {
  const form = event.target
  const submitter = event.submitter
  const source = submitter?.hasAttribute("data-confirm") ? submitter : form

  if (!source.hasAttribute("data-confirm")) return

  if (confirmed.has(form)) {
    confirmed.delete(form)
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()

  ask(source.getAttribute("data-confirm"), source.getAttribute("data-confirm-text")).then(confirm => {
    if (confirm) {
      confirmed.add(form)
      submitter ? form.requestSubmit(submitter) : form.requestSubmit()
    }
  })
}, true)

window.addEventListener("click", event => {
  const link = event.target instanceof Element && event.target.closest("a[data-confirm]")

  if (!link) return

  if (confirmed.has(link)) {
    confirmed.delete(link)
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()

  ask(link.getAttribute("data-confirm"), link.getAttribute("data-confirm-text")).then(confirm => {
    if (confirm) {
      confirmed.add(link)
      link.click()
    }
  })
}, true)
