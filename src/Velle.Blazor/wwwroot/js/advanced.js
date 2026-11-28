let commandUid = 0

export function command() {
  let observer
  let selected = null

  function getInput(root) {
    return root.querySelector("[data-velle-command-input]")
  }

  function getItems(root) {
    return [...root.querySelectorAll("[data-velle-command-item]")]
  }

  function getVisible(root) {
    return getItems(root).filter(item => !item.hidden && item.getAttribute("aria-disabled") !== "true")
  }

  function select(root, item, scroll = false) {
    selected?.removeAttribute("data-selected")
    selected?.setAttribute("aria-selected", "false")
    selected = item

    const input = getInput(root)
    if (item) {
      if (!item.id) item.id = `velle-command-item-${++commandUid}`
      item.setAttribute("data-selected", "")
      item.setAttribute("aria-selected", "true")
      input?.setAttribute("aria-activedescendant", item.id)
      if (scroll) item.scrollIntoView({ block: "nearest" })
    } else {
      input?.removeAttribute("aria-activedescendant")
    }
  }

  function filter(root) {
    const input = getInput(root)
    if (!input) return

    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean)
    const items = getItems(root)

    for (const item of items) {
      const text = `${item.getAttribute("data-command-value") ?? item.textContent} ${item.getAttribute("data-command-keywords") ?? ""}`.toLowerCase()
      item.hidden = !terms.every(term => text.includes(term))
    }

    for (const group of root.querySelectorAll("[data-velle-command-group]")) {
      group.hidden = !items.some(item => group.contains(item) && !item.hidden)
    }

    for (const sep of root.querySelectorAll("[data-velle-command-separator]")) {
      sep.hidden = terms.length > 0
    }

    const visible = getVisible(root)
    const empty = root.querySelector("[data-velle-command-empty]")
    if (empty) empty.hidden = visible.length > 0

    select(root, visible[0] ?? null)
  }

  return {
    init() {
      const root = this.$root
      const input = getInput(root)
      if (input) {
        input.setAttribute("role", "combobox")
        input.setAttribute("aria-expanded", "true")
        input.setAttribute("aria-autocomplete", "list")
      }

      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) this.reset()
      })
      observer.observe(root)
      this.reset()
    },

    destroy() {
      observer?.disconnect()
      observer = undefined
    },

    reset() {
      const input = getInput(this.$root)
      if (input) input.value = ""
      filter(this.$root)
    },

    onInput() {
      filter(this.$root)
    },

    onKeydown(event) {
      const visible = getVisible(this.$root)
      const index = visible.indexOf(selected)

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          select(this.$root, visible[Math.min(index + 1, visible.length - 1)] ?? null, true)
          break
        case "ArrowUp":
          event.preventDefault()
          select(this.$root, visible[Math.max(index - 1, 0)] ?? null, true)
          break
        case "Enter":
          if (event.isComposing || !selected) return
          event.preventDefault()
          selected.click()
          break
      }
    },

    onPointerMove(event) {
      const item = event.target instanceof Element ? event.target.closest("[data-velle-command-item]") : null
      if (item && item !== selected && getVisible(this.$root).includes(item)) {
        select(this.$root, item)
      }
    },

    onClick(event) {
      const item = event.target instanceof Element ? event.target.closest("[data-velle-command-item]") : null
      if (!item || !getItems(this.$root).includes(item)) return
      this.$root.dispatchEvent(new CustomEvent("velle:command:select", {
        bubbles: true,
        detail: { item, value: item.getAttribute("data-command-value") ?? item.textContent.trim() },
      }))
    },
  }
}

const DEFAULT_CONFIRM_TEXT = "This action cannot be undone and may have permanent consequences."
const confirmedElements = new WeakSet()
let activeConfirmDialog = null
let confirmListenersWired = false

function askConfirm(message, text) {
  return activeConfirmDialog
    ? activeConfirmDialog.ask(message, text)
    : Promise.resolve(window.confirm(message))
}

