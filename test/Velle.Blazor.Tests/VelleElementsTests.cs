using Microsoft.AspNetCore.Components;

namespace Velle.Blazor.Tests;

public sealed class VelleElementsTests : BunitContext
{
    private static RenderFragment Text(string text) => builder => builder.AddContent(0, text);

    [Fact]
    public void VelleButtonRendersVariantsSizesModifiersAndLinkMode()
    {
        var cut = Render<VelleButton>(p => p
            .Add(x => x.Variant, VelleButtonVariant.Primary)
            .Add(x => x.Size, VelleButtonSize.Small)
            .Add(x => x.Type, "submit")
            .Add(x => x.Feedback, true)
            .Add(x => x.Busy, true)
            .Add(x => x.Class, "custom-btn")
            .AddChildContent("Save"));

        var button = cut.Find("button");
        Assert.Equal("submit", button.GetAttribute("type"));
        Assert.Equal("btn btn--primary btn--sm btn--feedback btn--busy custom-btn", button.GetAttribute("class"));
        Assert.Equal("Save", button.TextContent.Trim());

        var iconButton = Render<VelleButton>(p => p
            .Add(x => x.IconOnly, true)
            .Add(x => x.Size, VelleButtonSize.ExtraSmall)
            .Add(x => x.Variant, VelleButtonVariant.Borderless)
            .AddUnmatched("aria-label", "Next"));
        Assert.Equal("btn btn--borderless btn--icon-xs", iconButton.Find("button").GetAttribute("class"));
        Assert.Equal("Next", iconButton.Find("button").GetAttribute("aria-label"));

        var link = Render<VelleButton>(p => p
            .Add(x => x.Href, "/settings")
            .Add(x => x.Variant, VelleButtonVariant.Negative)
            .Add(x => x.Disabled, true)
            .AddChildContent("Delete"));
        var anchor = link.Find("a");
        Assert.Equal("/settings", anchor.GetAttribute("href"));
        Assert.Equal("true", anchor.GetAttribute("aria-disabled"));
        Assert.Equal("btn btn--negative", anchor.GetAttribute("class"));
    }

    [Fact]
    public void VelleAlertRendersVariantsIconTitleAndActionSlot()
    {
        var cut = Render<VelleAlert>(p => p
            .Add(x => x.Variant, VelleAlertVariant.Negative)
            .Add(x => x.Title, "Payment failed")
            .Add(x => x.Icon, "circle-alert")
            .Add(x => x.Action, Text("Retry"))
            .AddChildContent("Check your billing details."));

        var alert = cut.Find("[role='alert']");
        Assert.Contains("alert--negative", alert.GetAttribute("class")!.Split(' '));
        Assert.NotNull(alert.QuerySelector(".icon.icon--circle-alert"));
        Assert.Equal("Payment failed", cut.Find("h5").TextContent);
        Assert.Contains("Check your billing details.", alert.TextContent);
        Assert.Contains("Retry", alert.TextContent);
    }

    [Fact]
    public void VelleBadgeRendersSpanAndLinkVariants()
    {
        var spanBadge = Render<VelleBadge>(p => p
            .Add(x => x.Variant, VelleBadgeVariant.Secondary)
            .AddChildContent("Beta"));
        Assert.Equal("badge badge--secondary", spanBadge.Find("span").GetAttribute("class"));
        Assert.Equal("Beta", spanBadge.Find("span").TextContent.Trim());

        var linkBadge = Render<VelleBadge>(p => p
            .Add(x => x.Variant, VelleBadgeVariant.Primary)
            .Add(x => x.Href, "/docs")
            .AddChildContent("Docs"));
        var anchor = linkBadge.Find("a");
        Assert.Equal("/docs", anchor.GetAttribute("href"));
        Assert.Equal("badge badge--primary", anchor.GetAttribute("class"));
    }

    [Fact]
    public void VelleCardRendersTitleDescriptionFooterAndCustomHeader()
    {
        var cut = Render<VelleCard>(p => p
            .Add(x => x.Title, "Sign in")
            .Add(x => x.Description, "Enter your email.")
            .AddChildContent("<p>Body</p>")
            .Add(x => x.Footer, Text("Footer action"))
            .Add(x => x.FooterClass, "flex justify-end"));

        Assert.Equal("Sign in", cut.Find("h3").TextContent);
        Assert.Equal("Enter your email.", cut.Find("p.text-subtle").TextContent);
        var footer = cut.Find("div.card__footer");
        Assert.Equal("card__footer flex justify-end", footer.GetAttribute("class"));
        Assert.Equal("Footer action", footer.TextContent);

        var custom = Render<VelleCard>(p => p
            .Add(x => x.Title, "Ignored")
            .Add(x => x.Header, Text("Custom header")));
        Assert.Empty(custom.FindAll("h3"));
        Assert.Contains("Custom header", custom.Markup);
    }

