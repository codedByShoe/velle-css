using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Scriban;
using Scriban.Runtime;

namespace Velle.Docs;

internal sealed class Documentation(Registry registry, Bundles bundles, string version, string blazorVersion)
{
    public const string Repository = "https://github.com/codedbyshoe/velle-css";
    public const string SiteUrl = "https://codedbyshoe.github.io/velle-css/";
    public static readonly string[] Categories = ["Elements", "Forms", "Overlays", "Layout", "Behaviors"];
    private static readonly Regex DemoAttribute = new(" data-demo-[a-z-]+=\"[^\"]*\"");
    private static readonly Regex SafeHeight = new(@"\A(?:[0-9]+(?:\.[0-9]+)?(?:rem|em|px|vh|vw|%)?|auto)\z");
    private static readonly JsonSerializerOptions ImportJson = new(JsonText.Relaxed) { WriteIndented = true };

    private readonly ResourceFiles inputs = new("docs/");
    private readonly Dictionary<string, Template> templates = new(StringComparer.Ordinal);

    public GeneratedFiles Build(string css, string js)
    {
        var outputs = new GeneratedFiles();
        var nav = Navigation();
        var flatNav = nav.SelectMany(group => group.Links).ToArray();
        var blazorGroups = BlazorComponents.Categories
            .Select(category => new BlazorComponentGroup(
                category,
                BlazorComponents.All
                    .Where(component => component.Category == category)
                    .OrderBy(component => component.Name, StringComparer.Ordinal)
                    .ToArray()))
            .Where(group => group.Components.Count > 0)
            .ToArray();
        var unported = registry.Components
            .Where(component => BlazorComponents.ByCssComponent(component.Name) is null)
            .OrderBy(component => component.Title, StringComparer.Ordinal)
            .Select(component => new NavLink(component.Title, component.Name + ".html", component.Category))
            .ToArray();

        var site = new Site(version, blazorVersion, Repository, nav, SiteImportMap(), blazorGroups, unported);
        var tokens = ReferenceCss.Tokens(registry);
        var utilities = ReferenceCss.Utilities(registry);

        Render("index", new Page(site, "Introduction", "index.html"));
        Render("javascript", new Page(site, "Alpine & Interop", "javascript.html"));
        Render("tokens", new Page(site, "Tokens", "tokens.html") { Tokens = tokens });
        Render("utilities", new Page(site, "Utilities", "utilities.html") { Utilities = utilities });

        foreach (var blazorComponent in BlazorComponents.All)
        {
            var extraStyles = new List<string>();
            var extraScripts = new List<string>();
            if (blazorComponent.CssComponent is { } cssName && registry[cssName].Library is { } library)
            {
                if (library.StylesheetUrl.Length > 0)
                    extraStyles.Add(library.StylesheetUrl);
                extraStyles.AddRange(registry[cssName].Files.Where(file => Path.GetExtension(file) == ".css").Select(file => "assets/adapters/" + file));
                extraScripts.AddRange(registry[cssName].Files.Where(file => Path.GetExtension(file) == ".js").Select(file => "assets/adapters/" + file));
            }

            var cssLink = blazorComponent.CssComponent is { } cssRef ? Link(cssRef) : null;
            Render("blazor_component", new Page(site, blazorComponent.Name, blazorComponent.Slug + ".html")
            {
                BlazorComponent = new BlazorComponentPage(blazorComponent, cssLink, extraStyles, extraScripts),
            });
        }

        foreach (var component in registry.Components)
            Render("component", new Page(site, component.Title, component.Name + ".html") { Component = ComponentDetails(component) });

        var guide = RenderTemplate("guide.md", new ScriptObject
        {
            ["version"] = version,
            ["blazor_version"] = blazorVersion,
        });
        LlmDocumentation.Add(outputs, registry, version, blazorVersion, guide, tokens, utilities);

        foreach (var path in inputs.Paths.Where(path => path.StartsWith("assets/", StringComparison.Ordinal)))
            outputs.Add(path, inputs.Read(path));
        foreach (var path in bundles.Adapters(".css").Concat(bundles.Adapters(".js")))
            outputs.Add("assets/adapters/" + Path.GetFileName(path), bundles.Adapter(path));

        outputs.Add("assets/velle.css", css);
        outputs.Add("assets/velle.js", js);
        outputs.Add("assets/images/avatar.svg", registry.Read("components/avatar/avatar.svg"));
        outputs.Add(".nojekyll", Array.Empty<byte>());
        return outputs;

        void Render(string name, Page page)
        {
            var index = Array.FindIndex(flatNav, link => link.Href == page.Href);
            if (index > 0) page.Previous = flatNav[index - 1];
            if (index >= 0 && index + 1 < flatNav.Length) page.Next = flatNav[index + 1];

            var data = new ScriptObject { ["page"] = page };
            page.Content = RenderTemplate(name + ".html", data);
            page.Navigation = RenderTemplate("nav.html", data);
            outputs.Add(page.Href, RenderTemplate("layout.html", data));
        }
    }

