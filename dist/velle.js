/*!
 * velle-css 0.1.0 | MIT License | https://github.com/codedbyshoe/velle-css
 * Based on css-zero by Lázaro Nixon (https://github.com/lazaronixon/css-zero)
 */

import { Application, Controller } from "@hotwired/stimulus"

// The Stimulus application velle's controllers are registered with. If your project already
// starts one, export that instead: export { application } from "../controllers/application.js"
export const application = Application.start()

// components/autosave/autosave_controller.js
{
const AUTOSAVE_INTERVAL = 3000

const controller = class extends Controller {
  static targets = [ "submit" ]

  #timer

  disconnect() {
    this.#dirty && this.#save()
  }

  change() {
    !this.#dirty && this.#scheduleSave()
  }

  #save() {
    this.#resetTimer()
    this.#submit()
  }

  #scheduleSave() {
    this.#timer = setTimeout(() => this.#save(), AUTOSAVE_INTERVAL)
  }

  #resetTimer() {
    clearTimeout(this.#timer)
    this.#timer = null
  }

  async #submit() {
    this.#toggleSaving(true)

    try {
      const response = await this.#performRequest()
      this.dispatch(response.ok ? "success" : "error", { detail: { response } })
    } catch (error) {
      this.dispatch("error", { detail: { error } })
    } finally {
      this.#toggleSaving(false)
    }
  }

  #toggleSaving(saving) {
    this.element.ariaBusy = saving
    if (this.hasSubmitTarget) this.submitTarget.disabled = saving
  }

  #performRequest() {
    const url = new URL(this.#action, location.href)
    const options = { method: this.#method, headers: this.#headers, credentials: "same-origin" }

    if (this.#method === "GET") {
      new FormData(this.element).forEach((value, key) => url.searchParams.append(key, value))
    } else {
      options.body = new FormData(this.element)
    }

    return fetch(url, options)
  }

  get #method() {
    return this.element.method.toUpperCase()
  }

  get #action() {
    return this.element.action
  }

  get #headers() {
    const headers = { "Accept": "text/html, application/xhtml+xml", "X-Requested-With": "XMLHttpRequest" }
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken
    return headers
  }

  get #dirty() {
    return !!this.#timer
  }
}
application.register("autosave", controller)
}

// components/autoselect/autoselect_controller.js
{
const controller = class extends Controller {
  connect() {
    this.#autoselect && this.element.select()
  }

  get #autoselect() {
    return this.element.autofocus
  }
}
application.register("autoselect", controller)
}

// components/carousel/carousel_controller.js
{
const controller = class extends Controller {
  static targets = [ "content" ]

  next() {
    this.contentTarget.scrollBy(100, 0)
  }

  prev() {
    this.contentTarget.scrollBy(-100, 0)
  }
}
application.register("carousel", controller)
}

// components/check_all/check_all_controller.js
{
const controller = class extends Controller {
  static targets = [ "dependee", "dependant" ]

  connect() {
    this.#checkDependee()
  }

  check({ target }) {
    target === this.#dependee ? this.#checkDependants() : this.#checkDependee()
  }

  #checkDependants() {
    this.#dependants.forEach(it => it.checked = this.#dependee.checked)
  }

  #checkDependee() {
    this.#dependee.checked = this.#allChecked
    this.#dependee.indeterminate = this.#indeterminate
  }

  get #dependee() {
    return this.dependeeTarget
  }

  get #dependants() {
    return this.dependantTargets
  }

  get #indeterminate() {
    return this.#atLeastOneChecked && !this.#allChecked
  }

  get #atLeastOneChecked() {
    return this.#dependants.length > 0 && this.#dependants.some(it => it.checked)
  }

  get #allChecked() {
    return this.#dependants.length > 0 && this.#dependants.every(it => it.checked)
  }
}
application.register("check-all", controller)
}

// components/collapsible/collapsible_controller.js
{
const controller = class extends Controller {
  static targets = [ "details" ]

  open() {
    this.detailsTarget.open = true
  }

  close() {
    this.detailsTarget.open = false
  }

  toggle() {
    this.detailsTarget.open ? this.close() : this.open()
  }
}
application.register("collapsible", controller)
}

