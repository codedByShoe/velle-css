using System.Text;

namespace Velle.Docs;

internal static class LlmDocumentation
{
    private sealed record MarkdownPage(string File, string Title, string Description, string Body);

    public static void Add(GeneratedFiles output, Registry registry, string version, string guide,
        IReadOnlyList<TokenFile> tokens, IReadOnlyList<UtilitySection> utilities)
    {
        MarkdownPage[] reference =
        [
            new("guide.md", "Guide", "Install, load order, markup conventions and the JavaScript runtime's data attributes", guide),
            new("tokens.md", "Tokens", "Design tokens: colors, typography, sizes, borders, shadows, animations", Tokens(tokens)),
            new("utilities.md", "Utilities", "Utility classes for layout, spacing, typography and color", Utilities(utilities)),
        ];

        var intro = "# velle-css\n\n" +
            "> Language and framework agnostic CSS components: plain CSS with design tokens and utilities, a small dependency-free JavaScript runtime driven by data attributes, and a .NET tool that copies selected assets into your project.\n\n" +
            $"Version {version}. Components are styled with BEM-style classes (`.btn`, `.btn--primary`, `.card__header`) and customized through CSS custom properties. " +
            "Interactive components read `data-NAME`, `data-NAME-target` and `data-NAME-action` attributes; the guide explains the syntax. Each component page lists its classes, variables, attributes, actions, events and HTML examples.\n";
        var index = new StringBuilder(intro);
        var full = new StringBuilder(intro);

        AddSection("Docs", reference);
        foreach (var category in Documentation.Categories)
        {
            var pages = registry.Components.Where(component => component.Category == category).Select(component =>
                new MarkdownPage(component.Name + ".md", component.Title, component.Description, ComponentReference(registry, component)));
            AddSection(category, pages);
        }

        index.Append("\n## Optional\n\n")
            .Append($"- [Full reference]({Documentation.SiteUrl}llms-full.txt): every page above in one file\n")
            .Append($"- [Source]({Documentation.Repository}): registry/components/<name>/ holds each component's CSS, JavaScript, metadata and examples\n");
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

    private static string ComponentReference(Registry registry, Component component)
    {
        var body = new StringBuilder()
            .Append($"# {component.Title}\n\n{component.Description}\n\nCategory: {component.Category}. Install with `dotnet tool run velle add {component.Name}`.");
        if (component.Dependencies.Length > 0)
            body.Append($" Also installs: {string.Join(", ", component.Dependencies)}.");
        body.Append($" Files: {string.Join(", ", component.Files)}.\n");

        if (component.Library is { } library)
        {
            body.Append("\n## Third-party library\n\n")
                .Append($"This component is an adapter for {library.Package} ({library.Homepage}, {library.License} license), which velle does not ship. ")
                .Append($"Install version {library.Version} with `npm install {string.Join(' ', library.Packages)}`, ")
                .Append("or map it in an import map placed before any module script:\n\n")
                .Append($"```html\n{Documentation.ImportMapEntry(library)}\n```\n");
            if (library.StylesheetUrl.Length > 0)
                body.Append($"\nAlso load the library's stylesheet before {component.Name}.css: {library.StylesheetUrl}\n");
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
            if (example.Requires.Length > 0)
                body.Append($"Also needs `dotnet tool run velle add {string.Join(' ', example.Requires)}`.\n\n");
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
        var body = new StringBuilder("# Tokens\n\nDesign tokens are CSS custom properties defined on :root by variables.css. Use them in your own CSS, e.g. `padding: var(--size-4)`.\n");
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
        var body = new StringBuilder("# Utilities\n\nUtility classes from utilities.css, which loads last so it overrides component styles.\n");
        foreach (var section in sections)
        {
            body.Append($"\n## {section.Title}\n\n");
            foreach (var rule in section.Rules)
                body.Append($"- `.{rule.Class}` {{ {rule.Declarations} }}\n");
        }

        return body.ToString();
    }
}
