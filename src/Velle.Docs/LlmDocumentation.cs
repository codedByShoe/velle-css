using System.Text;

namespace Velle.Docs;

internal static class LlmDocumentation
{
    private sealed record MarkdownPage(string File, string Title, string Description, string Body);

    public static void Add(GeneratedFiles output, Registry registry, string version, string blazorVersion, string guide,
        IReadOnlyList<TokenFile> tokens, IReadOnlyList<UtilitySection> utilities)
    {
        MarkdownPage[] reference =
        [
            new("guide.md", "Guide", "Velle.Blazor installation, Static SSR + Alpine.js CSP architecture, and legacy CLI notes", guide),
            new("tokens.md", "Tokens", "Design tokens: colors, typography, sizes, borders, shadows, animations", Tokens(tokens)),
            new("utilities.md", "Utilities", "Utility classes for layout, spacing, typography and color", Utilities(utilities)),
        ];

        var blazorPages = BlazorComponents.All.Select(component =>
            new MarkdownPage(component.Slug + ".md", component.Name, component.Summary, BlazorComponentReference(component)));

        var intro = "# Velle\n\n" +
            "> Blazor Static SSR component library (`Velle.Blazor`) built on plain CSS design tokens, utilities, and Alpine.js CSP — interactive modals, tabs, and datepickers without a SignalR circuit or WebAssembly runtime.\n\n" +
            $"Velle.Blazor {blazorVersion} (CSS registry {version}). Load styles in `Components/App.razor` with `<VelleStyles IncludeDatepicker=\"true\" />`; " +
            "`blazor.web.js` automatically loads `_content/Velle.Blazor/Velle.Blazor.lib.module.js`.\n";
        var index = new StringBuilder(intro);
        var full = new StringBuilder(intro);

        AddSection("Docs", reference);
        AddSection("Blazor Components", blazorPages);
        foreach (var category in Documentation.Categories)
        {
            var pages = registry.Components.Where(component => component.Category == category).Select(component =>
                new MarkdownPage(component.Name + ".md", component.Title, component.Description, ComponentReference(registry, component)));
            AddSection(category, pages);
        }

        index.Append("\n## Optional\n\n")
            .Append($"- [Full reference]({Documentation.SiteUrl}llms-full.txt): every page above in one file\n")
            .Append($"- [Source]({Documentation.Repository}): `src/Velle.Blazor/` contains the Razor Class Library and `registry/components/<name>/` contains the CSS source\n");
        output.Add("llms.txt", index.ToString());
        output.Add("llms-full.txt", full.ToString());

        void AddSection(string title, IEnumerable<MarkdownPage> pages)
        {
            index.Append($"\n## {title}\n\n");
            foreach (var page in pages)
            {
                index.Append($"- [{page.Title}]({Documentation.SiteUrl}{page.File}): {page.Description}\n");
                full.Append('\n').Append(page.Body);
                output.Add(page.File, page.Body);
            }
        }
    }

    private static string BlazorComponentReference(BlazorComponentDoc component)
    {
        var body = new StringBuilder()
            .Append($"# {component.Name}\n\n{component.Summary}\n\nNamespace: `Velle.Blazor`.");
        if (component.CssComponent is { } cssComponent)
            body.Append($" CSS reference: [{cssComponent}.md]({Documentation.SiteUrl}{cssComponent}.md).");
        body.Append('\n');

        if (component.Parameters.Length > 0)
        {
            body.Append("\n## Parameters\n\n");
            foreach (var param in component.Parameters)
            {
                var req = param.Required ? " (required)" : $" (default `{param.Default}`)";
                body.Append($"- `{param.Name}` (`{param.Type}`){req}: {param.Description}\n");
            }
        }

        foreach (var type in component.Types)
        {
            body.Append($"\n## {type.Name} ({type.Kind})\n\n{type.Description}\n\n");
            foreach (var member in type.Members)
                body.Append($"- `{member.Name}`: {member.Description}\n");
        }

        if (component.Notes.Length > 0)
        {
            body.Append("\n## Static SSR & behavior notes\n\n");
            foreach (var note in component.Notes)
                body.Append("- ").Append(note).Append('\n');
        }

        if (component.Examples.Length > 0)
            body.Append("\n## Examples\n");
        foreach (var example in component.Examples)
        {
            body.Append($"\n### {example.Title}\n\n");
            if (example.Description.Length > 0)
                body.Append(example.Description).Append("\n\n");
            body.Append($"```razor\n{example.RazorCode}\n```\n");
        }

        return body.ToString();
    }

