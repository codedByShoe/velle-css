import { define, Controller } from "./velle.js"

// Two range inputs that select a minimum and a maximum on one track. Each input is resized
// to cover its half of the range, split at the midpoint between the two values.
// Technique from @stanko/dual-range-input (MIT, https://muffinman.io/dual-range-input).
define("dual-range", class extends Controller {
  #min
  #max

  connect() {
    this.#min = this.target("min")
    this.#max = this.target("max")

    for (const type of [ "input", "focus", "mousedown", "touchstart" ]) {
      this.#min.addEventListener(type, this.#updateCeil, { passive: true })
      this.#max.addEventListener(type, this.#updateFloor, { passive: true })
    }

    this.#update("ceil")
    this.#min.setAttribute("data-ready", "")
    this.#max.setAttribute("data-ready", "")
  }

  disconnect() {
    for (const type of [ "input", "focus", "mousedown", "touchstart" ]) {
      this.#min.removeEventListener(type, this.#updateCeil)
      this.#max.removeEventListener(type, this.#updateFloor)
    }
  }

  // Moving the minimum rounds the midpoint up, moving the maximum rounds it down, so the
  // input being dragged always gets the extra step.
  #updateCeil = () => this.#update("ceil")

  #updateFloor = () => this.#update("floor")

  #update(round) {
    const thumb = "var(--dual-range-thumb-size)"
    const min = parseFloat(this.#min.min)
    const max = parseFloat(this.#max.max)
    const step = parseFloat(this.#min.step) || 1
    const minValue = parseFloat(this.#min.value)
    const maxValue = parseFloat(this.#max.value)
    const mid = minValue + Math[round]((maxValue - minValue) / 2 / step) * step
    const range = max - min

    this.#min.style.flexBasis = `calc(${this.#fixed((mid - min) / range * 100)}% + ${thumb})`
    this.#max.style.flexBasis = `calc(${this.#fixed((max - mid) / range * 100)}% + ${thumb})`
    this.#min.max = this.#fixed(mid)
    this.#max.min = this.#fixed(mid)

    const minFill = (minValue - min) / (mid - min) || 0
    const maxFill = (maxValue - mid) / (max - mid) || 0
    this.#min.style.setProperty("--dual-range-position", `calc(${this.#fixed(minFill * 100)}% + (${this.#fixed(0.5 - minFill)} * ${thumb}))`)
    this.#max.style.setProperty("--dual-range-position", `calc(${this.#fixed(maxFill * 100)}% + (${this.#fixed(0.5 - maxFill)} * ${thumb}))`)
  }

  #fixed(number) {
    return number.toFixed(this.#precision)
  }

  get #precision() {
    return this.hasData("precision") ? Number(this.data("precision")) : 3
  }
})
