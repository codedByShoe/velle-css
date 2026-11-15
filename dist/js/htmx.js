import { application } from "./application.js"

// htmx copies the page right after this event. Controllers that define beforeSnapshot()
// take out what connect() built, so the copy restores cleanly; the page often stays live
// after a partial swap, so each one gets its changes back as soon as the copy is taken.
document.addEventListener("htmx:beforeHistorySave", () => {
  const undo = application.controllers.map(controller => controller.beforeSnapshot?.())
  queueMicrotask(() => undo.forEach(callback => callback?.()))
})

// A saved dialog keeps its open attribute but comes back outside the top layer.
document.addEventListener("htmx:historyRestore", () => {
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.removeAttribute("open"))
})
