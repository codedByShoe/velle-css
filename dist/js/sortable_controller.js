import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

// Adapter for SortableJS (https://sortablejs.github.io/Sortable/). Install sortablejs
// yourself; see the docs.
export default class extends Controller {
  static values = { group: String, handle: String, method: { type: String, default: "PATCH" }, parentId: String }

  connect() {
    this.sortable = new Sortable(this.element, this.#options)
  }

  disconnect() {
    this.sortable.destroy()
  }

  #moved = ({ item, from, to, oldIndex, newIndex }) => {
    const list = this.application.getControllerForElementAndIdentifier(to, "sortable") ?? this

    list.dispatch("move", { detail: { item, from, to, oldIndex, newIndex } })

    const url = item.getAttribute("data-sortable-url")
    if (url) this.#save(url, list, newIndex)
  }

  // Sends the new position (and the parent id of the list it landed in) to the item's URL.
  #save(url, list, position) {
    const body = new FormData()
    body.append("position", position)

    if (list.hasParentIdValue) body.append("parent_id", list.parentIdValue)

    fetch(url, { method: this.methodValue, body, headers: this.#headers, credentials: "same-origin" })
      .then(response => this.dispatch(response.ok ? "success" : "error", { detail: { response } }))
      .catch(error => this.dispatch("error", { detail: { error } }))
  }

  get #headers() {
    const headers = { "Accept": "text/html, application/xhtml+xml", "X-Requested-With": "XMLHttpRequest" }
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken
    return headers
  }

  get #options() {
    return {
      animation: 150,
      group: this.groupValue || undefined,
      handle: this.handleValue || undefined,
      onAdd: this.#moved,
      onUpdate: this.#moved
    }
  }
}
