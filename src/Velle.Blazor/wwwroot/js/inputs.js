const OTP_PATTERNS = {
  digits: /\d/,
  chars: /\p{L}/u,
  "digits-and-chars": /[\p{L}\d]/u,
}

export function inputClearable() {
  return {
    clear() {
      const input = this.$root.querySelector("input")
      if (!input) return
      input.value = ""
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.focus()
    },
  }
}

export function inputCopyable() {
  return {
    async copy() {
      const root = this.$root
      const input = root.querySelector("input, textarea")
      if (!input) return

      root.classList.remove("input--copied")
      void root.offsetWidth

      try {
        await navigator.clipboard.writeText(input.value)
        root.classList.add("input--copied")
      } catch {}
    },
  }
}

export function inputRevealable() {
  return {
    reveal(event) {
      const root = this.$root
      const input = root.querySelector("input")
      if (!input) return

      const revealed = root.classList.toggle("input--revealed")
      input.type = revealed ? "text" : "password"
      if (event?.currentTarget instanceof Element) {
        event.currentTarget.setAttribute("aria-pressed", String(revealed))
      }
    },
  }
}

export function inputOtp() {
  let focused = false

  function getInput(root) {
    return root.querySelector("input")
  }

  function getSlots(root) {
    return [...root.querySelectorAll("[data-velle-otp-slot]")]
  }

  function sanitize(root, raw) {
    const patternKey = root.dataset.velleOtpPattern || "digits"
    const allowed = OTP_PATTERNS[patternKey] ?? OTP_PATTERNS.digits
    const maxLen = getSlots(root).length
    return [...raw].filter(ch => allowed.test(ch)).join("").slice(0, maxLen)
  }

  function render(root) {
    const input = getInput(root)
    if (!input) return
    const value = input.value
    const slots = getSlots(root)
    const active = Math.min(value.length, Math.max(0, slots.length - 1))

    slots.forEach((slot, idx) => {
      slot.textContent = value[idx] ?? ""
      slot.toggleAttribute("data-active", focused && idx === active)
    })
  }

  return {
    init() {
      this.refresh()
    },

    refresh() {
      const root = this.$root
      const input = getInput(root)
      const slots = getSlots(root)
      if (!input) return

      if (!input.hasAttribute("maxlength")) input.maxLength = slots.length
      if (!input.hasAttribute("autocomplete")) input.autocomplete = "one-time-code"
      if (!input.hasAttribute("inputmode")) {
        input.inputMode = (root.dataset.velleOtpPattern || "digits") === "digits" ? "numeric" : "text"
      }
      if (!input.hasAttribute("spellcheck")) input.spellcheck = false

      input.value = sanitize(root, input.value)
      render(root)
    },

    onInput() {
      const root = this.$root
      const input = getInput(root)
      if (!input) return

      const cleaned = sanitize(root, input.value)
      if (cleaned !== input.value) input.value = cleaned
      render(root)

      if (cleaned.length === getSlots(root).length) {
        root.dispatchEvent(new CustomEvent("velle:input-otp:complete", {
          bubbles: true,
          detail: { value: cleaned },
        }))
      }
    },

    onFocus() {
      focused = true
      this.moveCaret()
      render(this.$root)
    },

    onBlur() {
      focused = false
      render(this.$root)
    },

    moveCaret() {
      const input = getInput(this.$root)
      if (!input) return
      const end = input.value.length
      if (input.selectionStart !== end || input.selectionEnd !== end) {
        input.setSelectionRange(end, end)
      }
    },
  }
}
