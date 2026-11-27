using Microsoft.AspNetCore.Components.Forms;

namespace Velle.Blazor.Tests;

public sealed class VellePhase5ComponentsTests : BunitContext
{
    private sealed class BillingInput
    {
        public string? Phone { get; set; }
        public string? Amount { get; set; }
    }

    [Fact]
    public void VelleLayoutAndSidebarMenuRenderShellVariantsAndSidebarToggle()
    {
        var sidebar = Render<VelleLayout>(p => p
            .Add(x => x.Variant, VelleLayoutVariant.Sidebar)
            .Add(x => x.SidebarClosed, true)
            .Add(x => x.Header, b => b.AddContent(0, "Header"))
            .Add(x => x.Sidebar, b =>
            {
                b.OpenComponent<VelleSidebarMenu>(0);
                b.AddAttribute(1, "Label", "App nav");
                b.AddAttribute(2, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(c => c.AddContent(0, "Links")));
                b.AddAttribute(3, "Footer", (Microsoft.AspNetCore.Components.RenderFragment)(c => c.AddContent(0, "Profile")));
                b.CloseComponent();
            })
            .AddChildContent("<p>Main body</p>"));

        var root = sidebar.Find(".sidebar-layout.closed[x-data='velleToggleClass']");
        Assert.Equal("closed", root.GetAttribute("data-velle-toggle-class"));
        Assert.Equal("Header", sidebar.Find("header#header").TextContent);
        Assert.Equal("App nav", sidebar.Find("aside#sidebar nav.sidebar-menu__content").GetAttribute("aria-label"));
        Assert.Equal("Main body", sidebar.Find("main#main p").TextContent);

        var headerOnly = Render<VelleLayout>(p => p
            .Add(x => x.Variant, VelleLayoutVariant.Header)
            .Add(x => x.Header, b => b.AddContent(0, "Top"))
            .AddChildContent("<p>Body</p>"));
        Assert.NotNull(headerOnly.Find(".header-layout"));
        Assert.Empty(headerOnly.FindAll("aside#sidebar"));

        var centered = Render<VelleLayout>(p => p
            .Add(x => x.Variant, VelleLayoutVariant.Centered)
            .AddChildContent("<p>Login</p>"));
        Assert.NotNull(centered.Find(".centered-layout"));
    }

