import { define, Controller } from "./velle.js"

const MESSAGES = {
  type: "This file type is not accepted.",
  size: "This file is too large.",
  count: "Too many files."
}

// A drop area for a file input. Dropped and picked files are validated, previewed and kept
// in the input, so they are submitted with the form like any other file field.
define("dropzone", class extends Controller {
  #files = []
  #rejected = []
  #urls = new Map()
  #errors = new WeakMap()

  connect() {
    for (const type of [ "dragenter", "dragover", "dragleave", "drop" ]) {
      this.element.addEventListener(type, this.#drag)
    }
    this.#input.addEventListener("change", this.#picked)
    this.#input.form?.addEventListener("reset", this.#reset)
    this.#render()
  }

  disconnect() {
    for (const type of [ "dragenter", "dragover", "dragleave", "drop" ]) {
      this.element.removeEventListener(type, this.#drag)
    }
    this.#input.removeEventListener("change", this.#picked)
    this.#input.form?.removeEventListener("reset", this.#reset)
    this.#urls.forEach(url => URL.revokeObjectURL(url))
    this.#urls.clear()
  }

  remove(event, element) {
    const index = Number(element.closest("[data-index]").dataset.index)
    const list = element.closest("[data-error]") ? this.#rejected : this.#files
    this.#forget(list.splice(index, 1)[0])
    this.#sync()
  }

  #drag = event => {
    if (!event.dataTransfer?.types.includes("Files") || this.#input.disabled) return
    event.preventDefault()

    if (event.type === "dragenter" || event.type === "dragover") {
      event.dataTransfer.dropEffect = "copy"
      this.element.setAttribute("data-dragover", "")
    } else if (event.type === "dragleave") {
      if (!this.element.contains(event.relatedTarget)) this.element.removeAttribute("data-dragover")
    } else {
      this.element.removeAttribute("data-dragover")
      this.#add([ ...event.dataTransfer.files ])
    }
  }

  // The picker replaces the input's files, so merge the new selection into the list.
  #picked = () => {
    const picked = [ ...this.#input.files ]
    if (picked.length) this.#add(picked)
  }

  #reset = () => {
    [ ...this.#files, ...this.#rejected ].forEach(file => this.#forget(file))
    this.#files = []
    this.#rejected = []
    setTimeout(() => this.#sync())
  }

  #add(files) {
    this.#rejected.forEach(file => this.#forget(file))
    this.#rejected = []

    for (const file of files) {
      const error = this.#validate(file)
      if (error) {
        this.#errors.set(file, error)
        this.#rejected.push(file)
      } else {
        this.#files.push(file)
      }
    }

    if (!this.#input.multiple && this.#files.length > 1) {
      this.#files.slice(0, -1).forEach(file => this.#forget(file))
      this.#files = this.#files.slice(-1)
    }

    this.#sync()
  }

  #validate(file) {
    if (!this.#accepts(file)) return this.data("type-message") ?? MESSAGES.type
    if (this.hasData("max-file-size") && file.size > Number(this.data("max-file-size")) * 1024 * 1024) return this.data("size-message") ?? MESSAGES.size
    if (this.hasData("max-files") && this.#files.length >= Number(this.data("max-files"))) return this.data("count-message") ?? MESSAGES.count
    return null
  }

  // Follows the input's accept attribute: extensions (.pdf), exact types (image/png) and
  // wildcards (image/*).
  #accepts(file) {
    const accept = this.#input.accept.split(",").map(type => type.trim().toLowerCase()).filter(Boolean)
    if (accept.length === 0) return true

    const name = file.name.toLowerCase()
    const type = file.type.toLowerCase()
    return accept.some(rule => {
      if (rule.startsWith(".")) return name.endsWith(rule)
      if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1))
      return type === rule
    })
  }

  #sync() {
    const transfer = new DataTransfer()
    this.#files.forEach(file => transfer.items.add(file))
    this.#input.files = transfer.files
    this.#render()
    this.dispatch("change", { files: [ ...this.#files ], rejected: [ ...this.#rejected ] })
  }

  #render() {
    const list = this.target("files")
    if (!list) return

    list.replaceChildren(
      ...this.#files.map((file, index) => this.#preview(file, index, null)),
      ...this.#rejected.map((file, index) => this.#preview(file, index, this.#errors.get(file)))
    )
  }

  #preview(file, index, error) {
    const item = document.createElement("li")
    item.className = "dropzone__file"
    item.dataset.index = index
    if (error) item.setAttribute("data-error", "")

    let thumbnail
    if (file.type.startsWith("image/") && !error) {
      thumbnail = document.createElement("img")
      thumbnail.alt = ""
      thumbnail.src = this.#url(file)
    } else {
      thumbnail = document.createElement("span")
      thumbnail.className = "text-xs font-medium"
      thumbnail.textContent = (file.name.split(".").pop() || "file").slice(0, 4).toUpperCase()
    }
    thumbnail.classList.add("dropzone__thumbnail")

    const details = document.createElement("span")
    details.className = "dropzone__details"
    const name = document.createElement("span")
    name.className = "dropzone__name"
    name.textContent = file.name
    const meta = document.createElement("span")
    meta.className = "dropzone__meta"
    meta.textContent = error ?? this.#formatSize(file.size)
    details.append(name, meta)

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "btn btn--plain"
    remove.setAttribute("data-dropzone-action", "remove")
    remove.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span><span class="sr-only"></span>'
    remove.lastChild.textContent = `Remove ${file.name}`

    item.append(thumbnail, details, remove)
    return item
  }

  #url(file) {
    if (!this.#urls.has(file)) this.#urls.set(file, URL.createObjectURL(file))
    return this.#urls.get(file)
  }

  #forget(file) {
    if (!file) return
    const url = this.#urls.get(file)
    if (url) URL.revokeObjectURL(url)
    this.#urls.delete(file)
  }

  #formatSize(bytes) {
    const units = [ "B", "KB", "MB", "GB" ]
    let size = bytes
    let unit = 0
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024
      unit++
    }
    return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`
  }

  get #input() {
    return this.target("input")
  }
})
