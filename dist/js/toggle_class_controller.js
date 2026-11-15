import { Controller } from "@hotwired/stimulus"

// <div data-controller="toggle-class" data-toggle-class-toggle-class="closed"> toggles the
// "closed" class on itself.
export default class extends Controller {
  static classes = [ "toggle" ]

  toggle() {
    this.element.classList.toggle(this.toggleClass)
  }

  add() {
    this.element.classList.add(this.toggleClass)
  }

  remove() {
    this.element.classList.remove(this.toggleClass)
  }
}
