import { tick, mount, key } from "./setup.js"
import { test } from "node:test"
import assert from "node:assert/strict"
import { controllerFor } from "../../dist/js/velle.js"
import "../../dist/js/tabs.js"
import "../../dist/js/menu.js"
import "../../dist/js/form.js"

const tabsMarkup = index => `
  <div data-tabs ${index === undefined ? "" : `data-tabs-index="${index}"`}>
    <div data-tabs-action="keydown.left->prev keydown.right->next">
      <button type="button" data-tabs-target="button" data-tabs-action="select"><span>One</span></button>
      <button type="button" data-tabs-target="button" data-tabs-action="select">Two</button>
      <button type="button" data-tabs-target="button" data-tabs-action="select">Three</button>
    </div>
    <div hidden data-tabs-target="tab"></div>
    <div hidden data-tabs-target="tab"></div>
    <div hidden data-tabs-target="tab"></div>
  </div>`

function state(root) {
  return {
    selected: [ ...root.querySelectorAll("button") ].map(it => it.ariaSelected),
    tabIndex: [ ...root.querySelectorAll("button") ].map(it => it.tabIndex),
    hidden: [ ...root.querySelectorAll("[data-tabs-target=tab]") ].map(it => it.hidden)
  }
}

const showing = (index, count = 3) => ({
  selected: Array.from({ length: count }, (_, i) => String(i === index)),
  tabIndex: Array.from({ length: count }, (_, i) => i === index ? 0 : -1),
  hidden: Array.from({ length: count }, (_, i) => i !== index)
})

function changes(root) {
  const events = []
  root.addEventListener("velle:tabs:change", event => events.push(event.detail.index))
  return events
}

test("tabs render the initial index on connect and announce it", async () => {
  let announced
  const listener = event => announced = event.detail.index
  document.addEventListener("velle:tabs:change", listener)

  const root = await mount(tabsMarkup(1))
  document.removeEventListener("velle:tabs:change", listener)

  assert.deepEqual(state(root), showing(1))
  assert.equal(announced, 1)
})

test("tabs default to the first tab", async () => {
  assert.deepEqual(state(await mount(tabsMarkup())), showing(0))
})

test("clicking inside a tab button selects it", async () => {
  const root = await mount(tabsMarkup(1))
  const events = changes(root)

  root.querySelector("button span").click()
  await tick()

  assert.deepEqual(state(root), showing(0))
  assert.equal(root.getAttribute("data-tabs-index"), "0")
  assert.deepEqual(events, [ 0 ])
})

test("clicking the selected tab announces it again", async () => {
  const root = await mount(tabsMarkup(0))
  const events = changes(root)

  root.querySelectorAll("button")[0].click()
  await tick()

  assert.deepEqual(events, [ 0 ])
})

test("arrow keys move between tabs, focus follows and the ends stop", async () => {
  const root = await mount(tabsMarkup(0))
  const list = root.firstElementChild
  const buttons = root.querySelectorAll("button")
  const events = changes(root)

  list.dispatchEvent(key("keydown", "ArrowLeft"))
  await tick()
  assert.deepEqual(events, [], "already on the first tab")

  list.dispatchEvent(key("keydown", "ArrowRight"))
  assert.equal(document.activeElement, buttons[1], "focus moves right away")
  await tick()
  assert.deepEqual(state(root), showing(1))

  list.dispatchEvent(key("keydown", "ArrowRight"))
  await tick()
  list.dispatchEvent(key("keydown", "ArrowRight"))
  await tick()
  assert.deepEqual(state(root), showing(2))
  assert.equal(document.activeElement, buttons[2])

  list.dispatchEvent(key("keydown", "ArrowLeft"))
  await tick()
  assert.deepEqual(state(root), showing(1))
  assert.deepEqual(events, [ 1, 2, 1 ])
})

test("setting data-tabs-index from outside switches tab", async () => {
  const root = await mount(tabsMarkup(0))

  root.setAttribute("data-tabs-index", "2")
  await tick()

  assert.deepEqual(state(root), showing(2))
})

const menuMarkup = `
  <div data-menu>
    <button data-menu-target="item">A</button>
    <button data-menu-target="item">B</button>
    <button data-menu-target="item">C</button>
  </div>`

test("menu arrow keys, Home and End move a roving tabindex", async () => {
  const root = await mount(menuMarkup)
  const items = root.querySelectorAll("button")

  root.dispatchEvent(key("keydown", "ArrowDown"))
  assert.equal(document.activeElement, items[1])
  assert.deepEqual([ ...items ].map(it => it.tabIndex), [ -1, 0, -1 ])

  root.dispatchEvent(key("keydown", "End"))
  assert.equal(document.activeElement, items[2])

  root.dispatchEvent(key("keydown", "ArrowDown"))
  assert.equal(document.activeElement, items[2], "stops at the end")

  root.dispatchEvent(key("keydown", "Home"))
  assert.equal(document.activeElement, items[0])
})

test("menu focusin tracks the focused item", async () => {
  const root = await mount(menuMarkup)
  const items = root.querySelectorAll("button")

  items[2].focus()

  assert.deepEqual([ ...items ].map(it => it.tabIndex), [ -1, -1, 0 ])
})

test("menu stops handling keys and observing once removed", async () => {
  const disconnects = []
  const original = IntersectionObserver.prototype.disconnect
  IntersectionObserver.prototype.disconnect = function () { disconnects.push(this) }

  const root = await mount(menuMarkup)
  const items = root.querySelectorAll("button")
  items[1].focus()
  root.remove()
  await tick()
  IntersectionObserver.prototype.disconnect = original

  root.dispatchEvent(key("keydown", "Home"))

  assert.equal(disconnects.length, 1)
  assert.equal(items[0].tabIndex, -1, "the keydown listener is gone")
})

test("form debounce reads its wait from the attribute, once", async () => {
  const root = await mount(`<form data-form data-form-debounce="1"><input name="q"></form>`)
  const instance = controllerFor(root, "form")
  let submits = 0
  root.addEventListener("submit", event => {
    event.preventDefault()
    submits++
  })

  assert.equal(instance.debounce, 1)
  instance.debouncedSubmit()
  instance.debouncedSubmit()
  await new Promise(resolve => setTimeout(resolve, 20))

  assert.equal(submits, 1)
})

test("form debounce defaults to 300", async () => {
  assert.equal(controllerFor(await mount(`<form data-form></form>`), "form").debounce, 300)
})

test("form disableSubmitWhenInvalid and cancel use their targets", async () => {
  const root = await mount(`
    <form data-form>
      <input required>
      <button data-form-target="submit"></button>
      <button type="button" data-form-target="cancel"></button>
    </form>`)
  const instance = controllerFor(root, "form")
  const [ submit, cancel ] = root.querySelectorAll("button")

  instance.disableSubmitWhenInvalid()
  assert.equal(submit.disabled, true)

  root.querySelector("input").value = "x"
  instance.disableSubmitWhenInvalid()
  assert.equal(submit.disabled, false)

  let cancelled = false
  cancel.addEventListener("click", () => cancelled = true)
  instance.cancel()
  assert.equal(cancelled, true)
})
