using System.Text.RegularExpressions;

namespace Velle.Docs;

internal static class ReferenceCss
{
    private static readonly Regex Banner = new(@"^\s*\*\s+(.+?)\s*$");
    private static readonly Regex Declaration = new(@"^\s*(--[\w-]+)\s*:\s*(.+?);\s*(?:/\*\s*(.*?)\s*\*/)?\s*$");
    private static readonly Regex ColorName = new(@"^--([a-z]+)-[0-9]+$");
    private static readonly Regex Rule = new(@"^\.((?:[\w-]|\\@)+)\s*\{\s*(.*?)\s*\}\s*$");
    private static readonly string[] TokenOrder =
        ["colors", "typography", "sizes", "borders", "effects", "filters", "transforms", "transitions", "animations"];

    public static IReadOnlyList<TokenFile> Tokens(Registry registry)
    {
        var files = new List<TokenFile>();
        foreach (var name in TokenOrder)
        {
            var filename = name + ".css";
            var file = new TokenFile(char.ToUpperInvariant(name[0]) + name[1..], filename, []);
            files.Add(file);
            TokenSection? current = null;

            using var reader = new StringReader(registry.ReadText("core/tokens/" + filename));
            while (reader.ReadLine() is { } line)
            {
                var banner = Banner.Match(line);
                if (IsHeading(banner) && !line.TrimStart().StartsWith("*/", StringComparison.Ordinal))
                {
                    current = new TokenSection(banner.Groups[1].Value, []);
                    file.Sections.Add(current);
                    continue;
                }

                var match = Declaration.Match(line);
                if (!match.Success)
                    continue;

                var token = new Token(match.Groups[1].Value, match.Groups[2].Value, match.Groups[3].Value, name == "colors");
                if (token.Color && ColorName.Match(token.Name) is { Success: true } palette && current?.Title != palette.Groups[1].Value)
                {
                    current = new TokenSection(palette.Groups[1].Value, []);
                    file.Sections.Add(current);
                }

                if (current is null)
                {
                    current = new TokenSection("", []);
                    file.Sections.Add(current);
                }

                current.Tokens.Add(token);
            }
        }

        return files;
    }

    public static IReadOnlyList<UtilitySection> Utilities(Registry registry)
    {
        var sections = new List<UtilitySection>();
        using var reader = new StringReader(registry.ReadText("core/utilities.css"));
        while (reader.ReadLine() is { } line)
        {
            var banner = Banner.Match(line);
            if (IsHeading(banner))
            {
                sections.Add(new UtilitySection(banner.Groups[1].Value, []));
                continue;
            }

            var match = Rule.Match(line);
            if (match.Success && sections.Count > 0)
                sections[^1].Rules.Add(new UtilityRule(match.Groups[1].Value.Replace("\\", ""), match.Groups[2].Value));
        }

        return sections;
    }

    private static bool IsHeading(Match match) => match.Success && !match.Groups[1].Value.Contains("****", StringComparison.Ordinal);
}

internal sealed record TokenFile(string Title, string File, List<TokenSection> Sections);
internal sealed record TokenSection(string Title, List<Token> Tokens);
internal sealed record Token(string Name, string Value, string Comment, bool Color)
{
    public string Swatch => $"background: var({Name})";
}

internal sealed record UtilitySection(string Title, List<UtilityRule> Rules);
internal sealed record UtilityRule(string Class, string Declarations);
