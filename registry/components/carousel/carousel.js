import { define, Controller } from "./velle.js"

define("carousel", class extends Controller {
  next() {
    this.target("content").scrollBy(100, 0)
  }

  prev() {
    this.target("content").scrollBy(-100, 0)
  }
})
