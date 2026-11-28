using System.Reflection;
using Velle.Tool;

var version = typeof(Cli).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion;
return new Cli(new ProjectFiles(Directory.GetCurrentDirectory()), version, Console.Out, Console.Error).Run(args);
