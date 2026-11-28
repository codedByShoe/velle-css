using Microsoft.AspNetCore.Components;

namespace Velle.Blazor.Tests;

public sealed class VelleTabsTests : BunitContext
{
    private static IReadOnlyList<VelleTab> SampleTabs =>
    [
        new("Overview", Text("Overview panel")),
        new("Settings", Text("Settings panel")),
    ];

    private static RenderFragment Text(string content) => builder => builder.AddContent(0, content);

    [Fact]
    public void RendersTabsAndPanelsWithDefaultSelection()
    {
        var cut = Render<VelleTabs>(parameters => parameters
            .Add(p => p.Id, "account-tabs")
            .Add(p => p.Label, "Account sections")
            .Add(p => p.Items, SampleTabs));

        var root = cut.Find("div#account-tabs");
        Assert.Equal("tabs", root.GetAttribute("class"));
        Assert.Equal("0", root.GetAttribute("data-velle-selected"));
        Assert.Equal("velleTabs", root.GetAttribute("x-data"));

        var tablist = cut.Find("[role='tablist']");
        Assert.Equal("Account sections", tablist.GetAttribute("aria-label"));

        var buttons = cut.FindAll("button[role='tab']");
        Assert.Equal(2, buttons.Count);
        Assert.Equal("account-tabs-tab-0", buttons[0].GetAttribute("id"));
        Assert.Equal("true", buttons[0].GetAttribute("aria-selected"));
        Assert.Equal("0", buttons[0].GetAttribute("tabindex"));
        Assert.Equal("account-tabs-panel-0", buttons[0].GetAttribute("aria-controls"));

        Assert.Equal("account-tabs-tab-1", buttons[1].GetAttribute("id"));
        Assert.Equal("false", buttons[1].GetAttribute("aria-selected"));
        Assert.Equal("-1", buttons[1].GetAttribute("tabindex"));

        var panels = cut.FindAll("div[role='tabpanel']");
        Assert.Equal(2, panels.Count);
        Assert.False(panels[0].HasAttribute("hidden"));
        Assert.Equal("Overview panel", panels[0].TextContent.Trim());
        Assert.True(panels[1].HasAttribute("hidden"));
        Assert.Equal("Settings panel", panels[1].TextContent.Trim());
    }

    [Theory]
    [InlineData(-5, 0)]
    [InlineData(1, 1)]
    [InlineData(99, 1)]
    public void ClampsSelectedIndexToValidBounds(int requestedIndex, int expectedIndex)
    {
        var cut = Render<VelleTabs>(parameters => parameters
            .Add(p => p.Id, "clamped-tabs")
            .Add(p => p.Label, "Clamped")
            .Add(p => p.Items, SampleTabs)
            .Add(p => p.SelectedIndex, requestedIndex));

        Assert.Equal(expectedIndex.ToString(), cut.Find("div#clamped-tabs").GetAttribute("data-velle-selected"));

        var buttons = cut.FindAll("button[role='tab']");
        Assert.Equal("true", buttons[expectedIndex].GetAttribute("aria-selected"));
        Assert.Equal("0", buttons[expectedIndex].GetAttribute("tabindex"));

        var panels = cut.FindAll("div[role='tabpanel']");
        Assert.False(panels[expectedIndex].HasAttribute("hidden"));
    }

    [Fact]
    public void HandlesEmptyItemsGracefully()
    {
        var cut = Render<VelleTabs>(parameters => parameters
            .Add(p => p.Id, "empty-tabs")
            .Add(p => p.Label, "Empty")
            .Add(p => p.Items, Array.Empty<VelleTab>())
            .Add(p => p.SelectedIndex, 3));

        Assert.Equal("0", cut.Find("div#empty-tabs").GetAttribute("data-velle-selected"));
        Assert.Empty(cut.FindAll("button[role='tab']"));
        Assert.Empty(cut.FindAll("div[role='tabpanel']"));
    }

    [Fact]
    public void MergesClassAndSplatsAdditionalAttributesWithoutOverridingId()
    {
        var cut = Render<VelleTabs>(parameters => parameters
            .Add(p => p.Id, "styled-tabs")
            .Add(p => p.Label, "Styled")
            .Add(p => p.Items, SampleTabs)
            .Add(p => p.Class, "tabs--compact")
            .Add(p => p.AdditionalAttributes, new Dictionary<string, object>
            {
                ["class"] = "custom-tabs",
                ["id"] = "ignored-id",
                ["data-testid"] = "settings-tabs",
            }));

        var root = cut.Find("div[x-data='velleTabs']");
        Assert.Equal("styled-tabs", root.GetAttribute("id"));
        Assert.Equal("tabs tabs--compact custom-tabs", root.GetAttribute("class"));
        Assert.Equal("settings-tabs", root.GetAttribute("data-testid"));
    }
}
