export function collapsible() {
  return {
    get details() {
      return this.$root.matches("details")
        ? this.$root
        : this.$root.querySelector(":scope > details") ?? this.$root.querySelector("details")
    },

    open() {
      const el = this.details
      if (el) el.open = true
    },

    close() {
      const el = this.details
      if (el) el.open = false
    },

    toggle() {
      const el = this.details
      if (el) el.open = !el.open
    },
  }
}

export function uploadPreview() {
  return {
    preview() {
      const input = this.$root.querySelector("[data-velle-upload-input]")
      const image = this.$root.querySelector("[data-velle-upload-image]")
      const removeInput = this.$root.querySelector("[data-velle-upload-remove]")
      const file = input?.files?.[0]
      if (!file || !image) return

      const url = URL.createObjectURL(file)
      image.src = url
      image.onload = () => URL.revokeObjectURL(url)
      if (removeInput) removeInput.value = "false"

      this.$root.dispatchEvent(new CustomEvent("velle:upload-preview:change", {
        bubbles: true,
        detail: { file },
      }))
    },

    clear() {
      const input = this.$root.querySelector("[data-velle-upload-input]")
      const image = this.$root.querySelector("[data-velle-upload-image]")
      const removeInput = this.$root.querySelector("[data-velle-upload-remove]")
      const fallback = this.$root.dataset.velleDefaultImage ?? ""

      if (image) image.src = fallback
      if (input) input.value = ""
      if (removeInput) removeInput.value = "true"

      this.$root.dispatchEvent(new CustomEvent("velle:upload-preview:clear", { bubbles: true }))
    },
  }
}

export function webShare() {
  async function fetchFile(url) {
    const response = await fetch(url)
    const blob = await response.blob()
    const ext = blob.type.split("/").pop() || "bin"
    const name = `share_${Math.random().toString(36).slice(2)}.${ext}`
    return new File([blob], name, { type: blob.type })
  }

  return {
    init() {
      const supported = typeof navigator !== "undefined" && typeof navigator.share === "function"
      if (!supported && this.$root.dataset.velleShareAlwaysShow !== "true") {
        this.$root.hidden = true
      }
    },

    async share() {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function") return
      const { velleShareTitle, velleShareText, velleShareUrl, velleShareFile } = this.$root.dataset
      const data = {}
      if (velleShareTitle) data.title = velleShareTitle
      if (velleShareText) data.text = velleShareText
      if (velleShareUrl) data.url = velleShareUrl
      if (velleShareFile) {
        try {
          data.files = [await fetchFile(velleShareFile)]
        } catch {
          return
        }
      }

      try {
        await navigator.share(data)
      } catch {}
    },
  }
}

export function fullscreen() {
  function targetElement(root) {
    const selector = root.dataset.velleFullscreenTarget
    return (selector ? document.querySelector(selector) : null) ?? document.documentElement
  }

  return {
    init() {
      const supported = Boolean(document.fullscreenEnabled || document.documentElement.requestFullscreen)
      if (!supported) {
        const triggers = this.$root.querySelectorAll("[data-velle-fullscreen-trigger]")
        if (triggers.length) {
          triggers.forEach(btn => { btn.hidden = true })
        } else {
          this.$root.hidden = true
        }
      }
    },

    toggle() {
      if (document.fullscreenElement) {
        document.exitFullscreen?.()
      } else {
        targetElement(this.$root)?.requestFullscreen?.()
      }
    },
  }
}

