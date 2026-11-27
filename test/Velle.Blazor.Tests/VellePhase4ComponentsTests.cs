using Microsoft.AspNetCore.Components.Forms;

namespace Velle.Blazor.Tests;

public sealed class VellePhase4ComponentsTests : BunitContext
{
    private sealed class RangeModel
    {
        public double MinPrice { get; set; } = 25;
        public double MaxPrice { get; set; } = 75;
    }

    [Fact]
    public void VelleCommandRendersSearchInputListboxGroupsItemsAndEmptyState()
    {
        var cut = Render<VelleCommand>(p => p
            .Add(x => x.Id, "quick-cmd")
            .Add(x => x.Label, "Quick commands")
            .Add(x => x.Placeholder, "Filter...")
            .Add(x => x.EmptyText, "Nothing matches.")
            .AddChildContent(builder =>
            {
                builder.OpenComponent<VelleCommandGroup>(0);
                builder.AddAttribute(1, "Heading", "Navigation");
                builder.AddAttribute(2, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b =>
                {
                    b.OpenComponent<VelleCommandItem>(0);
                    b.AddAttribute(1, "Value", "Dashboard");
                    b.AddAttribute(2, "Keywords", "home overview");
                    b.AddAttribute(3, "Icon", "home");
                    b.AddAttribute(4, "Shortcut", "G D");
                    b.AddAttribute(5, "Href", "/dashboard");
                    b.AddAttribute(6, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(c => c.AddContent(0, "Dashboard")));
                    b.CloseComponent();

                    b.OpenComponent<VelleCommandItem>(7);
                    b.AddAttribute(8, "Disabled", true);
                    b.AddAttribute(9, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(c => c.AddContent(0, "Locked")));
                    b.CloseComponent();
                }));
                builder.CloseComponent();

                builder.OpenComponent<VelleCommandSeparator>(3);
                builder.CloseComponent();
            }));

        var root = cut.Find(".command[x-data='velleCommand']");
        Assert.NotNull(root);
        var input = cut.Find("input[data-velle-command-input]");
        Assert.Equal("quick-cmd-list", input.GetAttribute("aria-controls"));
        Assert.Equal("Filter...", input.GetAttribute("placeholder"));
        Assert.Equal("Nothing matches.", cut.Find("[data-velle-command-empty]").TextContent);
        Assert.Equal("Navigation", cut.Find(".command__heading").TextContent);
        Assert.NotNull(cut.Find("hr.command__separator[data-velle-command-separator]"));

