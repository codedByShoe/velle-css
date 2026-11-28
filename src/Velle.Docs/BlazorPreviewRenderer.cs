using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Velle.Docs;

internal sealed class BlazorPreviewRenderer : IAsyncDisposable
{
    private readonly ServiceProvider services;
    private readonly HtmlRenderer renderer;

    public BlazorPreviewRenderer()
    {
        services = new ServiceCollection().BuildServiceProvider();
        renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
    }

    public string Render<TComponent>(string exampleId) where TComponent : IComponent =>
        renderer.Dispatcher.InvokeAsync(async () =>
        {
            var parameters = ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                ["Id"] = exampleId,
            });
            var output = await renderer.RenderComponentAsync<TComponent>(parameters);
            return output.ToHtmlString().Trim();
        }).GetAwaiter().GetResult();

    public async ValueTask DisposeAsync()
    {
        await renderer.DisposeAsync();
        await services.DisposeAsync();
    }
}
