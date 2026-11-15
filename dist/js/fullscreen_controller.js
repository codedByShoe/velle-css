import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "button" ]

  connect() {
    this.#hideButtonIfNotSupported()
  }

  toggle() {
    this.#fullScreenMode ? this.#exitFullscreen() : this.#requestFullscreen()
  }

  #hideButtonIfNotSupported() {
    this.buttonTargets.forEach(button => button.hidden = !this.#supportsFullScreen)
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
}
