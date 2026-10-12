import { observe } from "./velle.js"

// Formats <time datetime="…" data-local-time="time|date|shortdate|datetime|ago"> in the
// visitor's locale and time zone. "ago" values are refreshed every 30 seconds.

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

const agoElements = new Set()
let timer = null

function formatTime(element) {
  const formatter = formatters[element.getAttribute("data-local-time")]

  if (!formatter) {
    console.error(`[velle] Unknown data-local-time format "${element.getAttribute("data-local-time")}"`, element)
    return
  }

  const date = new Date(element.getAttribute("datetime"))
  element.textContent = formatter.format(date)
  element.title = formatters.datetime.format(date)
}

observe("[data-local-time]", {
  connect(element) {
    formatTime(element)

    if (element.getAttribute("data-local-time") === "ago") {
      agoElements.add(element)
      timer ??= setInterval(() => agoElements.forEach(formatTime), 30_000)
    }
  },
  disconnect(element) {
    agoElements.delete(element)

    if (agoElements.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
})
