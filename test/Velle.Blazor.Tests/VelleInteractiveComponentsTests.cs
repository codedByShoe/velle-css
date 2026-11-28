using Microsoft.AspNetCore.Components.Forms;

namespace Velle.Blazor.Tests;

public sealed class VelleInteractiveComponentsTests : BunitContext
{
    private sealed class AccountInput
    {
        public string? Query { get; set; }
        public string? Password { get; set; }
        public string? Code { get; set; }
    }

    [Fact]
    public void VelleSheetRendersSidesTriggerHeaderCloseAndOpenState()
    {
        var cut = Render<VelleSheet>(p => p
            .Add(x => x.Id, "nav-sheet")
            .Add(x => x.Side, VelleSheetSide.Left)
            .Add(x => x.Title, "Navigation")
            .Add(x => x.Description, "Jump to any section.")
            .Add(x => x.TriggerText, "Open menu")
            .Add(x => x.Open, true)
            .AddChildContent("<p>Sheet body</p>"));

        var trigger = cut.Find("button[aria-haspopup='dialog']");
        Assert.Equal("nav-sheet", trigger.GetAttribute("aria-controls"));
        Assert.Equal("show", trigger.GetAttribute("x-on:click"));

        var dialog = cut.Find("dialog#nav-sheet");
        Assert.Equal("sheet sheet--left", dialog.GetAttribute("class"));
        Assert.Equal("true", dialog.GetAttribute("data-velle-open"));
        Assert.Equal("nav-sheet-title", dialog.GetAttribute("aria-labelledby"));
        Assert.Equal("nav-sheet-description", dialog.GetAttribute("aria-describedby"));
        Assert.NotNull(dialog.QuerySelector("button.sheet__close"));
        Assert.Equal("Navigation", cut.Find("h3#nav-sheet-title").TextContent);
        Assert.Equal("Jump to any section.", cut.Find("p#nav-sheet-description").TextContent);
    }

    [Fact]
    public void VellePopoverRendersClickAndHoverModesWithPlacements()
    {
        var clickCut = Render<VellePopover>(p => p
            .Add(x => x.Id, "info-popover")
            .Add(x => x.TriggerText, "Info")
            .Add(x => x.Placement, VellePopoverPlacement.BlockStartEnd)
            .Add(x => x.Label, "More info")
            .AddChildContent("<p>Details</p>"));

        Assert.Equal("info-popover", clickCut.Find("button").GetAttribute("popovertarget"));
        var popover = clickCut.Find("div#info-popover");
        Assert.Equal("popover popover--block-start-end", popover.GetAttribute("class"));
        Assert.Equal("auto", popover.GetAttribute("popover"));
        Assert.Equal("More info", popover.GetAttribute("aria-label"));

        var hoverCut = Render<VellePopover>(p => p
            .Add(x => x.Id, "tip-popover")
            .Add(x => x.TriggerText, "Hover me")
            .Add(x => x.TriggerMode, VellePopoverTrigger.Hover)
            .Add(x => x.PopoverMode, "hint")
            .Add(x => x.Role, "tooltip")
            .AddChildContent("Tooltip text"));

        Assert.NotNull(hoverCut.Find("[x-data='velleHoverPopover']"));
        Assert.Equal("show", hoverCut.Find("button").GetAttribute("x-on:mouseenter"));
        Assert.Equal("hide", hoverCut.Find("button").GetAttribute("x-on:mouseleave"));
        Assert.Equal("hint", hoverCut.Find("div#tip-popover").GetAttribute("popover"));
        Assert.Equal("tooltip", hoverCut.Find("div#tip-popover").GetAttribute("role"));
    }

