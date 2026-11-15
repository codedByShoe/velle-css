import { Controller } from "@hotwired/stimulus"

const PATTERNS = {
  "digits": /\d/,
  "chars": /\p{L}/u,
  "digits-and-chars": /[\p{L}\d]/u
}

// A one-time-code field: one real <input> laid over a row of slots. The input does the
// typing, pasting and autofill; this script shows each character in its slot.
export default class extends Controller {
  static targets = [ "input", "slot" ]
  static values = { pattern: { type: String, default: "digits" } }

  #listeners
  #focused = false

  connect() {
    const input = this.#input
    if (!input.hasAttribute("maxlength")) input.maxLength = this.#slots.length
    if (!input.hasAttribute("autocomplete")) input.autocomplete = "one-time-code"
    if (!input.hasAttribute("inputmode")) input.inputMode = this.patternValue === "digits" ? "numeric" : "text"
    if (!input.hasAttribute("spellcheck")) input.spellcheck = false

    this.#listeners = new AbortController()
    const { signal } = this.#listeners
    input.addEventListener("input", this.#changed, { signal })
    input.addEventListener("focus", this.#focus, { signal })
    input.addEventListener("blur", this.#blur, { signal })
    input.addEventListener("select", this.#moveCaretToEnd, { signal })
    input.addEventListener("click", this.#moveCaretToEnd, { signal })
    input.addEventListener("keyup", this.#moveCaretToEnd, { signal })

    input.value = this.#sanitize(input.value)
    this.#render()
  }

  disconnect() {
    this.#listeners.abort()
  }

  #changed = () => {
    const input = this.#input
    const value = this.#sanitize(input.value)
    if (value !== input.value) input.value = value

    this.#render()

    if (value.length === this.#slots.length) {
      this.dispatch("complete", { detail: { value } })
    }
  }

  #focus = () => {
    this.#focused = true
    this.#moveCaretToEnd()
    this.#render()
  }

  #blur = () => {
    this.#focused = false
    this.#render()
  }

  // Characters are always added and removed at the end, like the slots suggest.
  #moveCaretToEnd = () => {
    const input = this.#input
    const end = input.value.length
    if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end)
  }

  #render() {
    const value = this.#input.value
    const slots = this.#slots
    const active = Math.min(value.length, slots.length - 1)

    slots.forEach((slot, index) => {
      slot.textContent = value[index] ?? ""
      slot.toggleAttribute("data-active", this.#focused && index === active)
    })
  }

  #sanitize(value) {
    const allowed = PATTERNS[this.patternValue] ?? PATTERNS.digits
    return [ ...value ].filter(character => allowed.test(character)).join("").slice(0, this.#slots.length)
  }

  get #input() {
    return this.inputTarget
  }

  get #slots() {
    return this.slotTargets
  }
}
