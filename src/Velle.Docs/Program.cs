using System.Reflection;
using Velle;
using Velle.Docs;

try
{
    if (args is ["-h" or "--help"])
    {
        Console.WriteLine("Usage: Velle.Docs [--root DIRECTORY]\n\nBuilds dist/ and docs/ under the given directory (default: current directory).");
        return 0;
    }

    var root = args switch
    {
        [] => Directory.GetCurrentDirectory(),
        ["-root" or "--root", var directory] => Path.GetFullPath(directory),
        [var option] when option.StartsWith("--root=", StringComparison.Ordinal) => Path.GetFullPath(option["--root=".Length..]),
        [var option] when option.StartsWith("-root=", StringComparison.Ordinal) => Path.GetFullPath(option["-root=".Length..]),
        _ => throw new ArgumentException("usage: Velle.Docs [--root DIRECTORY]")
    };

    var version = typeof(Bundles).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion;
    var registry = new Registry();
    var bundles = new Bundles(registry, version);
    var css = bundles.Css();
    var js = bundles.JavaScript();
    var distribution = bundles.Distribution(css, js);
    var docs = new Documentation(registry, bundles, version).Build(css, js);
    distribution.WriteTo(Path.Combine(root, "dist"));
    docs.WriteTo(Path.Combine(root, "docs"));
    Console.WriteLine($"Built dist/ and docs/ ({registry.Components.Count()} components)");
    return 0;
}
catch (Exception error) when (error is IOException or InvalidDataException or ArgumentException
    or UnauthorizedAccessException or System.Text.Json.JsonException or Scriban.Syntax.ScriptRuntimeException)
{
    Console.Error.WriteLine($"docsgen: {error.Message}");
    return 1;
}
