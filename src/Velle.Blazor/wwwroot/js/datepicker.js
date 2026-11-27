function pickerOptions({ type, mode, disable, showMonths, dateFormat, dateTimeFormat }) {
  if (type === "time") {
    return { dateFormat: "H:i", enableTime: true, noCalendar: true }
  }

  const includeTime = type === "datetime"
  return {
    altInput: true,
    altFormat: includeTime ? dateTimeFormat : dateFormat,
    dateFormat: includeTime ? "Y-m-d H:i" : "Y-m-d",
    enableTime: includeTime,
    disable,
    mode,
    showMonths,
  }
}

function syncDisplayAttributes(input, display) {
  for (const attr of ["aria-invalid", "aria-describedby"]) {
    const value = input.getAttribute(attr)
    if (value !== null) {
      display.setAttribute(attr, value)
    } else {
      display.removeAttribute(attr)
    }
  }

  display.required = input.required
  display.disabled = input.disabled

  for (const className of ["invalid", "valid"]) {
    display.classList.toggle(className, input.classList.contains(className))
  }
}

export function datepicker() {
  let picker
  let disposed = false

  function release() {
    if (!picker) return

    const source = picker.input
    picker.destroy()
    delete source._flatpickr
    picker = undefined
  }

  return {
    init() {
      return this.refresh()
    },

    async refresh() {
      const root = this.$root
      const { default: flatpickr } = await import("../lib/flatpickr/flatpickr.min.js")
      if (disposed || !root.isConnected) return

      // Blazor can remove the generated display input and reset the named input
      // on an enhanced update. Rebuild from the value rendered by the server.
      release()
      const input = root.querySelector("input[name]")
      if (!input) return

      input.value = input.defaultValue
      const options = pickerOptions(JSON.parse(root.dataset.velleDatepickerOptions))
      picker = flatpickr(input, options)
      const display = picker.mobileInput ?? picker.altInput ?? input
      if (display !== input) {
        display.id = input.id + "-display"
        syncDisplayAttributes(input, display)
      }

      const label = root.querySelector("label")
      if (label) label.htmlFor = display.id
    },

    destroy() {
      disposed = true
      release()
    },
  }
}
