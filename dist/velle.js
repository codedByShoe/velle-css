/*!
 * velle-css 0.1.0 | MIT License | https://github.com/codedbyshoe/velle-css
 * Based on css-zero by Lázaro Nixon (https://github.com/lazaronixon/css-zero)
 */

// velle.js — the tiny runtime shared by every velle-css behavior.
//
// It gives plain data attributes a controller lifecycle:
//
//   <div data-tabs>                                   controller root
//     <button data-tabs-target="button"               target
//             data-tabs-action="click->select">       action
//
// Action syntax: "[event[.keyfilter][@document|@window]->]method[:prevent][:stop][:self]"
// separated by whitespace. When the event is omitted the element's default event is used
// (click for buttons and links, input for inputs and textareas, change for selects,
// submit for forms, toggle for details).

const registrations = []
const instances = new WeakMap()
const bindings = new WeakMap()
let observer = null

// observe(selector, { connect, disconnect }) runs connect(element) once for every element
// that matches the selector (now or later) and disconnect(element) when it stops matching
// or leaves the document.
export function observe(selector, { connect, disconnect } = {}) {
  const registration = { selector, connect, disconnect, elements: new Set() }
  registrations.push(registration)
  whenReady(() => {
    scan(registration, document.documentElement)
    start()
  })
  return registration
}

// define(name, Class) registers a controller. Every element with a data-<name> attribute
// gets its own instance, and data-<name>-action attributes are routed to the instance of
// the closest root.
export function define(name, Controller) {
  const rootSelector = `[data-${name}]`
  const actionAttribute = `data-${name}-action`

  observe(rootSelector, {
    connect(element) {
      const controller = new Controller(element, name)
      instances.set(element, controller)
      controller.connect()
    },
    disconnect(element) {
      const controller = instances.get(element)
      instances.delete(element)
      controller?.disconnect()
    }
  })

  observe(`[${actionAttribute}]`, {
    connect(element) {
      const listeners = parseActions(element.getAttribute(actionAttribute), element).map(action => {
        const listener = event => invoke(name, rootSelector, action, element, event)
        const eventTarget = action.global === "window" ? window : action.global === "document" ? document : element
        eventTarget.addEventListener(action.event, listener)
        return { eventTarget, event: action.event, listener }
      })
      bindings.set(element, listeners)
    },
    disconnect(element) {
      bindings.get(element)?.forEach(({ eventTarget, event, listener }) => eventTarget.removeEventListener(event, listener))
      bindings.delete(element)
    }
  })
}

export class Controller {
  constructor(element, name) {
    this.element = element
    this.name = name
  }

  connect() {}

  disconnect() {}

  // All elements with data-<name>-target="<target>" that belong to this root.
  targets(target) {
    return [ ...this.element.querySelectorAll(`[data-${this.name}-target~="${target}"]`) ]
      .filter(element => element.closest(`[data-${this.name}]`) === this.element)
  }

  target(target) {
    return this.targets(target)[0] ?? null
  }

  hasTarget(target) {
    return this.target(target) !== null
  }

  // Reads data-<name>-<key> from the root element.
  data(key) {
    return this.element.getAttribute(`data-${this.name}-${key}`)
  }

  hasData(key) {
    return this.element.hasAttribute(`data-${this.name}-${key}`)
  }

  // Dispatches a bubbling "velle:<name>:<type>" CustomEvent from the root element.
  dispatch(type, detail = {}) {
    this.element.dispatchEvent(new CustomEvent(`velle:${this.name}:${type}`, { bubbles: true, detail }))
  }
}

// Trailing-edge debounce.
export function debounce(fn, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), wait)
  }
}

// --- Actions ----------------------------------------------------------------------------

const actionPattern = /^(?:([^.@\s]+?)(?:\.([^@\s]+?))?(?:@(window|document))?->)?(\w+)((?::\w+)*)$/

const defaultEvents = {
  a: () => "click",
  button: () => "click",
  details: () => "toggle",
  form: () => "submit",
  input: element => element.type === "submit" ? "click" : "input",
  select: () => "change",
  textarea: () => "input"
}

