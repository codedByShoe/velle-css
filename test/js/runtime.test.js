import { tick, mount } from "./setup.js"
import { test } from "node:test"
import assert from "node:assert/strict"
import { define, controller, controllerFor, prepareSnapshot, Controller } from "../../dist/js/velle.js"

// Defines a controller and returns its instance on freshly mounted markup.
async function connected(name, Class, html = `<div data-${name}></div>`) {
  define(name, Class)
  const element = await mount(html)
  return controllerFor(element, name)
}

const typed = (values, methods = {}) => {
  const Class = class extends controller({ values }) {}
  Object.assign(Class.prototype, methods)
  return Class
}

test("values parse per the default's type", async () => {
  const values = { count: 0, label: "none", open: false, closed: true, items: [], config: {} }
  const instance = await connected("parse", typed(values), `
    <div data-parse data-parse-count="3" data-parse-label="hi" data-parse-open data-parse-closed="false"
         data-parse-items="[1,2]" data-parse-config='{"a":1}'></div>`)

  assert.equal(instance.count, 3)
  assert.equal(instance.label, "hi")
  assert.equal(instance.open, true)
  assert.equal(instance.closed, false)
  assert.deepEqual(instance.items, [ 1, 2 ])
  assert.deepEqual(instance.config, { a: 1 })
})

test("a missing attribute reads as the default", async () => {
  const instance = await connected("defaults", typed({ count: 7, label: "x", open: true, items: [ 1 ] }))

  assert.equal(instance.count, 7)
  assert.equal(instance.label, "x")
  assert.equal(instance.open, true)
  assert.deepEqual(instance.items, [ 1 ])
})

test("array and object defaults are not shared between reads", async () => {
  const instance = await connected("fresh", typed({ items: [] }))

  instance.items.push(1)

  assert.deepEqual(instance.items, [])
})

test("the setter writes the attribute, camelCase as dash-case", async () => {
  const instance = await connected("writes", typed({ showMonths: 1, label: "", open: false, items: [] }))
  const { element } = instance

  instance.showMonths = 2
  instance.label = "hello"
  instance.open = true
  instance.items = [ 1, "a" ]

  assert.equal(element.getAttribute("data-writes-show-months"), "2")
  assert.equal(element.getAttribute("data-writes-label"), "hello")
  assert.equal(element.getAttribute("data-writes-open"), "true")
  assert.equal(element.getAttribute("data-writes-items"), `[1,"a"]`)
  assert.equal(instance.showMonths, 2)
})

test("xChanged fires once per attribute change with parsed new and old values", async () => {
  const calls = []
  const instance = await connected("changes", typed({ count: 5, showMonths: 1 }, {
    countChanged(value, old) { calls.push([ "count", value, old ]) },
    showMonthsChanged(value, old) { calls.push([ "showMonths", value, old ]) }
  }))

  instance.count = 6
  await tick()
  assert.deepEqual(calls, [ [ "count", 6, 5 ] ], "the old value of a missing attribute is the default")

  instance.count = 9
  await tick()
  assert.deepEqual(calls[1], [ "count", 9, 6 ])

  instance.showMonths = 2
  await tick()
  assert.deepEqual(calls[2], [ "showMonths", 2, 1 ])

  instance.element.removeAttribute("data-changes-count")
  await tick()
  assert.deepEqual(calls[3], [ "count", 5, 9 ], "removing the attribute goes back to the default")
  assert.equal(calls.length, 4)
})

test("xChanged does not run during connect", async () => {
  const calls = []
  await connected("quiet", typed({ count: 0 }, {
    countChanged(value) { calls.push(value) }
  }), `<div data-quiet data-quiet-count="3"></div>`)

  assert.deepEqual(calls, [])
})

test("xChanged is skipped for an element removed in the same batch", async () => {
  const calls = []
  const instance = await connected("gone", typed({ count: 0 }, {
    countChanged(value) { calls.push(value) }
  }))

  instance.count = 1
  instance.element.remove()
  await tick()

  assert.deepEqual(calls, [])
})

test("only the controller that owns the attribute is notified", async () => {
  const calls = []
  define("owner-a", typed({ count: 0 }, { countChanged() { calls.push("a") } }))
  define("owner-b", typed({ count: 0 }, { countChanged() { calls.push("b") } }))
  const element = await mount(`<div data-owner-a data-owner-b></div>`)

  element.setAttribute("data-owner-b-count", "1")
  await tick()

  assert.deepEqual(calls, [ "b" ])
})

test("attributes that are not declared values do not call callbacks", async () => {
  const calls = []
  const instance = await connected("undeclared", typed({ count: 0 }, {
    otherChanged() { calls.push("other") }
  }))

  instance.element.setAttribute("data-undeclared-other", "1")
  await tick()

  assert.deepEqual(calls, [])
})

