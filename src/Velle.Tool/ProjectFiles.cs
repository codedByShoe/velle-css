using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;

namespace Velle.Tool;

internal sealed class ProjectFiles(string root)
{
    private static readonly StringComparison PathComparison =
        OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

    public bool UsesWwwroot => Directory.Exists(Path.Combine(root, "wwwroot")) ||
        Directory.EnumerateFiles(root, "*.csproj").Any(UsesWebSdk);

    private static bool UsesWebSdk(string path)
    {
        try
        {
            var project = XDocument.Load(path).Root;
            if (project is null)
                return false;

            var namespaces = project.Name.Namespace;
            return IsWebSdk((string?)project.Attribute("Sdk")) ||
                project.Elements(namespaces + "Sdk").Any(sdk => IsWebSdk((string?)sdk.Attribute("Name")));
        }
        catch (System.Xml.XmlException)
        {
            return false;
        }
    }

    private static bool IsWebSdk(string? sdk) => sdk?.Split(';').Any(value =>
        value.Split('/', 2)[0].Trim() is "Microsoft.NET.Sdk.Web" or "Microsoft.NET.Sdk.BlazorWebAssembly") == true;

    public void UnderWriteLock(Action action)
    {
        var key = OperatingSystem.IsWindows() ? root.ToUpperInvariant() : root;
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
        using var gate = new Mutex(false, $"velle-{hash}");
        try
        {
            gate.WaitOne();
        }
        catch (AbandonedMutexException)
        {
            // The preceding command exited during a write. File updates are atomic and can be retried.
        }

        try
        {
            action();
        }
        finally
        {
            gate.ReleaseMutex();
        }
    }

    public string Normalize(string path, string field)
    {
        var portable = path.Replace('\\', '/');
        if (Path.IsPathRooted(portable) || (portable.Length > 1 && portable[1] == ':'))
            throw Outside(field, path);

        var absolute = Path.GetFullPath(portable, root);
        if (!IsInside(absolute))
            throw Outside(field, path);

        var relative = Portable(Path.GetRelativePath(root, absolute));
        Resolve(relative);
        return relative;
    }

    public static string Join(string directory, string path) => directory == "." ? path : $"{directory}/{path}";

    public static string Url(string path) => path.StartsWith("wwwroot/", StringComparison.Ordinal)
        ? "/" + path["wwwroot/".Length..]
        : "/" + path;

    public string RelativeToEntry(string entry, string target)
    {
        var entryDirectory = Path.GetDirectoryName(Path.Combine(root, entry))!;
        return Portable(Path.GetRelativePath(entryDirectory, Path.Combine(root, target)));
    }

    public byte[]? Read(string relative)
    {
        try
        {
            return File.ReadAllBytes(Resolve(relative));
        }
        catch (FileNotFoundException)
        {
            return null;
        }
        catch (DirectoryNotFoundException)
        {
            return null;
        }
    }

    public void Write(string relative, byte[] bytes)
    {
        var destination = Resolve(relative);
        var directory = Path.GetDirectoryName(destination)!;
        Directory.CreateDirectory(directory);
        var temporary = Path.Combine(directory, $".velle-{Guid.NewGuid():N}.tmp");
        try
        {
            File.WriteAllBytes(temporary, bytes);
            if (!OperatingSystem.IsWindows() && File.Exists(destination))
                File.SetUnixFileMode(temporary, File.GetUnixFileMode(destination));
            File.Move(temporary, destination, overwrite: true);
        }
        finally
        {
            File.Delete(temporary);
        }
    }

    private string Resolve(string relative)
    {
        var current = root;
        foreach (var part in relative.Split('/'))
        {
            current = Path.Combine(current, part);
            FileSystemInfo entry = Directory.Exists(current) ? new DirectoryInfo(current) : new FileInfo(current);
            if (entry.LinkTarget is null)
                continue;

            current = entry.ResolveLinkTarget(returnFinalTarget: true)!.FullName;
            if (!IsInside(current))
                throw Outside("destination", relative);
        }

        return current;
    }

    private bool IsInside(string path) =>
        path.Equals(root, PathComparison) || path.StartsWith(Path.EndsInDirectorySeparator(root)
            ? root
            : root + Path.DirectorySeparatorChar, PathComparison);

    private static CliException Outside(string field, string path) =>
        new($"{field} must be a path inside the project, got {Cli.Quote(path)}");

    private static string Portable(string path) => path.Replace(Path.DirectorySeparatorChar, '/');
}
