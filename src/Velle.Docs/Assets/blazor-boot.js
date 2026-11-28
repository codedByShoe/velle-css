// Boots Velle.Blazor's Alpine.js CSP runtime on static documentation pages so live Razor previews work without blazor.web.js.
import { afterWebStarted } from "./blazor/Velle.Blazor.lib.module.js"

const staticBlazorShim = {
  addEventListener() {},
}

afterWebStarted(staticBlazorShim)
