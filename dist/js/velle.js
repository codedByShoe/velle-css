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
//
// controller({ targets, values }) builds a base class. Each value is a property stored in
// data-<name>-<key> and parsed by its default's type. <key>Changed(value, oldValue) runs
// after the attribute changes, never during connect(), so call it from connect() to render
// the initial state. this.$.x and this.$$.x are target("x") and targets("x"). Listeners
// added with on(), and anything given this.signal, end when the controller disconnects.
// controllerFor(element, name) returns a connected instance to code outside controllers.
// prepareSnapshot() calls each controller's beforeSnapshot(), for libraries that save a copy
// of the page; beforeSnapshot() can return a function that undoes what it did.

const registrations = []
const instances = new WeakMap()
const bindings = new WeakMap()
const abort = Symbol("abort")
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
      if (!instances.has(element)) instances.set(element, new Map())
      instances.get(element).set(name, controller)
      controller.connect()
    },
    disconnect(element) {
      const controller = instances.get(element)?.get(name)
      instances.get(element)?.delete(name)
      try { controller?.disconnect() } finally { controller?.[abort].abort() }
    }
  })

  const actions = observe(`[${actionAttribute}]`, {
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
  actions.attribute = actionAttribute
}

// The connected instance of a controller on an element, or null.
export function controllerFor(element, name) {
  return instances.get(element)?.get(name) ?? null
}

// Asks every connected controller to leave the DOM as a saved copy of the page should have
// it. Returns a function that puts it back, for a page that stays live after the copy.
export function prepareSnapshot() {
  const undo = []
  for (const element of new Set(registrations.flatMap(({ elements }) => [ ...elements ]))) {
    instances.get(element)?.forEach(controller => run(() => undo.push(controller.beforeSnapshot?.()), element))
  }
  return () => undo.forEach(callback => run(callback))
}

export class Controller {
  constructor(element, name) {
    this.element = element
    this.name = name
    this[abort] = new AbortController()
    this.$ = new Proxy({}, { get: (_, key) => this.target(key) })
    this.$$ = new Proxy({}, { get: (_, key) => this.targets(key) })
  }

  connect() {}

  disconnect() {}

  get signal() { return this[abort].signal }

  // addEventListener that is removed automatically when the controller disconnects.
  on(target, type, listener, options) {
    target.addEventListener(type, listener, { ...options, signal: this.signal })
  }

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

// A Controller subclass with a property for each value. `targets` only feeds the types.
export function controller({ values = {} } = {}) {
  const Base = class extends Controller {}
  Base.values = values
  for (const [ key, fallback ] of Object.entries(values)) {
    if (key in Base.prototype || [ "element", "name", "action", "$", "$$" ].includes(key)) throw new Error(`[velle] "${key}" is reserved`)
    Object.defineProperty(Base.prototype, key, {
      get() { return read(this.data(dasherize(key)), fallback) },
      set(value) {
        this.element.setAttribute(`data-${this.name}-${dasherize(key)}`, typeof value === "string" ? value : JSON.stringify(value))
      }
    })
  }
  return Base
}

function read(raw, fallback) {
  if (raw === null) return structuredClone(fallback)
  if (typeof fallback === "number") return Number(raw)
  if (typeof fallback === "boolean") return raw !== "false"
  if (typeof fallback === "string") return raw
  return JSON.parse(raw)
}

function dasherize(value) {
  return value.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)
}

function valueChanged(element, attribute, oldRaw) {
  if (!element.isConnected) return

  instances.get(element)?.forEach((controller, name) => {
    const prefix = `data-${name}-`
    if (!attribute.startsWith(prefix)) return
    const key = camelize(attribute.slice(prefix.length))
    const fallback = controller.constructor.values?.[key]
    if (fallback === undefined || typeof controller[`${key}Changed`] !== "function") return
    run(() => controller[`${key}Changed`](controller[key], read(oldRaw, fallback)), element)
  })
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
  home: "Home", end: "End", page_up: "PageUp", page_down: "PageDown"
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
  const controller = root && instances.get(root)?.get(name)

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

  const key = standardFilter.length === 1 ? standardFilter : keyMappings[standardFilter]
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
        registrations.forEach(registration => {
          if (registration.attribute === mutation.attributeName) remove(registration, mutation.target)
          refresh(registration, mutation.target)
        })
        valueChanged(mutation.target, mutation.attributeName, mutation.oldValue)
      }
    }

    if (removed) registrations.forEach(prune)
  })

  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeOldValue: true })
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
