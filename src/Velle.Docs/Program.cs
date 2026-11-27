using System.Net;
using System.Reflection;
using Velle;
using Velle.Docs;

try
{
    if (args is ["-h" or "--help"])
    {
        Console.WriteLine("Usage: Velle.Docs [--root DIRECTORY] [--serve [PORT]]\n\nBuilds dist/ and docs/ under the given directory (default: current directory).\nPass --serve to start a local HTTP preview server for docs/ (default port: 8080).");
        return 0;
    }

    var root = Directory.GetCurrentDirectory();
    var serve = false;
    var port = 8080;

    for (var i = 0; i < args.Length; i++)
    {
        switch (args[i])
        {
            case "-root" or "--root" when i + 1 < args.Length:
                root = Path.GetFullPath(args[++i]);
                break;
            case var option when option.StartsWith("--root=", StringComparison.Ordinal):
                root = Path.GetFullPath(option["--root=".Length..]);
                break;
            case var option when option.StartsWith("-root=", StringComparison.Ordinal):
                root = Path.GetFullPath(option["-root=".Length..]);
                break;
            case "--serve":
                serve = true;
                if (i + 1 < args.Length && int.TryParse(args[i + 1], out var parsedPort))
                {
                    port = parsedPort;
                    i++;
                }
                break;
            case var option when option.StartsWith("--serve=", StringComparison.Ordinal) && int.TryParse(option["--serve=".Length..], out var inlinePort):
                serve = true;
                port = inlinePort;
                break;
            default:
                throw new ArgumentException("usage: Velle.Docs [--root DIRECTORY] [--serve [PORT]]");
        }
    }

    var assembly = typeof(Bundles).Assembly;
    var version = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion;
    var blazorVersion = assembly.GetCustomAttributes<AssemblyMetadataAttribute>()
        .FirstOrDefault(attribute => attribute.Key == "BlazorVersion")?.Value ?? version;

    var registry = new Registry();
    var bundles = new Bundles(registry, version);
    var css = bundles.Css();
    var js = bundles.JavaScript();
    var distribution = bundles.Distribution(css, js);
    var docs = new Documentation(registry, bundles, version, blazorVersion).Build(css, js);
    var docsRoot = Path.Combine(root, "docs");
    distribution.WriteTo(Path.Combine(root, "dist"));
    docs.WriteTo(docsRoot);
    Console.WriteLine($"Built dist/ and docs/ ({BlazorComponents.All.Count} Blazor components, {registry.Components.Count()} CSS components)");

    if (serve)
    {
        ServeDocs(docsRoot, port);
    }

    return 0;
}
catch (Exception error) when (error is IOException or InvalidDataException or ArgumentException
    or UnauthorizedAccessException or System.Text.Json.JsonException or Scriban.Syntax.ScriptRuntimeException or HttpListenerException)
{
    Console.Error.WriteLine($"docsgen: {error.Message}");
    return 1;
}

static void ServeDocs(string docsRoot, int port)
{
    var fullRoot = Path.GetFullPath(docsRoot);
    var prefix = $"http://127.0.0.1:{port}/";
    using var listener = new HttpListener();
    listener.Prefixes.Add(prefix);
    listener.Start();
    Console.WriteLine($"Serving {fullRoot} at {prefix} (Ctrl+C to stop)");

    Console.CancelKeyPress += (_, e) =>
    {
        e.Cancel = true;
        listener.Stop();
    };

    while (listener.IsListening)
    {
        HttpListenerContext context;
        try
        {
            context = listener.GetContext();
        }
        catch (HttpListenerException)
        {
            break;
        }
        catch (ObjectDisposedException)
        {
            break;
        }

        var relativePath = Uri.UnescapeDataString(context.Request.Url?.AbsolutePath ?? "/").TrimStart('/');
        if (string.IsNullOrEmpty(relativePath))
        {
            relativePath = "index.html";
        }

        var candidate = Path.GetFullPath(Path.Combine(fullRoot, relativePath));
        if (!candidate.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal) || !File.Exists(candidate))
        {
            context.Response.StatusCode = 404;
            context.Response.Close();
            continue;
        }

        context.Response.ContentType = Path.GetExtension(candidate).ToLowerInvariant() switch
        {
            ".html" => "text/html; charset=utf-8",
            ".css" => "text/css; charset=utf-8",
            ".js" => "text/javascript; charset=utf-8",
            ".json" => "application/json; charset=utf-8",
            ".svg" => "image/svg+xml",
            ".md" or ".txt" => "text/plain; charset=utf-8",
            _ => "application/octet-stream",
        };

        var bytes = File.ReadAllBytes(candidate);
        context.Response.ContentLength64 = bytes.LongLength;
        context.Response.OutputStream.Write(bytes);
        context.Response.Close();
    }
}
