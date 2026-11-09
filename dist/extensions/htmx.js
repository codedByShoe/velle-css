// @ts-check
import { prepareSnapshot } from "../velle.js"

// htmx copies the page right after this event, and the page often stays live after a partial
// swap, so controllers get their changes back as soon as the copy is taken.
document.addEventListener("htmx:beforeHistorySave", () => queueMicrotask(prepareSnapshot()))

// A saved dialog keeps its open attribute but comes back outside the top layer.
document.addEventListener("htmx:historyRestore", () => {
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.removeAttribute("open"))
})