const keyMappings = {
  enter: "Enter", tab: "Tab", esc: "Escape", space: " ",
  up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
  home: "Home", end: "End", page_up: "PageUp", page_down: "PageDown",
  ...Object.fromEntries("abcdefghijklmnopqrstuvwxyz".split("").map(key => [ key, key ])),
  ...Object.fromEntries("0123456789".split("").map(key => [ key, key ]))
}

const modifierKeys = [ "meta", "ctrl", "alt", "shift" ]

function parseActions(value, element) {
  return (value || "").trim().split(/\s+/).filter(Boolean).flatMap(descriptor => {
    const match = descriptor.match(actionPattern)

    if (!match) {
      console.error(`[velle] Invalid action "${descriptor}"`, element)
      return []
    }

    const [ , event, keyFilter, global, method, options ] = match
    const eventName = event || defaultEvents[element.localName]?.(element)

    if (!eventName) {
      console.error(`[velle] Action "${descriptor}" needs an event name`, element)
      return []
    }

    return [ { event: eventName, keyFilter, global, method, options: options.split(":").filter(Boolean) } ]
  })
}

function invoke(name, rootSelector, action, element, event) {
  if (action.keyFilter && isKeyboardEvent(event) && !keyFilterMatches(event, action.keyFilter)) return
  if (action.options.includes("self") && event.target !== element) return

  const root = element.closest(rootSelector)
  const controller = root && instances.get(root)

  if (!controller) {
    console.error(`[velle] No ${rootSelector} root found for action "${action.method}"`, element)
    return
  }

  if (typeof controller[action.method] !== "function") {
    console.error(`[velle] "${action.method}" is not an action of ${name}`, element)
    return
  }

  if (action.options.includes("prevent")) event.preventDefault()
  if (action.options.includes("stop")) event.stopPropagation()

  Object.assign(event, { params: paramsFor(name, element) })
  controller[action.method](event, element)
}

function isKeyboardEvent(event) {
  return event.type === "keydown" || event.type === "keyup" || event.type === "keypress"
}

function keyFilterMatches(event, keyFilter) {
  const filters = keyFilter.split("+")
  const [ meta, ctrl, alt, shift ] = modifierKeys.map(modifier => filters.includes(modifier))

  if (event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== alt || event.shiftKey !== shift) return false

  const standardFilter = filters.find(key => !modifierKeys.includes(key))
  if (!standardFilter) return true

  const key = keyMappings[standardFilter]
  if (!key) {
    console.error(`[velle] Unknown key filter "${standardFilter}"`)
    return false
  }

  return key.toLowerCase() === event.key.toLowerCase()
}

// data-<name>-<param>-param attributes on the action element. Values that parse as JSON
// (numbers, booleans, objects) are typecast; everything else stays a string.
function paramsFor(name, element) {
  const pattern = new RegExp(`^data-${name}-(.+)-param$`)
  const params = {}

  for (const { name: attribute, value } of element.attributes) {
    const match = attribute.match(pattern)
    if (match) params[camelize(match[1])] = typecast(value)
  }

  return params
}

function camelize(value) {
  return value.replace(/-(\w)/g, (_, character) => character.toUpperCase())
}

function typecast(value) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// --- Lifecycle --------------------------------------------------------------------------

function whenReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true })
  } else {
    callback()
  }
}

function start() {
  if (observer) return

  observer = new MutationObserver(mutations => {
    let removed = false

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) registrations.forEach(registration => scan(registration, node))
        }
        if (mutation.removedNodes.length) removed = true
      } else if (mutation.type === "attributes") {
        registrations.forEach(registration => refresh(registration, mutation.target))
      }
    }

    if (removed) registrations.forEach(prune)
  })

  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
}

function scan(registration, root) {
  if (root.matches(registration.selector)) add(registration, root)
  root.querySelectorAll(registration.selector).forEach(element => add(registration, element))
}

function refresh(registration, element) {
  if (!element.isConnected) return

  if (element.matches(registration.selector)) {
    add(registration, element)
  } else {
    remove(registration, element)
  }
}

function prune(registration) {
  registration.elements.forEach(element => {
    if (!element.isConnected) remove(registration, element)
  })
}

