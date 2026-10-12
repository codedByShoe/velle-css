import { define, Controller } from "./velle.js"

let uid = 0

// A command palette: a search field that filters a list of items, with keyboard
// navigation. Activating an item clicks it, so links navigate and buttons run.
define("command", class extends Controller {
  #observer
  #selected = null

  connect() {
    this.#input.setAttribute("role", "combobox")
    this.#input.setAttribute("aria-expanded", "true")
    this.#input.setAttribute("aria-autocomplete", "list")
    this.#input.addEventListener("input", this.#filter)
    this.#input.addEventListener("keydown", this.#keydown)
    this.element.addEventListener("pointermove", this.#pointermove)
    this.element.addEventListener("click", this.#click)

    // Start fresh every time the palette becomes visible, e.g. when its dialog opens.
    this.#observer = new IntersectionObserver(([ entry ]) => entry.isIntersecting && this.reset())
    this.#observer.observe(this.element)
    this.reset()
  }

  disconnect() {
    this.#input.removeEventListener("input", this.#filter)
    this.#input.removeEventListener("keydown", this.#keydown)
    this.element.removeEventListener("pointermove", this.#pointermove)
    this.element.removeEventListener("click", this.#click)
    this.#observer.disconnect()
  }

  reset() {
    this.#input.value = ""
    this.#filter()
  }

  // Shows the items whose text contains every word typed, hides empty groups and shows
  // the empty state when nothing matches.
  #filter = () => {
    const terms = this.#input.value.toLowerCase().split(/\s+/).filter(Boolean)

    for (const item of this.#items) {
      const text = `${item.getAttribute("data-command-value") ?? item.textContent} ${item.getAttribute("data-command-keywords") ?? ""}`.toLowerCase()
      item.hidden = !terms.every(term => text.includes(term))
    }

    for (const group of this.targets("group")) {
      group.hidden = !this.#items.some(item => group.contains(item) && !item.hidden)
    }

    for (const separator of this.targets("separator")) {
      separator.hidden = terms.length > 0
    }

    const visible = this.#visibleItems
    const empty = this.target("empty")
    if (empty) empty.hidden = visible.length > 0

    this.#select(visible[0] ?? null)
  }

  #keydown = event => {
    const visible = this.#visibleItems
    const index = visible.indexOf(this.#selected)

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        this.#select(visible[Math.min(index + 1, visible.length - 1)] ?? null, true)
        break
      case "ArrowUp":
        event.preventDefault()
        this.#select(visible[Math.max(index - 1, 0)] ?? null, true)
        break
      case "Enter":
        if (event.isComposing || !this.#selected) return
        event.preventDefault()
        this.#selected.click()
        break
    }
  }

  #pointermove = ({ target }) => {
    const item = target instanceof Element ? target.closest('[data-command-target~="item"]') : null
    if (item && item !== this.#selected && this.#visibleItems.includes(item)) this.#select(item)
  }

  #click = ({ target }) => {
    const item = target instanceof Element ? target.closest('[data-command-target~="item"]') : null
    if (!item || !this.#items.includes(item)) return

    this.dispatch("select", { item, value: item.getAttribute("data-command-value") ?? item.textContent.trim() })
  }

  #select(item, scroll = false) {
    this.#selected?.removeAttribute("data-selected")
    this.#selected?.setAttribute("aria-selected", "false")
    this.#selected = item

    if (item) {
      if (!item.id) item.id = `velle-command-item-${++uid}`
      item.setAttribute("data-selected", "")
      item.setAttribute("aria-selected", "true")
      this.#input.setAttribute("aria-activedescendant", item.id)
      if (scroll) item.scrollIntoView({ block: "nearest" })
    } else {
      this.#input.removeAttribute("aria-activedescendant")
    }
  }

  get #input() {
    return this.target("input")
  }

  get #items() {
    return this.targets("item")
  }

  get #visibleItems() {
    return this.#items.filter(item => !item.hidden && item.getAttribute("aria-disabled") !== "true")
  }
})
