import { define, Controller } from "../velle.js"
import flatpickr from "flatpickr"

// Adapter for flatpickr (https://flatpickr.js.org). Install flatpickr yourself; see the docs.
define("datepicker", class extends Controller {
  connect() {
    if (this.#type == "time") {
      this.flatpickr = flatpickr(this.element, this.#timeOptions)
    } else if (this.#type == "datetime") {
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
    return { ...this.#baseOptions, altFormat: this.data("datetime-format") ?? "F d, Y H:i", dateFormat: "Y-m-d H:i", enableTime: true }
  }

  get #basicOptions() {
    return { ...this.#baseOptions, altFormat: this.data("date-format") ?? "F d, Y", dateFormat: "Y-m-d" }
  }

  get #baseOptions() {
    return {
      altInput: true,
      disable: JSON.parse(this.data("disable") ?? "[]"),
      mode: this.data("mode") ?? "single",
      showMonths: Number(this.data("show-months") ?? 1)
    }
  }

  get #type() {
    return this.data("type") ?? ""
  }
})
