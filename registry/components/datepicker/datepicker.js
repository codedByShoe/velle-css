import { define, controller } from "./velle.js"
import flatpickr from "flatpickr"

// Adapter for flatpickr (https://flatpickr.js.org). Install flatpickr yourself; see the docs.
define("datepicker", class extends controller({
  values: {
    type: "",
    mode: "single",
    disable: [],
    showMonths: 1,
    dateFormat: "F d, Y",
    datetimeFormat: "F d, Y H:i",
  },
}) {
  connect() {
    if (this.type == "time") {
      this.flatpickr = flatpickr(this.element, this.#timeOptions)
    } else if (this.type == "datetime") {
      this.flatpickr = flatpickr(this.element, this.#dateTimeOptions)
    } else {
      this.flatpickr = flatpickr(this.element, this.#basicOptions)
    }
  }

  disconnect() {
    this.flatpickr.destroy()
  }

  get #timeOptions() {
    return { dateFormat: "H:i", enableTime: true, noCalendar: true }
  }

  get #dateTimeOptions() {
    return { ...this.#baseOptions, altFormat: this.datetimeFormat, dateFormat: "Y-m-d H:i", enableTime: true }
  }

  get #basicOptions() {
    return { ...this.#baseOptions, altFormat: this.dateFormat, dateFormat: "Y-m-d" }
  }

  get #baseOptions() {
    return {
      altInput: true,
      disable: this.disable,
      mode: this.mode,
      showMonths: this.showMonths
    }
  }
})
