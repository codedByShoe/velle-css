import { Controller } from "@hotwired/stimulus"

// Stores the visitor's IANA time zone in a "timezone" cookie so the server can read it.
// Put data-controller="timezone-cookie" on any element, usually <body>.
export default class extends Controller {
  connect() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `timezone=${encodeURIComponent(timezone)}; path=/`
  }
}
