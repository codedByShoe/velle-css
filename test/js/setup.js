// Gives the runtime a browser to run in. Import this before anything from dist/.
import { JSDOM } from "jsdom"

const { window } = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true, url: "http://localhost/" })

globalThis.window = window
// AbortController must be jsdom's: its addEventListener rejects a signal from Node's.
for (const name of [ "document", "Node", "Element", "HTMLElement", "HTMLButtonElement", "MutationObserver", "Event", "CustomEvent", "KeyboardEvent", "AbortController", "AbortSignal" ]) {
  globalThis[name] = window[name]
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
}

if (document.readyState === "loading") {
  await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
}

// Lets MutationObserver callbacks run.
export function tick() {
  return new Promise(resolve => setTimeout(resolve))
}

// Adds markup to the document and returns its first element, once the runtime has seen it.
export async function mount(html) {
  const template = document.createElement("template")
  template.innerHTML = html.trim()
  const element = template.content.firstElementChild
  document.body.append(element)
  await tick()
  return element
}

export function key(type, value, init = {}) {
  return new KeyboardEvent(type, { key: value, bubbles: true, ...init })
}
