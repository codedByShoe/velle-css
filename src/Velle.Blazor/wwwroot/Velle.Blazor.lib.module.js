import BundledAlpine from "./lib/alpine/alpine-csp.min.js"
import maskPlugin from "./lib/alpine/alpine-mask.min.js"
import sortPlugin from "./lib/alpine/alpine-sort.min.js"
import { datepicker } from "./js/datepicker.js"
import { colorScheme, flash, hoverPopover, initColorSchemeRoot, menu } from "./js/overlays.js"
import { inputClearable, inputCopyable, inputOtp, inputRevealable } from "./js/inputs.js"
import { carousel, command, confirmDialog, contextMenu, lightbox, resizable } from "./js/advanced.js"
import { checkAll, dropzone, dualRange, localTime, timezoneCookie } from "./js/forms_advanced.js"
import {
  autoSelect,
  autosave,
  collapsible,
  formHelper,
  fullscreen,
  hotkey,
  inputMask,
  sortable,
  toggleClass,
  uploadPreview,
  webShare,
} from "./js/behaviors.js"
import { chart } from "./js/chart.js"
import { editor } from "./js/editor.js"

let enhancedLoadWired = false
let alpineInitialized = false

if (typeof document !== "undefined") {
  document.addEventListener("alpine:initialized", () => {
    alpineInitialized = true
  })
}

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
      if (!dialog) return

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
      const dialog = this.dialog
      if (dialog && !dialog.open) dialog.showModal()
    },

    close() {
      const dialog = this.dialog
      if (dialog && dialog.open) dialog.close()
    },

    onClose() {
      const dialog = this.dialog
      if (dialog) dialog.dataset.velleOpen = "false"
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

function isAlpineStarted() {
  if (alpineInitialized) return true
  const existing = document.querySelector("[x-data]")
  return Boolean(existing && existing._x_dataStack)
}

export function afterWebStarted(blazor) {
  const hadAlpine = Boolean(window.Alpine)
  const alpine = window.Alpine ?? BundledAlpine
  if (!hadAlpine) {
    window.Alpine = alpine
  }

  alpine.plugin(maskPlugin)
  alpine.plugin(sortPlugin)

  alpine.data("velleDialog", dialog)
  alpine.data("velleTabs", tabs)
  alpine.data("velleDatepicker", datepicker)
  alpine.data("velleMenu", menu)
  alpine.data("velleHoverPopover", hoverPopover)
  alpine.data("velleFlash", flash)
  alpine.data("velleColorScheme", colorScheme)
  alpine.data("velleInputClearable", inputClearable)
  alpine.data("velleInputCopyable", inputCopyable)
  alpine.data("velleInputRevealable", inputRevealable)
  alpine.data("velleInputOtp", inputOtp)
  alpine.data("velleCommand", command)
  alpine.data("velleConfirm", confirmDialog)
  alpine.data("velleContextMenu", contextMenu)
  alpine.data("velleLightbox", lightbox)
  alpine.data("velleCarousel", carousel)
  alpine.data("velleResizable", resizable)
  alpine.data("velleDualRange", dualRange)
  alpine.data("velleDropzone", dropzone)
  alpine.data("velleCheckAll", checkAll)
  alpine.data("velleLocalTime", localTime)
  alpine.data("velleTimezoneCookie", timezoneCookie)
  alpine.data("velleCollapsible", collapsible)
  alpine.data("velleUploadPreview", uploadPreview)
  alpine.data("velleWebShare", webShare)
  alpine.data("velleFullscreen", fullscreen)
  alpine.data("velleAutosave", autosave)
  alpine.data("velleFormHelper", formHelper)
  alpine.data("velleAutoSelect", autoSelect)
  alpine.data("velleHotkey", hotkey)
  alpine.data("velleToggleClass", toggleClass)
  alpine.data("velleInputMask", inputMask)
  alpine.data("velleSortable", sortable)
  alpine.data("velleChart", chart)
  alpine.data("velleEditor", editor)

  initColorSchemeRoot()

  if (!isAlpineStarted() && !hadAlpine) {
    window.dispatchEvent(new CustomEvent("velle:before-start", { detail: { Alpine: alpine } }))
    alpine.start()
  }

  if (!enhancedLoadWired) {
    enhancedLoadWired = true
    // Blazor can patch attributes on elements that Alpine has already initialized.
    blazor.addEventListener("enhancedload", () => {
      window.dispatchEvent(new Event("velle-enhanced-load"))
    })
  }
}
