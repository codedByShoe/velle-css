import { define, Controller } from "../velle.js"
import Sortable from "sortablejs"

// Adapter for SortableJS (https://sortablejs.github.io/Sortable/). Install sortablejs
// yourself; see the docs.
define("sortable", class extends Controller {
  connect() {
    this.sortable = new Sortable(this.element, this.#options)
  }

  disconnect() {
    this.sortable.destroy()
  }

  #moved = ({ item, from, to, oldIndex, newIndex }) => {
    const list = to.closest("[data-sortable]") ?? to
    const detail = { item, from, to, oldIndex, newIndex }

    list.dispatchEvent(new CustomEvent("velle:sortable:move", { bubbles: true, detail }))

    const url = item.getAttribute("data-sortable-url")
    if (url) this.#save(url, list, newIndex)
  }

  // Sends the new position (and the parent id of the list it landed in) to the item's URL.
  #save(url, list, position) {
    const body = new FormData()
    body.append("position", position)

    const parentId = list.getAttribute("data-sortable-parent-id")
    if (parentId !== null) body.append("parent_id", parentId)

    fetch(url, { method: this.data("method") ?? "PATCH", body, headers: this.#headers, credentials: "same-origin" })
      .then(response => this.dispatch(response.ok ? "success" : "error", { response }))
      .catch(error => this.dispatch("error", { error }))
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
      group: this.data("group") ?? undefined,
      handle: this.data("handle") ?? undefined,
      onAdd: this.#moved,
      onUpdate: this.#moved
    }
  }
})