    [Fact]
    public void VelleDropdownAndMenuRenderTriggerPopoverRovingItemsAndDisabledState()
    {
        var cut = Render<VelleDropdown>(p => p
            .Add(x => x.Id, "account-menu")
            .Add(x => x.Label, "Account")
            .Add(x => x.TriggerText, "Account")
            .Add(x => x.Placement, VellePopoverPlacement.BlockEndEnd)
            .AddChildContent(builder =>
            {
                builder.OpenComponent<VelleMenuHeader>(0);
                builder.AddAttribute(1, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "My Account")));
                builder.CloseComponent();

                builder.OpenComponent<VelleMenuItem>(2);
                builder.AddAttribute(3, "Icon", "copy");
                builder.AddAttribute(4, "Shortcut", "⌘C");
                builder.AddAttribute(5, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Copy")));
                builder.CloseComponent();

                builder.OpenComponent<VelleMenuSeparator>(6);
                builder.CloseComponent();

                builder.OpenComponent<VelleMenuItem>(7);
                builder.AddAttribute(8, "Href", "/profile");
                builder.AddAttribute(9, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Profile")));
                builder.CloseComponent();

                builder.OpenComponent<VelleMenuItem>(10);
                builder.AddAttribute(11, "Disabled", true);
                builder.AddAttribute(12, "ChildContent", (Microsoft.AspNetCore.Components.RenderFragment)(b => b.AddContent(0, "Locked")));
                builder.CloseComponent();
            }));

        Assert.Equal("account-menu", cut.Find("button[aria-haspopup='true']").GetAttribute("popovertarget"));
        var popover = cut.Find("div#account-menu[role='menu']");
        Assert.Equal("popover popover--block-end-end", popover.GetAttribute("class"));
        Assert.NotNull(cut.Find("div.menu[x-data='velleMenu']"));
        Assert.Equal("My Account", cut.Find(".menu__header").TextContent);
        Assert.NotNull(cut.Find("hr.menu__separator"));

        var items = cut.FindAll("[role='menuitem']");
        Assert.Equal(3, items.Count);
        Assert.Equal("account-menu", items[0].GetAttribute("popovertarget"));
        Assert.True(items[0].HasAttribute("data-velle-menu-item"));
        Assert.Equal("⌘C", items[0].QuerySelector(".menu__item-key")!.TextContent);
        Assert.Equal("/profile", items[1].GetAttribute("href"));
        Assert.True(items[1].HasAttribute("data-velle-menu-item"));
        Assert.Equal("true", items[2].GetAttribute("aria-disabled"));
        Assert.False(items[2].HasAttribute("data-velle-menu-item"));
    }

    [Fact]
    public void VelleFlashRendersManualPopoverAlpineHookIconAndExtendedModifier()
    {
        var cut = Render<VelleFlash>(p => p
            .Add(x => x.Message, "Saved successfully")
            .Add(x => x.Icon, "circle-check")
            .Add(x => x.Extended, true));

        var flash = cut.Find("div.flash");
        Assert.Equal("manual", flash.GetAttribute("popover"));
        Assert.Equal("velleFlash", flash.GetAttribute("x-data"));
        Assert.Equal("hide", flash.GetAttribute("x-on:animationend"));
        Assert.Contains("flash--extended", flash.GetAttribute("class")!.Split(' '));
        Assert.NotNull(flash.QuerySelector(".icon.icon--circle-check"));
        Assert.Contains("Saved successfully", flash.TextContent);
    }

    [Fact]
    public void VelleColorSchemeRendersSunMoonTriggerAndThemeMenuButtons()
    {
        var cut = Render<VelleColorScheme>(p => p.Add(x => x.Id, "site-theme"));

        Assert.NotNull(cut.Find("[x-data='velleColorScheme']"));
        Assert.Equal("site-theme", cut.Find("button[aria-haspopup='true']").GetAttribute("popovertarget"));
        Assert.NotNull(cut.Find(".icon--color-scheme-light"));
        Assert.NotNull(cut.Find(".icon--color-scheme-dark"));
        Assert.Equal("setLight", cut.Find("button[x-on\\:click='setLight']").GetAttribute("x-on:click"));
        Assert.Equal("setDark", cut.Find("button[x-on\\:click='setDark']").GetAttribute("x-on:click"));
        Assert.Equal("setSystem", cut.Find("button[x-on\\:click='setSystem']").GetAttribute("x-on:click"));
    }

