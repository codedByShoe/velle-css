using Microsoft.AspNetCore.Components.Forms;

namespace Velle.Blazor.Tests;

public sealed class VellePhase6ComponentsTests : BunitContext
{
    private sealed class ArticleInput
    {
        public string? Body { get; set; }
    }

    [Fact]
    public void VelleStylesIncludesEditorStylesheetsWhenEnabled()
    {
        var cut = Render<VelleStyles>(p => p
            .Add(x => x.IncludeDatepicker, true)
            .Add(x => x.IncludeEditor, true));

        var hrefs = cut.FindAll("link[rel='stylesheet']").Select(link => link.GetAttribute("href") ?? "").ToArray();
        Assert.Equal(
            [
                "_content/Velle.Blazor/css/velle.css",
                "_content/Velle.Blazor/lib/flatpickr/flatpickr.min.css",
                "_content/Velle.Blazor/css/datepicker.css",
                "_content/Velle.Blazor/lib/lexxy/lexxy.css",
                "_content/Velle.Blazor/css/editor.css",
            ],
            hrefs);
    }

    [Fact]
    public void VelleChartSerializesTypeDataOptionsAndCanvasAriaLabel()
    {
        var cut = Render<VelleChart>(p => p
            .Add(x => x.Type, VelleChartType.Bar)
            .Add(x => x.Label, "Monthly revenue")
            .Add(x => x.Data, new
            {
                Labels = new[] { "Jan", "Feb" },
                Datasets = new[] { new { Label = "Sales", Data = new[] { 10, 20 } } },
            })
            .Add(x => x.Options, new { Responsive = true })
            .Add(x => x.Class, "chart-box"));

        var root = cut.Find("div.chart-box[x-data='velleChart']");
        Assert.Equal("bar", root.GetAttribute("data-velle-chart-type"));
        Assert.Contains("\"labels\":[\"Jan\",\"Feb\"]", root.GetAttribute("data-velle-chart-data"));
        Assert.Contains("\"responsive\":true", root.GetAttribute("data-velle-chart-options"));

        var canvas = cut.Find("canvas[role='img']");
        Assert.Equal("Monthly revenue", canvas.GetAttribute("aria-label"));
    }

    [Fact]
    public void VelleEditorRendersLexxyElementHiddenInputEditContextAndAttachmentBridge()
    {
        var model = new ArticleInput { Body = "<p>Hello <strong>Velle</strong></p>" };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(ArticleInput.Body)), "Body is too short.");

        var withoutUpload = Render<VelleEditor>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Article.Body")
            .Add(x => x.Label, "Article body")
            .Add(x => x.Description, "Supports Markdown shortcuts.")
            .Add(x => x.Placeholder, "Write here...")
            .Add(x => x.For, () => model.Body));

        var root = withoutUpload.Find(".velle-editor[x-data='velleEditor']");
        Assert.Equal("true", root.GetAttribute("data-invalid"));
        Assert.Null(root.GetAttribute("data-velle-editor-upload-url"));

        var hidden = withoutUpload.Find("input[type='hidden'][data-velle-editor-input]");
        Assert.Equal("Article.Body", hidden.GetAttribute("name"));
        Assert.Equal("<p>Hello <strong>Velle</strong></p>", hidden.GetAttribute("value"));

        var lexxy = withoutUpload.Find("lexxy-editor#article-body");
        Assert.Equal("true", lexxy.GetAttribute("markdown"));
        Assert.Equal("true", lexxy.GetAttribute("tables"));
        Assert.Equal("true", lexxy.GetAttribute("code-blocks"));
        Assert.Equal("false", lexxy.GetAttribute("attachments"));
        Assert.Equal("true", lexxy.GetAttribute("aria-invalid"));
        Assert.Equal("Write here...", lexxy.GetAttribute("placeholder"));

        var withUpload = Render<VelleEditor>(p => p
            .Add(x => x.Name, "Post.Content")
            .Add(x => x.UploadUrl, "/api/uploads")
            .Add(x => x.UploadFieldName, "attachment")
            .Add(x => x.PermittedAttachmentTypes, "image/png image/jpeg")
            .Add(x => x.Toolbar, false));

        var uploadRoot = withUpload.Find(".velle-editor[x-data='velleEditor']");
        Assert.Equal("/api/uploads", uploadRoot.GetAttribute("data-velle-editor-upload-url"));
        Assert.Equal("attachment", uploadRoot.GetAttribute("data-velle-editor-upload-field"));

        var uploadLexxy = withUpload.Find("lexxy-editor#post-content");
        Assert.Equal("true", uploadLexxy.GetAttribute("attachments"));
        Assert.Equal("false", uploadLexxy.GetAttribute("toolbar"));
        Assert.Equal("image/png image/jpeg", uploadLexxy.GetAttribute("permitted-attachment-types"));
    }
}
