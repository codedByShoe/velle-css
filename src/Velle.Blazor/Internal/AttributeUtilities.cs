using System.Text;

namespace Velle.Blazor;

internal static class AttributeUtilities
{
    public static string? CombineClasses(
        string? baseClass,
        string? userClass,
        IReadOnlyDictionary<string, object>? additionalAttributes,
        string? extraClass = null)
    {
        var attributeClass = additionalAttributes is not null
            && additionalAttributes.TryGetValue("class", out var value)
            ? value?.ToString()
            : null;

        var builder = new StringBuilder();
        Append(builder, baseClass);
        Append(builder, extraClass);
        Append(builder, userClass);
        Append(builder, attributeClass);
        return builder.Length == 0 ? null : builder.ToString();
    }

    public static IReadOnlyDictionary<string, object>? Without(
        IReadOnlyDictionary<string, object>? additionalAttributes,
        params string[] excludedKeys)
    {
        if (additionalAttributes is null || additionalAttributes.Count == 0)
        {
            return null;
        }

        Dictionary<string, object>? filtered = null;
        foreach (var pair in additionalAttributes)
        {
            if (Array.Exists(excludedKeys, key => string.Equals(key, pair.Key, StringComparison.OrdinalIgnoreCase)))
            {
                filtered ??= new Dictionary<string, object>(additionalAttributes, StringComparer.OrdinalIgnoreCase);
                filtered.Remove(pair.Key);
            }
        }

        return filtered ?? additionalAttributes;
    }

    public static string ToElementId(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "velle-field";
        }

        var builder = new StringBuilder(name.Length);
        var previousDash = false;
        foreach (var ch in name.Trim())
        {
            if (char.IsAsciiLetterOrDigit(ch))
            {
                builder.Append(char.ToLowerInvariant(ch));
                previousDash = false;
            }
            else if (!previousDash && builder.Length > 0)
            {
                builder.Append('-');
                previousDash = true;
            }
        }

        var result = builder.ToString().TrimEnd('-');
        if (result.Length == 0)
        {
            return "velle-field";
        }

        return char.IsAsciiDigit(result[0]) ? $"velle-{result}" : result;
    }

    public static string ToPopoverPlacementClass(VellePopoverPlacement placement) => placement switch
    {
        VellePopoverPlacement.BlockEndCenter => "popover--block-end-center",
        VellePopoverPlacement.BlockEndEnd => "popover--block-end-end",
        VellePopoverPlacement.BlockStartStart => "popover--block-start-start",
        VellePopoverPlacement.BlockStartCenter => "popover--block-start-center",
        VellePopoverPlacement.BlockStartEnd => "popover--block-start-end",
        VellePopoverPlacement.Unanchored => "popover--unanchored",
        _ => "popover--block-end-start",
    };

    private static void Append(StringBuilder builder, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (builder.Length > 0)
        {
            builder.Append(' ');
        }

        builder.Append(value.Trim());
    }
}