export function autosave() {
  let timer = null

  function getForm(root) {
    return root.matches("form") ? root : root.querySelector("form")
  }

  function resetTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function submitForm(root) {
    const form = getForm(root)
    if (!form) return

    if (root.dataset.velleAutosaveMode === "submit") {
      form.requestSubmit()
      return
    }

    const submit = root.querySelector("[data-velle-autosave-submit]")
    form.setAttribute("aria-busy", "true")
    if (submit) submit.disabled = true

    try {
      const method = (form.method || "POST").toUpperCase()
      const url = new URL(form.action || location.href, location.href)
      const headers = { Accept: "text/html, application/xhtml+xml", "X-Requested-With": "XMLHttpRequest" }
      const options = { method, headers, credentials: "same-origin" }

      if (method === "GET") {
        new FormData(form).forEach((value, key) => url.searchParams.append(key, String(value)))
      } else {
        options.body = new FormData(form)
      }

      const response = await fetch(url, options)
      root.dispatchEvent(new CustomEvent(response.ok ? "velle:autosave:success" : "velle:autosave:error", {
        bubbles: true,
        detail: { response },
      }))
    } catch (error) {
      root.dispatchEvent(new CustomEvent("velle:autosave:error", {
        bubbles: true,
        detail: { error },
      }))
    } finally {
      form.setAttribute("aria-busy", "false")
      if (submit) submit.disabled = false
    }
  }

  return {
    change() {
      if (timer !== null) return
      const interval = Number(this.$root.dataset.velleAutosaveInterval ?? 3000)
      timer = setTimeout(() => {
        resetTimer()
        submitForm(this.$root)
      }, Number.isFinite(interval) ? interval : 3000)
    },

    saveNow() {
      resetTimer()
      submitForm(this.$root)
    },

    destroy() {
      if (timer !== null) {
        resetTimer()
        submitForm(this.$root)
      }
    },
  }
}

export function formHelper() {
  let debounceTimer = null

  function getForm(root) {
    return root.matches("form") ? root : root.querySelector("form")
  }

  return {
    submit() {
      getForm(this.$root)?.requestSubmit()
    },

    debouncedSubmit() {
      if (debounceTimer !== null) clearTimeout(debounceTimer)
      const wait = Number(this.$root.dataset.velleFormDebounce ?? 300)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        getForm(this.$root)?.requestSubmit()
      }, Number.isFinite(wait) ? wait : 300)
    },

    validate() {
      const form = getForm(this.$root)
      const submit = this.$root.querySelector("[data-velle-form-submit]")
      if (!form || !submit) return
      submit.disabled = !form.checkValidity()
    },

    select(event) {
      event.target?.select?.()
    },

    reset() {
      getForm(this.$root)?.reset()
    },

    cancel() {
      this.$root.querySelector("[data-velle-form-cancel]")?.click()
    },

    destroy() {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
    },
  }
}

export function autoSelect() {
  return {
    init() {
      this.refresh()
    },

    refresh() {
      const el = this.$root.matches("input, textarea")
        ? this.$root
        : this.$root.querySelector("input, textarea")
      if (!el || typeof el.select !== "function") return
      if (el.autofocus || this.$root.dataset.velleAutoselectAlways === "true") {
        el.select()
      }
    },
  }
}

export function hotkey() {
  let handler = null

  function parseCombo(raw) {
    const parts = (raw || "").toLowerCase().split("+").map(s => s.trim()).filter(Boolean)
    const key = parts.pop() || ""
    return {
      key,
      ctrl: parts.includes("ctrl") || parts.includes("control"),
      meta: parts.includes("meta") || parts.includes("cmd") || parts.includes("command"),
      alt: parts.includes("alt") || parts.includes("option"),
      shift: parts.includes("shift"),
      mod: parts.includes("mod"),
    }
  }

  function matches(event, combo) {
    if (!combo.key || event.key.toLowerCase() !== combo.key) return false
    if (combo.mod) {
      if (!(event.metaKey || event.ctrlKey)) return false
      if (event.altKey !== combo.alt || event.shiftKey !== combo.shift) return false
      return true
    }
    return event.ctrlKey === combo.ctrl
      && event.metaKey === combo.meta
      && event.altKey === combo.alt
      && event.shiftKey === combo.shift
  }

  return {
    init() {
      const root = this.$root
      const combo = parseCombo(root.dataset.velleHotkey)
      const action = root.dataset.velleHotkeyAction || "click"

      handler = event => {
        if (event.defaultPrevented) return
        if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return
        if (!matches(event, combo)) return

        const target = root.querySelector("[data-velle-hotkey-target]")
          ?? root.querySelector("a, button, input, textarea, select, [tabindex]")
          ?? root
        if (!target || getComputedStyle(target).pointerEvents === "none") return

        event.preventDefault()
        if (action === "focus") {
          target.focus()
        } else {
          target.click()
        }
      }

      window.addEventListener("keydown", handler)
    },

    destroy() {
      if (handler) {
        window.removeEventListener("keydown", handler)
        handler = null
      }
    },
  }
}