    [Fact]
    public void VelleAccordionRendersDetailsWithGroupOpenAndDisabledState()
    {
        var items = new VelleAccordionItem[]
        {
            new("First", Text("Body 1"), Open: true),
            new("Locked", Text("Body 2"), Disabled: true),
        };

        var cut = Render<VelleAccordion>(p => p
            .Add(x => x.GroupName, "faq")
            .Add(x => x.Items, items));

        var details = cut.FindAll("details");
        Assert.Equal(2, details.Count);
        Assert.All(details, d => Assert.Equal("faq", d.GetAttribute("name")));
        Assert.True(details[0].HasAttribute("open"));
        Assert.False(details[1].HasAttribute("open"));
        Assert.Equal("true", details[1].QuerySelector("summary")!.GetAttribute("aria-disabled"));
        Assert.Equal("-1", details[1].QuerySelector("summary")!.GetAttribute("tabindex"));
    }

    [Fact]
    public void VelleAvatarAndGroupRenderImagesInitialsSizesAndBadges()
    {
        var imageAvatar = Render<VelleAvatar>(p => p
            .Add(x => x.Src, "/img/ada.png")
            .Add(x => x.Alt, "Ada Lovelace")
            .Add(x => x.Size, VelleAvatarSize.Large)
            .Add(x => x.BadgeColor, "var(--green-600)")
            .Add(x => x.BadgeLabel, "Online"));

        Assert.Equal("avatar avatar--lg", imageAvatar.Find("div.avatar").GetAttribute("class"));
        Assert.Equal("/img/ada.png", imageAvatar.Find("img").GetAttribute("src"));
        var badge = imageAvatar.Find(".avatar__badge");
        Assert.Equal("Online", badge.GetAttribute("aria-label"));
        Assert.Contains("--avatar-badge-color: var(--green-600)", badge.GetAttribute("style"));

        var initialsAvatar = Render<VelleAvatar>(p => p
            .Add(x => x.Initials, "AL")
            .Add(x => x.Size, VelleAvatarSize.Small));
        Assert.Equal("avatar avatar--sm", initialsAvatar.Find("div.avatar").GetAttribute("class"));
        Assert.Equal("AL", initialsAvatar.Find("span[role='img']").TextContent);

        var group = Render<VelleAvatarGroup>(p => p.AddChildContent("<div class=\"avatar\"></div>"));
        Assert.Equal("avatar-group", group.Find("div.avatar-group").GetAttribute("class"));
    }

    [Fact]
    public void VelleBreadcrumbRendersLinksSeparatorsAndCurrentPage()
    {
        var items = new VelleBreadcrumbItem[]
        {
            new("Home", "/"),
            new("Components", "/components"),
            new("Button"),
        };

        var cut = Render<VelleBreadcrumb>(p => p.Add(x => x.Items, items));

        Assert.Equal("Breadcrumb", cut.Find("nav.breadcrumb").GetAttribute("aria-label"));
        Assert.Equal(2, cut.FindAll("a").Count);
        Assert.Equal(2, cut.FindAll(".icon--chevron-right").Count);
        var current = cut.Find("[aria-current='page']");
        Assert.Equal("Button", current.TextContent);
    }

    [Fact]
    public void VellePaginationRendersBoundsWindowEllipsisAndIconsOnly()
    {
        var cut = Render<VellePagination>(p => p
            .Add(x => x.CurrentPage, 5)
            .Add(x => x.TotalPages, 10)
            .Add(x => x.PageUrl, page => $"?page={page}"));

        Assert.Equal("?page=4", cut.Find("a[aria-label='Previous page']").GetAttribute("href"));
        Assert.Equal("?page=6", cut.Find("a[aria-label='Next page']").GetAttribute("href"));
        Assert.Equal("5", cut.Find("a[aria-current='page']").TextContent.Trim());
        Assert.Equal(2, cut.FindAll(".icon--ellipsis").Count);

        var firstPage = Render<VellePagination>(p => p
            .Add(x => x.CurrentPage, 1)
            .Add(x => x.TotalPages, 3)
            .Add(x => x.IconsOnly, true)
            .Add(x => x.PageUrl, page => $"?page={page}"));
        Assert.Equal("true", firstPage.Find("span[aria-label='Previous page']").GetAttribute("aria-disabled"));
        Assert.Contains("btn--icon", firstPage.Find("a[aria-label='Next page']").GetAttribute("class")!.Split(' '));
    }

