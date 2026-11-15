// Runs the example from the "Writing your own controllers" docs, so it cannot go stale.
import { tick, mount } from "./setup.js"
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Controller } from "@hotwired/stimulus"
import { application } from "../../dist/js/application.js"

const read = file => readFileSync(new URL(`../../internal/docs/templates/${file}`, import.meta.url), "utf8")
const guide = read("guide.md")
const controller = file => guide.match(new RegExp("```js\\n(// " + file + "\\n[^`]*)\\n```"))[1]
const counter = controller("counter_controller.js")
const cart = controller("cart_controller.js")
const markup = guide.match(/```html\n(<div data-controller="counter">[^`]*)\n```/)[1]

const requests = []
globalThis.fetch = async (url, { signal }) => {
  requests.push({ url, signal })
  return { text: async () => "$12" }
}

// Each example is a module with one import and a default export.
const load = source => new Function("Controller", source.replace(/^import .*$/m, "").replace("export default class", "return class"))(Controller)
application.register("counter", load(counter))
application.register("cart", load(cart))

test("the HTML docs show the same example as the guide", () => {
  const page = read("javascript.html").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&")
  assert.ok(page.includes(counter))
  assert.ok(page.includes(cart))
  assert.ok(page.includes(markup))
})

test("the cart follows the counter through its event", async () => {
  const wrapper = await mount(`<div>${markup}</div>`)
  const element = wrapper.querySelector("[data-controller=cart]")
  await tick()

  wrapper.querySelector("button").click()
  await tick()
  await tick()

  assert.equal(wrapper.querySelector("output").textContent, "1")
  assert.equal(element.getAttribute("data-cart-count-value"), "1")
  assert.equal(element.querySelector("[data-cart-target=badge]").textContent, "1")
  assert.equal(element.querySelector("[data-cart-target=total]").textContent, "$12")
  assert.equal(application.getControllerForElementAndIdentifier(element, "cart").countValue, 1)

  const { signal, url } = requests.at(-1)
  assert.equal(url, "/cart/total")
  assert.equal(signal.aborted, false)

  wrapper.remove()
  await tick()
  assert.equal(signal.aborted, true)
})