export function toggleClass() {
  function resolveTarget(root) {
    const selector = root.dataset.velleToggleTarget
    return selector ? document.querySelector(selector) : root
  }

  function className(root) {
    return root.dataset.velleToggleClass || "closed"
  }

  return {
    toggle() {
      resolveTarget(this.$root)?.classList.toggle(className(this.$root))
    },

    add() {
      resolveTarget(this.$root)?.classList.add(className(this.$root))
    },

    remove() {
      resolveTarget(this.$root)?.classList.remove(className(this.$root))
    },
  }
}

export function inputMask() {
  function buildMoneyPattern(input, decimal, thousands, precision) {
    if (input === "-") return "-"
    if (/^\D+$/.test(input)) return "9"
    const neg = input.startsWith("-") ? "-" : ""
    const escapedDecimal = decimal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const stripped = input.replace(new RegExp(`[^0-9${escapedDecimal}]`, "g"), "")
    const intLen = Math.max(stripped.split(decimal)[0].length, 1)
    let intMask = ""
    let count = 0
    for (let i = 0; i < intLen; i++) {
      if (count === 3) {
        intMask = thousands + intMask
        count = 0
      }
      intMask = "9" + intMask
      count++
    }
    let pattern = `${neg}${intMask}`
    if (precision > 0 && input.includes(decimal)) {
      pattern += decimal + "9".repeat(precision)
    }
    return pattern
  }

  return {
    moneyMask(input) {
      const decimal = this.$root.dataset.velleMaskDecimal || "."
      const thousands = this.$root.dataset.velleMaskThousands || (decimal === "," ? "." : ",")
      const precision = Number(this.$root.dataset.velleMaskPrecision ?? 2)
      return buildMoneyPattern(String(input ?? ""), decimal, thousands, Number.isFinite(precision) ? precision : 2)
    },
  }
}

export function sortable() {
  function getOrder(list) {
    return [...list.querySelectorAll(":scope > [data-velle-sort-key]")]
      .map(el => el.getAttribute("data-velle-sort-key"))
      .filter(Boolean)
  }

  function syncOrderInput(root, list) {
    const order = getOrder(list)
    const input = root.querySelector("[data-velle-sortable-order]")
    if (input) input.value = order.join(",")
    return order
  }

  function persist(root, list, item, key, position, order) {
    const url = item?.getAttribute("data-velle-sort-url") || root.dataset.velleSortUrl
    if (!url) return

    const method = (root.dataset.velleSortMethod || "PATCH").toUpperCase()
    const body = new FormData()
    body.append("position", String(position))
    if (key) body.append("key", key)
    body.append("order", order.join(","))
    const parentId = root.dataset.velleSortParentId
    if (parentId !== undefined) body.append("parent_id", parentId)

    fetch(url, {
      method,
      body,
      headers: { Accept: "text/html, application/xhtml+xml", "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin",
    })
      .then(response => root.dispatchEvent(new CustomEvent(response.ok ? "velle:sortable:success" : "velle:sortable:error", {
        bubbles: true,
        detail: { response, key, position, order },
      })))
      .catch(error => root.dispatchEvent(new CustomEvent("velle:sortable:error", {
        bubbles: true,
        detail: { error, key, position, order },
      })))
  }

  return {
    init() {
      const list = this.$root.querySelector("[data-velle-sortable-list]") ?? this.$root
      syncOrderInput(this.$root, list)
    },

    onSort(itemKey, position) {
      const list = this.$root.querySelector("[data-velle-sortable-list]") ?? this.$root
      const order = syncOrderInput(this.$root, list)
      const items = [...list.querySelectorAll(":scope > [data-velle-sort-key]")]
      const item = typeof position === "number" ? items[position] : null
      const key = itemKey ?? item?.getAttribute("data-velle-sort-key") ?? null

      this.$root.dispatchEvent(new CustomEvent("velle:sortable:move", {
        bubbles: true,
        detail: { item, key, position, order },
      }))

      persist(this.$root, list, item, key, position, order)
    },
  }
}