    [Fact]
    public void VelleProgressRendersDeterminateIndeterminateAndLabeledModes()
    {
        var labeled = Render<VelleProgress>(p => p
            .Add(x => x.Value, 56)
            .Add(x => x.Max, 100)
            .Add(x => x.Label, "Upload progress")
            .Add(x => x.ShowValue, true));
        Assert.Contains("56%", labeled.Markup);
        Assert.Equal("56", labeled.Find("progress").GetAttribute("value"));
        Assert.Equal("upload-progress-label", labeled.Find("progress").GetAttribute("aria-labelledby"));

        var indeterminate = Render<VelleProgress>(p => p.Add(x => x.Label, "Loading"));
        Assert.False(indeterminate.Find("progress").HasAttribute("value"));
        Assert.Equal("Loading", indeterminate.Find("progress").GetAttribute("aria-label"));
    }

    [Fact]
    public void VelleSeparatorSkeletonIconKbdGroupTableAndListRenderExpectedMarkup()
    {
        var sep = Render<VelleSeparator>(p => p.Add(x => x.Orientation, VelleOrientation.Vertical));
        Assert.Equal("separator-vertical", sep.Find("span").GetAttribute("class"));

        var skel = Render<VelleSkeleton>(p => p
            .Add(x => x.Width, "10rem")
            .Add(x => x.Height, "2rem")
            .Add(x => x.Rounded, true));
        Assert.Equal("skeleton rounded-full", skel.Find("div").GetAttribute("class"));
        Assert.Equal("inline-size: 10rem; block-size: 2rem", skel.Find("div").GetAttribute("style"));

        var decorativeIcon = Render<VelleIcon>(p => p.Add(x => x.Name, "search"));
        Assert.Equal("true", decorativeIcon.Find("span").GetAttribute("aria-hidden"));
        var labeledIcon = Render<VelleIcon>(p => p.Add(x => x.Name, "circle-check").Add(x => x.Label, "Verified"));
        Assert.Equal("img", labeledIcon.Find("span").GetAttribute("role"));
        Assert.Equal("Verified", labeledIcon.Find("span").GetAttribute("aria-label"));

        var kbd = Render<VelleKbd>(p => p.Add(x => x.Tooltip, true).AddChildContent("⌘ K"));
        Assert.Equal("kbd kbd--tooltip", kbd.Find("kbd").GetAttribute("class"));

        var group = Render<VelleGroup>(p => p
            .Add(x => x.Orientation, VelleOrientation.Vertical)
            .Add(x => x.Label, "Actions")
            .AddChildContent("<button class=\"btn\">One</button>"));
        Assert.Equal("group-vertical", group.Find("[role='group']").GetAttribute("class"));
        Assert.Equal("Actions", group.Find("[role='group']").GetAttribute("aria-label"));

        var table = Render<VelleTable>(p => p
            .Add(x => x.Caption, "Invoices")
            .Add(x => x.Header, Text("<tr><th>ID</th></tr>"))
            .Add(x => x.Body, Text("<tr><td>INV-1</td></tr>"))
            .Add(x => x.Footer, Text("<tr><td>1 row</td></tr>")));
        Assert.Equal("Invoices", table.Find("caption").TextContent);
        Assert.NotNull(table.Find("thead"));
        Assert.NotNull(table.Find("tbody"));
        Assert.NotNull(table.Find("tfoot"));

        var list = Render<VelleList>(p => p.AddChildContent<VelleListRow>(row => row
            .Add(r => r.Variant, VelleListRowVariant.Muted)
            .Add(r => r.Href, "/docs")
            .Add(r => r.Title, "Documentation")
            .Add(r => r.Description, "Read the guide")
            .Add(r => r.Icon, "circle-check")));
        var rowLink = list.Find("a.list-row");
        Assert.Contains("list-row--muted", rowLink.GetAttribute("class")!.Split(' '));
        Assert.Contains("list-row--link", rowLink.GetAttribute("class")!.Split(' '));
        Assert.Contains("Documentation", rowLink.TextContent);

        var selectableRow = Render<VelleListRow>(row => row
            .Add(r => r.Selectable, true)
            .Add(r => r.Title, "Alerts"));
        Assert.Contains("list-row--check", selectableRow.Find("label.list-row").GetAttribute("class")!.Split(' '));
    }
}