        var items = cut.FindAll("[role='option']");
        Assert.Equal(2, items.Count);
        Assert.Equal("/dashboard", items[0].GetAttribute("href"));
        Assert.Equal("Dashboard", items[0].GetAttribute("data-command-value"));
        Assert.Equal("home overview", items[0].GetAttribute("data-command-keywords"));
        Assert.Equal("G D", items[0].QuerySelector(".command__item-key")!.TextContent);
        Assert.Equal("true", items[1].GetAttribute("aria-disabled"));
    }

    [Fact]
    public void VelleConfirmRendersAlertDialogWithCustomLabelsAndVariant()
    {
        var cut = Render<VelleConfirm>(p => p
            .Add(x => x.Id, "app-confirm")
            .Add(x => x.DefaultText, "Permanent deletion.")
            .Add(x => x.CancelText, "Keep")
            .Add(x => x.ConfirmText, "Delete")
            .Add(x => x.ConfirmVariant, VelleButtonVariant.Primary));

        var dialog = cut.Find("dialog#app-confirm[role='alertdialog']");
        Assert.Equal("velleConfirm", dialog.GetAttribute("x-data"));
        Assert.Equal("Permanent deletion.", dialog.GetAttribute("data-velle-confirm-default-text"));
        Assert.Equal("app-confirm-title", dialog.GetAttribute("aria-labelledby"));
        Assert.Equal("app-confirm-text", dialog.GetAttribute("aria-describedby"));
        Assert.Equal("Keep", cut.Find("button[value='cancel']").TextContent);
        var confirmBtn = cut.Find("button[value='confirm']");
        Assert.Equal("Delete", confirmBtn.TextContent);
        Assert.Equal("btn btn--primary", confirmBtn.GetAttribute("class"));
    }

    [Fact]
    public void VelleContextMenuRendersTriggerAreaAndUnanchoredMenuPopover()
    {
        var cut = Render<VelleContextMenu>(p => p
            .Add(x => x.Id, "row-ctx")
            .Add(x => x.Label, "Row actions")
            .AddChildContent("<p>Right-click here</p>")
            .Add(x => x.MenuContent, builder =>
            {
                builder.OpenComponent<VelleMenuItem>(0);
                builder.AddAttribute(1, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Rename")));
                builder.CloseComponent();
            }));

        Assert.NotNull(cut.Find("[x-data='velleContextMenu'][x-on\\:contextmenu='show']"));
        var popover = cut.Find("div#row-ctx[role='menu']");
        Assert.Equal("popover popover--unanchored", popover.GetAttribute("class"));
        Assert.Equal("Row actions", popover.GetAttribute("aria-label"));
        Assert.Equal("row-ctx", cut.Find("[role='menuitem']").GetAttribute("popovertarget"));
    }

    [Fact]
    public void VelleLightboxAndLinkRenderDialogAndGalleryAnchors()
    {
        var cut = Render<VelleLightbox>(p => p
            .Add(x => x.Label, "Photo preview")
            .Add(x => x.ShowDownload, true)
            .AddChildContent(builder =>
            {
                builder.OpenComponent<VelleLightboxLink>(0);
                builder.AddAttribute(1, "Href", "/images/photo.jpg");
                builder.AddAttribute(2, "DownloadUrl", "/images/photo-full.jpg");
                builder.AddAttribute(3, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddMarkupContent(0, "<img src=\"/images/thumb.jpg\" alt=\"Sunset\" />")));
                builder.CloseComponent();
            }));

        Assert.NotNull(cut.Find("[x-data='velleLightbox'][x-on\\:click='show']"));
        var link = cut.Find("a[data-velle-lightbox-trigger]");
        Assert.Equal("/images/photo.jpg", link.GetAttribute("href"));
        Assert.Equal("/images/photo-full.jpg", link.GetAttribute("data-velle-lightbox-url"));
        var dialog = cut.Find("dialog.lightbox");
        Assert.Equal("Photo preview", dialog.GetAttribute("aria-label"));
        Assert.NotNull(dialog.QuerySelector("img[data-velle-lightbox-image]"));
        Assert.NotNull(dialog.QuerySelector("a[data-velle-lightbox-download]"));
    }

    [Fact]
    public void VelleCarouselRendersRegionControlsAndSlides()
    {
        var cut = Render<VelleCarousel>(p => p
            .Add(x => x.Label, "Featured cards")
            .AddChildContent(builder =>
            {
                builder.OpenComponent<VelleCarouselItem>(0);
                builder.AddAttribute(1, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Slide 1")));
                builder.CloseComponent();
                builder.OpenComponent<VelleCarouselItem>(2);
                builder.AddAttribute(3, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Slide 2")));
                builder.CloseComponent();
            }));

        var root = cut.Find(".carousel[role='region'][aria-roledescription='carousel']");
        Assert.Equal("Featured cards", root.GetAttribute("aria-label"));
        Assert.Equal("velleCarousel", root.GetAttribute("x-data"));
        Assert.Equal("prev", cut.Find("button[x-on\\:click='prev']").GetAttribute("x-on:click"));
        Assert.Equal("next", cut.Find("button[x-on\\:click='next']").GetAttribute("x-on:click"));
        Assert.Equal(2, cut.FindAll(".carousel__item").Count);
    }

    [Fact]
    public void VelleDualRangeRendersTwoRangeInputsWithEditContextAndForValues()
    {
        var model = new RangeModel { MinPrice = 20, MaxPrice = 80 };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(RangeModel.MinPrice)), "Too low.");

        var cut = Render<VelleDualRange>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.MinName, "Filter.MinPrice")
            .Add(x => x.MaxName, "Filter.MaxPrice")
            .Add(x => x.Min, 0)
            .Add(x => x.Max, 200)
            .Add(x => x.Step, 5)
            .Add(x => x.MinFor, () => model.MinPrice)
            .Add(x => x.MaxFor, () => model.MaxPrice));

        var root = cut.Find(".dual-range[x-data='velleDualRange']");
        Assert.Equal("3", root.GetAttribute("data-velle-dual-range-precision"));

        var minInput = cut.Find("input[data-velle-dual-range-min]");
        var maxInput = cut.Find("input[data-velle-dual-range-max]");
        Assert.Equal("filter-minprice", minInput.GetAttribute("id"));
        Assert.Equal("20", minInput.GetAttribute("value"));
        Assert.Equal("true", minInput.GetAttribute("aria-invalid"));
        Assert.Equal("80", maxInput.GetAttribute("value"));
        Assert.Null(maxInput.GetAttribute("aria-invalid"));
        Assert.Equal("5", minInput.GetAttribute("step"));
    }

    [Fact]
    public void VelleDropzoneRendersValidationConstraintsAndFileInput()
    {
        var cut = Render<VelleDropzone>(p => p
            .Add(x => x.Name, "Upload.Files")
            .Add(x => x.Label, "Drop PDFs")
            .Add(x => x.Description, "Up to 5 MB")
            .Add(x => x.Accept, ".pdf,image/*")
            .Add(x => x.MaxFileSizeMb, 5)
            .Add(x => x.MaxFiles, 3)
            .Add(x => x.SizeMessage, "Too big"));

        var root = cut.Find(".dropzone[x-data='velleDropzone']");
        Assert.Equal("5", root.GetAttribute("data-velle-max-file-size"));
        Assert.Equal("3", root.GetAttribute("data-velle-max-files"));
        Assert.Equal("Too big", root.GetAttribute("data-velle-size-message"));

        var input = cut.Find("input[type='file']#upload-files");
        Assert.Equal("Upload.Files", input.GetAttribute("name"));
        Assert.Equal(".pdf,image/*", input.GetAttribute("accept"));
        Assert.True(input.HasAttribute("multiple"));
        Assert.NotNull(cut.Find("ul.dropzone__files[x-on\\:click='onListClick']"));
    }

    [Fact]
    public void VelleCheckAllResizableAutoAnimateLocalTimeAndTimezoneCookieRenderExpectedContracts()
    {
        var checkAll = Render<VelleCheckAll>(p => p
            .Add(x => x.Class, "flex flex-col")
            .AddChildContent("<input type=\"checkbox\" data-velle-check-all-dependee />"));
        Assert.Equal("flex flex-col", checkAll.Find("[x-data='velleCheckAll']").GetAttribute("class"));

        var resizable = Render<VelleResizable>(p => p
            .Add(x => x.Orientation, VelleOrientation.Vertical)
            .AddChildContent(builder =>
            {
                builder.OpenComponent<VelleResizablePanel>(0);
                builder.AddAttribute(1, "InitialSize", 40d);
                builder.AddAttribute(2, "MinSize", 20d);
                builder.AddAttribute(3, "MaxSize", 80d);
                builder.AddAttribute(4, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Top")));
                builder.CloseComponent();
                builder.OpenComponent<VelleResizableHandle>(5);
                builder.AddAttribute(6, "Label", "Resize vertical split");
                builder.CloseComponent();
                builder.OpenComponent<VelleResizablePanel>(7);
                builder.AddAttribute(8, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Bottom")));
                builder.CloseComponent();
            }));
        Assert.Equal("resizable resizable--vertical", resizable.Find("[x-data='velleResizable']").GetAttribute("class"));
        var firstPanel = resizable.Find(".resizable__panel");
        Assert.Equal("40", firstPanel.GetAttribute("data-resizable-size"));
        Assert.Equal("20", firstPanel.GetAttribute("data-resizable-min"));
        Assert.Equal("80", firstPanel.GetAttribute("data-resizable-max"));
        var handle = resizable.Find(".resizable__handle[role='separator']");
        Assert.Equal("Resize vertical split", handle.GetAttribute("aria-label"));

        var autoAnimate = Render<VelleAutoAnimate>(p => p
            .Add(x => x.Class, "flex gap")
            .AddChildContent("<div>Item</div>"));
        Assert.Equal("auto-animate flex gap", autoAnimate.Find("div.auto-animate").GetAttribute("class"));

        var timestamp = new DateTimeOffset(2030, 4, 12, 15, 30, 0, TimeSpan.Zero);
        var localTime = Render<VelleLocalTime>(p => p
            .Add(x => x.Value, timestamp)
            .Add(x => x.Format, VelleLocalTimeFormat.Ago));
        var timeEl = localTime.Find("time[x-data='velleLocalTime']");
        Assert.Equal("ago", timeEl.GetAttribute("data-velle-local-time"));
        Assert.StartsWith("2030-04-12T15:30:00", timeEl.GetAttribute("datetime"));

        var tz = Render<VelleTimezoneCookie>(p => p.Add(x => x.CookieName, "user_tz"));
        var tzEl = tz.Find("span[x-data='velleTimezoneCookie']");
        Assert.True(tzEl.HasAttribute("hidden"));
        Assert.Equal("user_tz", tzEl.GetAttribute("data-velle-cookie-name"));
    }
}