function add(registration, element) {
  if (registration.elements.has(element)) return
  registration.elements.add(element)
  run(registration.connect, element)
}

function remove(registration, element) {
  if (!registration.elements.has(element)) return
  registration.elements.delete(element)
  run(registration.disconnect, element)
}

function run(callback, element) {
  try {
    callback?.(element)
  } catch (error) {
    console.error(error)
  }
}

// components/autosave/autosave.js
{

const AUTOSAVE_INTERVAL = 3000

define("autosave", class extends Controller {
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
      this.dispatch(response.ok ? "success" : "error", { response })
    } catch (error) {
      this.dispatch("error", { error })
    } finally {
      this.#toggleSaving(false)
    }
  }

  #toggleSaving(saving) {
    this.element.ariaBusy = saving
    const submit = this.target("submit")
    if (submit) submit.disabled = saving
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
})
}

// components/autoselect/autoselect.js
{

define("autoselect", class extends Controller {
  connect() {
    this.#autoselect && this.element.select()
  }

  get #autoselect() {
    return this.element.autofocus
  }
})
}

// components/carousel/carousel.js
{

define("carousel", class extends Controller {
  next() {
    this.target("content").scrollBy(100, 0)
  }

  prev() {
    this.target("content").scrollBy(-100, 0)
  }
})
}

// components/check_all/check_all.js
{

define("check-all", class extends Controller {
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
    return this.target("dependee")
  }

  get #dependants() {
    return this.targets("dependant")
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
})
}

// components/collapsible/collapsible.js
{

define("collapsible", class extends Controller {
  open() {
    this.target("details").open = true
  }

  close() {
    this.target("details").open = false
  }

  toggle() {
    this.target("details").open ? this.close() : this.open()
  }
})
}

// components/color_scheme/color_scheme.js
{

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
}