    [Fact]
    public void VelleInputMaskRendersPatternAndMoneyModesWithEditContext()
    {
        var model = new BillingInput { Phone = "5551234567", Amount = "1200.50" };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(BillingInput.Phone)), "Invalid phone.");

        var pattern = Render<VelleInputMask>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Phone")
            .Add(x => x.Label, "Phone")
            .Add(x => x.Mask, "(999) 999-9999")
            .Add(x => x.For, () => model.Phone));

        var phoneInput = pattern.Find("input#input-phone");
        Assert.Equal("(999) 999-9999", phoneInput.GetAttribute("x-mask"));
        Assert.Equal("velleInputMask", phoneInput.GetAttribute("x-data"));
        Assert.Equal("5551234567", phoneInput.GetAttribute("value"));
        Assert.Equal("true", phoneInput.GetAttribute("aria-invalid"));

        var money = Render<VelleInputMask>(p => p
            .Add(x => x.Name, "Input.Amount")
            .Add(x => x.Mode, VelleInputMaskMode.Money)
            .Add(x => x.DecimalSeparator, ",")
            .Add(x => x.Precision, 2)
            .Add(x => x.Value, "1200,50"));

        var amountInput = money.Find("input#input-amount");
        Assert.Equal("moneyMask", amountInput.GetAttribute("x-mask:dynamic"));
        Assert.Equal("decimal", amountInput.GetAttribute("inputmode"));
        Assert.Equal(",", amountInput.GetAttribute("data-velle-mask-decimal"));
        Assert.Equal(".", amountInput.GetAttribute("data-velle-mask-thousands"));
        Assert.Equal("2", amountInput.GetAttribute("data-velle-mask-precision"));
    }

    [Fact]
    public void VelleSortableRendersAlpineSortDirectivesOrderInputAndHandles()
    {
        var cut = Render<VelleSortable>(p => p
            .Add(x => x.Group, "board")
            .Add(x => x.OrderName, "CardOrder")
            .Add(x => x.Url, "/api/reorder")
            .Add(x => x.Method, "POST")
            .Add(x => x.ParentId, "col-1")
            .AddChildContent(builder =>
            {
                builder.OpenComponent<VelleSortableItem>(0);
                builder.AddAttribute(1, "Key", "task-1");
                builder.AddAttribute(2, "Url", "/api/tasks/1");
                builder.AddAttribute(3, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b =>
                {
                    b.OpenComponent<VelleSortableHandle>(0);
                    b.AddAttribute(1, "Label", "Move task 1");
                    b.CloseComponent();
                    b.AddContent(2, "Task 1");
                }));
                builder.CloseComponent();
            }));

        var root = cut.Find("[x-data='velleSortable']");
        Assert.Equal("/api/reorder", root.GetAttribute("data-velle-sort-url"));
        Assert.Equal("POST", root.GetAttribute("data-velle-sort-method"));
        Assert.Equal("col-1", root.GetAttribute("data-velle-sort-parent-id"));

        var orderInput = cut.Find("input[type='hidden'][data-velle-sortable-order]");
        Assert.Equal("CardOrder", orderInput.GetAttribute("name"));

        var list = cut.Find("[data-velle-sortable-list]");
        Assert.Equal("onSort", list.GetAttribute("x-sort.ghost"));
        Assert.Equal("board", list.GetAttribute("x-sort:group"));

        var item = cut.Find("[data-velle-sort-key='task-1']");
        Assert.True(item.HasAttribute("x-sort:item"));
        Assert.Equal("/api/tasks/1", item.GetAttribute("data-velle-sort-url"));

        var handle = cut.Find(".sortable-handle");
        Assert.True(handle.HasAttribute("x-sort:handle"));
        Assert.Equal("Move task 1", handle.GetAttribute("aria-label"));
    }

    [Fact]
    public void VelleZeroDepBehaviorsRenderExpectedAlpineContracts()
    {
        var collapsible = Render<VelleCollapsible>(p => p
            .Add(x => x.TriggerText, "Toggle")
            .Add(x => x.Summary, "Details")
            .Add(x => x.Open, true)
            .AddChildContent("<p>Hidden text</p>"));
        Assert.NotNull(collapsible.Find("[x-data='velleCollapsible']"));
        Assert.Equal("toggle", collapsible.Find("button").GetAttribute("x-on:click"));
        Assert.True(collapsible.Find("details").HasAttribute("open"));
        Assert.Equal("Details", collapsible.Find("summary").TextContent);

        var upload = Render<VelleUploadPreview>(p => p
            .Add(x => x.Name, "Avatar")
            .Add(x => x.DefaultImage, "/img/default.svg")
            .Add(x => x.CurrentImage, "/img/current.png")
            .Add(x => x.RemoveName, "RemoveAvatar"));
        Assert.Equal("/img/default.svg", upload.Find("[x-data='velleUploadPreview']").GetAttribute("data-velle-default-image"));
        Assert.Equal("/img/current.png", upload.Find("img[data-velle-upload-image]").GetAttribute("src"));
        Assert.Equal("RemoveAvatar", upload.Find("input[data-velle-upload-remove]").GetAttribute("name"));

        var share = Render<VelleWebShare>(p => p
            .Add(x => x.Title, "Velle")
            .Add(x => x.Text, "Check this out")
            .Add(x => x.Url, "https://example.com")
            .Add(x => x.AlwaysShow, true));
        var shareBtn = share.Find("button[x-data='velleWebShare']");
        Assert.Equal("Velle", shareBtn.GetAttribute("data-velle-share-title"));
        Assert.Equal("https://example.com", shareBtn.GetAttribute("data-velle-share-url"));
        Assert.Equal("true", shareBtn.GetAttribute("data-velle-share-always-show"));

        var fs = Render<VelleFullscreen>(p => p.Add(x => x.TargetSelector, "#stage").Add(x => x.Label, "Expand"));
        var fsBtn = fs.Find("button[x-data='velleFullscreen']");
        Assert.Equal("#stage", fsBtn.GetAttribute("data-velle-fullscreen-target"));
        Assert.Contains("Expand", fsBtn.TextContent);

        var autosave = Render<VelleAutosave>(p => p
            .Add(x => x.IntervalMs, 1500)
            .Add(x => x.Mode, VelleAutosaveMode.Submit)
            .AddChildContent("<form></form>"));
        var asRoot = autosave.Find("[x-data='velleAutosave']");
        Assert.Equal("1500", asRoot.GetAttribute("data-velle-autosave-interval"));
        Assert.Equal("submit", asRoot.GetAttribute("data-velle-autosave-mode"));

        var formHelper = Render<VelleFormHelper>(p => p.Add(x => x.DebounceMs, 500).AddChildContent("<form></form>"));
        Assert.Equal("500", formHelper.Find("[x-data='velleFormHelper']").GetAttribute("data-velle-form-debounce"));

        var autoSelect = Render<VelleAutoSelect>(p => p.Add(x => x.Always, true).AddChildContent("<input value=\"hi\" />"));
        Assert.Equal("true", autoSelect.Find("[x-data='velleAutoSelect']").GetAttribute("data-velle-autoselect-always"));

        var hotkey = Render<VelleHotkey>(p => p
            .Add(x => x.Keys, "mod+k")
            .Add(x => x.Action, VelleHotkeyAction.Focus)
            .AddChildContent("<input />"));
        var hkRoot = hotkey.Find("[x-data='velleHotkey']");
        Assert.Equal("mod+k", hkRoot.GetAttribute("data-velle-hotkey"));
        Assert.Equal("focus", hkRoot.GetAttribute("data-velle-hotkey-action"));

        var toggle = Render<VelleToggleClass>(p => p
            .Add(x => x.ClassName, "is-open")
            .Add(x => x.TargetSelector, "#panel")
            .AddChildContent("<button x-on:click=\"toggle\">Go</button>"));
        var tgRoot = toggle.Find("[x-data='velleToggleClass']");
        Assert.Equal("is-open", tgRoot.GetAttribute("data-velle-toggle-class"));
        Assert.Equal("#panel", tgRoot.GetAttribute("data-velle-toggle-target"));
    }
}
