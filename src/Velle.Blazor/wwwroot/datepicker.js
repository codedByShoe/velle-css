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
      const { default: flatpickr } = await import("./vendor/flatpickr-4.6.13.min.js")
      if (disposed || !root.isConnected) return

      // Blazor can remove the generated display input and reset the named input
      // on an enhanced update. Rebuild from the value rendered by the server.
      release()
      const input = root.querySelector("input[name]")
      input.value = input.defaultValue
      const options = pickerOptions(JSON.parse(root.dataset.velleDatepickerOptions))
      picker = flatpickr(input, options)
      const display = picker.mobileInput ?? picker.altInput ?? input
      if (display !== input) display.id = input.id + "-display"
      root.querySelector("label").htmlFor = display.id
    },

    destroy() {
      disposed = true
      release()
    },
  }
}
