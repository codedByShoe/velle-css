import { Controller } from "@hotwired/stimulus"

// The root element carries the current scheme itself:
// <html data-controller="color-scheme" data-color-scheme>.
export default class extends Controller {
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
    this.dispatch("change", { detail: { colorScheme } })
  }

  get #colorScheme() {
    return localStorage.getItem("color_scheme") || "system"
  }
}