// components/command/command.js
{

let uid = 0

// A command palette: a search field that filters a list of items, with keyboard
// navigation. Activating an item clicks it, so links navigate and buttons run.
define("command", class extends Controller {
  #observer
  #selected = null

  connect() {
    this.#input.setAttribute("role", "combobox")
    this.#input.setAttribute("aria-expanded", "true")
    this.#input.setAttribute("aria-autocomplete", "list")
    this.#input.addEventListener("input", this.#filter)
    this.#input.addEventListener("keydown", this.#keydown)
    this.element.addEventListener("pointermove", this.#pointermove)
    this.element.addEventListener("click", this.#click)

    // Start fresh every time the palette becomes visible, e.g. when its dialog opens.
    this.#observer = new IntersectionObserver(([ entry ]) => entry.isIntersecting && this.reset())
    this.#observer.observe(this.element)
    this.reset()
  }

  disconnect() {
    this.#input.removeEventListener("input", this.#filter)
    this.#input.removeEventListener("keydown", this.#keydown)
    this.element.removeEventListener("pointermove", this.#pointermove)
    this.element.removeEventListener("click", this.#click)
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

    for (const group of this.targets("group")) {
      group.hidden = !this.#items.some(item => group.contains(item) && !item.hidden)
    }

    for (const separator of this.targets("separator")) {
      separator.hidden = terms.length > 0
    }

    const visible = this.#visibleItems
    const empty = this.target("empty")
    if (empty) empty.hidden = visible.length > 0

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

    this.dispatch("select", { item, value: item.getAttribute("data-command-value") ?? item.textContent.trim() })
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
    return this.target("input")
  }

  get #items() {
    return this.targets("item")
  }

  get #visibleItems() {
    return this.#items.filter(item => !item.hidden && item.getAttribute("aria-disabled") !== "true")
  }
})
}

// components/confirm/confirm.js
{

// Asks for confirmation before a form submits or a link is followed:
//
//   <form data-confirm="Are you sure?" data-confirm-text="This cannot be undone.">
//   <button type="submit" data-confirm="Delete this item?">
//   <a href="/logout" data-confirm="Sign out?">
//
// The question is shown in the <dialog data-confirm-dialog> on the page. When there is no
// such dialog the browser's native confirm() is used instead.

const DEFAULT_CONFIRM_TEXT = "This action cannot be undone and may have permanent consequences."

const confirmed = new WeakSet()
let confirmDialog = null

define("confirm-dialog", class extends Controller {
  #resolve = null

  connect() {
    confirmDialog = this
    this.element.addEventListener("close", this.#submit)
  }

  disconnect() {
    if (confirmDialog === this) confirmDialog = null
    this.element.removeEventListener("close", this.#submit)
  }

  confirm(message, text) {
    this.target("title").textContent = message
    this.target("text").textContent  = text || this.data("default-text") || DEFAULT_CONFIRM_TEXT
    this.element.returnValue = ""
    this.element.showModal()
    return new Promise(resolve => (this.#resolve = resolve))
  }

  #submit = () => {
    this.#resolve?.(this.element.returnValue === "confirm")
    this.#resolve = null
  }
})

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
}

// components/context_menu/context_menu.js
{

define("context-menu", class extends Controller {
  show({ clientX, clientY }) {
    const content = this.target("content")
    content.style.insetInlineStart = `${clientX}px`
    content.style.insetBlockStart  = `${clientY}px`
    content.showPopover()
  }

  hide({ target }) {
    const content = this.target("content")
    !content.contains(target) && content.hidePopover()
  }
})
}

// components/dialog/dialog.js
{

define("dialog", class extends Controller {
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
})
}

// components/dropzone/dropzone.js
{

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
}

// components/dual_range/dual_range.js
{

// Two range inputs that select a minimum and a maximum on one track. Each input is resized
// to cover its half of the range, split at the midpoint between the two values.
// Technique from @stanko/dual-range-input (MIT, https://muffinman.io/dual-range-input).
define("dual-range", class extends Controller {
  #min
  #max

  connect() {
    this.#min = this.target("min")
    this.#max = this.target("max")

    for (const type of [ "input", "focus", "mousedown", "touchstart" ]) {
      this.#min.addEventListener(type, this.#updateCeil, { passive: true })
      this.#max.addEventListener(type, this.#updateFloor, { passive: true })
    }

    this.#update("ceil")
    this.#min.setAttribute("data-ready", "")
    this.#max.setAttribute("data-ready", "")
  }

  disconnect() {
    for (const type of [ "input", "focus", "mousedown", "touchstart" ]) {
      this.#min.removeEventListener(type, this.#updateCeil)
      this.#max.removeEventListener(type, this.#updateFloor)
    }
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
    return number.toFixed(this.#precision)
  }

  get #precision() {
    return this.hasData("precision") ? Number(this.data("precision")) : 3
  }
})
}

// components/flash/flash.js
{

define("flash", class extends Controller {
  connect() {
    this.element.showPopover()
  }

  hide() {
    this.element.hidePopover()
  }
})
}

// components/form/form.js
{

define("form", class extends Controller {
  constructor(element, name) {
    super(element, name)
    this.debouncedSubmit = debounce(this.debouncedSubmit.bind(this), this.#debounceTimeout)
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
    const submit = this.target("submit")

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
    this.target("cancel")?.click()
  }

  #find(id) {
    return document.getElementById(id) || this.#notFound(id)
  }

  #notFound(id) {
    throw new Error(`Submitter with ID "${id}" not found`)
  }

  get #debounceTimeout() {
    return this.hasData("debounce") ? Number(this.data("debounce")) : 300
  }
})
}

// components/fullscreen/fullscreen.js
{

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
}

// components/hotkey/hotkey.js
{

define("hotkey", class extends Controller {
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
})
}

// components/input_clearable/input_clearable.js
{

define("input-clearable", class extends Controller {
  clear() {
    const input = this.target("input")
    input.value = ""
    input.focus()
  }
})
}

// components/input_copyable/input_copyable.js
{

define("input-copyable", class extends Controller {
  async copy() {
    this.#reset()
    this.#writeToClipboard()
  }

  async #writeToClipboard() {
    try {
      await navigator.clipboard.writeText(this.target("input").value)
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
})
}

// components/input_otp/input_otp.js
{

const PATTERNS = {
  "digits": /\d/,
  "chars": /\p{L}/u,
  "digits-and-chars": /[\p{L}\d]/u
}

// A one-time-code field: one real <input> laid over a row of slots. The input does the
// typing, pasting and autofill; this script shows each character in its slot.
define("input-otp", class extends Controller {
  #focused = false

  connect() {
    const input = this.#input
    if (!input.hasAttribute("maxlength")) input.maxLength = this.#slots.length
    if (!input.hasAttribute("autocomplete")) input.autocomplete = "one-time-code"
    if (!input.hasAttribute("inputmode")) input.inputMode = this.#pattern === "digits" ? "numeric" : "text"
    if (!input.hasAttribute("spellcheck")) input.spellcheck = false

    input.addEventListener("input", this.#changed)
    input.addEventListener("focus", this.#focus)
    input.addEventListener("blur", this.#blur)
    input.addEventListener("select", this.#moveCaretToEnd)
    input.addEventListener("click", this.#moveCaretToEnd)
    input.addEventListener("keyup", this.#moveCaretToEnd)

    input.value = this.#sanitize(input.value)
    this.#render()
  }

  disconnect() {
    const input = this.#input
    input.removeEventListener("input", this.#changed)
    input.removeEventListener("focus", this.#focus)
    input.removeEventListener("blur", this.#blur)
    input.removeEventListener("select", this.#moveCaretToEnd)
    input.removeEventListener("click", this.#moveCaretToEnd)
    input.removeEventListener("keyup", this.#moveCaretToEnd)
  }

  #changed = () => {
    const input = this.#input
    const value = this.#sanitize(input.value)
    if (value !== input.value) input.value = value

    this.#render()

    if (value.length === this.#slots.length) {
      this.dispatch("complete", { value })
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
    const allowed = PATTERNS[this.#pattern] ?? PATTERNS.digits
    return [ ...value ].filter(character => allowed.test(character)).join("").slice(0, this.#slots.length)
  }

  get #input() {
    return this.target("input")
  }

  get #slots() {
    return this.targets("slot")
  }

  get #pattern() {
    return this.data("pattern") ?? "digits"
  }
})
}

// components/input_revealable/input_revealable.js
{

define("input-revealable", class extends Controller {
  reveal() {
    const input = this.target("input")
    this.element.classList.toggle("input--revealed")
    input.type = input.type === "text" ? "password" : "text"
  }
})
}

// components/popover/interest.js
{

// Shows the popover named by data-interest-for while the pointer hovers the element.
define("interest", class extends Controller {
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
    return document.getElementById(this.data("for"))
  }
})
}

// components/lightbox/lightbox.js
{

define("lightbox", class extends Controller {
  show(event, link) {
    this.target("dialog").showModal()
    this.#set(link)
  }

  close() {
    this.target("dialog").close()
  }

  reset() {
    this.target("zoomedImage").src = ""
    this.target("download").href = ""
    this.target("share")?.setAttribute("data-web-share-file", "")
  }

  #set(link) {
    this.target("zoomedImage").src = link.href
    this.target("download").href = link.getAttribute("data-lightbox-url")
    this.target("share")?.setAttribute("data-web-share-file", link.getAttribute("data-lightbox-url"))
  }
})
}

// components/local_time/local_time.js
{

// Formats <time datetime="…" data-local-time="time|date|shortdate|datetime|ago"> in the
// visitor's locale and time zone. "ago" values are refreshed every 30 seconds.

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

const agoElements = new Set()
let timer = null

function formatTime(element) {
  const formatter = formatters[element.getAttribute("data-local-time")]

  if (!formatter) {
    console.error(`[velle] Unknown data-local-time format "${element.getAttribute("data-local-time")}"`, element)
    return
  }

  const date = new Date(element.getAttribute("datetime"))
  element.textContent = formatter.format(date)
  element.title = formatters.datetime.format(date)
}

observe("[data-local-time]", {
  connect(element) {
    formatTime(element)

    if (element.getAttribute("data-local-time") === "ago") {
      agoElements.add(element)
      timer ??= setInterval(() => agoElements.forEach(formatTime), 30_000)
    }
  },
  disconnect(element) {
    agoElements.delete(element)

    if (agoElements.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
})
}

// components/menu/menu.js
{

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
}

// components/resizable/resizable.js
{

// Panels separated by draggable handles. Sizes are percentages of the group, applied as
// flex-grow, so the panels always fill it.
define("resizable", class extends Controller {
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
    this.dispatch("resize", { sizes: this.#panels.map(panel => this.#sizes.get(panel)) })
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
    return this.targets("panel")
  }

  get #handles() {
    return this.targets("handle")
  }
})
}

// components/tabs/tabs.js
{

define("tabs", class extends Controller {
  connect() {
    this.#showCurrentTab()
  }

  select({ target }) {
    this.#index = this.targets("button").indexOf(target.closest(`[data-tabs-target~="button"]`))
    this.#showCurrentTab()
  }

  prev() {
    if (this.#index > 0) {
      this.#index--
      this.#showCurrentTab()
      this.#focusCurrentButton()
    }
  }

  next() {
    if (this.#index < this.#lastIndex) {
      this.#index++
      this.#showCurrentTab()
      this.#focusCurrentButton()
    }
  }

  #showCurrentTab() {
    const index = this.#index

    this.targets("button").forEach((it, i) => {
      it.ariaSelected = i === index
      it.tabIndex = i === index ? 0 : -1
    })

    this.targets("tab").forEach((it, i) => {
      it.hidden = i !== index
    })

    this.dispatch("change", { index })
  }

  #focusCurrentButton() {
    this.targets("button")[this.#index].focus()
  }

  get #index() {
    return Number(this.data("index")) || 0
  }

  set #index(value) {
    this.element.setAttribute("data-tabs-index", value)
  }

  get #lastIndex() {
    return this.targets("tab").length - 1
  }
})
}

// components/timezone_cookie/timezone_cookie.js
{

// Stores the visitor's IANA time zone in a "timezone" cookie so the server can read it.
// Put data-timezone-cookie on any element, usually <body>.
observe("[data-timezone-cookie]", {
  connect() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `timezone=${encodeURIComponent(timezone)}; path=/`
  }
})
}

// components/toggle_class/toggle_class.js
{

// <div data-toggle-class="closed"> toggles the "closed" class on itself.
define("toggle-class", class extends Controller {
  toggle() {
    this.element.classList.toggle(this.#toggleClass)
  }

  add() {
    this.element.classList.add(this.#toggleClass)
  }

  remove() {
    this.element.classList.remove(this.#toggleClass)
  }

  get #toggleClass() {
    return this.element.getAttribute("data-toggle-class")
  }
})
}

// components/upload_preview/upload_preview.js
{

define("upload-preview", class extends Controller {
  previewImage() {
    const selectedFile = this.target("input").files[0]

    if (selectedFile) {
      const image = this.target("image")
      image.src = URL.createObjectURL(selectedFile)
      image.onload = () => { URL.revokeObjectURL(image.src) }
      this.target("removeInput").value = false
    }
  }

  clear() {
    this.target("image").src = this.data("default-image")
    this.target("removeInput").value = true
  }
})
}

// components/web_share/web_share.js
{

// Prefix for the names of shared files, e.g. "my_application_x1y2z3.jpg".
const APPLICATION_NAME = "my_application"

define("web-share", class extends Controller {
  connect() {
    this.element.hidden = !navigator.canShare
  }

  async share() {
    try {
      await navigator.share(await this.#getShareData())
    } catch {}
  }

  async #getShareData() {
    const data = { title: this.data("title") ?? "", text: this.data("text") ?? "" }

    if (this.data("url")) {
      data.url = this.data("url")
    }

    if (this.data("file")) {
      data.files = [await this.#getFileObject()]
    }

    return data
  }

  async #getFileObject() {
    const response = await fetch(this.data("file"))
    const blob = await response.blob()
    const randomPrefix = `${APPLICATION_NAME}_${Math.random().toString(36).slice(2)}`
    const fileName = `${randomPrefix}.${blob.type.split('/').pop()}`

    return new File([ blob ], fileName, { type: blob.type })
  }
})
}
