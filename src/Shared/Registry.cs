using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Velle;

internal sealed class Registry
{
    public const string Runtime = "js/velle.js";
    public const string RuntimeTypes = "js/velle.d.ts";
    public static readonly string[] CoreEntries = ["reset.css", "variables.css", "base.css", "utilities.css"];

    private readonly ResourceFiles files = new("registry/");
    private readonly Dictionary<string, Component> components = new(StringComparer.Ordinal);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    public Registry()
    {
        foreach (var path in files.Paths.Order(StringComparer.Ordinal))
        {
            var parts = path.Split('/');
            if (parts is not ["components", _, "component.json"])
                continue;

            using var stream = files.Open(path);
            var component = JsonSerializer.Deserialize<Component>(stream, JsonOptions);
            if (component is null || component.Name != parts[1])
                throw new InvalidDataException($"{path}: component name does not match its directory");
            if (!components.TryAdd(component.Name, component))
                throw new InvalidDataException($"{path}: the name {JsonText.Quote(component.Name)} is already used");
        }
    }

    public IEnumerable<Component> Components => components.Values.OrderBy(component => component.Name, StringComparer.Ordinal);

    public IEnumerable<string> CoreFiles => CoreEntries.Take(2)
        .Select(file => "core/" + file)
        .Concat(files.Paths.Where(file => file.StartsWith("core/tokens/", StringComparison.Ordinal)).Order(StringComparer.Ordinal))
        .Concat(CoreEntries.Skip(2).Select(file => "core/" + file));

    public HashSet<string> KnownFiles() => CoreFiles.Select(Path.GetFileName).OfType<string>()
        .Concat(Components.SelectMany(component => component.Files))
        .ToHashSet(StringComparer.Ordinal);

    public Component this[string name] => components[name];

    public byte[] Read(string path) => files.Read(path);
    public string ReadText(string path) => files.ReadText(path);

    public IReadOnlyList<Component> Resolve(IEnumerable<string> names)
    {
        var ordered = new List<Component>();
        var done = new HashSet<string>(StringComparer.Ordinal);
        var chain = new List<string>();

        foreach (var name in names)
            Visit(name);
        return ordered;

        void Visit(string name)
        {
            if (done.Contains(name))
                return;
            if (chain.Contains(name, StringComparer.Ordinal))
                throw new InvalidDataException($"dependency cycle: {string.Join(" -> ", chain.Append(name))}");
            if (!components.TryGetValue(name, out var component))
            {
                if (chain.Count == 0)
                    throw new InvalidDataException($"unknown component {JsonText.Quote(name)}; run `velle list` to see what is available");
                throw new InvalidDataException($"unknown component {JsonText.Quote(name)} (required by {JsonText.Quote(chain[^1])})");
            }

            chain.Add(name);
            foreach (var dependency in component.Dependencies)
                Visit(dependency);
            chain.RemoveAt(chain.Count - 1);
            done.Add(name);
            ordered.Add(component);
        }
    }
}

internal sealed class Component
{
    public required string Name { get; init; }
    public required string Title { get; init; }
    public required string Category { get; init; }
    public required string Description { get; init; }
    public string[] Files { get; init; } = [];
    public string[] Dependencies { get; init; } = [];
    public NamedDescription[] Classes { get; init; } = [];
    public CssVariable[] Variables { get; init; } = [];
    public HtmlAttribute[] Attributes { get; init; } = [];
    public NamedDescription[] Actions { get; init; } = [];
    public NamedDescription[] Events { get; init; } = [];
    public string[] Notes { get; init; } = [];
    public Example[] Examples { get; init; } = [];
    public string Headless { get; init; } = "";
    public AdapterLibrary? Library { get; init; }

    [JsonIgnore]
    public bool HasJavaScript => Files.Any(file => Path.GetExtension(file) == ".js");
    public string Source(string file) => $"components/{Name}/{file}";
    public string ExampleSource(string file) => Source("examples/" + file);
}

internal sealed class AdapterLibrary
{
    public required string Package { get; init; }
    public required string Version { get; init; }
    public required string Homepage { get; init; }
    public required string License { get; init; }
    public required string Esm { get; init; }
    public string Stylesheet { get; init; } = "";
    public AdapterModule[] Modules { get; init; } = [];

    [JsonIgnore]
    public IEnumerable<string> Packages => Modules.Select(module => module.Package).Prepend(Package)
        .Select(package => $"{package}@{Version}");

    [JsonIgnore]
    public string StylesheetUrl => Stylesheet.Length == 0 ? "" : $"https://cdn.jsdelivr.net/npm/{Package}@{Version}/{Stylesheet}";

    public SortedDictionary<string, string> Imports()
    {
        var imports = new SortedDictionary<string, string>(StringComparer.Ordinal) { [Package] = Esm };
        foreach (var module in Modules)
            imports[module.Package] = module.Esm;
        return imports;
    }
}

internal sealed record AdapterModule(string Package, string Esm);

internal sealed record NamedDescription(string Name, string Description);
internal sealed record CssVariable(string Name, string Default, string Description);
internal sealed record HtmlAttribute(string Name, string Element, string Description);

internal sealed class Example
{
    public required string File { get; init; }
    public required string Title { get; init; }
    public string Description { get; init; } = "";
    public bool Frame { get; init; }
    public string Height { get; init; } = "";
    public string[] Requires { get; init; } = [];
}

internal sealed class ResourceFiles(string prefix)
{
    private static readonly System.Reflection.Assembly Assembly = typeof(ResourceFiles).Assembly;

    private readonly Dictionary<string, string> resources = Assembly.GetManifestResourceNames()
        .Select(name => (Resource: name, Path: name.Replace('\\', '/')))
        .Where(item => item.Path.StartsWith(prefix, StringComparison.Ordinal))
        .ToDictionary(item => item.Path[prefix.Length..], item => item.Resource, StringComparer.Ordinal);

    public IEnumerable<string> Paths => resources.Keys;
    public Stream Open(string path)
    {
        if (!resources.TryGetValue(path, out var name))
            throw new InvalidDataException($"missing embedded file {path}");
        return Assembly.GetManifestResourceStream(name)
            ?? throw new InvalidDataException($"missing embedded resource {name}");
    }

    public byte[] Read(string path)
    {
        using var stream = Open(path);
        using var bytes = new MemoryStream();
        stream.CopyTo(bytes);
        return bytes.ToArray();
    }

    public string ReadText(string path) => Encoding.UTF8.GetString(Read(path));
}

internal static class JsonText
{
    public static readonly JsonSerializerOptions Relaxed = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    public static string Quote(string value) => JsonSerializer.Serialize(value, Relaxed);
}
