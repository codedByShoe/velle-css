using System.Net;
using System.Text;
using System.Text.Json;
using Velle;
using System.Text.RegularExpressions;

namespace Velle.Tool;

internal sealed class Cli(ProjectFiles files, string version, TextWriter output, TextWriter errors)
{
    private const string Usage = """
        velle installs Velle CSS styles and components into your project.

        Usage:
          velle init [--css-dir DIR] [--js-dir DIR] [--images-dir DIR] [--css-entry FILE] [--js-entry FILE]
          velle init --js [--js-dir DIR] [--js-entry FILE]
          velle add [--overwrite] COMPONENT...
          velle add --all [--overwrite]
          velle new controller [--overwrite] NAME
          velle list
          velle version

        Run "velle <command> --help" for the options of a command.
        """;

    private const string InitHelp = """
        Usage: velle init [options]

        Writes velle.json and copies the core styles.

        Options:
          --css-dir DIR       Directory for stylesheets.
          --js-dir DIR        Directory for JavaScript.
          --images-dir DIR    Directory for images.
          --css-entry FILE    Stylesheet entry (default <css-dir>/main.css; "none" to turn off).
          --js-entry FILE     JavaScript entry (default <js-dir>/main.js; "none" to turn off).
          --js                Install only JavaScript.
          --overwrite         Replace core files that already exist.
        """;

    private const string AddHelp = """
        Usage: velle add [--all] [--overwrite] [COMPONENT...]

        Copies components and their dependencies.
          --all          Add every component.
          --overwrite    Replace files that already exist.
        """;

    private const string NewHelp = """
        Usage: velle new controller [--overwrite] NAME

        Creates and imports a controller. Use --overwrite to replace an existing controller.
        """;

    private const string JsConfig = """
        {
          "compilerOptions": {
            "checkJs": true,
            "strict": true,
            "module": "esnext",
            "target": "es2022",
            "moduleResolution": "bundler"
          }
        }
        """;

    private static readonly string[] PathOptions = ["css-dir", "js-dir", "images-dir", "css-entry", "js-entry"];
    private static readonly string[] Categories = ["Elements", "Forms", "Overlays", "Layout", "Behaviors"];
    private static readonly Regex RuntimeExport = new(@"^export (?:function|class) (\w+)", RegexOptions.Multiline);
    private static readonly Regex ControllerName = new(@"\A[a-z][a-z0-9_-]*\z");
    private static readonly Regex DefinedName = new("define\\(\"([a-z0-9-]+)\"");
    private Registry? registry;
    private Registry Assets => registry ??= new Registry();

    public static string Quote(string value) => JsonText.Quote(value);

    public int Run(string[] args)
    {
        if (args.Length == 0)
        {
            errors.WriteLine(Usage);
            return 2;
        }

        try
        {
            switch (args[0])
            {
                case "init":
                    RunCommand(args[1..], InitHelp, ["js", "overwrite"], PathOptions, Init);
                    break;
                case "add":
                    RunCommand(args[1..], AddHelp, ["all", "overwrite"], [], Add);
                    break;
                case "new":
                    RunCommand(args[1..], NewHelp, ["overwrite"], [], NewController);
                    break;
                case "list":
                    RunCommand(args[1..], "Usage: velle list\n\nShows the available components.", [], [], List, writes: false);
                    break;
                case "version" or "--version" or "-v":
                    output.WriteLine($"velle {version}");
                    break;
                case "help" or "--help" or "-h":
                    output.WriteLine(Usage);
                    break;
                default:
                    errors.WriteLine($"velle: unknown command {Quote(args[0])}\n\n{Usage}");
                    return 2;
            }

            return 0;
        }
        catch (Exception error) when (error is CliException or IOException or UnauthorizedAccessException
            or ArgumentException or JsonException or InvalidDataException)
        {
            errors.WriteLine($"velle: {error.Message}");
            return 1;
        }
    }

    private void RunCommand(string[] args, string help, string[] switches, string[] options,
        Action<Arguments> action, bool writes = true)
    {
        var parsed = Arguments.Parse(args, switches, options);
        if (parsed.Help)
            errors.WriteLine(help);
        else if (writes)
            files.UnderWriteLock(() => action(parsed));
        else
            action(parsed);
    }

