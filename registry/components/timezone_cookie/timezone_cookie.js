import { observe } from "./velle.js"

// Stores the visitor's IANA time zone in a "timezone" cookie so the server can read it.
// Put data-timezone-cookie on any element, usually <body>.
observe("[data-timezone-cookie]", {
  connect() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `timezone=${encodeURIComponent(timezone)}; path=/`
  }
})