    [Fact]
    public void VelleInputClearableCopyableRevealableAndOtpRenderAlpineAndValidationState()
    {
        var model = new AccountInput { Query = "blazor", Password = "secret", Code = "1234" };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(AccountInput.Query)), "Invalid query.");
        messages.Add(editContext.Field(nameof(AccountInput.Password)), "Weak password.");
        messages.Add(editContext.Field(nameof(AccountInput.Code)), "Code expired.");

        var clearable = Render<VelleInputClearable>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Query")
            .Add(x => x.Label, "Search")
            .Add(x => x.For, () => model.Query));
        Assert.NotNull(clearable.Find(".input--clearable[x-data='velleInputClearable']"));
        var clearInput = clearable.Find("input#input-query");
        Assert.Equal("blazor", clearInput.GetAttribute("value"));
        Assert.Equal(" ", clearInput.GetAttribute("placeholder"));
        Assert.Equal("true", clearInput.GetAttribute("aria-invalid"));
        Assert.Equal("clear", clearable.Find("button").GetAttribute("x-on:click"));

        var copyable = Render<VelleInputCopyable>(p => p
            .Add(x => x.Name, "ApiKey")
            .Add(x => x.Label, "API key")
            .Add(x => x.Value, "sk_test_123"));
        Assert.NotNull(copyable.Find("[x-data='velleInputCopyable']"));
        var copyInput = copyable.Find("input#apikey");
        Assert.True(copyInput.HasAttribute("readonly"));
        Assert.Equal("sk_test_123", copyInput.GetAttribute("value"));
        Assert.Equal("copy", copyable.Find("button").GetAttribute("x-on:click"));

        var revealable = Render<VelleInputRevealable>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Password")
            .Add(x => x.Label, "Password")
            .Add(x => x.For, () => model.Password));
        Assert.NotNull(revealable.Find(".input--revealable[x-data='velleInputRevealable']"));
        var pwdInput = revealable.Find("input#input-password");
        Assert.Equal("password", pwdInput.GetAttribute("type"));
        Assert.Equal("true", pwdInput.GetAttribute("aria-invalid"));
        Assert.Equal("reveal", revealable.Find("button").GetAttribute("x-on:click"));

        var otp = Render<VelleInputOtp>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Code")
            .Add(x => x.Label, "Verification code")
            .Add(x => x.Length, 6)
            .Add(x => x.GroupSize, 3)
            .Add(x => x.Pattern, VelleOtpPattern.DigitsAndChars)
            .Add(x => x.Large, true)
            .Add(x => x.For, () => model.Code));

        var otpRoot = otp.Find(".input-otp[x-data='velleInputOtp']");
        Assert.Contains("input-otp--lg", otpRoot.GetAttribute("class")!.Split(' '));
        Assert.Equal("digits-and-chars", otpRoot.GetAttribute("data-velle-otp-pattern"));
        Assert.Equal(2, otp.FindAll(".input-otp__group").Count);
        Assert.Single(otp.FindAll(".input-otp__separator"));
        var slots = otp.FindAll("[data-velle-otp-slot]");
        Assert.Equal(6, slots.Count);
        Assert.Equal("1", slots[0].TextContent);
        Assert.Equal("4", slots[3].TextContent);
        Assert.Equal("", slots[4].TextContent);
        var otpInput = otp.Find("input#input-code");
        Assert.Equal("6", otpInput.GetAttribute("maxlength"));
        Assert.Equal("one-time-code", otpInput.GetAttribute("autocomplete"));
        Assert.Equal("text", otpInput.GetAttribute("inputmode"));
        Assert.Equal("true", otpInput.GetAttribute("aria-invalid"));
    }
}
