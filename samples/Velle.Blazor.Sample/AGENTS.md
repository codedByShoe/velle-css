# Velle.Blazor.Sample

The sample uses Blazor static server-side rendering. Alpine.js handles browser interactions. Keep routes and components on static SSR.

- Keep enhanced navigation enabled through `blazor.web.js`.
- Use `EditForm` with `FormName`, `Enhance`, and `[SupplyParameterFromForm]` for forms. `EditForm` generates the antiforgery token.
- Use Alpine directives for client events and call C# submit handlers through server form posts.
