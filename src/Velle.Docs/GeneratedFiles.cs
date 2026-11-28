using System.Text;

namespace Velle.Docs;

internal sealed class GeneratedFiles
{
    private readonly Dictionary<string, byte[]> files = new(StringComparer.Ordinal);

    public void Add(string path, string text) => Add(path, Encoding.UTF8.GetBytes(text));

    public void Add(string path, byte[] data)
    {
        if (!files.TryAdd(path, data))
            throw new InvalidDataException($"duplicate output file {path}");
    }

    public void WriteTo(string directory)
    {
        var stage = directory + ".new-" + Guid.NewGuid().ToString("N");
        var previous = stage + ".previous";
        Directory.CreateDirectory(stage);
        try
        {
            foreach (var (relative, bytes) in files)
            {
                var target = Path.Combine(stage, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                File.WriteAllBytes(target, bytes);
            }

            if (Directory.Exists(directory))
                Directory.Move(directory, previous);

            try
            {
                Directory.Move(stage, directory);
            }
            catch
            {
                if (Directory.Exists(previous) && !Directory.Exists(directory))
                    Directory.Move(previous, directory);
                throw;
            }

            if (Directory.Exists(previous))
                Directory.Delete(previous, recursive: true);
        }
        finally
        {
            if (Directory.Exists(stage))
                Directory.Delete(stage, recursive: true);
        }
    }
}
