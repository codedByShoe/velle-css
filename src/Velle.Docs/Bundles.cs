using System.Text;
using System.Text.RegularExpressions;

namespace Velle.Docs;

internal sealed class Bundles(Registry registry, string version)
{
    private const string RuntimeImport = "from \"./velle.js\"";
    private static readonly Regex InlineRuntimeImport = new(@"^import \{[^}]*\} from ""\./velle\.js""\n", RegexOptions.Multiline);

    private IEnumerable<string> Entries(Func<Component, bool> include, string extension) =>
        registry.Components.Where(include)
            .SelectMany(component => component.Files.Where(file => Path.GetExtension(file) == extension)
                .Select(component.Source))
            .OrderBy(path => Path.GetFileName(path), StringComparer.Ordinal);

    public IEnumerable<string> Adapters(string extension) => Entries(component => component.Library is not null, extension);

    public string Css()
    {
        var output = new StringBuilder(Header());
        var files = registry.CoreFiles.Where(path => path is not ("core/variables.css" or "core/utilities.css"))
            .Concat(Core(".css"))
            .Append("core/utilities.css");
        foreach (var file in files)
            output.Append($"\n/* {file} */\n").Append(registry.ReadText(file).TrimEnd('\n')).Append('\n');

        return output.ToString();
    }

    public string JavaScript()
    {
        var output = new StringBuilder(Header()).Append('\n').Append(registry.ReadText(Registry.Runtime));
        foreach (var file in Core(".js"))
        {
            var source = registry.ReadText(file);
            if (Regex.Count(source, "import ") != InlineRuntimeImport.Count(source))
                throw new InvalidDataException($"{file}: only `import {{ … }} from \"./velle.js\"` is supported");

            output.Append($"\n// {file}\n{{\n").Append(InlineRuntimeImport.Replace(source, "")).Append("}\n");
        }

        return output.ToString();
    }

    public byte[] Adapter(string path)
    {
        if (Path.GetExtension(path) != ".js")
            return registry.Read(path);
        var source = registry.ReadText(path);
        if (!source.Contains(RuntimeImport, StringComparison.Ordinal))
            throw new InvalidDataException($"{path}: adapters must import the runtime from \"./velle.js\"");

        return Encoding.UTF8.GetBytes(source.Replace(RuntimeImport, "from \"../velle.js\"", StringComparison.Ordinal));
    }

    public GeneratedFiles Distribution(string css, string js)
    {
        var output = new GeneratedFiles();
        output.Add("velle.css", css);
        output.Add("velle.js", js);
        output.Add("velle.d.ts", "export * from \"./js/velle.js\"\n");
        output.Add(Registry.Runtime, registry.Read(Registry.Runtime));
        output.Add(Registry.RuntimeTypes, registry.Read(Registry.RuntimeTypes));

        foreach (var file in registry.CoreFiles)
            output.Add("css/" + file["core/".Length..], registry.Read(file));

        foreach (var component in registry.Components)
        {
            foreach (var file in component.Files)
            {
                var directory = Path.GetExtension(file) switch { ".css" => "css", ".js" => "js", _ => "images" };
                output.Add($"{directory}/{file}", registry.Read(component.Source(file)));
            }
        }

        foreach (var file in Adapters(".css").Concat(Adapters(".js")))
            output.Add("adapters/" + Path.GetFileName(file), Adapter(file));

        return output;
    }

    private IEnumerable<string> Core(string extension) =>
        Entries(component => component.Library is null, extension);

    private string Header() =>
        $"/*!\n * velle-css {version} | MIT License | {Documentation.Repository}\n" +
        " * Based on css-zero by Lázaro Nixon (https://github.com/lazaronixon/css-zero)\n */\n";
}