    private static string ComponentReference(Registry registry, Component component)
    {
        var blazorPeer = BlazorComponents.ByCssComponent(component.Name);
        var body = new StringBuilder()
            .Append($"# {component.Title}\n\n{component.Description}\n\nCategory: {component.Category}. Included in `Velle.Blazor` via `<VelleStyles />`.");
        if (blazorPeer is not null)
            body.Append($" Dedicated Blazor component: `{blazorPeer.Name}` ({Documentation.SiteUrl}{blazorPeer.Slug}.md).");
        body.Append($" Legacy CLI: `dotnet tool run velle add {component.Name}`.");
        if (component.Dependencies.Length > 0)
            body.Append($" Dependencies: {string.Join(", ", component.Dependencies)}.");
        body.Append($" Files: {string.Join(", ", component.Files)}.\n");

        if (component.Library is { } library)
        {
            body.Append("\n## Third-party library\n\n");
            if (component.Name == "datepicker")
            {
                body.Append($"In `Velle.Blazor`, {library.Package} ({library.Version}) is bundled locally and lazy-loaded by `<VelleDatepicker />` when `<VelleStyles IncludeDatepicker=\"true\" />` is included.\n");
            }
            else
            {
                body.Append($"This adapter wraps {library.Package} ({library.Homepage}, {library.License} license). ")
                    .Append($"Install version {library.Version} with `npm install {string.Join(' ', library.Packages)}`, ")
                    .Append("or map it in an import map placed before any module script:\n\n")
                    .Append($"```html\n{Documentation.ImportMapEntry(library)}\n```\n");
                if (library.StylesheetUrl.Length > 0)
                    body.Append($"\nAlso load the library's stylesheet before {component.Name}.css: {library.StylesheetUrl}\n");
            }
        }

        AddList("Classes", component.Classes.Select(item => $"`.{item.Name}`: {item.Description}"));
        AddList("CSS variables", component.Variables.Select(item => $"`{item.Name}` (default `{item.Default}`): {item.Description}"));
        AddList("Attributes", component.Attributes.Select(item => $"`{item.Name}` on {item.Element}: {item.Description}"));
        AddList("Actions", component.Actions.Select(item => $"`{item.Name}`: {item.Description}"));
        AddList("Events", component.Events.Select(item => $"`{item.Name}`: {item.Description}"));
        if (component.Headless.Length > 0)
            body.Append($"\n## Without velle's styles\n\n{component.Headless}\n");
        AddList("Notes", component.Notes);

        if (component.Examples.Length > 0)
            body.Append("\n## Examples\n");
        foreach (var example in component.Examples)
        {
            body.Append($"\n### {example.Title}\n\n");
            if (example.Description.Length > 0)
                body.Append(example.Description).Append("\n\n");
            var html = Documentation.CleanExample(registry.ReadText(component.ExampleSource(example.File)).Trim());
            body.Append($"```html\n{html}\n```\n");
        }

        return body.ToString();

        void AddList(string title, IEnumerable<string> items)
        {
            var first = true;
            foreach (var item in items)
            {
                if (first)
                {
                    body.Append($"\n## {title}\n\n");
                    first = false;
                }
                body.Append("- ").Append(item).Append('\n');
            }
        }
    }

    private static string Tokens(IReadOnlyList<TokenFile> files)
    {
        var body = new StringBuilder("# Tokens\n\nDesign tokens are CSS custom properties defined on :root and loaded via `<VelleStyles />`. Use them in your own CSS, e.g. `padding: var(--size-4)`.\n");
        foreach (var file in files)
        {
            body.Append($"\n## {file.Title} ({file.File})\n");
            foreach (var section in file.Sections)
            {
                if (section.Title.Length > 0)
                    body.Append($"\n### {section.Title}\n");
                body.Append('\n');
                foreach (var token in section.Tokens)
                {
                    body.Append($"- `{token.Name}: {token.Value}`");
                    if (token.Comment.Length > 0)
                        body.Append($" ({token.Comment})");
                    body.Append('\n');
                }
            }
        }

        return body.ToString();
    }

    private static string Utilities(IReadOnlyList<UtilitySection> sections)
    {
        var body = new StringBuilder("# Utilities\n\nUtility classes included in `velle.css` via `<VelleStyles />`. Utilities load last so they override component styles.\n");
        foreach (var section in sections)
        {
            body.Append($"\n## {section.Title}\n\n");
            foreach (var rule in section.Rules)
                body.Append($"- `.{rule.Class}` {{ {rule.Declarations} }}\n");
        }

        return body.ToString();
    }
}
