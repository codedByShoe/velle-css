namespace Velle.Blazor.Tests;

public sealed class VelleStylesTests : BunitContext
{
    [Fact]
    public void RendersCoreStylesheetByDefault()
    {
        var cut = Render<VelleStyles>();

        var links = cut.FindAll("link[rel='stylesheet']");
        Assert.Single(links);
        Assert.Equal("_content/Velle.Blazor/css/velle.css", links[0].GetAttribute("href"));
    }

    [Fact]
    public void RendersDatepickerStylesheetsWhenEnabled()
    {
        var cut = Render<VelleStyles>(parameters => parameters
            .Add(p => p.IncludeDatepicker, true));

        var hrefs = cut.FindAll("link[rel='stylesheet']").Select(link => link.GetAttribute("href") ?? "").ToArray();
        Assert.Equal(
            [
                "_content/Velle.Blazor/css/velle.css",
                "_content/Velle.Blazor/lib/flatpickr/flatpickr.min.css",
                "_content/Velle.Blazor/css/datepicker.css",
            ],
            hrefs);
    }
}
