import { define, Controller } from "./velle.js"

// The root element carries the current scheme itself: <html data-color-scheme>.
define("color-scheme", class extends Controller {
  connect() {
    this.element.dataset.colorScheme = this.#colorScheme
  }

  setLight() {
    this.#set("light")
  }

  setDark() {
    this.#set("dark")
  }

  setSystem() {
    this.#set("system")
  }

  #set(colorScheme) {
    this.element.dataset.colorScheme = colorScheme
    localStorage.setItem("color_scheme", colorScheme)
    this.dispatch("change", { colorScheme })
  }

  get #colorScheme() {
    return localStorage.getItem("color_scheme") || "system"
  }
})
