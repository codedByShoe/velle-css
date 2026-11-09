// Uses only the API that existed before controller() so it can also run against an older
// runtime: everything here is the backward compatibility contract, plus the routing and
// rebinding fixes.
import { tick, mount, key } from "./setup.js"
import { test } from "node:test"
import assert from "node:assert/strict"
import { define, observe, debounce, Controller } from "../../dist/js/velle.js"

function recorder(name) {
  const calls = []
  define(name, class extends Controller {
    ping(event, element) { calls.push({ name, event, element, controller: this }) }
    other() { calls.push({ name, method: "other" }) }
  })
  return calls
}

test("two controllers on one element route their actions to the right instance", async () => {
  const first = recorder("route-a")
  const second = recorder("route-b")
  const element = await mount(`<div data-route-a data-route-b data-route-a-action="click->ping"></div>`)

  element.click()

  assert.equal(first.length, 1)
  assert.equal(second.length, 0)
  assert.equal(first[0].controller.name, "route-a")
})

test("removing one of two controllers leaves the other connected", async () => {
  const first = recorder("keep-a")
  const second = recorder("keep-b")
  const element = await mount(`<div data-keep-a data-keep-b data-keep-b-action="click->ping"></div>`)

  element.removeAttribute("data-keep-a")
  await tick()
  element.click()

  assert.equal(first.length, 0)
  assert.equal(second.length, 1)
})

test("changing an action attribute rebinds its listeners", async () => {
  const calls = recorder("rebind")
  const element = await mount(`<button data-rebind data-rebind-action="click->ping"></button>`)

  element.setAttribute("data-rebind-action", "focus->other")
  await tick()

  element.click()
  assert.equal(calls.length, 0, "the old listener is gone")

  element.dispatchEvent(new Event("focus"))
  assert.deepEqual(calls, [ { name: "rebind", method: "other" } ])
})

test("an action attribute added later binds exactly once", async () => {
  const calls = recorder("late")
  const element = await mount(`<button data-late></button>`)

  element.setAttribute("data-late-action", "click->ping")
  await tick()
  element.click()

  assert.equal(calls.length, 1)
})

test("removing an action attribute unbinds its listeners", async () => {
  const calls = recorder("unbind")
  const element = await mount(`<button data-unbind data-unbind-action="click->ping"></button>`)

  element.removeAttribute("data-unbind-action")
  await tick()
  element.click()

  assert.equal(calls.length, 0)
})

test("single-character key filters match case-insensitively", async () => {
  const calls = recorder("letters")
  const element = await mount(`<input data-letters data-letters-action="keydown.k->ping keydown.7->other">`)

  element.dispatchEvent(key("keydown", "k"))
  element.dispatchEvent(key("keydown", "K"))
  element.dispatchEvent(key("keydown", "j"))
  assert.equal(calls.length, 2)

  element.dispatchEvent(key("keydown", "7"))
  assert.equal(calls.length, 3)
})

test("named key filters and modifiers still work", async () => {
  const calls = recorder("named")
  const element = await mount(`<input data-named data-named-action="keydown.esc->ping keydown.ctrl+enter->other keydown.page_up->ping">`)

  element.dispatchEvent(key("keydown", "Escape"))
  assert.equal(calls.length, 1)

  element.dispatchEvent(key("keydown", "Enter"))
  assert.equal(calls.length, 1, "ctrl is required")

  element.dispatchEvent(key("keydown", "Enter", { ctrlKey: true }))
  assert.equal(calls.length, 2)

  element.dispatchEvent(key("keydown", "PageUp"))
  assert.equal(calls.length, 3)
})

test("an unknown multi-character key filter logs an error and does not match", async t => {
  const error = t.mock.method(console, "error", () => {})
  const calls = recorder("unknown-key")
  const element = await mount(`<input data-unknown-key data-unknown-key-action="keydown.nope->ping">`)

  element.dispatchEvent(key("keydown", "n"))

  assert.equal(calls.length, 0)
  assert.match(error.mock.calls[0].arguments[0], /Unknown key filter "nope"/)
})

test("custom event names with colons listen on the window", async () => {
  const calls = recorder("listens")
  await mount(`<div data-listens data-listens-action="velle:emits:change@window->ping"></div>`)

  define("emits", class extends Controller {
    connect() { this.dispatch("change", { count: 1 }) }
  })
  await mount(`<div data-emits></div>`)

  assert.equal(calls.length, 1)
  assert.equal(calls[0].event.detail.count, 1)
})

test("targets, data, params and dispatch keep working", async () => {
  let instance
  let params
  define("legacy", class extends Controller {
    connect() { instance ??= this }
    go(event) { params = event.params }
  })
  const element = await mount(`
    <div data-legacy data-legacy-mode="fast">
      <input data-legacy-target="field other">
      <button data-legacy-action="go" data-legacy-some-id-param="42" data-legacy-label-param="hi"></button>
      <div data-legacy><input data-legacy-target="field"></div>
    </div>`)

  assert.equal(instance.targets("field").length, 1, "nested roots keep their own targets")
  assert.equal(instance.target("other"), element.querySelector("input"))
  assert.equal(instance.target("missing"), null)
  assert.equal(instance.hasTarget("field"), true)
  assert.equal(instance.hasTarget("missing"), false)
  assert.equal(instance.data("mode"), "fast")
  assert.equal(instance.hasData("mode"), true)
  assert.equal(instance.hasData("missing"), false)
  assert.equal(instance.data("missing"), null)

  element.querySelector("button").click()
  assert.deepEqual(params, { someId: 42, label: "hi" })

  let detail
  element.addEventListener("velle:legacy:done", event => detail = event.detail)
  instance.dispatch("done", { ok: true })
  assert.deepEqual(detail, { ok: true })
})

test("connect and disconnect run with the element's lifetime", async () => {
  const log = []
  define("lifecycle", class extends Controller {
    connect() { log.push("connect") }
    disconnect() { log.push("disconnect") }
  })

  const element = await mount(`<div data-lifecycle></div>`)
  assert.deepEqual(log, [ "connect" ])

  element.remove()
  await tick()
  assert.deepEqual(log, [ "connect", "disconnect" ])
})

test("observe runs callbacks as elements start and stop matching", async () => {
  const log = []
  observe("[data-observed]", {
    connect: element => log.push([ "connect", element.id ]),
    disconnect: element => log.push([ "disconnect", element.id ])
  })

  const element = await mount(`<div id="seen" data-observed></div>`)
  element.removeAttribute("data-observed")
  await tick()

  assert.deepEqual(log, [ [ "connect", "seen" ], [ "disconnect", "seen" ] ])
})

test("debounce runs once after the wait with the last arguments", async () => {
  const calls = []
  const debounced = debounce(value => calls.push(value), 1)

  debounced("a")
  debounced("b")
  await new Promise(resolve => setTimeout(resolve, 10))

  assert.deepEqual(calls, [ "b" ])
})