    private void Init(Arguments args)
    {
        RejectNames("init", args);
        var config = InstallConfig.Read(files);
        if (config is null)
        {
            config = InstallConfig.Create(args, files);
            files.Write(InstallConfig.Filename, config.Serialize());
            Status("create", InstallConfig.Filename);
        }
        else
        {
            if (args.Has("js") || PathOptions.Any(args.Has))
                throw new CliException("velle.json already exists; edit it to change directories or entries");
            Status("exists", InstallConfig.Filename);
        }

        if (config.Headless)
        {
            UpdateEntries(config, [], []);
            PrintEntryTags(config);
            output.WriteLine("\nThen add behaviors with: velle add tabs menu …");
            return;
        }

        foreach (var file in Assets.CoreFiles)
            Copy(file, ProjectFiles.Join(config.CssDir, file["core/".Length..]), args.Flag("overwrite"));

        UpdateEntries(config, Registry.CoreEntries.Select(name => ProjectFiles.Join(config.CssDir, name)), []);
        PrintEntryTags(config);
        if (config.CssEntry.Length == 0)
        {
            output.WriteLine("\nAdd the core styles to your <head>, in this order:\n");
            foreach (var name in Registry.CoreEntries.Take(3))
                output.WriteLine(Link(ProjectFiles.Join(config.CssDir, name)));
            output.WriteLine("  <!-- component stylesheets go here -->");
            output.WriteLine(Link(ProjectFiles.Join(config.CssDir, "utilities.css")));
        }

        output.WriteLine("\nThen add components with: velle add button dialog …");
    }

    private void PrintEntryTags(InstallConfig config)
    {
        var css = !config.Headless && config.CssEntry.Length > 0;
        var js = config.JsEntry.Length > 0;
        if (!css && !js)
            return;

        output.WriteLine(config.Headless
            ? "\nAdd this to your <head> once; velle add keeps it up to date:\n"
            : "\nAdd these to your <head> once; velle add keeps them up to date:\n");
        if (css)
            output.WriteLine(Link(config.CssEntry));
        if (js)
            output.WriteLine(Script(config.JsEntry));
    }

    private void Add(Arguments args)
    {
        var config = RequireConfig();
        IReadOnlyList<string> names = args.Names;
        if (args.Flag("all"))
        {
            if (names.Count > 0)
                throw new CliException("use either --all or component names, not both");
            names = Assets.Components.Select(component => component.Name).ToList();
        }

        if (names.Count == 0)
            throw new CliException("name at least one component; run `velle list` to see them");

        var components = Assets.Resolve(names);
        var overwrite = args.Flag("overwrite");
        if (components.Any(component => component.HasJavaScript))
            CopyRuntime(config, overwrite);

        var stylesheets = new List<string>();
        var scripts = new List<string>();
        foreach (var component in components)
        {
            foreach (var file in component.Files)
            {
                var extension = Path.GetExtension(file);
                if (config.Headless && extension != ".js")
                    continue;

                var directory = extension switch
                {
                    ".css" => config.CssDir,
                    ".js" => config.JsDir,
                    _ => config.ImagesDir
                };
                var target = ProjectFiles.Join(directory, file);
                Copy(component.Source(file), target, overwrite);

                if (extension == ".css")
                    stylesheets.Add(target);
                else if (extension == ".js")
                    scripts.Add(target);
            }
        }

        UpdateEntries(config, stylesheets, scripts);
        if (stylesheets.Count > 0 && config.CssEntry.Length == 0)
        {
            output.WriteLine("\nStylesheets, between base.css and utilities.css. Keep all component\nstylesheets in alphabetical order:\n");
            foreach (var stylesheet in stylesheets.OrderBy(Path.GetFileName, StringComparer.Ordinal))
                output.WriteLine(Link(stylesheet));
        }

        if (scripts.Count > 0 && config.JsEntry.Length == 0)
            PrintScripts(scripts);

        foreach (var component in components.Where(component => component.Library is not null))
            PrintLibrary(component, config.Headless);

        if (config.Headless)
            PrintHeadlessNotes(args.Names, components);
    }

