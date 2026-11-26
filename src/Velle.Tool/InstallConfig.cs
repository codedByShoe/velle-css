using System.Text.Json;
using System.Text.Json.Serialization;

namespace Velle.Tool;

internal sealed record InstallConfig(
    string CssDir, string JsDir, string ImagesDir, string CssEntry, string JsEntry,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)] bool Headless)
{
    public const string Filename = "velle.json";
    public const string DefaultCssEntry = "main.css";
    public const string DefaultJsEntry = "main.js";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static InstallConfig Create(Arguments args, ProjectFiles files)
    {
        var defaults = files.UsesWwwroot
            ? (Css: "wwwroot/velle/css", Js: "wwwroot/velle/js", Images: "wwwroot/velle/images")
            : (Css: "assets/css/velle", Js: "assets/js/velle", Images: "assets/images/velle");
        var css = args.Get("css-dir") ?? defaults.Css;
        var js = args.Get("js-dir") ?? defaults.Js;
        var images = args.Get("images-dir") ?? defaults.Images;
        var cssEntry = args.Get("css-entry");
        var jsEntry = args.Get("js-entry");
        var headless = args.Flag("js");

        if (headless)
        {
            RejectStyleOption("css-dir", css != defaults.Css);
            RejectStyleOption("images-dir", images != defaults.Images);
            RejectStyleOption("css-entry", !string.IsNullOrEmpty(cssEntry));
        }

        return new InstallConfig(css, js, images, Entry(cssEntry, css, DefaultCssEntry),
            Entry(jsEntry, js, DefaultJsEntry), headless).Normalize(files);
    }

    public static InstallConfig? Read(ProjectFiles files)
    {
        var data = files.Read(Filename);
        if (data is null)
            return null;

        try
        {
            var json = data.AsSpan();
            if (json.StartsWith(System.Text.Encoding.UTF8.Preamble))
                json = json[System.Text.Encoding.UTF8.Preamble.Length..];

            var config = JsonSerializer.Deserialize<ConfigDocument>(json, JsonOptions)
                ?? throw new JsonException("expected a configuration object");
            // Older configs omitted entry keys. Empty strings and null values disable the corresponding entry.
            return new InstallConfig(
                config.CssDir ?? "", config.JsDir ?? "", config.ImagesDir ?? "",
                ReadEntry(config.CssEntry, config.CssDir, DefaultCssEntry),
                ReadEntry(config.JsEntry, config.JsDir, DefaultJsEntry),
                config.Headless ?? false).Normalize(files);
        }
        catch (Exception error) when (error is JsonException or CliException or ArgumentException)
        {
            throw new CliException($"{Filename}: {error.Message}");
        }
    }

    public byte[] Serialize() => [.. JsonSerializer.SerializeToUtf8Bytes(this, JsonOptions), (byte)'\n'];

    private InstallConfig Normalize(ProjectFiles files)
    {
        return this with
        {
            CssDir = NormalizePath(CssDir, "cssDir"),
            JsDir = NormalizePath(JsDir, "jsDir"),
            ImagesDir = NormalizePath(ImagesDir, "imagesDir"),
            CssEntry = NormalizePath(CssEntry, "cssEntry", ".css"),
            JsEntry = NormalizePath(JsEntry, "jsEntry", ".js")
        };

        string NormalizePath(string value, string field, string? extension = null)
        {
            if (value.Length == 0)
            {
                if (extension is not null)
                    return "";
                throw new CliException($"{field} is required");
            }

            var normalized = files.Normalize(value, field);
            if (extension is not null && Path.GetExtension(normalized) != extension)
                throw new CliException($"{field} must be a {extension} file, got {Cli.Quote(value)}");
            return normalized;
        }
    }

    private static string Entry(string? flag, string directory, string name) => flag switch
    {
        null or "" => ProjectFiles.Join(directory, name),
        "none" => "",
        _ => flag
    };

    private static string ReadEntry(JsonElement value, string? directory, string name) => value.ValueKind switch
    {
        JsonValueKind.Undefined => string.IsNullOrEmpty(directory) ? "" : ProjectFiles.Join(directory, name),
        JsonValueKind.Null => "",
        JsonValueKind.String => value.GetString()!,
        _ => throw new JsonException($"expected a string for the {name} entry")
    };

    private static void RejectStyleOption(string name, bool specified)
    {
        if (specified)
            throw new CliException($"--{name} does not apply to a headless project");
    }

    private sealed class ConfigDocument
    {
        public string? CssDir { get; init; }
        public string? JsDir { get; init; }
        public string? ImagesDir { get; init; }
        public JsonElement CssEntry { get; init; }
        public JsonElement JsEntry { get; init; }
        public bool? Headless { get; init; }
    }
}
