// Demo helpers for the documentation site. Not part of velle-css.
(() => {
  const demoArea = ".docs-preview, .docs-frame"

  // Shows a short message using the flash component.
  function toast(message) {
    const flash = document.createElement("div")
    flash.setAttribute("popover", "manual")
    flash.setAttribute("role", "status")
    flash.setAttribute("data-flash", "")
    flash.setAttribute("data-flash-action", "animationend->hide")
    flash.className = "flash"
    flash.addEventListener("toggle", event => event.newState === "closed" && flash.remove())

    const content = document.createElement("div")
    content.className = "flash__content font-medium"
    content.textContent = message

    flash.append(content)
    document.body.append(flash)
  }

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return

    const flashTrigger = event.target.closest("[data-demo-flash]")
    if (flashTrigger) {
      const template = document.getElementById(flashTrigger.dataset.demoFlash)
      document.body.append(template.content.cloneNode(true))
    }

    const toastTrigger = event.target.closest("[data-demo-toast]")
    if (toastTrigger) toast(toastTrigger.dataset.demoToast)

    // Keep placeholder links in examples from jumping to the top of the page.
    const placeholderLink = event.target.closest('a[href="#"]')
    if (placeholderLink && placeholderLink.closest(demoArea)) event.preventDefault()
  })

  // Example forms have no server to post to: show what would have happened instead.
  document.addEventListener("submit", event => {
    const form = event.target
    const method = event.submitter?.getAttribute("formmethod") || form.getAttribute("method")

    if (!form.closest(demoArea) || method === "dialog") return

    event.preventDefault()
    toast(`Submitted ${form.getAttribute("action") || "the form"} (demo: nothing was sent)`)
  })

  // Keep framed examples in the same color scheme as the page.
  document.addEventListener("velle:color-scheme:change", event => {
    document.querySelectorAll("iframe.docs-frame-preview").forEach(frame => {
      const root = frame.contentDocument?.documentElement
      if (root) root.dataset.colorScheme = event.detail.colorScheme
    })
  })
})()
