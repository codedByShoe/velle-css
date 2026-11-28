using Microsoft.AspNetCore.Components;

namespace Velle.Blazor.Tests;

public sealed class VelleDialogTests : BunitContext
{
    [Fact]
    public void RendersDefaultTriggerDialogAndCloseButton()
    {
        var cut = Render<VelleDialog>(parameters => parameters
            .Add(p => p.Id, "profile-dialog")
            .Add(p => p.Title, "Edit profile")
            .Add(p => p.TriggerText, "Open profile")
            .AddChildContent("<p>Dialog body</p>"));

        var root = cut.Find("div[x-data='velleDialog']");
        Assert.Equal("refresh", root.GetAttribute("x-on:velle-enhanced-load.window"));

        var trigger = cut.Find("button[aria-haspopup='dialog']");
        Assert.Equal("btn", trigger.GetAttribute("class"));
        Assert.Equal("profile-dialog", trigger.GetAttribute("aria-controls"));
        Assert.Equal("show", trigger.GetAttribute("x-on:click"));
        Assert.Equal("Open profile", trigger.TextContent.Trim());

        var dialog = cut.Find("dialog#profile-dialog");
        Assert.Equal("dialog", dialog.GetAttribute("class"));
        Assert.Equal("profile-dialog-title", dialog.GetAttribute("aria-labelledby"));
        Assert.Equal("false", dialog.GetAttribute("data-velle-open"));
        Assert.Equal("close", dialog.GetAttribute("x-on:click.self"));
        Assert.Equal("onClose", dialog.GetAttribute("x-on:close"));

        var heading = cut.Find("h2#profile-dialog-title");
        Assert.Equal("Edit profile", heading.TextContent);
        Assert.Contains("Dialog body", dialog.InnerHtml);

        var closeButton = dialog.QuerySelector("button[x-on\\:click='close']");
        Assert.NotNull(closeButton);
        Assert.Equal("Close", closeButton.TextContent.Trim());
    }

    [Fact]
    public void RendersOpenStateWhenOpenIsTrue()
    {
        var cut = Render<VelleDialog>(parameters => parameters
            .Add(p => p.Id, "alert-dialog")
            .Add(p => p.Title, "Notice")
            .Add(p => p.TriggerText, "Open")
            .Add(p => p.Open, true));

        Assert.Equal("true", cut.Find("dialog#alert-dialog").GetAttribute("data-velle-open"));
    }

    [Fact]
    public void RendersCustomTriggerClassCloseTextAndCanHideCloseButton()
    {
        var cut = Render<VelleDialog>(parameters => parameters
            .Add(p => p.Id, "confirm-dialog")
            .Add(p => p.Title, "Confirm")
            .Add(p => p.TriggerText, "Delete")
            .Add(p => p.TriggerClass, "btn--negative")
            .Add(p => p.ShowCloseButton, false));

        Assert.Equal("btn btn--negative", cut.Find("button[aria-haspopup='dialog']").GetAttribute("class"));
        Assert.Null(cut.Find("dialog").QuerySelector("button[x-on\\:click='close']"));

        var customClose = Render<VelleDialog>(parameters => parameters
            .Add(p => p.Id, "dismiss-dialog")
            .Add(p => p.Title, "Dismiss")
            .Add(p => p.TriggerText, "Show")
            .Add(p => p.CloseText, "Dismiss"));

        Assert.Equal("Dismiss", customClose.Find("dialog button[x-on\\:click='close']").TextContent.Trim());
    }

    [Fact]
    public void RendersCustomTriggerAndFooterFragments()
    {
        RenderFragment trigger = builder =>
        {
            builder.OpenElement(0, "button");
            builder.AddAttribute(1, "type", "button");
            builder.AddAttribute(2, "class", "custom-trigger");
            builder.AddAttribute(3, "x-on:click", "show");
            builder.AddContent(4, "Custom Open");
            builder.CloseElement();
        };

        RenderFragment footer = builder =>
        {
            builder.OpenElement(0, "div");
            builder.AddAttribute(1, "class", "custom-footer");
            builder.AddContent(2, "Footer Actions");
            builder.CloseElement();
        };

        var cut = Render<VelleDialog>(parameters => parameters
            .Add(p => p.Id, "custom-dialog")
            .Add(p => p.Title, "Custom")
            .Add(p => p.TriggerText, "Ignored")
            .Add(p => p.Trigger, trigger)
            .Add(p => p.Footer, footer));

        Assert.Empty(cut.FindAll("button[aria-haspopup='dialog']"));
        Assert.Equal("Custom Open", cut.Find("button.custom-trigger").TextContent);
        Assert.Equal("Footer Actions", cut.Find("div.custom-footer").TextContent);
        Assert.Empty(cut.FindAll("dialog button[x-on\\:click='close']"));
    }

    [Fact]
    public void OmitsTriggerButtonWhenBothTriggerAndTriggerTextAreMissing()
    {
        var cut = Render<VelleDialog>(parameters => parameters
            .Add(p => p.Id, "server-dialog")
            .Add(p => p.Title, "Server controlled")
            .Add(p => p.Open, true));

        Assert.Empty(cut.FindAll("button[aria-haspopup='dialog']"));
        Assert.Equal("true", cut.Find("dialog#server-dialog").GetAttribute("data-velle-open"));
    }

    [Fact]
    public void MergesClassAndSplatsAdditionalAttributesWithoutOverridingId()
    {
        var cut = Render<VelleDialog>(parameters => parameters
            .Add(p => p.Id, "styled-dialog")
            .Add(p => p.Title, "Styled")
            .Add(p => p.TriggerText, "Open")
            .Add(p => p.Class, "dialog--wide")
            .Add(p => p.AdditionalAttributes, new Dictionary<string, object>
            {
                ["class"] = "extra-class",
                ["id"] = "ignored-id",
                ["data-testid"] = "profile-modal",
                ["aria-describedby"] = "profile-help",
            }));

        var dialog = cut.Find("dialog");
        Assert.Equal("styled-dialog", dialog.GetAttribute("id"));
        Assert.Equal("dialog dialog--wide extra-class", dialog.GetAttribute("class"));
        Assert.Equal("profile-modal", dialog.GetAttribute("data-testid"));
        Assert.Equal("profile-help", dialog.GetAttribute("aria-describedby"));
    }
}
