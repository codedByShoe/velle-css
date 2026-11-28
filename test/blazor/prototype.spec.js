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

test("Phase 3 Alpine overlays, color scheme, and interactive inputs work in Static SSR", async ({ page }) => {
  await page.goto("/components")

  // Sheet opens as modal and closes with Escape
  await page.getByRole("button", { name: "Open sheet" }).click()
  await expect(page.locator("#demo-sheet:modal")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.locator("#demo-sheet:modal")).toHaveCount(0)

  // Dropdown opens and supports roving arrow-key navigation
  await page.getByRole("button", { name: "Actions" }).click()
  const copyItem = page.getByRole("menuitem", { name: /Copy link/ })
  const downloadItem = page.getByRole("menuitem", { name: /Download/ })
  await expect(copyItem).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(downloadItem).toBeFocused()
  await page.keyboard.press("Escape")

  // Color scheme switcher updates <html data-color-scheme>
  await page.getByRole("button", { name: "Theme" }).click()
  await page.getByRole("menuitem", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "dark")

  // Clearable input clears value and focuses input
  const clearable = page.getByLabel("Clearable search")
  await expect(clearable).toHaveValue("Blazor Static SSR")
  await page.getByRole("button", { name: "Clear input" }).click()
  await expect(clearable).toHaveValue("")
  await expect(clearable).toBeFocused()

  // Revealable input toggles password -> text -> password
  const password = page.getByLabel("Password")
  await expect(password).toHaveAttribute("type", "password")
  await page.getByRole("button", { name: "Toggle password visibility" }).click()
  await expect(password).toHaveAttribute("type", "text")
  await page.getByRole("button", { name: "Toggle password visibility" }).click()
  await expect(password).toHaveAttribute("type", "password")

  // OTP input sanitizes non-digits as you type and populates slots
  const otp = page.getByLabel("Verification code")
  await otp.click()
  await otp.pressSequentially("12ab3456")
  await expect(otp).toHaveValue("123456")
  const slots = page.locator("[data-velle-otp-slot]")
  await expect(slots.nth(0)).toHaveText("1")
  await expect(slots.nth(5)).toHaveText("6")

  // Enhanced form submission triggers VelleFlash manual popover
  const post = enhancedResponse(page, "POST", "/components")
  await page.getByRole("button", { name: "Save preferences" }).click()
  expect((await post).ok()).toBe(true)
  await expect(page.locator(".flash:popover-open")).toBeVisible()
})

test("Phase 4 command, check-all, dual-range, resizable, local-time, timezone-cookie, and confirm work in Static SSR", async ({ page }) => {
  await page.goto("/components")

  // Timezone cookie sets the browser's IANA timezone
  await expect.poll(() => page.evaluate(() => document.cookie)).toContain("timezone=")

  // Local time formats the UTC fallback into browser-local text and sets a title tooltip
  const localTime = page.locator("#demo-local-time")
  await expect(localTime).toHaveAttribute("title", /.+/)
  await expect(localTime).not.toHaveText("2030-04-12 15:30:00Z")

  // Command palette filters items, shows empty state, and moves selection with arrow keys
  const commandInput = page.getByRole("combobox", { name: "Search commands" })
  await commandInput.scrollIntoViewIfNeeded()
  await commandInput.fill("deploy")
  await expect(page.getByRole("option", { name: /Deploy release/ })).toBeVisible()
  await expect(page.getByRole("option", { name: /Open settings/ })).toBeHidden()
  await commandInput.fill("zzzzz")
  await expect(page.locator("[data-velle-command-empty]")).toBeVisible()
  await commandInput.fill("")
  await expect(page.getByRole("option", { name: /Open settings/ })).toHaveAttribute("aria-selected", "true")
  await commandInput.press("ArrowDown")
  await expect(page.getByRole("option", { name: /Deploy release/ })).toHaveAttribute("aria-selected", "true")

  // Check-all synchronizes indeterminate, all-checked, and unchecked states
  const selectAll = page.getByLabel("Select all environments")
  const staging = page.getByLabel("Staging")
  const production = page.getByLabel("Production")
  await expect(selectAll).toHaveJSProperty("indeterminate", true)
  await selectAll.check()
  await expect(staging).toBeChecked()
  await expect(production).toBeChecked()
  await expect(selectAll).toHaveJSProperty("indeterminate", false)
  await staging.uncheck()
  await expect(selectAll).toHaveJSProperty("indeterminate", true)

  // Dual range initializes data-ready and adjusts midpoint on input
  const minSlider = page.locator("[data-velle-dual-range-min]")
  const maxSlider = page.locator("[data-velle-dual-range-max]")
  await expect(minSlider).toHaveAttribute("data-ready", "")
  await expect(maxSlider).toHaveAttribute("data-ready", "")

  // Resizable handle updates aria-valuenow on keyboard ArrowRight
  const resizeHandle = page.getByRole("separator", { name: "Resize preview panels" })
  await expect(resizeHandle).toHaveAttribute("aria-valuenow", "40")
  await resizeHandle.focus()
  await resizeHandle.press("Shift+ArrowRight")
  await expect(resizeHandle).toHaveAttribute("aria-valuenow", "50")

  // VelleConfirm intercepts [data-confirm] button and submits only after confirming
  await page.getByRole("button", { name: "Reset demo data" }).click()
  const confirmDialog = page.locator("#velle-confirm:modal")
  await expect(confirmDialog).toBeVisible()
  await expect(confirmDialog).toContainText("Reset demo data?")
  await confirmDialog.getByRole("button", { name: "Cancel" }).click()
  await expect(confirmDialog).toHaveCount(0)
  await expect(page.locator("#confirm-result")).toHaveCount(0)

  await page.getByRole("button", { name: "Reset demo data" }).click()
  await expect(confirmDialog).toBeVisible()
  const resetPost = enhancedResponse(page, "POST", "/components")
  await confirmDialog.getByRole("button", { name: "Continue" }).click()
  expect((await resetPost).ok()).toBe(true)
  await expect(page.locator("#confirm-result")).toContainText("Demo data reset.")
})