test("reserved value names throw", () => {
  for (const name of [ "data", "element", "name", "action", "target", "targets", "signal", "on", "connect", "$", "$$", "constructor" ]) {
    assert.throws(() => controller({ values: { [name]: 0 } }), { message: `[velle] "${name}" is reserved` }, name)
  }
})

test("listeners added with on() stop firing after the element is removed", async () => {
  let calls = 0
  let signal
  const instance = await connected("listens", class extends Controller {
    connect() {
      signal = this.signal
      this.on(window, "velle-test", () => calls++)
    }
  })

  window.dispatchEvent(new Event("velle-test"))
  assert.equal(calls, 1)
  assert.equal(signal.aborted, false)

  instance.element.remove()
  await tick()

  window.dispatchEvent(new Event("velle-test"))
  assert.equal(calls, 1)
  assert.equal(signal.aborted, true)
})

test("on() passes options through", async () => {
  let calls = 0
  await connected("options", class extends Controller {
    connect() { this.on(window, "velle-once", () => calls++, { once: true }) }
  })

  window.dispatchEvent(new Event("velle-once"))
  window.dispatchEvent(new Event("velle-once"))

  assert.equal(calls, 1)
})

test("the signal aborts after disconnect runs, even if disconnect throws", async t => {
  t.mock.method(console, "error", () => {})
  let abortedDuringDisconnect
  const instance = await connected("throws", class extends Controller {
    disconnect() {
      abortedDuringDisconnect = this.signal.aborted
      throw new Error("boom")
    }
  })
  const { signal } = instance

  instance.element.remove()
  await tick()

  assert.equal(abortedDuringDisconnect, false)
  assert.equal(signal.aborted, true)
})

test("reconnecting an element gets a fresh signal", async () => {
  define("again", class extends Controller {})
  const element = await mount(`<div data-again></div>`)
  const first = controllerFor(element, "again")

  element.removeAttribute("data-again")
  await tick()
  assert.equal(controllerFor(element, "again"), null)

  element.setAttribute("data-again", "")
  await tick()
  const second = controllerFor(element, "again")

  assert.notEqual(second, first)
  assert.equal(first.signal.aborted, true)
  assert.equal(second.signal.aborted, false)
})

test("$ and $$ find targets", async () => {
  const instance = await connected("shorthand", class extends Controller {}, `
    <div data-shorthand>
      <i data-shorthand-target="item"></i>
      <i data-shorthand-target="item"></i>
    </div>`)

  assert.equal(instance.$.item, instance.target("item"))
  assert.equal(instance.$.missing, null)
  assert.equal(instance.$$.item.length, 2)
  assert.deepEqual(instance.$$.missing, [])
})

test("controllerFor returns the instance by name, or null", async () => {
  define("find-a", class extends Controller {})
  define("find-b", class extends Controller {})
  const element = await mount(`<div data-find-a data-find-b></div>`)

  assert.equal(controllerFor(element, "find-a").name, "find-a")
  assert.equal(controllerFor(element, "find-b").name, "find-b")
  assert.equal(controllerFor(element, "nope"), null)
  assert.equal(controllerFor(document.body, "find-a"), null)
})

test("prepareSnapshot runs each controller's hook and returns its undo", async () => {
  const calls = []
  define("snap-a", class extends Controller {
    beforeSnapshot() {
      calls.push("a")
      return () => calls.push("undo a")
    }
  })
  define("snap-b", class extends Controller {
    beforeSnapshot() { calls.push("b") }
  })
  define("snap-none", class extends Controller {})
  const element = await mount(`<div data-snap-a data-snap-b data-snap-none data-snap-a-action="click->beforeSnapshot"></div>`)

  const undo = prepareSnapshot()
  assert.deepEqual([ ...calls ].sort(), [ "a", "b" ])

  undo()
  assert.equal(calls.filter(call => call === "undo a").length, 1)
  element.remove()
  await tick()
})

test("prepareSnapshot skips removed controllers", async () => {
  let calls = 0
  define("snap-gone", class extends Controller {
    beforeSnapshot() { calls++ }
  })
  const element = await mount(`<div data-snap-gone></div>`)
  element.remove()
  await tick()

  prepareSnapshot()

  assert.equal(calls, 0)
})

test("a failing beforeSnapshot does not stop the others", async () => {
  let reached = false
  const logged = console.error
  console.error = () => {}
  define("snap-bad", class extends Controller {
    beforeSnapshot() { throw new Error("nope") }
  })
  define("snap-good", class extends Controller {
    beforeSnapshot() { reached = true }
  })
  const first = await mount(`<div data-snap-bad></div>`)
  const second = await mount(`<div data-snap-good></div>`)

  prepareSnapshot()()
  console.error = logged

  assert.equal(reached, true)
  first.remove()
  second.remove()
  await tick()
})