// components/color_scheme/color_scheme_controller.js
{
// The root element carries the current scheme itself:
// <html data-controller="color-scheme" data-color-scheme>.
const controller = class extends Controller {
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
application.register("color-scheme", controller)
}

// components/command/command_controller.js
{
let uid = 0

// A command palette: a search field that filters a list of items, with keyboard
// navigation. Activating an item clicks it, so links navigate and buttons run.
const controller = class extends Controller {
  static targets = [ "input", "item", "group", "separator", "empty" ]

  #listeners
  #observer
  #selected = null

  connect() {
    this.#input.setAttribute("role", "combobox")
    this.#input.setAttribute("aria-expanded", "true")
    this.#input.setAttribute("aria-autocomplete", "list")
    this.#listeners = new AbortController()
    const { signal } = this.#listeners
    this.#input.addEventListener("input", this.#filter, { signal })
    this.#input.addEventListener("keydown", this.#keydown, { signal })
    this.element.addEventListener("pointermove", this.#pointermove, { signal })
    this.element.addEventListener("click", this.#click, { signal })

    // Start fresh every time the palette becomes visible, e.g. when its dialog opens.
    this.#observer = new IntersectionObserver(([ entry ]) => entry.isIntersecting && this.reset())
    this.#observer.observe(this.element)
    this.reset()
  }

  disconnect() {
    this.#listeners.abort()
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

    for (const group of this.groupTargets) {
      group.hidden = !this.#items.some(item => group.contains(item) && !item.hidden)
    }

    for (const separator of this.separatorTargets) {
      separator.hidden = terms.length > 0
    }

    const visible = this.#visibleItems
    if (this.hasEmptyTarget) this.emptyTarget.hidden = visible.length > 0

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

    this.dispatch("select", { detail: { item, value: item.getAttribute("data-command-value") ?? item.textContent.trim() } })
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
    return this.inputTarget
  }

  get #items() {
    return this.itemTargets
  }

  get #visibleItems() {
    return this.#items.filter(item => !item.hidden && item.getAttribute("aria-disabled") !== "true")
  }
}
application.register("command", controller)
}

// components/confirm/confirm_dialog_controller.js
{
// Asks for confirmation before a form submits or a link is followed:
//
//   <form data-confirm="Are you sure?" data-confirm-text="This cannot be undone.">
//   <button type="submit" data-confirm="Delete this item?">
//   <a href="/logout" data-confirm="Sign out?">
//
// The question is shown in the <dialog data-controller="confirm-dialog"> on the page. When there is no
// such dialog the browser's native confirm() is used instead.

const DEFAULT_CONFIRM_TEXT = "This action cannot be undone and may have permanent consequences."

const confirmed = new WeakSet()
let confirmDialog = null

const controller = class extends Controller {
  static targets = [ "title", "text" ]
  static values = { defaultText: String }

  #resolve = null

  connect() {
    confirmDialog = this
    this.element.addEventListener("close", this.#submit)
  }

  disconnect() {
    this.element.removeEventListener("close", this.#submit)
    if (confirmDialog === this) confirmDialog = null
  }

  confirm(message, text) {
    this.titleTarget.textContent = message
    this.textTarget.textContent  = text || this.defaultTextValue || DEFAULT_CONFIRM_TEXT
    this.element.returnValue = ""
    this.element.showModal()
    return new Promise(resolve => (this.#resolve = resolve))
  }

  #submit = () => {
    this.#resolve?.(this.element.returnValue === "confirm")
    this.#resolve = null
  }
}

function ask(message, text) {
  return confirmDialog ? confirmDialog.confirm(message, text) : Promise.resolve(window.confirm(message))
}

window.addEventListener("submit", event => {
  const form = event.target
  const submitter = event.submitter
  const source = submitter?.hasAttribute("data-confirm") ? submitter : form

  if (!source.hasAttribute("data-confirm")) return

  if (confirmed.has(form)) {
    confirmed.delete(form)
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()

  ask(source.getAttribute("data-confirm"), source.getAttribute("data-confirm-text")).then(confirm => {
    if (confirm) {
      confirmed.add(form)
      submitter ? form.requestSubmit(submitter) : form.requestSubmit()
    }
  })
}, true)

window.addEventListener("click", event => {
  const link = event.target instanceof Element && event.target.closest("a[data-confirm]")

  if (!link) return

  if (confirmed.has(link)) {
    confirmed.delete(link)
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()

  ask(link.getAttribute("data-confirm"), link.getAttribute("data-confirm-text")).then(confirm => {
    if (confirm) {
      confirmed.add(link)
      link.click()
    }
  })
}, true)
application.register("confirm-dialog", controller)
}

// components/context_menu/context_menu_controller.js
{
const controller = class extends Controller {
  static targets = [ "content" ]

  show({ clientX, clientY }) {
    const content = this.contentTarget
    content.style.insetInlineStart = `${clientX}px`
    content.style.insetBlockStart  = `${clientY}px`
    content.showPopover()
  }

  hide({ target }) {
    const content = this.contentTarget
    !content.contains(target) && content.hidePopover()
  }
}
application.register("context-menu", controller)
}

// components/dialog/dialog_controller.js
{
const controller = class extends Controller {
  show() {
    this.element.show()
  }

  showModal() {
    this.element.showModal()
  }

  close() {
    this.element.close()
  }

  closeOnClickOutside({ target }) {
    target.nodeName === "DIALOG" && this.close()
  }
}
application.register("dialog", controller)
}

// components/dropzone/dropzone_controller.js
{
const MESSAGES = {
  type: "This file type is not accepted.",
  size: "This file is too large.",
  count: "Too many files."
}

// A drop area for a file input. Dropped and picked files are validated, previewed and kept
// in the input, so they are submitted with the form like any other file field.
const controller = class extends Controller {
  static targets = [ "input", "files" ]
  static values = {
    typeMessage: { type: String, default: MESSAGES.type },
    sizeMessage: { type: String, default: MESSAGES.size },
    countMessage: { type: String, default: MESSAGES.count },
    maxFileSize: { type: Number, default: Infinity },
    maxFiles: { type: Number, default: Infinity }
  }

  #listeners
  #files = []
  #rejected = []
  #urls = new Map()
  #errors = new WeakMap()

  connect() {
    this.#listeners = new AbortController()
    const { signal } = this.#listeners
    for (const type of [ "dragenter", "dragover", "dragleave", "drop" ]) {
      this.element.addEventListener(type, this.#drag, { signal })
    }
    this.#input.addEventListener("change", this.#picked, { signal })
    this.#input.form?.addEventListener("reset", this.#reset, { signal })
    this.#render()
  }

  disconnect() {
    this.#listeners.abort()
    this.#urls.forEach(url => URL.revokeObjectURL(url))
    this.#urls.clear()
  }

  remove({ currentTarget }) {
    const index = Number(currentTarget.closest("[data-index]").dataset.index)
    const list = currentTarget.closest("[data-error]") ? this.#rejected : this.#files
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
    if (!this.#accepts(file)) return this.typeMessageValue
    if (file.size > this.maxFileSizeValue * 1024 * 1024) return this.sizeMessageValue
    if (this.#files.length >= this.maxFilesValue) return this.countMessageValue
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
    this.dispatch("change", { detail: { files: [ ...this.#files ], rejected: [ ...this.#rejected ] } })
  }

  #render() {
    if (!this.hasFilesTarget) return

    this.filesTarget.replaceChildren(
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
    remove.setAttribute("data-action", "dropzone#remove")
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
    return this.inputTarget
  }
}
application.register("dropzone", controller)
}

// components/dual_range/dual_range_controller.js
{
// Two range inputs that select a minimum and a maximum on one track. Each input is resized
// to cover its half of the range, split at the midpoint between the two values.
// Technique from @stanko/dual-range-input (MIT, https://muffinman.io/dual-range-input).
const controller = class extends Controller {
  static targets = [ "min", "max" ]
  static values = { precision: { type: Number, default: 3 } }

  #listeners
  #min
  #max

  connect() {
    this.#min = this.minTarget
    this.#max = this.maxTarget
    this.#listeners = new AbortController()
    const { signal } = this.#listeners

    for (const type of [ "input", "focus", "mousedown", "touchstart" ]) {
      this.#min.addEventListener(type, this.#updateCeil, { passive: true, signal })
      this.#max.addEventListener(type, this.#updateFloor, { passive: true, signal })
    }

    this.#update("ceil")
    this.#min.setAttribute("data-ready", "")
    this.#max.setAttribute("data-ready", "")
  }

  disconnect() {
    this.#listeners.abort()
  }

  // Moving the minimum rounds the midpoint up, moving the maximum rounds it down, so the
  // input being dragged always gets the extra step.
  #updateCeil = () => this.#update("ceil")

  #updateFloor = () => this.#update("floor")

  #update(round) {
    const thumb = "var(--dual-range-thumb-size)"
    const min = parseFloat(this.#min.min)
    const max = parseFloat(this.#max.max)
    const step = parseFloat(this.#min.step) || 1
    const minValue = parseFloat(this.#min.value)
    const maxValue = parseFloat(this.#max.value)
    const mid = minValue + Math[round]((maxValue - minValue) / 2 / step) * step
    const range = max - min

    this.#min.style.flexBasis = `calc(${this.#fixed((mid - min) / range * 100)}% + ${thumb})`
    this.#max.style.flexBasis = `calc(${this.#fixed((max - mid) / range * 100)}% + ${thumb})`
    this.#min.max = this.#fixed(mid)
    this.#max.min = this.#fixed(mid)

    const minFill = (minValue - min) / (mid - min) || 0
    const maxFill = (maxValue - mid) / (max - mid) || 0
    this.#min.style.setProperty("--dual-range-position", `calc(${this.#fixed(minFill * 100)}% + (${this.#fixed(0.5 - minFill)} * ${thumb}))`)
    this.#max.style.setProperty("--dual-range-position", `calc(${this.#fixed(maxFill * 100)}% + (${this.#fixed(0.5 - maxFill)} * ${thumb}))`)
  }

  #fixed(number) {
    return number.toFixed(this.precisionValue)
  }
}
application.register("dual-range", controller)
}

// components/flash/flash_controller.js
{
const controller = class extends Controller {
  connect() {
    this.element.showPopover()
  }

  hide() {
    this.element.hidePopover()
  }
}
application.register("flash", controller)
}

// components/form/form_controller.js
{
const controller = class extends Controller {
  static targets = [ "submit", "cancel" ]
  static values = { debounce: { type: Number, default: 300 } }

  initialize() {
    this.debouncedSubmit = debounce(this.debouncedSubmit.bind(this), this.debounceValue)
  }

  submit(event) {
    const submitter = event?.params?.submitter

    if (submitter) {
      this.element.requestSubmit(this.#find(submitter))
    } else {
      this.element.requestSubmit()
    }
  }

  debouncedSubmit(event) {
    this.submit(event)
  }

  disableSubmitWhenInvalid() {
    const submit = this.submitTarget

    if (this.element.checkValidity()) {
      submit.removeAttribute("disabled")
    } else {
      submit.toggleAttribute("disabled", true)
    }
  }

  select(event) {
    event.target.select()
  }

  reset() {
    this.element.reset()
  }

  cancel() {
    if (this.hasCancelTarget) this.cancelTarget.click()
  }

  #find(id) {
    return document.getElementById(id) || this.#notFound(id)
  }

  #notFound(id) {
    throw new Error(`Submitter with ID "${id}" not found`)
  }
}

// Trailing-edge debounce.
function debounce(fn, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), wait)
  }
}
application.register("form", controller)
}

// components/fullscreen/fullscreen_controller.js
{
const controller = class extends Controller {
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
application.register("fullscreen", controller)
}

// components/hotkey/hotkey_controller.js
{
const controller = class extends Controller {
  click(event) {
    if (this.#isClickable && !this.#shouldIgnore(event)) {
      event.preventDefault(); this.element.click()
    }
  }

  focus(event) {
    if (this.#isClickable && !this.#shouldIgnore(event)) {
      event.preventDefault(); this.element.focus()
    }
  }

  #shouldIgnore(event) {
    return event.defaultPrevented || event.target.closest("input, textarea")
  }

  get #isClickable() {
    return getComputedStyle(this.element).pointerEvents !== "none"
  }
}
application.register("hotkey", controller)
}

// components/input_clearable/input_clearable_controller.js
{
const controller = class extends Controller {
  static targets = [ "input" ]

  clear() {
    const input = this.inputTarget
    input.value = ""
    input.focus()
  }
}
application.register("input-clearable", controller)
}

// components/input_copyable/input_copyable_controller.js
{
const controller = class extends Controller {
  static targets = [ "input" ]

  async copy() {
    this.#reset()
    this.#writeToClipboard()
  }

  async #writeToClipboard() {
    try {
      await navigator.clipboard.writeText(this.inputTarget.value)
      this.element.classList.add("input--copied")
    } catch {}
  }

  #reset() {
    this.element.classList.remove("input--copied")
    this.#forceReflow()
  }

  #forceReflow() {
    this.element.offsetWidth
  }
}
application.register("input-copyable", controller)
}

// components/input_otp/input_otp_controller.js
{
const PATTERNS = {
  "digits": /\d/,
  "chars": /\p{L}/u,
  "digits-and-chars": /[\p{L}\d]/u
}

// A one-time-code field: one real <input> laid over a row of slots. The input does the
// typing, pasting and autofill; this script shows each character in its slot.
const controller = class extends Controller {
  static targets = [ "input", "slot" ]
  static values = { pattern: { type: String, default: "digits" } }

  #listeners
  #focused = false

  connect() {
    const input = this.#input
    if (!input.hasAttribute("maxlength")) input.maxLength = this.#slots.length
    if (!input.hasAttribute("autocomplete")) input.autocomplete = "one-time-code"
    if (!input.hasAttribute("inputmode")) input.inputMode = this.patternValue === "digits" ? "numeric" : "text"
    if (!input.hasAttribute("spellcheck")) input.spellcheck = false

    this.#listeners = new AbortController()
    const { signal } = this.#listeners
    input.addEventListener("input", this.#changed, { signal })
    input.addEventListener("focus", this.#focus, { signal })
    input.addEventListener("blur", this.#blur, { signal })
    input.addEventListener("select", this.#moveCaretToEnd, { signal })
    input.addEventListener("click", this.#moveCaretToEnd, { signal })
    input.addEventListener("keyup", this.#moveCaretToEnd, { signal })

    input.value = this.#sanitize(input.value)
    this.#render()
  }

  disconnect() {
    this.#listeners.abort()
  }

  #changed = () => {
    const input = this.#input
    const value = this.#sanitize(input.value)
    if (value !== input.value) input.value = value

    this.#render()

    if (value.length === this.#slots.length) {
      this.dispatch("complete", { detail: { value } })
    }
  }

  #focus = () => {
    this.#focused = true
    this.#moveCaretToEnd()
    this.#render()
  }

  #blur = () => {
    this.#focused = false
    this.#render()
  }

  // Characters are always added and removed at the end, like the slots suggest.
  #moveCaretToEnd = () => {
    const input = this.#input
    const end = input.value.length
    if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end)
  }

  #render() {
    const value = this.#input.value
    const slots = this.#slots
    const active = Math.min(value.length, slots.length - 1)

    slots.forEach((slot, index) => {
      slot.textContent = value[index] ?? ""
      slot.toggleAttribute("data-active", this.#focused && index === active)
    })
  }

  #sanitize(value) {
    const allowed = PATTERNS[this.patternValue] ?? PATTERNS.digits
    return [ ...value ].filter(character => allowed.test(character)).join("").slice(0, this.#slots.length)
  }

  get #input() {
    return this.inputTarget
  }

  get #slots() {
    return this.slotTargets
  }
}
application.register("input-otp", controller)
}

// components/input_revealable/input_revealable_controller.js
{
const controller = class extends Controller {
  static targets = [ "input" ]

  reveal() {
    const input = this.inputTarget
    this.element.classList.toggle("input--revealed")
    input.type = input.type === "text" ? "password" : "text"
  }
}
application.register("input-revealable", controller)
}

// components/popover/interest_controller.js
{
// Shows the popover named by data-interest-for-value while the pointer hovers the element.
const controller = class extends Controller {
  static values = { for: String }

  connect() {
    this.element.addEventListener("mouseenter", this.#show)
    this.element.addEventListener("mouseleave", this.#hide)
  }

  disconnect() {
    this.element.removeEventListener("mouseenter", this.#show)
    this.element.removeEventListener("mouseleave", this.#hide)
  }

  #show = () => {
    this.#forElement?.showPopover({ source: this.element })
  }

  #hide = () => {
    this.#forElement?.hidePopover()
  }

  get #forElement() {
    return document.getElementById(this.forValue)
  }
}
application.register("interest", controller)
}

// components/lightbox/lightbox_controller.js
{
const controller = class extends Controller {
  static targets = [ "dialog", "zoomedImage", "download", "share" ]

  show({ currentTarget }) {
    this.dialogTarget.showModal()
    this.#set(currentTarget)
  }

  close() {
    this.dialogTarget.close()
  }

  reset() {
    this.zoomedImageTarget.src = ""
    this.downloadTarget.href = ""
    if (this.hasShareTarget) this.shareTarget.setAttribute("data-web-share-file-value", "")
  }

  #set(link) {
    this.zoomedImageTarget.src = link.href
    this.downloadTarget.href = link.getAttribute("data-lightbox-url")
    if (this.hasShareTarget) this.shareTarget.setAttribute("data-web-share-file-value", link.getAttribute("data-lightbox-url"))
  }
}
application.register("lightbox", controller)
}

// components/local_time/local_time_controller.js
{
// Formats <time datetime="…" data-controller="local-time" data-local-time-format-value="…">
// in the visitor's locale and time zone. The format is time, date, shortdate, datetime or
// ago; "ago" values are refreshed every 30 seconds.

class TimeAgoFormat extends Intl.RelativeTimeFormat {
  format(date) {
    const seconds = (Date.now() - date) / 1000
    const minutes = seconds / 60
    const hours   = minutes / 60
    const days    = hours / 24
    const weeks   = days / 7
    const months  = days / 30.4
    const years   = days / 365

    if (years >= 1) {
      return super.format(-Math.floor(years), "years")
    } else if (months >= 1) {
      return super.format(-Math.floor(months), "months")
    } else if (weeks >= 1) {
      return super.format(-Math.floor(weeks), "weeks")
    } else if (days >= 1) {
      return super.format(-Math.floor(days), "days")
    } else if (hours >= 1) {
      return super.format(-Math.floor(hours), "hours")
    } else if (minutes >= 1) {
      return super.format(-Math.floor(minutes), "minutes")
    } else {
      return this.#formatAsTime(date)
    }
  }

  #formatAsTime(date) {
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date)
  }
}

const formatters = {
  time: new Intl.DateTimeFormat(undefined, { timeStyle: "short" }),
  date: new Intl.DateTimeFormat(undefined, { dateStyle: "long" }),
  shortdate: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  datetime: new Intl.DateTimeFormat(undefined, { timeStyle: "short", dateStyle: "short" }),
  ago: new TimeAgoFormat(undefined, { numeric: "always" })
}

const agoControllers = new Set()
let timer = null

const controller = class extends Controller {
  static values = { format: String }

  connect() {
    this.#render()

    if (this.formatValue === "ago") {
      agoControllers.add(this)
      timer ??= setInterval(() => agoControllers.forEach(controller => controller.#render()), 30_000)
    }
  }

  disconnect() {
    agoControllers.delete(this)

    if (agoControllers.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }

  #render() {
    const formatter = formatters[this.formatValue]

    if (!formatter) {
      console.error(`[velle] Unknown local-time format "${this.formatValue}"`, this.element)
      return
    }

    const date = new Date(this.element.getAttribute("datetime"))
    this.element.textContent = formatter.format(date)
    this.element.title = formatters.datetime.format(date)
  }
}
application.register("local-time", controller)
}

// components/menu/menu_controller.js
{
// Roving tabindex for menus: arrow keys move focus between data-menu-target="item"
// elements, and the first item is focused every time the menu becomes visible.
const controller = class extends Controller {
  static targets = [ "item" ]

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
    return this.itemTargets
  }
}
application.register("menu", controller)
}

// components/resizable/resizable_controller.js
{
// Panels separated by draggable handles. Sizes are percentages of the group, applied as
// flex-grow, so the panels always fill it.
const controller = class extends Controller {
  static targets = [ "panel", "handle" ]

  #sizes = new Map()
  #drag = null

  connect() {
    this.#applyInitialSizes()
    this.element.addEventListener("pointerdown", this.#pointerdown)
    this.element.addEventListener("keydown", this.#keydown)
  }

  disconnect() {
    this.element.removeEventListener("pointerdown", this.#pointerdown)
    this.element.removeEventListener("keydown", this.#keydown)
    this.#stopDragging()
  }

  // Panels with data-resizable-size keep it; the rest share what is left equally.
  #applyInitialSizes() {
    const panels = this.#panels
    const given = panels.map(panel => parseFloat(panel.getAttribute("data-resizable-size")))
    const taken = given.filter(size => !isNaN(size)).reduce((sum, size) => sum + size, 0)
    const unsized = given.filter(size => isNaN(size)).length
    const share = unsized ? Math.max(100 - taken, 0) / unsized : 0

    panels.forEach((panel, index) => this.#setSize(panel, isNaN(given[index]) ? share : given[index]))
    this.#handles.forEach(handle => this.#updateHandle(handle))
  }

  #pointerdown = event => {
    const handle = this.#handleFor(event.target)
    if (!handle || event.button !== 0) return

    const [ before, after ] = this.#neighbours(handle)
    if (!before || !after) return

    event.preventDefault()
    handle.focus()
    handle.setPointerCapture(event.pointerId)

    this.#drag = {
      handle, before, after,
      start: this.#position(event),
      beforeSize: this.#sizes.get(before),
      afterSize: this.#sizes.get(after),
      available: this.#panels.reduce((sum, panel) => sum + this.#length(panel.getBoundingClientRect()), 0)
    }

    handle.setAttribute("data-dragging", "")
    this.element.setAttribute("data-dragging", "")
    handle.addEventListener("pointermove", this.#pointermove)
    handle.addEventListener("pointerup", this.#stopDragging)
    handle.addEventListener("pointercancel", this.#stopDragging)
  }

  #pointermove = event => {
    const drag = this.#drag
    if (!drag || drag.available === 0) return

    const delta = (this.#position(event) - drag.start) / drag.available * 100 * this.#direction
    this.#resize(drag.handle, drag.before, drag.after, drag.beforeSize + delta, drag.beforeSize + drag.afterSize)
  }

  #stopDragging = () => {
    const drag = this.#drag
    if (!drag) return

    drag.handle.removeAttribute("data-dragging")
    this.element.removeAttribute("data-dragging")
    drag.handle.removeEventListener("pointermove", this.#pointermove)
    drag.handle.removeEventListener("pointerup", this.#stopDragging)
    drag.handle.removeEventListener("pointercancel", this.#stopDragging)
    this.#drag = null
  }

  #keydown = event => {
    const handle = this.#handleFor(event.target)
    if (!handle || event.target !== handle) return

    const [ before, after ] = this.#neighbours(handle)
    if (!before || !after) return

    const step = event.shiftKey ? 10 : 1
    const [ backward, forward ] = this.#vertical ? [ "ArrowUp", "ArrowDown" ]
      : this.#direction === 1 ? [ "ArrowLeft", "ArrowRight" ] : [ "ArrowRight", "ArrowLeft" ]
    const total = this.#sizes.get(before) + this.#sizes.get(after)
    let size

    switch (event.key) {
      case backward: size = this.#sizes.get(before) - step; break
      case forward: size = this.#sizes.get(before) + step; break
      case "Home": size = 0; break
      case "End": size = total; break
      default: return
    }

    event.preventDefault()
    this.#resize(handle, before, after, size, total)
  }

  // Gives `before` the requested size and `after` the rest of `total`, within each
  // panel's data-resizable-min and data-resizable-max.
  #resize(handle, before, after, size, total) {
    const lower = Math.max(this.#limit(before, "min", 0), total - this.#limit(after, "max", 100))
    const upper = Math.min(this.#limit(before, "max", 100), total - this.#limit(after, "min", 0))
    const clamped = Math.min(Math.max(size, lower), upper)

    if (clamped === this.#sizes.get(before)) return

    this.#setSize(before, clamped)
    this.#setSize(after, total - clamped)
    this.#updateHandle(handle)
    this.dispatch("resize", { detail: { sizes: this.#panels.map(panel => this.#sizes.get(panel)) } })
  }

  #setSize(panel, size) {
    this.#sizes.set(panel, size)
    panel.style.flexGrow = size
  }

  #updateHandle(handle) {
    const [ before ] = this.#neighbours(handle)
    handle.setAttribute("role", "separator")
    handle.setAttribute("aria-orientation", this.#vertical ? "horizontal" : "vertical")
    if (!handle.hasAttribute("tabindex")) handle.tabIndex = 0
    handle.setAttribute("aria-valuemin", "0")
    handle.setAttribute("aria-valuemax", "100")
    if (before) handle.setAttribute("aria-valuenow", Math.round(this.#sizes.get(before)))
  }

  #neighbours(handle) {
    const panels = this.#panels
    const before = handle.previousElementSibling
    const after = handle.nextElementSibling
    return [ panels.includes(before) ? before : null, panels.includes(after) ? after : null ]
  }

  #handleFor(element) {
    const handle = element instanceof Element ? element.closest('[data-resizable-target~="handle"]') : null
    return handle && this.#handles.includes(handle) ? handle : null
  }

  #limit(panel, name, fallback) {
    const value = parseFloat(panel.getAttribute(`data-resizable-${name}`))
    return isNaN(value) ? fallback : value
  }

  #position(event) {
    return this.#vertical ? event.clientY : event.clientX
  }

  #length(rect) {
    return this.#vertical ? rect.height : rect.width
  }

  // In right-to-left layouts the first panel is on the right, so horizontal movement flips.
  get #direction() {
    return !this.#vertical && getComputedStyle(this.element).direction === "rtl" ? -1 : 1
  }

  get #vertical() {
    return this.element.classList.contains("resizable--vertical")
  }

  get #panels() {
    return this.panelTargets
  }

  get #handles() {
    return this.handleTargets
  }
}
application.register("resizable", controller)
}

// components/tabs/tabs_controller.js
{
const controller = class extends Controller {
  static targets = [ "button", "tab" ]
  static values = { index: Number }

  select({ currentTarget }) {
    this.indexValue = this.buttonTargets.indexOf(currentTarget)
  }

  prev() {
    if (this.indexValue > 0) {
      this.indexValue--
      this.#focusCurrentButton()
    }
  }

  next() {
    if (this.indexValue < this.#lastIndex) {
      this.indexValue++
      this.#focusCurrentButton()
    }
  }

  indexValueChanged() {
    const index = this.indexValue

    this.buttonTargets.forEach((it, i) => {
      it.ariaSelected = String(i === index)
      it.tabIndex = i === index ? 0 : -1
    })

    this.tabTargets.forEach((it, i) => {
      it.hidden = i !== index
    })

    this.dispatch("change", { detail: { index } })
  }

  #focusCurrentButton() {
    this.buttonTargets[this.indexValue].focus()
  }

  get #lastIndex() {
    return this.tabTargets.length - 1
  }
}
application.register("tabs", controller)
}

// components/timezone_cookie/timezone_cookie_controller.js
{
// Stores the visitor's IANA time zone in a "timezone" cookie so the server can read it.
// Put data-controller="timezone-cookie" on any element, usually <body>.
const controller = class extends Controller {
  connect() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `timezone=${encodeURIComponent(timezone)}; path=/`
  }
}
application.register("timezone-cookie", controller)
}

// components/toggle_class/toggle_class_controller.js
{
// <div data-controller="toggle-class" data-toggle-class-toggle-class="closed"> toggles the
// "closed" class on itself.
const controller = class extends Controller {
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
application.register("toggle-class", controller)
}

// components/upload_preview/upload_preview_controller.js
{
const controller = class extends Controller {
  static targets = [ "input", "image", "removeInput" ]
  static values = { defaultImage: String }

  previewImage() {
    const selectedFile = this.inputTarget.files[0]

    if (selectedFile) {
      const image = this.imageTarget
      image.src = URL.createObjectURL(selectedFile)
      image.onload = () => { URL.revokeObjectURL(image.src) }
      this.removeInputTarget.value = false
    }
  }

  clear() {
    this.imageTarget.src = this.defaultImageValue
    this.removeInputTarget.value = true
  }
}
application.register("upload-preview", controller)
}

// components/web_share/web_share_controller.js
{
// Prefix for the names of shared files, e.g. "my_application_x1y2z3.jpg".
const APPLICATION_NAME = "my_application"

const controller = class extends Controller {
  static values = { title: String, text: String, url: String, file: String }

  connect() {
    this.element.hidden = !navigator.canShare
  }

  async share() {
    try {
      await navigator.share(await this.#getShareData())
    } catch {}
  }

  async #getShareData() {
    const data = { title: this.titleValue, text: this.textValue }

    if (this.urlValue) {
      data.url = this.urlValue
    }

    if (this.fileValue) {
      data.files = [await this.#getFileObject()]
    }

    return data
  }

  async #getFileObject() {
    const response = await fetch(this.fileValue)
    const blob = await response.blob()
    const randomPrefix = `${APPLICATION_NAME}_${Math.random().toString(36).slice(2)}`
    const fileName = `${randomPrefix}.${blob.type.split('/').pop()}`

    return new File([ blob ], fileName, { type: blob.type })
  }
}
application.register("web-share", controller)
}
