import { tick, mount } from "./setup.js"
import { test } from "node:test"
import assert from "node:assert/strict"
import { define, controllerFor, prepareSnapshot, Controller } from "../../dist/js/velle.js"

// Runs the real htmx and flatpickr, so a change in what they do fails here.
const { window } = globalThis
for (const name of Object.getOwnPropertyNames(window)) {
  if ([ "FormData", "localStorage", "sessionStorage" ].includes(name) || !(name in globalThis)) Object.defineProperty(globalThis, name, { value: window[name], configurable: true, writable: true })
}

// htmx only uses this to find hx-on attributes, and jsdom's evaluate() needs an argument it omits.
globalThis.XPathEvaluator = class {
  createExpression() {
    return { evaluate: () => ({ iterateNext: () => null }) }
  }
}

const requests = []

class FakeXHR {
  status = 200
  statusText = "OK"
  response = "<p>swapped</p>"
  responseText = "<p>swapped</p>"
  upload = new window.EventTarget()
  open(method, url) {
    this.url = url
    this.responseURL = new URL(url, window.location.href).href
  }
  setRequestHeader() {}
  overrideMimeType() {}
  getAllResponseHeaders() { return "" }
  getResponseHeader() { return null }
  addEventListener() {}
  abort() {}
  send() {
    requests.push(this.url)
    setTimeout(() => this.onload?.())
  }
}

window.XMLHttpRequest = globalThis.XMLHttpRequest = FakeXHR

const { default: htmx } = await import("htmx.org/dist/htmx.cjs.js")
await import("../../dist/js/htmx.js")
await import("../../dist/js/tabs.js")
await import("../../dist/js/datepicker.js")

htmx.config.defaultSettleDelay = 0
htmx.config.allowEval = true

const settled = () => new Promise(resolve => setTimeout(resolve, 60))

async function page(html) {
  document.body.replaceChildren()
  const root = await mount(html)
  htmx.process(root)
  return root
}

function savedPages() {
  return JSON.parse(sessionStorage.getItem("htmx-history-cache") ?? "[]")
}

let connects = 0

define("generated", class extends Controller {
  connect() {
    connects++
    this.element.insertAdjacentHTML("beforeend", `<i class="built"></i>`)
  }

  beforeSnapshot() {
    const built = this.element.querySelector(".built")
    built.remove()
    return () => this.element.append(built)
  }
})

const historyMarkup = path => `
  <div>
    <div data-generated></div>
    <a id="go" hx-get="${path}" hx-push-url="true" hx-target="#out">Go</a>
    <div id="out"></div>
  </div>`

test("the saved page leaves out what controllers built, and the live page keeps it", async () => {
  const root = await page(historyMarkup("/saved"))

  root.querySelector("#go").click()
  await settled()

  const [ saved ] = savedPages().slice(-1)
  assert.match(saved.content, /data-generated/)
  assert.doesNotMatch(saved.content, /class="built"/)
  assert.equal(root.querySelectorAll(".built").length, 1)
  assert.match(root.querySelector("#out").innerHTML, /swapped/)
})

test("going back reconnects controllers without doubling what they build", async () => {
  const root = await page(historyMarkup("/back"))
  root.querySelector("#go").click()
  await settled()
  const before = connects

  window.history.back()
  await settled()

  assert.equal(connects, before + 1)
  assert.equal(document.querySelectorAll("[data-generated] .built").length, 1)
})

test("a dialog saved while open comes back closed", async () => {
  const root = await page(`
    <div>
      <dialog open></dialog>
      <a id="go" hx-get="/dialog" hx-push-url="true" hx-target="#out">Go</a>
      <div id="out"></div>
    </div>`)
  root.querySelector("#go").click()
  await settled()

  window.history.back()
  await settled()

  assert.ok(document.querySelector("dialog"))
  assert.equal(document.querySelector("dialog").hasAttribute("open"), false)
})

test("htmx can trigger on a velle event, with a filter", async () => {
  const root = await page(`
    <div data-tabs>
      <button type="button" data-tabs-target="button" data-tabs-action="select">One</button>
      <button type="button" data-tabs-target="button" data-tabs-action="select">Two</button>
      <div hidden data-tabs-target="tab"></div>
      <div hidden data-tabs-target="tab" hx-get="/activity" hx-trigger="velle:tabs:change[detail.index==1] from:closest [data-tabs] once"></div>
    </div>`)
  const count = () => requests.filter(url => url === "/activity").length
  assert.equal(count(), 0)

  root.querySelectorAll("button")[1].click()
  await settled()
  assert.equal(count(), 1)

  root.querySelectorAll("button")[0].click()
  await tick()
  root.querySelectorAll("button")[1].click()
  await settled()
  assert.equal(count(), 1, "once")
})

test("controllers connect inside swapped markup", async () => {
  const root = await page(`<div><a id="go" hx-get="/swap" hx-target="#out">Go</a><div id="out"></div></div>`)
  const original = FakeXHR.prototype.send
  FakeXHR.prototype.send = function () {
    this.response = this.responseText = `<div id="fresh" data-generated></div>`
    original.call(this)
  }

  root.querySelector("#go").click()
  await settled()
  FakeXHR.prototype.send = original

  assert.equal(root.querySelectorAll("#fresh .built").length, 1)
})

test("datepicker leaves no flatpickr markup in a snapshot and comes back with its date", async () => {
  const root = await page(`<div><input data-datepicker value="2028-01-10"></div>`)
  const input = root.querySelector("[data-datepicker]")
  const instance = controllerFor(input, "datepicker")
  assert.equal(root.querySelectorAll("input").length, 2, "flatpickr adds a visible input")

  const undo = prepareSnapshot()
  assert.equal(root.querySelectorAll("input").length, 1)
  assert.equal(document.querySelector(".flatpickr-calendar"), null)
  assert.equal(input.value, "2028-01-10")

  undo()
  assert.equal(root.querySelectorAll("input").length, 2)
  assert.equal(document.querySelectorAll(".flatpickr-calendar").length, 1)
  assert.equal(instance.flatpickr.input, input)
  assert.equal(instance.flatpickr.selectedDates.length, 1)
})
