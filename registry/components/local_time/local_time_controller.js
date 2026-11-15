import { Controller } from "@hotwired/stimulus"

// Formats <time datetime="…" data-controller="local-time" data-local-time-format-value="…">
// in the visitor's locale and time zone. The format is time, date, shortdate, datetime or
// ago; "ago" values are refreshed every 30 seconds.

class TimeAgoFormat extends Intl.RelativeTimeFormat {
  format(date) {
    const seconds = (Date.now() - date) / 1000
    const minutes = seconds / 60
    const hours   = minutes / 60
    const days    = hours / 24
    const weeks   = days / 7
    const months  = days / 30.4
    const years   = days / 365

    if (years >= 1) {
      return super.format(-Math.floor(years), "years")
    } else if (months >= 1) {
      return super.format(-Math.floor(months), "months")
    } else if (weeks >= 1) {
      return super.format(-Math.floor(weeks), "weeks")
    } else if (days >= 1) {
      return super.format(-Math.floor(days), "days")
    } else if (hours >= 1) {
      return super.format(-Math.floor(hours), "hours")
    } else if (minutes >= 1) {
      return super.format(-Math.floor(minutes), "minutes")
    } else {
      return this.#formatAsTime(date)
    }
  }

  #formatAsTime(date) {
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date)
  }
}

const formatters = {
  time: new Intl.DateTimeFormat(undefined, { timeStyle: "short" }),
  date: new Intl.DateTimeFormat(undefined, { dateStyle: "long" }),
  shortdate: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  datetime: new Intl.DateTimeFormat(undefined, { timeStyle: "short", dateStyle: "short" }),
  ago: new TimeAgoFormat(undefined, { numeric: "always" })
}

const agoControllers = new Set()
let timer = null

export default class extends Controller {
  static values = { format: String }

  connect() {
    this.#render()

    if (this.formatValue === "ago") {
      agoControllers.add(this)
      timer ??= setInterval(() => agoControllers.forEach(controller => controller.#render()), 30_000)
    }
  }

  disconnect() {
    agoControllers.delete(this)

    if (agoControllers.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }

  #render() {
    const formatter = formatters[this.formatValue]

    if (!formatter) {
      console.error(`[velle] Unknown local-time format "${this.formatValue}"`, this.element)
      return
    }

    const date = new Date(this.element.getAttribute("datetime"))
    this.element.textContent = formatter.format(date)
    this.element.title = formatters.datetime.format(date)
  }
}
