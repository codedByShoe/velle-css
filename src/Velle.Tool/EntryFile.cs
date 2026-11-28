using System.Text;
using System.Text.RegularExpressions;

namespace Velle.Tool;

internal sealed class EntryFile(
    ProjectFiles files, string path, bool isCss, Action<string, string> status, TextWriter errors)
{
    private const string BeginText = "velle:begin — managed by the velle CLI, which keeps these imports in load order. Add your own below velle:end.";
    private static readonly Regex CssImport = new("""^\s*@import\s+url\(\s*["']?([^"')]+?)["']?\s*\)\s*;\s*$""");
    private static readonly Regex ScriptImport = new("""^\s*import\s+["']([^"']+)["']\s*;?\s*$""");
    private static readonly Regex CssComment = new(@"/\*.*?\*/", RegexOptions.Singleline);

    private string Begin => isCss ? $"/* {BeginText} */" : $"// {BeginText}";
    private string End => isCss ? "/* velle:end */" : "// velle:end";
    private Regex ImportPattern => isCss ? CssImport : ScriptImport;

    public void Update(IEnumerable<string> targets, HashSet<string> known)
    {
        var existing = Read();
        var content = existing ?? "";
        var newline = Newline(content);
        var (before, block, after, found) = FindBlock(content);
        if (!found)
        {
            // Keep a BOM and @charset before the CSS imports, then add the block above user rules.
            var insertion = content.StartsWith('\uFEFF') ? 1 : 0;
            if (isCss && content.AsSpan(insertion).StartsWith("@charset", StringComparison.Ordinal))
            {
                var end = content.IndexOf('\n', insertion);
                insertion = end < 0 ? content.Length : end + 1;
            }

            before = content[..insertion];
            after = content[insertion..];
            if (before.Length > 1 && !before.EndsWith('\n'))
                before += newline;
        }

        var imports = new HashSet<string>(targets.Select(Specifier), StringComparer.Ordinal);
        var other = new List<string>();
        foreach (var line in block.Split('\n'))
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var match = ImportPattern.Match(line);
            if (match.Success && known.Contains(Path.GetFileName(match.Groups[1].Value)))
                imports.Add(match.Groups[1].Value);
            else
                other.Add(line.TrimEnd('\r'));
        }

        var sorted = imports.OrderBy(Rank)
            .ThenBy(specifier => Path.GetFileName(specifier), StringComparer.Ordinal)
            .ThenBy(specifier => specifier, StringComparer.Ordinal);
        var updatedBlock = string.Join(newline, new[] { Begin }.Concat(sorted.Select(ImportLine)).Concat(other).Append(End));
        var separator = after.Length > 0 && !after.StartsWith('\n') && !after.StartsWith("\r\n", StringComparison.Ordinal)
            ? newline
            : "";
        var updated = before + updatedBlock + newline + separator + after;
        if (content == updated)
        {
            status("identical", path);
            return;
        }

        files.Write(path, Encoding.UTF8.GetBytes(updated));
        status(existing is null ? "create" : "update", path);
        if (isCss && HasRulesBefore(before.TrimStart('\uFEFF')))
            errors.WriteLine($"velle: warning: {path} has CSS before the velle block; @import only works before other rules, so move the block to the top");
    }

    public void ImportController(string target, HashSet<string> known)
    {
        var content = Read() ?? "";
        if (!FindBlock(content).Found)
        {
            Update([], known);
            content = Read()!;
        }

        var specifier = Specifier(target);
        if (content.Split('\n').Any(line => ImportPattern.Match(line).Groups[1].Value == specifier))
        {
            status("identical", path);
            return;
        }

        var newline = Newline(content);
        if (!content.EndsWith('\n'))
            content += newline;
        files.Write(path, Encoding.UTF8.GetBytes(content + ImportLine(specifier) + newline));
        status("update", path);
    }

    private string? Read() => files.Read(path) is { } bytes ? Encoding.UTF8.GetString(bytes) : null;

    private (string Before, string Block, string After, bool Found) FindBlock(string content)
    {
        var start = content.IndexOf(Begin, StringComparison.Ordinal);
        if (start < 0)
            return ("", "", content, false);

        var blockStart = start + Begin.Length;
        var stop = content.IndexOf(End, blockStart, StringComparison.Ordinal);
        if (stop < 0)
            return ("", "", content, false);

        var after = content[(stop + End.Length)..];
        if (after.StartsWith("\r\n", StringComparison.Ordinal))
            after = after[2..];
        else if (after.StartsWith('\n'))
            after = after[1..];

        return (content[..start], content[blockStart..stop], after, true);
    }

    private string Specifier(string target)
    {
        var relative = files.RelativeToEntry(path, target);
        return isCss || relative.StartsWith("../", StringComparison.Ordinal) ? relative : "./" + relative;
    }

    private string ImportLine(string specifier) => isCss
        ? $"@import url({Cli.Quote(specifier)});"
        : $"import {Cli.Quote(specifier)}";

    private int Rank(string specifier) => !isCss ? 0 : Path.GetFileName(specifier) switch
    {
        "reset.css" => 0,
        "variables.css" => 1,
        "base.css" => 2,
        "utilities.css" => 4,
        _ => 3
    };

    private static string Newline(string content)
    {
        var first = content.IndexOf('\n');
        return first > 0 && content[first - 1] == '\r' ? "\r\n" : "\n";
    }

    private static bool HasRulesBefore(string css) => CssComment.Replace(css, "").Split('\n').Any(line =>
    {
        var text = line.Trim();
        return text.Length > 0 &&
            !text.StartsWith("@charset", StringComparison.Ordinal) &&
            !text.StartsWith("@import", StringComparison.Ordinal) &&
            !(text.StartsWith("@layer", StringComparison.Ordinal) && text.EndsWith(';'));
    });
}
