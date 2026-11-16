// Runs the example from the "Writing your own controllers" docs, so it cannot go stale.
import { tick, mount } from "./setup.js"
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { define, controller, controllerFor } from "../../dist/js/velle.js"

const read = file => readFileSync(new URL(`../../internal/docs/templates/${file}`, import.meta.url), "utf8")
const guide = read("guide.md")
const example = guide.match(/```js\n(\/\/ @ts-check\n[^`]*define\("cart"[^`]*)\n```/)[1]
const markup = guide.match(/```html\n(<div data-counter>[^`]*)\n```/)[1]

const requests = []
globalThis.fetch = async (url, { signal }) => {
  requests.push({ url, signal })
  return { text: async () => "$12" }
}

new Function("define", "controller", example.replace(/^import .*$/m, ""))(define, controller)

test("the HTML docs show the same example as the guide", () => {
  const page = read("javascript.html").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&")
  assert.ok(page.includes(example))
  assert.ok(page.includes(markup))
})

test("the cart follows the counter through its event", async () => {
  const wrapper = await mount(`<div>${markup}</div>`)
  const cart = wrapper.querySelector("[data-cart]")
  await tick()

  wrapper.querySelector("button").click()
  await tick()
  await tick()

  assert.equal(wrapper.querySelector("output").textContent, "1")
  assert.equal(cart.getAttribute("data-cart-count"), "1")
  assert.equal(cart.querySelector("[data-cart-target=badge]").textContent, "1")
  assert.equal(cart.querySelector("[data-cart-target=total]").textContent, "$12")
  assert.equal(controllerFor(cart, "cart").count, 1)

  const { signal, url } = requests.at(-1)
  assert.equal(url, "/cart/total")
  assert.equal(signal.aborted, false)

  wrapper.remove()
  await tick()
  assert.equal(signal.aborted, true)
})