test("Phase 5 Alpine plugins (mask, sort) and zero-dep behaviors work in Static SSR", async ({ page }) => {
  await page.goto("/components")

  // @alpinejs/mask pattern mode formats phone input as you type
  const phone = page.getByLabel("Phone mask")
  await phone.scrollIntoViewIfNeeded()
  await phone.click()
  await phone.pressSequentially("5551234567")
  await expect(phone).toHaveValue("(555) 123-4567")

  // @alpinejs/mask dynamic money mode formats currency values
  const amount = page.getByLabel("Amount mask")
  await amount.click()
  await amount.pressSequentially("12345.67")
  await expect(amount).toHaveValue("12,345.67")

  // @alpinejs/sort initializes order hidden input and sortable items
  const orderInput = page.locator("input[name='Demo.Order']")
  await expect(orderInput).toHaveValue("alpha,beta,gamma")

  // VelleCollapsible toggles <details> via external button
  const details = page.locator("#demo-collapsible details")
  await expect(details).not.toHaveAttribute("open", "")
  await page.getByRole("button", { name: "Toggle details" }).click()
  await expect(details).toHaveAttribute("open", "")
  await page.getByRole("button", { name: "Toggle details" }).click()
  await expect(details).not.toHaveAttribute("open", "")

  // VelleToggleClass toggles a CSS class on its target
  const toggleBox = page.locator("#demo-toggle-target")
  await expect(toggleBox).not.toHaveClass(/bg-shade/)
  await page.getByRole("button", { name: "Toggle highlight" }).click()
  await expect(toggleBox).toHaveClass(/bg-shade/)

  // VelleHotkey focuses target input when '/' is pressed outside inputs
  await page.locator("h1").click()
  await page.keyboard.press("/")
  await expect(page.locator("#demo-hotkey-input")).toBeFocused()
})

test("Phase 6 Chart.js and Lexxy editor (Markdown shortcuts, EditForm submit, and .NET upload bridge) work in Static SSR", async ({ page }) => {
  await page.goto("/components")

  // VelleChart lazy-loads Chart.js and attaches a live Chart instance to <canvas>
  const canvas = page.locator("#demo-chart canvas")
  await canvas.scrollIntoViewIfNeeded()
  await expect.poll(() => canvas.evaluate(el => Boolean(window.Chart?.getChart(el)))).toBe(true)

  // VelleEditor lazy-loads Lexxy, renders initial content, converts Markdown shortcuts, and posts via EditForm Enhance
  const editor = page.locator("lexxy-editor#article-body")
  await expect.poll(() => page.evaluate(() => Boolean(customElements.get("lexxy-editor")))).toBe(true)
  const contentEditable = editor.locator("[contenteditable='true']")
  await expect(contentEditable).toBeVisible()
  await expect(contentEditable).toContainText("Welcome to Lexxy in Blazor Static SSR.")

  // Type a Markdown shortcut (**strong**) at the end and verify Lexxy converts it
  await contentEditable.click()
  await page.keyboard.press("End")
  await page.keyboard.press("Enter")
  await page.keyboard.type("**Markdown works**!")
  await expect(contentEditable.locator("strong", { hasText: "Markdown works" })).toBeVisible()

  // Submit the enhanced EditForm and confirm server received the normalized HTML
  const post = enhancedResponse(page, "POST", "/components")
  await page.getByRole("button", { name: "Save article" }).click()
  expect((await post).ok()).toBe(true)
  await expect(page.locator("#saved-article")).toContainText("<strong>Markdown works</strong>")

  // Verify the .NET attachment upload bridge intercepts lexxy:file-accept and uploads to /api/demo-upload
  const uploadPromise = page.waitForResponse(res => res.request().method() === "POST" && new URL(res.url()).pathname === "/api/demo-upload")
  const uploadEvent = editor.evaluate(el => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    const bytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0))
    const file = new File([bytes], "pixel.png", { type: "image/png" })
    el.contents.uploadFiles([file])
  })
  await uploadEvent
  const uploadRes = await uploadPromise
  expect(uploadRes.ok()).toBe(true)
  const json = await uploadRes.json()
  expect(json.filename).toBe("pixel.png")
  expect(json.url).toMatch(/^data:image\/png;base64,/)
})