    private void PrintHeadlessNotes(IEnumerable<string> requested, IReadOnlyList<Component> components)
    {
        foreach (var name in requested.Where(name => !Assets[name].HasJavaScript))
            Status("skip", $"{name} (styles only; this project is headless)");

        var notes = components.Where(component => component.Headless.Length > 0).ToArray();
        if (notes.Length == 0)
            return;

        output.WriteLine("\nThese behaviors expect something from your CSS:\n");
        foreach (var component in notes)
            output.WriteLine($"  {component.Name}: {component.Headless}");
    }

    private void PrintLibrary(Component component, bool headless)
    {
        var library = component.Library!;
        var before = headless ? "" : $" before {component.Name}.css";
        output.WriteLine($"\n{component.Name} needs {library.Package} {library.Version}, which velle does not install. Either:\n");
        output.WriteLine($"  • with a bundler:   npm install {string.Join(' ', library.Packages)}");
        if (library.Stylesheet.Length > 0)
            output.WriteLine($"                      and import \"{library.Package}/{library.Stylesheet}\"{before}");
        output.WriteLine("  • without a build:  add it to your import map (before any module script):\n");

        if (library.Modules.Length == 0)
        {
            output.WriteLine($"      <script type=\"importmap\">{{ \"imports\": {{ {Quote(library.Package)}: {Quote(library.Esm)} }} }}</script>");
        }
        else
        {
            output.WriteLine("      <script type=\"importmap\">{ \"imports\": {");
            var modules = library.Modules.Prepend(new AdapterModule(library.Package, library.Esm))
                .OrderBy(module => module.Package, StringComparer.Ordinal);
            output.WriteLine(string.Join(",\n", modules.Select(module => $"        {Quote(module.Package)}: {Quote(module.Esm)}")));
            output.WriteLine("      } }</script>");
        }

        if (library.Stylesheet.Length > 0)
        {
            var comment = headless ? "" : $"  <!--{before} -->";
            output.WriteLine($"      <link rel=\"stylesheet\" href=\"{library.StylesheetUrl}\">{comment}");
        }
    }

    private void NewController(Arguments args)
    {
        if (args.Names is not ["controller", var name])
            throw new CliException("usage: velle new controller [--overwrite] NAME");
        if (!ControllerName.IsMatch(name))
            throw new CliException($"invalid controller name {Quote(name)}: use lowercase letters, digits, dashes and underscores, starting with a letter");

        var config = RequireConfig();
        var target = ProjectFiles.Join(config.JsDir, name + ".js");
        var pathComparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        if (target.Equals(config.JsEntry, pathComparison))
            throw new CliException($"{Quote(name)} is the JavaScript entry file; choose another name");

        var attribute = name.Replace('_', '-');
        if (IsReservedController(attribute))
            throw new CliException($"{Quote(name)} is already used by velle; choose another name");

        CopyRuntime(config, overwrite: false);
        var template = $$"""
            // @ts-check
            import { define, controller } from "./velle.js"

            define("{{attribute}}", class extends controller({
              targets: {},
              values: {},
            }) {
              connect() {}
            })
            """;
        WriteAsset(target, TemplateBytes(template), args.Flag("overwrite"));

        if (config.JsEntry.Length == 0)
            PrintScripts([target]);
        else
            Entry(config.JsEntry, isCss: false).ImportController(target, Assets.KnownFiles());

        const string jsConfigFile = "jsconfig.json";
        if (files.Read(jsConfigFile) is not null)
            Status("exists", jsConfigFile);
        else
            WriteAsset(jsConfigFile, TemplateBytes(JsConfig), overwrite: false);

        output.WriteLine($"\nAdd data-{attribute} to an element to connect it.");
    }

    private bool IsReservedController(string attribute)
    {
        if (attribute == Path.GetFileNameWithoutExtension(Registry.Runtime))
            return true;

        foreach (var component in Assets.Components)
        {
            foreach (var file in component.Files.Where(file => Path.GetExtension(file) == ".js"))
            {
                if (Path.GetFileNameWithoutExtension(file).Replace('_', '-') == attribute ||
                    DefinedName.Matches(Assets.ReadText(component.Source(file))).Any(match => match.Groups[1].Value == attribute))
                    return true;
            }
        }

        return false;
    }