    private string RenderTemplate(string name, ScriptObject globals)
    {
        if (!templates.TryGetValue(name, out var template))
        {
            var path = $"templates/{name}";
            template = Template.Parse(inputs.ReadText(path), path);
            if (template.HasErrors)
                throw new InvalidDataException(string.Join("\n", template.Messages));
            templates.Add(name, template);
        }

        var builtIns = new ScriptObject();
        builtIns.Import("escape_html", new Func<string, string>(EscapeHtml));
        builtIns.Import("safe_url", new Func<string, string>(EscapeUrl));
        builtIns.Import("slug", new Func<string, string>(title => Regex.Replace(title.ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-')));
        var context = new TemplateContext
        {
            MemberRenamer = member => member.Name,
            StrictVariables = true,
            AutoIndent = false,
        };
        context.PushGlobal(builtIns);
        context.PushGlobal(globals);
        return template.Render(context);
    }

    private IReadOnlyList<NavGroup> Navigation()
    {
        var groups = new List<NavGroup>
        {
            new("Getting started",
            [
                new("Introduction", "index.html"),
                new("VelleStyles", "velle-styles.html", "Setup"),
                new("Alpine & Interop", "javascript.html"),
                new("Tokens", "tokens.html"),
                new("Utilities", "utilities.html"),
            ]),
        };

        foreach (var category in BlazorComponents.Categories)
        {
            var links = BlazorComponents.All
                .Where(component => component.Category == category)
                .OrderBy(component => component.Name, StringComparer.Ordinal)
                .Select(component => new NavLink(component.Name, component.Slug + ".html"))
                .ToArray();
            if (links.Length > 0)
            {
                groups.Add(new NavGroup(category, links));
            }
        }

        var roadmapLinks = registry.Components
            .Where(component => BlazorComponents.ByCssComponent(component.Name) is null)
            .OrderBy(component => component.Title, StringComparer.Ordinal)
            .Select(component => new NavLink(component.Title, component.Name + ".html", "CSS"))
            .ToArray();
        if (roadmapLinks.Length > 0)
        {
            groups.Add(new NavGroup("Roadmap (CSS-only)", roadmapLinks));
        }

        return groups;
    }

    private ComponentPage ComponentDetails(Component component)
    {
        var stylesheets = new List<string>();
        var scripts = new List<string>();
        var importMap = "";
        if (component.Library is { } library)
        {
            if (library.StylesheetUrl.Length > 0)
                stylesheets.Add(library.StylesheetUrl);
            stylesheets.AddRange(component.Files.Where(file => Path.GetExtension(file) == ".css").Select(file => "assets/adapters/" + file));
            scripts.AddRange(component.Files.Where(file => Path.GetExtension(file) == ".js").Select(file => "assets/adapters/" + file));
            importMap = ImportMapEntry(library);
        }

        var examples = component.Examples.Select(example =>
        {
            var html = registry.ReadText(component.ExampleSource(example.File)).Trim();
            var frame = example.Frame ? RenderTemplate("frame.html", new ScriptObject { ["example"] = html }) : "";
            var height = example.Height.Length == 0 || SafeHeight.IsMatch(example.Height) ? example.Height : "ZgotmplZ";
            return new ExamplePage(
                example.Title, example.Description, example.Frame, height, example.Requires,
                example.Requires.Select(Link).ToArray(), "example-" + Path.GetFileNameWithoutExtension(example.File),
                html, CleanExample(html), frame);
        }).ToArray();

        var blazorPeer = BlazorComponents.ByCssComponent(component.Name);
        var blazorLink = blazorPeer is not null ? new NavLink(blazorPeer.Name, blazorPeer.Slug + ".html") : null;

        return new ComponentPage(component, component.Dependencies.Select(Link).ToArray(),
            component.Files.Any(file => Path.GetExtension(file) == ".css"), component.HasJavaScript,
            examples, stylesheets, scripts, importMap, blazorLink);
    }

    private NavLink Link(string name) => new(registry[name].Title, name + ".html");

    private string SiteImportMap()
    {
        var imports = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var library in registry.Components.Select(component => component.Library).OfType<AdapterLibrary>())
        {
            foreach (var (package, esm) in library.Imports())
                imports[package] = esm;
        }

        return imports.Count == 0 ? "" : "<script type=\"importmap\">\n  " + FormatImportMap(imports) + "\n  </script>";
    }

    public static string ImportMapEntry(AdapterLibrary library)
    {
        var imports = library.Modules.Length == 0
            ? $$"""{ "imports": { {{JsonText.Quote(library.Package)}}: {{JsonText.Quote(library.Esm)}} } }"""
            : FormatImportMap(library.Imports());

        return "<script type=\"importmap\">\n  " + imports + "\n</script>";
    }

    private static string FormatImportMap(SortedDictionary<string, string> imports) =>
        JsonSerializer.Serialize(new { imports }, ImportJson)
            .Replace("\n", "\n  ", StringComparison.Ordinal)
            .Replace("<", "\\u003c", StringComparison.Ordinal)
            .Replace(">", "\\u003e", StringComparison.Ordinal)
            .Replace("&", "\\u0026", StringComparison.Ordinal);

    public static string CleanExample(string html) => DemoAttribute.Replace(html, "");

    // Match the entity spellings of the original generator in text and quoted attributes.
    private static string EscapeHtml(string value) => value
        .Replace("&", "&amp;", StringComparison.Ordinal)
        .Replace("<", "&lt;", StringComparison.Ordinal)
        .Replace(">", "&gt;", StringComparison.Ordinal)
        .Replace("\"", "&#34;", StringComparison.Ordinal)
        .Replace("'", "&#39;", StringComparison.Ordinal)
        .Replace("+", "&#43;", StringComparison.Ordinal)
        .Replace('\0', '\uFFFD');

    private static string EscapeUrl(string value)
    {
        var colon = value.IndexOf(':');
        var pathStart = value.IndexOfAny(['/', '?', '#']);
        if (colon >= 0 && (pathStart < 0 || colon < pathStart) &&
            value[..colon].ToLowerInvariant() is not ("http" or "https" or "mailto"))
        {
            return "#ZgotmplZ";
        }

        var normalized = new StringBuilder();
        foreach (var rune in value.EnumerateRunes())
        {
            if (rune.IsAscii && (char.IsAsciiLetterOrDigit((char)rune.Value) ||
                "-._~:/?#[]@!$&*+,;=%".Contains((char)rune.Value)))
            {
                normalized.Append((char)rune.Value);
            }
            else
            {
                foreach (var b in Encoding.UTF8.GetBytes(rune.ToString()))
                    normalized.Append('%').Append(b.ToString("x2", CultureInfo.InvariantCulture));
            }
        }

        return EscapeHtml(normalized.ToString());
    }
}

internal sealed record Site(
    string Version,
    string BlazorVersion,
    string Repo,
    IReadOnlyList<NavGroup> Nav,
    string ImportMap,
    IReadOnlyList<BlazorComponentGroup> BlazorGroups,
    IReadOnlyList<NavLink> RoadmapComponents);
internal sealed record BlazorComponentGroup(string Title, IReadOnlyList<BlazorComponentDoc> Components);
internal sealed record NavGroup(string Title, IReadOnlyList<NavLink> Links);
internal sealed record NavLink(string Title, string Href, string Badge = "");

internal sealed record Page(Site Site, string Title, string Href)
{
    public ComponentPage? Component { get; init; }
    public BlazorComponentPage? BlazorComponent { get; init; }
    public IReadOnlyList<TokenFile> Tokens { get; init; } = [];
    public IReadOnlyList<UtilitySection> Utilities { get; init; } = [];
    public NavLink? Previous { get; set; }
    public NavLink? Next { get; set; }
    public string Navigation { get; set; } = "";
    public string Content { get; set; } = "";
}

internal sealed record BlazorComponentPage(
    BlazorComponentDoc Metadata,
    NavLink? CssReference,
    IReadOnlyList<string> Stylesheets,
    IReadOnlyList<string> Scripts);

internal sealed record ComponentPage(Component Metadata, IReadOnlyList<NavLink> Dependencies, bool HasCss, bool HasJs,
    IReadOnlyList<ExamplePage> Examples, IReadOnlyList<string> Stylesheets, IReadOnlyList<string> Scripts,
    string ImportMapEntry, NavLink? BlazorComponent);

internal sealed record ExamplePage(string Title, string Description, bool Frame, string Height,
    IReadOnlyList<string> Requires, IReadOnlyList<NavLink> Uses, string Id, string Html, string Code, string FrameDoc);
