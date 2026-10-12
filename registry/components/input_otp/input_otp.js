import { define, Controller } from "./velle.js"

const PATTERNS = {
  "digits": /\d/,
  "chars": /\p{L}/u,
  "digits-and-chars": /[\p{L}\d]/u
}

// A one-time-code field: one real <input> laid over a row of slots. The input does the
// typing, pasting and autofill; this script shows each character in its slot.
define("input-otp", class extends Controller {
  #focused = false

  connect() {
    const input = this.#input
    if (!input.hasAttribute("maxlength")) input.maxLength = this.#slots.length
    if (!input.hasAttribute("autocomplete")) input.autocomplete = "one-time-code"
    if (!input.hasAttribute("inputmode")) input.inputMode = this.#pattern === "digits" ? "numeric" : "text"
    if (!input.hasAttribute("spellcheck")) input.spellcheck = false

    input.addEventListener("input", this.#changed)
    input.addEventListener("focus", this.#focus)
    input.addEventListener("blur", this.#blur)
    input.addEventListener("select", this.#moveCaretToEnd)
    input.addEventListener("click", this.#moveCaretToEnd)
    input.addEventListener("keyup", this.#moveCaretToEnd)

    input.value = this.#sanitize(input.value)
    this.#render()
  }

  disconnect() {
    const input = this.#input
    input.removeEventListener("input", this.#changed)
    input.removeEventListener("focus", this.#focus)
    input.removeEventListener("blur", this.#blur)
    input.removeEventListener("select", this.#moveCaretToEnd)
    input.removeEventListener("click", this.#moveCaretToEnd)
    input.removeEventListener("keyup", this.#moveCaretToEnd)
  }

  #changed = () => {
    const input = this.#input
    const value = this.#sanitize(input.value)
    if (value !== input.value) input.value = value

    this.#render()

    if (value.length === this.#slots.length) {
      this.dispatch("complete", { value })
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
    const allowed = PATTERNS[this.#pattern] ?? PATTERNS.digits
    return [ ...value ].filter(character => allowed.test(character)).join("").slice(0, this.#slots.length)
  }

  get #input() {
    return this.target("input")
  }

  get #slots() {
    return this.targets("slot")
  }

  get #pattern() {
    return this.data("pattern") ?? "digits"
  }
})
