namespace Velle.Tool;

internal sealed class Arguments
{
    private readonly Dictionary<string, string> options = new(StringComparer.Ordinal);
    public List<string> Names { get; } = [];
    public bool Help { get; private set; }

    public string? Get(string name) => options.GetValueOrDefault(name);
    public bool Has(string name) => options.ContainsKey(name);
    public bool Flag(string name) => Get(name) == "true";

    public static Arguments Parse(string[] args, string[] switches, string[] values)
    {
        var result = new Arguments();
        for (var index = 0; index < args.Length; index++)
        {
            var argument = args[index];
            if (argument == "--")
            {
                result.Names.AddRange(args[(index + 1)..]);
                break;
            }

            if (!argument.StartsWith('-') || argument == "-")
            {
                result.Names.Add(argument);
                continue;
            }

            var option = argument[(argument.StartsWith("--", StringComparison.Ordinal) ? 2 : 1)..].Split('=', 2);
            var name = option[0];
            if (name is "help" or "h")
            {
                result.Help = true;
                break;
            }

            if (switches.Contains(name, StringComparer.Ordinal))
            {
                result.options[name] = option.Length == 1 ? "true" : option[1] switch
                {
                    "1" or "t" or "T" or "true" or "TRUE" or "True" => "true",
                    "0" or "f" or "F" or "false" or "FALSE" or "False" => "false",
                    _ => throw new CliException($"invalid value {Cli.Quote(option[1])} for --{name}")
                };
                continue;
            }

            if (!values.Contains(name, StringComparer.Ordinal))
                throw new CliException($"flag provided but not defined: --{name}");

            if (option.Length == 2)
                result.options[name] = option[1];
            else if (++index < args.Length)
                result.options[name] = args[index];
            else
                throw new CliException($"flag needs an argument: --{name}");
        }

        return result;
    }
}

internal sealed class CliException(string message) : Exception(message);
