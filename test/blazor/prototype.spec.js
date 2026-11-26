import { expect, test } from "@playwright/test"

function enhancedResponse(page, method, path) {
  return page.waitForResponse(response => {
    const request = response.request()
    return request.resourceType() === "fetch" &&
      request.method() === method &&
      new URL(response.url()).pathname === path
  })
}

test("static SSR renders tabs and Alpine handles keyboard and dialog interactions", async ({ browser, page, baseURL }) => {
  const serverPage = await browser.newPage({ baseURL, javaScriptEnabled: false })
  try {
    await serverPage.goto("/prototype")
    await expect(serverPage.locator("#prototype-tabs")).toHaveCSS("display", "flex")
    await expect(serverPage.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true")
    await expect(serverPage.getByRole("tabpanel", { name: "Overview" })).toBeVisible()
    await expect(serverPage.locator("#prototype-tabs-panel-1")).toBeHidden()
    await expect(serverPage.locator("#profile-dialog")).toBeHidden()
  } finally {
    await serverPage.close()
  }

  await page.goto("/prototype")
  const overview = page.getByRole("tab", { name: "Overview" })
  const settings = page.getByRole("tab", { name: "Settings" })
  await overview.focus()
  await overview.press("ArrowRight")
  await expect(settings).toBeFocused()
  await expect(settings).toHaveAttribute("aria-selected", "true")
  await expect(overview).toHaveAttribute("tabindex", "-1")

  await settings.press("ArrowRight")
  await expect(overview).toBeFocused()
  await overview.press("End")
  await expect(settings).toBeFocused()
  await settings.press("Home")
  await expect(overview).toBeFocused()
  await overview.press("ArrowLeft")
  await expect(settings).toBeFocused()
  await expect(page.getByRole("tabpanel", { name: "Settings" })).toBeVisible()

  const trigger = page.getByRole("button", { name: "Edit profile" })
  await trigger.click()
  await expect(page.locator("#profile-dialog:modal")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.locator("#profile-dialog:modal")).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test("Dialog and Tabs initialize after enhanced navigation and return visits", async ({ page }) => {
  await page.goto("/")
  const marker = await page.evaluate(() => (window.vellePageMarker = crypto.randomUUID()))

  for (let visit = 0; visit < 2; visit++) {
    const navigation = enhancedResponse(page, "GET", "/prototype")
    await page.getByRole("link", { name: "Dialog and Tabs" }).click()
    expect((await navigation).ok()).toBe(true)
    await expect(page.getByRole("heading", { name: "Dialog and Tabs" })).toBeVisible()

    await page.getByRole("tab", { name: "Settings" }).click()
    await expect(page.getByRole("tabpanel", { name: "Settings" })).toBeVisible()
    await page.getByRole("button", { name: "Edit profile" }).click()
    await expect(page.locator("#profile-dialog:modal")).toBeVisible()
    await page.getByRole("button", { name: "Close" }).click()
    await expect(page.locator("#profile-dialog:modal")).toHaveCount(0)

    const back = enhancedResponse(page, "GET", "/")
    await page.getByRole("link", { name: "Home" }).click()
    expect((await back).ok()).toBe(true)
    await expect(page.getByRole("heading", { name: "Velle Blazor" })).toBeVisible()
  }

  expect(await page.evaluate(() => window.vellePageMarker)).toBe(marker)
})

test("enhanced invalid and valid form posts keep dialog and tab state synchronized", async ({ page }) => {
  await page.goto("/prototype")
  const marker = await page.evaluate(() => (window.vellePageMarker = crypto.randomUUID()))
  const settings = page.getByRole("tab", { name: "Settings" })
  const dialog = page.locator("#profile-dialog")
  await settings.click()
  await page.getByRole("button", { name: "Edit profile" }).click()

  const invalid = enhancedResponse(page, "POST", "/prototype")
  await page.getByRole("button", { name: "Save" }).click()
  expect((await invalid).ok()).toBe(true)
  await expect(dialog.getByText("Enter a display name.")).toBeVisible()
  await expect(page.locator("#profile-dialog:modal")).toBeVisible()
  await expect(settings).toHaveAttribute("aria-selected", "true")

  await dialog.getByRole("textbox", { name: "Display name" }).fill("Ada Lovelace")
  const valid = enhancedResponse(page, "POST", "/prototype")
  await page.getByRole("button", { name: "Save" }).click()
  expect((await valid).ok()).toBe(true)
  await expect(page.getByRole("status")).toHaveText("Saved display name: Ada Lovelace")
  await expect(page.locator("#profile-dialog:modal")).toHaveCount(0)
  await expect(settings).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("tabpanel", { name: "Settings" })).toBeVisible()

  await page.getByRole("button", { name: "Edit profile" }).click()
  await expect(page.locator("#profile-dialog:modal")).toBeVisible()
  await expect(dialog.getByRole("textbox", { name: "Display name" })).toHaveValue("Ada Lovelace")
  expect(await page.evaluate(() => window.vellePageMarker)).toBe(marker)
})

test("Datepicker submits the selected ISO date on enhanced form posts", async ({ page }) => {
  await page.goto("/datepicker")
  const display = page.getByLabel("Appointment date")
  const field = page.locator('input[name="Input.Date"]')
  const calendar = page.locator(".flatpickr-calendar")
  await expect(display).toHaveValue("April 12, 2030")
  await expect(calendar).toBeHidden()

  for (const day of [19, 23]) {
    const isoDate = `2030-04-${day}`
    const readableDate = `April ${day}, 2030`
    await display.click()
    await calendar.locator(`.flatpickr-day[aria-label="${readableDate}"]`).click()
    await expect(display).toHaveValue(readableDate)
    await expect(field).toHaveValue(isoDate)
    await expect(field).toHaveCount(1)

    const submission = enhancedResponse(page, "POST", "/datepicker")
    await page.getByRole("button", { name: "Save date" }).click()
    expect((await submission).ok()).toBe(true)
    await expect(page.getByRole("status")).toHaveText(`Saved date: ${isoDate}`)
    await expect(display).toHaveValue(readableDate)
    await expect(calendar).toHaveCount(1)
  }
})

test("Datepicker destroys the old calendar and initializes one picker after enhanced navigation", async ({ page }) => {
  await page.goto("/")
  const marker = await page.evaluate(() => (window.vellePageMarker = crypto.randomUUID()))
  const calendar = page.locator(".flatpickr-calendar")
  const display = page.getByLabel("Appointment date")
  const field = page.locator('input[name="Input.Date"]')

  for (let visit = 0; visit < 2; visit++) {
    const enter = enhancedResponse(page, "GET", "/datepicker")
    await page.getByRole("link", { name: "Datepicker", exact: true }).click()
    expect((await enter).ok()).toBe(true)
    await expect(display).toHaveValue("April 12, 2030")
    await display.click()
    await expect(calendar).toBeVisible()
    await expect(calendar).toHaveCount(1)
    const originalField = await field.elementHandle()
    const originalPicker = await originalField.evaluateHandle(input => input._flatpickr)
    expect(await originalPicker.evaluate(picker => Boolean(picker.config))).toBe(true)

    const leave = enhancedResponse(page, "GET", "/")
    await page.getByRole("link", { name: "Home", exact: true }).click()
    expect((await leave).ok()).toBe(true)
    await expect(calendar).toHaveCount(0)
    await expect.poll(() => originalField.evaluate(input => Boolean(input._flatpickr))).toBe(false)
    await expect.poll(() => originalPicker.evaluate(picker => Boolean(picker.config))).toBe(false)
    await originalPicker.dispose()
    await originalField.dispose()
  }

  expect(await page.evaluate(() => window.vellePageMarker)).toBe(marker)
})
