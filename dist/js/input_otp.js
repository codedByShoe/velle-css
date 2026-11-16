import { define, controller } from "./velle.js"

const PATTERNS = {
  "digits": /\d/,
  "chars": /\p{L}/u,
  "digits-and-chars": /[\p{L}\d]/u
}

// A one-time-code field: one real <input> laid over a row of slots. The input does the
// typing, pasting and autofill; this script shows each character in its slot.
define("input-otp", class extends controller({ values: { pattern: "digits" } }) {
  #focused = false

  connect() {
    const input = this.#input
    if (!input.hasAttribute("maxlength")) input.maxLength = this.#slots.length
    if (!input.hasAttribute("autocomplete")) input.autocomplete = "one-time-code"
    if (!input.hasAttribute("inputmode")) input.inputMode = this.pattern === "digits" ? "numeric" : "text"
    if (!input.hasAttribute("spellcheck")) input.spellcheck = false

    this.on(input, "input", this.#changed)
    this.on(input, "focus", this.#focus)
    this.on(input, "blur", this.#blur)
    this.on(input, "select", this.#moveCaretToEnd)
    this.on(input, "click", this.#moveCaretToEnd)
    this.on(input, "keyup", this.#moveCaretToEnd)

    input.value = this.#sanitize(input.value)
    this.#render()
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
    const allowed = PATTERNS[this.pattern] ?? PATTERNS.digits
    return [ ...value ].filter(character => allowed.test(character)).join("").slice(0, this.#slots.length)
  }

  get #input() {
    return this.target("input")
  }

  get #slots() {
    return this.targets("slot")
  }
})
