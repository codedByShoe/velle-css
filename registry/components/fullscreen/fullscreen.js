import { define, Controller } from "./velle.js"

define("fullscreen", class extends Controller {
  connect() {
    this.#hideButtonIfNotSupported()
  }

  toggle() {
    this.#fullScreenMode ? this.#exitFullscreen() : this.#requestFullscreen()
  }

  #hideButtonIfNotSupported() {
    this.targets("button").forEach(button => button.hidden = !this.#supportsFullScreen)
  }

  #exitFullscreen() {
    document.exitFullscreen()
  }

  #requestFullscreen() {
    document.documentElement.requestFullscreen()
  }

  get #supportsFullScreen() {
    return !!this.element.requestFullscreen
  }

  get #fullScreenMode() {
    return document.fullscreenElement
  }
})