function wireConfirmListeners() {
  if (confirmListenersWired || typeof window === "undefined") return
  confirmListenersWired = true

  window.addEventListener("submit", event => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    const submitter = event.submitter
    const source = submitter?.hasAttribute("data-confirm") ? submitter : form
    if (!source.hasAttribute("data-confirm")) return

    if (confirmedElements.has(form)) {
      confirmedElements.delete(form)
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()

    askConfirm(source.getAttribute("data-confirm"), source.getAttribute("data-confirm-text")).then(ok => {
      if (ok) {
        confirmedElements.add(form)
        submitter ? form.requestSubmit(submitter) : form.requestSubmit()
      }
    })
  }, true)

  window.addEventListener("click", event => {
    const link = event.target instanceof Element ? event.target.closest("a[data-confirm]") : null
    if (!link) return

    if (confirmedElements.has(link)) {
      confirmedElements.delete(link)
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()

    askConfirm(link.getAttribute("data-confirm"), link.getAttribute("data-confirm-text")).then(ok => {
      if (ok) {
        confirmedElements.add(link)
        link.click()
      }
    })
  }, true)
}

export function confirmDialog() {
  let resolvePromise = null

  const controller = {
    init() {
      wireConfirmListeners()
      activeConfirmDialog = this
    },

    destroy() {
      if (activeConfirmDialog === this) activeConfirmDialog = null
    },

    ask(message, text) {
      const dialog = this.$root
      const title = dialog.querySelector("[data-velle-confirm-title]")
      const body = dialog.querySelector("[data-velle-confirm-text]")
      if (title) title.textContent = message || ""
      if (body) body.textContent = text || dialog.dataset.velleConfirmDefaultText || DEFAULT_CONFIRM_TEXT
      dialog.returnValue = ""
      dialog.showModal()
      return new Promise(resolve => { resolvePromise = resolve })
    },

    onClose() {
      resolvePromise?.(this.$root.returnValue === "confirm")
      resolvePromise = null
    },
  }

  return controller
}

export function contextMenu() {
  return {
    show(event) {
      event.preventDefault()
      const content = this.$root.querySelector("[data-velle-context-menu-content]")
      if (!content || typeof content.showPopover !== "function") return

      content.style.insetInlineStart = `${event.clientX}px`
      content.style.insetBlockStart = `${event.clientY}px`
      content.showPopover()
    },
  }
}

export function lightbox() {
  return {
    get dialog() {
      return this.$root.querySelector("dialog.lightbox")
    },

    show(event) {
      const link = event.target instanceof Element ? event.target.closest("[data-velle-lightbox-trigger]") : null
      if (!link) return
      event.preventDefault()

      const dialog = this.dialog
      if (!dialog) return

      const img = dialog.querySelector("[data-velle-lightbox-image]")
      const download = dialog.querySelector("[data-velle-lightbox-download]")
      const url = link.getAttribute("data-velle-lightbox-url") || link.getAttribute("href") || ""
      const alt = link.querySelector("img")?.getAttribute("alt") || link.getAttribute("aria-label") || ""

      if (img) {
        img.src = link.getAttribute("href") || url
        img.alt = alt
      }
      if (download) download.href = url

      if (!dialog.open) dialog.showModal()
    },

    close() {
      const dialog = this.dialog
      if (dialog?.open) dialog.close()
    },

    reset() {
      const dialog = this.dialog
      if (!dialog) return
      const img = dialog.querySelector("[data-velle-lightbox-image]")
      const download = dialog.querySelector("[data-velle-lightbox-download]")
      if (img) img.src = ""
      if (download) download.href = ""
    },
  }
}

export function carousel() {
  return {
    get content() {
      return this.$root.querySelector(".carousel__content")
    },

    next() {
      this.content?.scrollBy(100, 0)
    },

    prev() {
      this.content?.scrollBy(-100, 0)
    },

    onKeydown(event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        this.prev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        this.next()
      }
    },
  }
}

