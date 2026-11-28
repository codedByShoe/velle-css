using Microsoft.AspNetCore.Components.Forms;

namespace Velle.Blazor.Tests;

public sealed class VelleFormControlsTests : BunitContext
{
    private sealed class SettingsModel
    {
        public string? Email { get; set; }
        public string? Bio { get; set; }
        public bool Notifications { get; set; }
        public bool Bookmark { get; set; }
        public string? Framework { get; set; }
    }

    [Fact]
    public void VelleInputRendersTextTextareaCheckboxAndEditContextValidation()
    {
        var model = new SettingsModel { Email = "ada@example.com", Bio = "Mathematician", Notifications = true };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(SettingsModel.Email)), "Invalid email.");

        var emailCut = Render<VelleInput>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Email")
            .Add(x => x.Label, "Email")
            .Add(x => x.Description, "Used for sign-in.")
            .Add(x => x.Type, "email")
            .Add(x => x.For, () => model.Email));

        var emailInput = emailCut.Find("input#input-email");
        Assert.Equal("email", emailInput.GetAttribute("type"));
        Assert.Equal("ada@example.com", emailInput.GetAttribute("value"));
        Assert.Equal("true", emailInput.GetAttribute("aria-invalid"));
        Assert.Contains("invalid", emailInput.GetAttribute("class")!.Split(' '));
        Assert.Equal("Used for sign-in.", emailCut.Find("p.text-subtle").TextContent);

        var bioCut = Render<VelleInput>(p => p
            .Add(x => x.Name, "Input.Bio")
            .Add(x => x.Label, "Bio")
            .Add(x => x.Multiline, true)
            .Add(x => x.Rows, 4)
            .Add(x => x.For, () => model.Bio));
        var textarea = bioCut.Find("textarea#input-bio");
        Assert.Equal("4", textarea.GetAttribute("rows"));
        Assert.Equal("Mathematician", textarea.TextContent);

        var checkCut = Render<VelleInput>(p => p
            .Add(x => x.Name, "Input.Notifications")
            .Add(x => x.Type, "checkbox")
            .Add(x => x.For, () => model.Notifications));
        Assert.True(checkCut.Find("input[type='checkbox']").HasAttribute("checked"));
    }

    [Fact]
    public void VelleSwitchRendersRoleSwitchSizesDescriptionHiddenFallbackAndValidation()
    {
        var model = new SettingsModel { Notifications = true };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(SettingsModel.Notifications)), "Required.");

        var cut = Render<VelleSwitch>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Notifications")
            .Add(x => x.Label, "Enable notifications")
            .Add(x => x.Description, "Receive email updates.")
            .Add(x => x.Size, VelleSwitchSize.Small)
            .Add(x => x.For, () => model.Notifications));

        var input = cut.Find("input[role='switch']");
        Assert.Equal("input-notifications", input.GetAttribute("id"));
        Assert.True(input.HasAttribute("checked"));
        Assert.Equal("true", input.GetAttribute("aria-invalid"));
        Assert.Contains("switch--sm", input.GetAttribute("class")!.Split(' '));
        Assert.Contains("invalid", input.GetAttribute("class")!.Split(' '));
        Assert.Equal("false", cut.Find("input[type='hidden'][name='Input.Notifications']").GetAttribute("value"));
        Assert.Equal("Receive email updates.", cut.Find("p.text-subtle").TextContent);
    }

    [Fact]
    public void VelleToggleRendersCheckboxInsideToggleLabelWithValidation()
    {
        var model = new SettingsModel { Bookmark = true };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(SettingsModel.Bookmark)), "Invalid.");

        var cut = Render<VelleToggle>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Bookmark")
            .Add(x => x.For, () => model.Bookmark)
            .AddChildContent("Bookmark"));

        var label = cut.Find("label.btn.btn--toggle");
        Assert.Contains("invalid", label.GetAttribute("class")!.Split(' '));
        var checkbox = cut.Find("input[type='checkbox']");
        Assert.Equal("input-bookmark", checkbox.GetAttribute("id"));
        Assert.True(checkbox.HasAttribute("checked"));
        Assert.Equal("true", checkbox.GetAttribute("aria-invalid"));
        Assert.Equal("false", cut.Find("input[type='hidden'][name='Input.Bookmark']").GetAttribute("value"));
    }

    [Fact]
    public void VelleComboboxRendersOptionsGroupsPlaceholderSelectionAndValidation()
    {
        var model = new SettingsModel { Framework = "blazor" };
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(SettingsModel.Framework)), "Select a framework.");

        var options = new VelleSelectOption[]
        {
            new("blazor", "Blazor", Group: ".NET"),
            new("razor-pages", "Razor Pages", Group: ".NET"),
            new("legacy", "Legacy", Disabled: true, Group: "Other"),
        };

        var cut = Render<VelleCombobox>(p => p
            .AddCascadingValue(editContext)
            .Add(x => x.Name, "Input.Framework")
            .Add(x => x.Label, "Framework")
            .Add(x => x.Placeholder, "Choose one...")
            .Add(x => x.For, () => model.Framework)
            .Add(x => x.Options, options));

        var select = cut.Find("select#input-framework");
        Assert.Contains("combobox", select.GetAttribute("class")!.Split(' '));
        Assert.Contains("invalid", select.GetAttribute("class")!.Split(' '));
        Assert.Equal("true", select.GetAttribute("aria-invalid"));
        Assert.Equal(2, cut.FindAll("optgroup").Count);
        Assert.True(cut.Find("option[value='blazor']").HasAttribute("selected"));
        Assert.True(cut.Find("option[value='legacy']").HasAttribute("disabled"));
        Assert.Equal("Choose one...", cut.Find("option[value='']").TextContent);
    }
}
