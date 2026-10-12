import { define, Controller } from "./velle.js"

// Roving tabindex for menus: arrow keys move focus between data-menu-target="item"
// elements, and the first item is focused every time the menu becomes visible.
define("menu", class extends Controller {
  #observer
  #index = 0

  connect() {
    this.element.addEventListener("keydown", this.#keydown)
    this.element.addEventListener("focusin", this.#focusin)
    this.#observer = new IntersectionObserver(this.#reset.bind(this))
    this.#observer.observe(this.element)
  }

  disconnect() {
    this.element.removeEventListener("keydown", this.#keydown)
    this.element.removeEventListener("focusin", this.#focusin)
    this.#observer.disconnect()
  }

  #reset([ entry ]) {
    entry.isIntersecting && this.#start()
  }

  #start() {
    const items = this.#items
    if (items.length === 0) return

    this.element.tabIndex = -1
    items.forEach(it => it.tabIndex = -1)
    items[0].tabIndex = 0
    this.#index = 0
    items[0].focus()
  }

  #keydown = event => {
    const rtl = getComputedStyle(this.element).direction === "rtl"

    switch (event.key) {
      case "ArrowDown":
      case rtl ? "ArrowLeft" : "ArrowRight":
        event.preventDefault()
        this.#activate(Math.min(this.#index + 1, this.#items.length - 1))
        break
      case "ArrowUp":
      case rtl ? "ArrowRight" : "ArrowLeft":
        event.preventDefault()
        this.#activate(Math.max(this.#index - 1, 0))
        break
      case "Home":
        event.preventDefault()
        this.#activate(0)
        break
      case "End":
        event.preventDefault()
        this.#activate(this.#items.length - 1)
        break
    }
  }

  #focusin = ({ target }) => {
    if (target === this.element) {
      this.#activate(this.#index)
    } else if (this.#items.includes(target)) {
      const items = this.#items
      items.forEach(it => it.tabIndex = -1)
      target.tabIndex = 0
      this.#index = items.indexOf(target)
    }
  }

  #activate(index) {
    const items = this.#items
    const item = items[index]
    if (!item) return

    items.forEach(it => it.tabIndex = -1)
    item.tabIndex = 0
    this.#index = index
    item.focus()
  }

  get #items() {
    return this.targets("item")
  }
})