export function resizable() {
  const sizes = new Map()
  let drag = null

  function isVertical(root) {
    return root.classList.contains("resizable--vertical")
  }

  function direction(root) {
    return !isVertical(root) && getComputedStyle(root).direction === "rtl" ? -1 : 1
  }

  function directPanels(root) {
    return [...root.querySelectorAll(":scope > .resizable__panel")]
  }

  function directHandles(root) {
    return [...root.querySelectorAll(":scope > .resizable__handle")]
  }

  function neighbours(root, handle) {
    const panels = directPanels(root)
    const before = handle.previousElementSibling
    const after = handle.nextElementSibling
    return [panels.includes(before) ? before : null, panels.includes(after) ? after : null]
  }

  function limit(panel, name, fallback) {
    const val = parseFloat(panel.getAttribute(`data-resizable-${name}`))
    return Number.isNaN(val) ? fallback : val
  }

  function setSize(panel, size) {
    sizes.set(panel, size)
    panel.style.flexGrow = String(size)
  }

  function updateHandle(root, handle) {
    const [before] = neighbours(root, handle)
    handle.setAttribute("role", "separator")
    handle.setAttribute("aria-orientation", isVertical(root) ? "horizontal" : "vertical")
    if (!handle.hasAttribute("tabindex")) handle.tabIndex = 0
    handle.setAttribute("aria-valuemin", "0")
    handle.setAttribute("aria-valuemax", "100")
    if (before) handle.setAttribute("aria-valuenow", String(Math.round(sizes.get(before) ?? 0)))
  }

  function resize(root, handle, before, after, size, total) {
    const lower = Math.max(limit(before, "min", 0), total - limit(after, "max", 100))
    const upper = Math.min(limit(before, "max", 100), total - limit(after, "min", 0))
    const clamped = Math.min(Math.max(size, lower), upper)
    if (clamped === sizes.get(before)) return

    setSize(before, clamped)
    setSize(after, total - clamped)
    updateHandle(root, handle)
    root.dispatchEvent(new CustomEvent("velle:resizable:resize", {
      bubbles: true,
      detail: { sizes: directPanels(root).map(p => sizes.get(p)) },
    }))
  }

  function position(root, event) {
    return isVertical(root) ? event.clientY : event.clientX
  }

  function length(root, rect) {
    return isVertical(root) ? rect.height : rect.width
  }

  function onPointerMove(event) {
    if (!drag || drag.available === 0) return
    const delta = (position(drag.root, event) - drag.start) / drag.available * 100 * direction(drag.root)
    resize(drag.root, drag.handle, drag.before, drag.after, drag.beforeSize + delta, drag.beforeSize + drag.afterSize)
  }

  function stopDragging() {
    if (!drag) return
    drag.handle.removeAttribute("data-dragging")
    drag.root.removeAttribute("data-dragging")
    drag.handle.removeEventListener("pointermove", onPointerMove)
    drag.handle.removeEventListener("pointerup", stopDragging)
    drag.handle.removeEventListener("pointercancel", stopDragging)
    drag = null
  }

  return {
    init() {
      const root = this.$root
      const panels = directPanels(root)
      const given = panels.map(p => parseFloat(p.getAttribute("data-resizable-size")))
      const taken = given.filter(s => !Number.isNaN(s)).reduce((a, b) => a + b, 0)
      const unsized = given.filter(s => Number.isNaN(s)).length
      const share = unsized ? Math.max(100 - taken, 0) / unsized : 0

      panels.forEach((panel, i) => setSize(panel, Number.isNaN(given[i]) ? share : given[i]))
      directHandles(root).forEach(handle => updateHandle(root, handle))
    },

    destroy() {
      stopDragging()
    },

    onPointerDown(event) {
      const root = this.$root
      const handle = event.target instanceof Element ? event.target.closest(".resizable__handle") : null
      if (!handle || !directHandles(root).includes(handle) || event.button !== 0) return

      const [before, after] = neighbours(root, handle)
      if (!before || !after) return

      event.preventDefault()
      handle.focus()
      handle.setPointerCapture?.(event.pointerId)

      drag = {
        root,
        handle,
        before,
        after,
        start: position(root, event),
        beforeSize: sizes.get(before),
        afterSize: sizes.get(after),
        available: directPanels(root).reduce((sum, p) => sum + length(root, p.getBoundingClientRect()), 0),
      }

      handle.setAttribute("data-dragging", "")
      root.setAttribute("data-dragging", "")
      handle.addEventListener("pointermove", onPointerMove)
      handle.addEventListener("pointerup", stopDragging)
      handle.addEventListener("pointercancel", stopDragging)
    },

    onKeydown(event) {
      const root = this.$root
      const handle = event.target instanceof Element ? event.target.closest(".resizable__handle") : null
      if (!handle || event.target !== handle || !directHandles(root).includes(handle)) return

      const [before, after] = neighbours(root, handle)
      if (!before || !after) return

      const step = event.shiftKey ? 10 : 1
      const [backward, forward] = isVertical(root)
        ? ["ArrowUp", "ArrowDown"]
        : direction(root) === 1 ? ["ArrowLeft", "ArrowRight"] : ["ArrowRight", "ArrowLeft"]
      const total = sizes.get(before) + sizes.get(after)

      let nextSize
      switch (event.key) {
        case backward: nextSize = sizes.get(before) - step; break
        case forward: nextSize = sizes.get(before) + step; break
        case "Home": nextSize = 0; break
        case "End": nextSize = total; break
        default: return
      }

      event.preventDefault()
      resize(root, handle, before, after, nextSize, total)
    },
  }
}
