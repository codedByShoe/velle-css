import Alpine from "./vendor/alpine-csp-3.15.12.min.js"
import { datepicker } from "./datepicker.js"

function dialog() {
  return {
    get dialog() {
      return this.$root.querySelector(":scope > dialog")
    },

    init() {
      this.refresh()
    },

    refresh() {
      const dialog = this.dialog
      // Blazor can remove the open attribute while the dialog is still modal.
      // Restore it so the native close() can remove the dialog from the top layer.
      if (dialog.matches(":modal") && !dialog.open) {
        dialog.open = true
      }

      if (dialog.dataset.velleOpen === "true") {
        this.show()
      } else {
        this.close()
      }
    },

    show() {
      if (!this.dialog.open) this.dialog.showModal()
    },

    close() {
      if (this.dialog.open) this.dialog.close()
    },
  }
}

function tabs() {
  return {
    selected: 0,
    serverSelection: null,

    get buttons() {
      return [...this.$root.querySelectorAll(":scope > [role=tablist] > [role=tab]")]
    },

    init() {
      this.refresh()
    },

    refresh() {
      const serverSelection = Number(this.$root.dataset.velleSelected)
      if (this.serverSelection !== serverSelection) {
        this.serverSelection = serverSelection
        this.selected = serverSelection
      }

      const buttons = this.buttons
      this.selected = Math.min(this.selected, Math.max(0, buttons.length - 1))
      buttons.forEach((button, index) => {
        const selected = index === this.selected
        button.setAttribute("aria-selected", String(selected))
        button.tabIndex = selected ? 0 : -1
      })

      const panels = this.$root.querySelectorAll(":scope > [role=tabpanel]")
      panels.forEach((panel, index) => {
        panel.hidden = index !== this.selected
      })
    },

    select(event) {
      this.selected = this.buttons.indexOf(event.currentTarget)
      this.refresh()
    },

    onKeydown(event) {
      const buttons = this.buttons
      const current = buttons.indexOf(event.target)
      if (current === -1) return

      switch (event.key) {
        case "ArrowLeft":
          this.selected = (current - 1 + buttons.length) % buttons.length
          break
        case "ArrowRight":
          this.selected = (current + 1) % buttons.length
          break
        case "Home":
          this.selected = 0
          break
        case "End":
          this.selected = buttons.length - 1
          break
        default:
          return
      }

      event.preventDefault()
      this.refresh()
      buttons[this.selected].focus()
    },
  }
}

export function afterWebStarted(blazor) {
  Alpine.data("velleDialog", dialog)
  Alpine.data("velleTabs", tabs)
  Alpine.data("velleDatepicker", datepicker)
  Alpine.start()

  // Blazor can patch attributes on elements that Alpine has already initialized.
  blazor.addEventListener("enhancedload", () => {
    window.dispatchEvent(new Event("velle-enhanced-load"))
  })
}