    private void List(Arguments args)
    {
        RejectNames("list", args);
        var components = Assets.Components.ToArray();
        var width = components.Max(component => component.Name.Length);
        foreach (var category in Categories)
        {
            output.WriteLine(category);
            foreach (var component in components.Where(component => component.Category == category))
            {
                var suffix = component.Library is { } library ? $" (needs {library.Package})" : "";
                output.WriteLine($"  {component.Name.PadRight(width)}  {component.Description}{suffix}");
            }
            output.WriteLine();
        }
    }

    private void UpdateEntries(InstallConfig config, IEnumerable<string> stylesheets, IEnumerable<string> scripts)
    {
        var known = Assets.KnownFiles();
        if (!config.Headless && config.CssEntry.Length > 0)
            Entry(config.CssEntry, isCss: true).Update(stylesheets, known);
        if (config.JsEntry.Length > 0)
            Entry(config.JsEntry, isCss: false).Update(scripts, known);
    }

    private void CopyRuntime(InstallConfig config, bool overwrite)
    {
        var target = ProjectFiles.Join(config.JsDir, Path.GetFileName(Registry.Runtime));
        var current = Assets.Read(Registry.Runtime);
        WriteAsset(target, current, overwrite);
        Copy(Registry.RuntimeTypes, ProjectFiles.Join(config.JsDir, Path.GetFileName(Registry.RuntimeTypes)), overwrite);

        var installed = Encoding.UTF8.GetString(files.Read(target)!);
        var missing = RuntimeExport.Matches(Encoding.UTF8.GetString(current))
            .Select(match => match.Groups[1].Value)
            .Where(name => !installed.Contains($"export function {name}", StringComparison.Ordinal) &&
                !installed.Contains($"export class {name}", StringComparison.Ordinal))
            .ToArray();
        if (missing.Length > 0)
            errors.WriteLine($"velle: warning: {target} is older than this version and does not export {string.Join(", ", missing)}, so new components will fail to load; replace it with `velle add --overwrite` on a component that uses JavaScript");
    }

    private void Copy(string source, string target, bool overwrite) => WriteAsset(target, Assets.Read(source), overwrite);

    private void WriteAsset(string target, byte[] bytes, bool overwrite)
    {
        var existing = files.Read(target);
        if (existing is not null)
        {
            if (existing.AsSpan().SequenceEqual(bytes))
            {
                Status("identical", target);
                return;
            }
            if (!overwrite)
            {
                Status("skip", $"{target} (exists; use --overwrite to replace)");
                return;
            }
        }

        files.Write(target, bytes);
        Status(existing is null ? "create" : "overwrite", target);
    }

    private static void RejectNames(string command, Arguments args)
    {
        if (args.Names.Count > 0)
            throw new CliException($"{command} takes no arguments, got {string.Join(' ', args.Names.Select(Quote))}");
    }

    private InstallConfig RequireConfig() => InstallConfig.Read(files) ??
        throw new CliException("velle.json not found; run `velle init` first");

    private void PrintScripts(IEnumerable<string> scripts)
    {
        output.WriteLine("\nScripts:\n");
        foreach (var script in scripts)
            output.WriteLine(Script(script));
    }

    private static string Link(string path) => $"  <link rel=\"stylesheet\" href=\"{WebUtility.HtmlEncode(ProjectFiles.Url(path))}\">";
    private static string Script(string path) => $"  <script type=\"module\" src=\"{WebUtility.HtmlEncode(ProjectFiles.Url(path))}\"></script>";
    private static byte[] TemplateBytes(string content) => Encoding.UTF8.GetBytes(content.ReplaceLineEndings("\n") + "\n");
    private EntryFile Entry(string path, bool isCss) => new(files, path, isCss, Status, errors);
    private void Status(string action, string target) => output.WriteLine($"{action,12}  {target}");
}
