export function menu() {
  let observer
  let index = 0

  function getItems(root) {
    return [...root.querySelectorAll("[data-velle-menu-item]")]
  }

  function activate(root, nextIndex) {
    const items = getItems(root)
    const item = items[nextIndex]
    if (!item) return

    items.forEach(it => { it.tabIndex = -1 })
    item.tabIndex = 0
    index = nextIndex
    item.focus()
  }

  return {
    init() {
      const root = this.$root
      observer = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting) return
        const items = getItems(root)
        if (items.length === 0) return

        root.tabIndex = -1
        items.forEach(it => { it.tabIndex = -1 })
        items[0].tabIndex = 0
        index = 0
        items[0].focus()
      })
      observer.observe(root)
    },

    destroy() {
      observer?.disconnect()
      observer = undefined
    },

    onKeydown(event) {
      const root = this.$root
      const items = getItems(root)
      if (items.length === 0) return

      const rtl = getComputedStyle(root).direction === "rtl"
      switch (event.key) {
        case "ArrowDown":
        case rtl ? "ArrowLeft" : "ArrowRight":
          event.preventDefault()
          activate(root, Math.min(index + 1, items.length - 1))
          break
        case "ArrowUp":
        case rtl ? "ArrowRight" : "ArrowLeft":
          event.preventDefault()
          activate(root, Math.max(index - 1, 0))
          break
        case "Home":
          event.preventDefault()
          activate(root, 0)
          break
        case "End":
          event.preventDefault()
          activate(root, items.length - 1)
          break
      }
    },

    onFocusin(event) {
      const root = this.$root
      const items = getItems(root)
      if (event.target === root) {
        activate(root, index)
      } else if (items.includes(event.target)) {
        items.forEach(it => { it.tabIndex = -1 })
        event.target.tabIndex = 0
        index = items.indexOf(event.target)
      }
    },
  }
}

export function hoverPopover() {
  return {
    get target() {
      const id = this.$root.dataset.vellePopoverTarget
      return id ? document.getElementById(id) : this.$root.querySelector("[popover]")
    },

    show(event) {
      const target = this.target
      if (!target || typeof target.showPopover !== "function") return
      try {
        target.showPopover({ source: event.currentTarget })
      } catch {}
    },

    hide() {
      const target = this.target
      if (!target || typeof target.hidePopover !== "function") return
      try {
        target.hidePopover()
      } catch {}
    },
  }
}

export function flash() {
  return {
    init() {
      this.refresh()
    },

    refresh() {
      const el = this.$root
      if (!el.isConnected || typeof el.showPopover !== "function") return
      try {
        if (!el.matches(":popover-open")) el.showPopover()
      } catch {}
    },

    hide() {
      const el = this.$root
      if (typeof el.hidePopover !== "function") return
      try {
        if (el.matches(":popover-open")) el.hidePopover()
      } catch {}
    },
  }
}

function readStoredScheme() {
  try {
    return localStorage.getItem("color_scheme") || "system"
  } catch {
    return "system"
  }
}

function applyScheme(scheme, persist = true) {
  document.documentElement.dataset.colorScheme = scheme
  if (persist) {
    try {
      localStorage.setItem("color_scheme", scheme)
    } catch {}
  }
  document.dispatchEvent(new CustomEvent("velle:color-scheme:change", {
    bubbles: true,
    detail: { colorScheme: scheme },
  }))
}

export function initColorSchemeRoot() {
  if (typeof document === "undefined") return
  if (document.documentElement.hasAttribute("data-color-scheme") && !document.documentElement.dataset.colorScheme) {
    document.documentElement.dataset.colorScheme = readStoredScheme()
  }
}

export function colorScheme() {
  return {
    init() {
      if (!document.documentElement.dataset.colorScheme) {
        document.documentElement.dataset.colorScheme = readStoredScheme()
      }
    },

    setLight() {
      applyScheme("light")
    },

    setDark() {
      applyScheme("dark")
    },

    setSystem() {
      applyScheme("system")
    },
  }
}
