# Bundled Client Libraries

`Velle.Blazor` bundles these third-party client libraries locally under `wwwroot/lib/` so consuming apps have no external CDN or npm requirement. File names omit version numbers because ASP.NET Core static web assets (`MapStaticAssets` + `@Assets[...]`) fingerprint files automatically.

| Library | Version | Files | License |
| --- | --- | --- | --- |
| [Alpine.js (CSP build)](https://alpinejs.dev/advanced/csp) | 3.15.12 | `alpine/alpine-csp.min.js` | MIT (`alpine/LICENSE.md`) |
| [Flatpickr](https://flatpickr.js.org/) | 4.6.13 | `flatpickr/flatpickr.min.js`, `flatpickr/flatpickr.min.css` | MIT (`flatpickr/LICENSE.md`) |
