import { define, Controller } from "./velle.js"

// Panels separated by draggable handles. Sizes are percentages of the group, applied as
// flex-grow, so the panels always fill it.
define("resizable", class extends Controller {
  #sizes = new Map()
  #drag = null

  connect() {
    this.#applyInitialSizes()
    this.element.addEventListener("pointerdown", this.#pointerdown)
    this.element.addEventListener("keydown", this.#keydown)
  }

  disconnect() {
    this.element.removeEventListener("pointerdown", this.#pointerdown)
    this.element.removeEventListener("keydown", this.#keydown)
    this.#stopDragging()
  }

  // Panels with data-resizable-size keep it; the rest share what is left equally.
  #applyInitialSizes() {
    const panels = this.#panels
    const given = panels.map(panel => parseFloat(panel.getAttribute("data-resizable-size")))
    const taken = given.filter(size => !isNaN(size)).reduce((sum, size) => sum + size, 0)
    const unsized = given.filter(size => isNaN(size)).length
    const share = unsized ? Math.max(100 - taken, 0) / unsized : 0

    panels.forEach((panel, index) => this.#setSize(panel, isNaN(given[index]) ? share : given[index]))
    this.#handles.forEach(handle => this.#updateHandle(handle))
  }

  #pointerdown = event => {
    const handle = this.#handleFor(event.target)
    if (!handle || event.button !== 0) return

    const [ before, after ] = this.#neighbours(handle)
    if (!before || !after) return

    event.preventDefault()
    handle.focus()
    handle.setPointerCapture(event.pointerId)

    this.#drag = {
      handle, before, after,
      start: this.#position(event),
      beforeSize: this.#sizes.get(before),
      afterSize: this.#sizes.get(after),
      available: this.#panels.reduce((sum, panel) => sum + this.#length(panel.getBoundingClientRect()), 0)
    }

    handle.setAttribute("data-dragging", "")
    this.element.setAttribute("data-dragging", "")
    handle.addEventListener("pointermove", this.#pointermove)
    handle.addEventListener("pointerup", this.#stopDragging)
    handle.addEventListener("pointercancel", this.#stopDragging)
  }

  #pointermove = event => {
    const drag = this.#drag
    if (!drag || drag.available === 0) return

    const delta = (this.#position(event) - drag.start) / drag.available * 100 * this.#direction
    this.#resize(drag.handle, drag.before, drag.after, drag.beforeSize + delta, drag.beforeSize + drag.afterSize)
  }

  #stopDragging = () => {
    const drag = this.#drag
    if (!drag) return

    drag.handle.removeAttribute("data-dragging")
    this.element.removeAttribute("data-dragging")
    drag.handle.removeEventListener("pointermove", this.#pointermove)
    drag.handle.removeEventListener("pointerup", this.#stopDragging)
    drag.handle.removeEventListener("pointercancel", this.#stopDragging)
    this.#drag = null
  }

  #keydown = event => {
    const handle = this.#handleFor(event.target)
    if (!handle || event.target !== handle) return

    const [ before, after ] = this.#neighbours(handle)
    if (!before || !after) return

    const step = event.shiftKey ? 10 : 1
    const [ backward, forward ] = this.#vertical ? [ "ArrowUp", "ArrowDown" ]
      : this.#direction === 1 ? [ "ArrowLeft", "ArrowRight" ] : [ "ArrowRight", "ArrowLeft" ]
    const total = this.#sizes.get(before) + this.#sizes.get(after)
    let size

    switch (event.key) {
      case backward: size = this.#sizes.get(before) - step; break
      case forward: size = this.#sizes.get(before) + step; break
      case "Home": size = 0; break
      case "End": size = total; break
      default: return
    }

    event.preventDefault()
    this.#resize(handle, before, after, size, total)
  }

  // Gives `before` the requested size and `after` the rest of `total`, within each
  // panel's data-resizable-min and data-resizable-max.
  #resize(handle, before, after, size, total) {
    const lower = Math.max(this.#limit(before, "min", 0), total - this.#limit(after, "max", 100))
    const upper = Math.min(this.#limit(before, "max", 100), total - this.#limit(after, "min", 0))
    const clamped = Math.min(Math.max(size, lower), upper)

    if (clamped === this.#sizes.get(before)) return

    this.#setSize(before, clamped)
    this.#setSize(after, total - clamped)
    this.#updateHandle(handle)
    this.dispatch("resize", { sizes: this.#panels.map(panel => this.#sizes.get(panel)) })
  }

  #setSize(panel, size) {
    this.#sizes.set(panel, size)
    panel.style.flexGrow = size
  }

  #updateHandle(handle) {
    const [ before ] = this.#neighbours(handle)
    handle.setAttribute("role", "separator")
    handle.setAttribute("aria-orientation", this.#vertical ? "horizontal" : "vertical")
    if (!handle.hasAttribute("tabindex")) handle.tabIndex = 0
    handle.setAttribute("aria-valuemin", "0")
    handle.setAttribute("aria-valuemax", "100")
    if (before) handle.setAttribute("aria-valuenow", Math.round(this.#sizes.get(before)))
  }

  #neighbours(handle) {
    const panels = this.#panels
    const before = handle.previousElementSibling
    const after = handle.nextElementSibling
    return [ panels.includes(before) ? before : null, panels.includes(after) ? after : null ]
  }

  #handleFor(element) {
    const handle = element instanceof Element ? element.closest('[data-resizable-target~="handle"]') : null
    return handle && this.#handles.includes(handle) ? handle : null
  }

  #limit(panel, name, fallback) {
    const value = parseFloat(panel.getAttribute(`data-resizable-${name}`))
    return isNaN(value) ? fallback : value
  }

  #position(event) {
    return this.#vertical ? event.clientY : event.clientX
  }

  #length(rect) {
    return this.#vertical ? rect.height : rect.width
  }

  // In right-to-left layouts the first panel is on the right, so horizontal movement flips.
  get #direction() {
    return !this.#vertical && getComputedStyle(this.element).direction === "rtl" ? -1 : 1
  }

  get #vertical() {
    return this.element.classList.contains("resizable--vertical")
  }

  get #panels() {
    return this.targets("panel")
  }

  get #handles() {
    return this.targets("handle")
  }
})
