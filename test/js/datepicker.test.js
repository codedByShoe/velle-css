import { mount } from "./setup.js"
import { test } from "node:test"
import assert from "node:assert/strict"
import { controllerFor, prepareSnapshot } from "../../dist/js/velle.js"
import "../../dist/js/datepicker.js"

test("datepicker leaves no flatpickr markup in a snapshot and comes back with its date", async () => {
  const root = await mount('<div><input data-datepicker value="2028-01-10"></div>')
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
