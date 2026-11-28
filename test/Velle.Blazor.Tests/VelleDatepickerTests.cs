using System.Text.Json;
using Microsoft.AspNetCore.Components.Forms;

namespace Velle.Blazor.Tests;

public sealed class VelleDatepickerTests : BunitContext
{
    private sealed class AppointmentModel
    {
        public DateOnly? Date { get; set; }
        public DateTime? Timestamp { get; set; }
        public DateTimeOffset? OffsetTimestamp { get; set; }
        public TimeOnly? Time { get; set; }
        public string? TextDate { get; set; }
    }

    [Fact]
    public void RendersDefaultsAndSerializesOptionsJson()
    {
        var cut = Render<VelleDatepicker>(parameters => parameters
            .Add(p => p.Id, "appointment-date")
            .Add(p => p.Name, "Input.Date")
            .Add(p => p.Label, "Appointment date")
            .Add(p => p.Value, "2030-04-12")
            .Add(p => p.Placeholder, "Select a date"));

        var wrapper = cut.Find("div[x-data='velleDatepicker']");
        Assert.Equal("flex flex-col gap", wrapper.GetAttribute("class"));
        Assert.Equal("refresh", wrapper.GetAttribute("x-on:velle-enhanced-load.window"));

        var label = cut.Find("label");
        Assert.Equal("appointment-date", label.GetAttribute("for"));
        Assert.Equal("Appointment date", label.TextContent);

        var input = cut.Find("input#appointment-date");
        Assert.Equal("Input.Date", input.GetAttribute("name"));
        Assert.Equal("2030-04-12", input.GetAttribute("value"));
        Assert.Equal("Select a date", input.GetAttribute("placeholder"));
        Assert.Equal("input", input.GetAttribute("class"));
        Assert.False(input.HasAttribute("aria-invalid"));

        using var options = JsonDocument.Parse(wrapper.GetAttribute("data-velle-datepicker-options")!);
        Assert.Equal("date", options.RootElement.GetProperty("type").GetString());
        Assert.Equal("single", options.RootElement.GetProperty("mode").GetString());
        Assert.Equal(1, options.RootElement.GetProperty("showMonths").GetInt32());
        Assert.Equal("F d, Y", options.RootElement.GetProperty("dateFormat").GetString());
        Assert.Equal("F d, Y H:i", options.RootElement.GetProperty("dateTimeFormat").GetString());
        Assert.Equal(0, options.RootElement.GetProperty("disable").GetArrayLength());
    }

    [Theory]
    [InlineData("Input.Date", "input-date")]
    [InlineData("Input[0].Start_Date", "input-0-start-date")]
    [InlineData("123Date", "velle-123date")]
    [InlineData("...", "velle-field")]
    public void DerivesStableElementIdFromNameWhenIdIsOmitted(string fieldName, string expectedId)
    {
        var cut = Render<VelleDatepicker>(parameters => parameters
            .Add(p => p.Name, fieldName)
            .Add(p => p.Label, "Date"));

        Assert.Equal(expectedId, cut.Find("label").GetAttribute("for"));
        Assert.Equal(expectedId, cut.Find("input").GetAttribute("id"));
    }

    [Fact]
    public void SerializesTypeAndModeEnumsAndCalendarOptions()
    {
        var cut = Render<VelleDatepicker>(parameters => parameters
            .Add(p => p.Name, "Input.Window")
            .Add(p => p.Label, "Window")
            .Add(p => p.Type, VelleDatepickerType.DateTime)
            .Add(p => p.Mode, VelleDatepickerMode.Range)
            .Add(p => p.ShowMonths, 2)
            .Add(p => p.DisabledDates, ["2030-04-14", "2030-04-15"])
            .Add(p => p.DateFormat, "Y-m-d")
            .Add(p => p.DateTimeFormat, "Y-m-d H:i"));

        using var options = JsonDocument.Parse(
            cut.Find("div[x-data='velleDatepicker']").GetAttribute("data-velle-datepicker-options")!);

        Assert.Equal("datetime", options.RootElement.GetProperty("type").GetString());
        Assert.Equal("range", options.RootElement.GetProperty("mode").GetString());
        Assert.Equal(2, options.RootElement.GetProperty("showMonths").GetInt32());
        Assert.Equal("Y-m-d", options.RootElement.GetProperty("dateFormat").GetString());
        Assert.Equal("Y-m-d H:i", options.RootElement.GetProperty("dateTimeFormat").GetString());
        var disabled = options.RootElement.GetProperty("disable").EnumerateArray().Select(e => e.GetString()!).ToArray();
        Assert.Equal(["2030-04-14", "2030-04-15"], disabled);

        var timeMultiple = Render<VelleDatepicker>(parameters => parameters
            .Add(p => p.Name, "Input.Time")
            .Add(p => p.Label, "Time")
            .Add(p => p.Type, VelleDatepickerType.Time)
            .Add(p => p.Mode, VelleDatepickerMode.Multiple));

        using var timeOptions = JsonDocument.Parse(
            timeMultiple.Find("div[x-data='velleDatepicker']").GetAttribute("data-velle-datepicker-options")!);
        Assert.Equal("time", timeOptions.RootElement.GetProperty("type").GetString());
        Assert.Equal("multiple", timeOptions.RootElement.GetProperty("mode").GetString());
    }

    [Fact]
    public void FormatsExpressionValuesForSupportedTemporalTypes()
    {
        var model = new AppointmentModel
        {
            Date = new DateOnly(2030, 4, 12),
            Timestamp = new DateTime(2030, 4, 12, 14, 30, 0),
            OffsetTimestamp = new DateTimeOffset(2030, 4, 12, 9, 15, 0, TimeSpan.Zero),
            Time = new TimeOnly(8, 45),
            TextDate = "2030-05-01 to 2030-05-05",
        };

        var dateCut = Render<VelleDatepicker>(p => p
            .Add(x => x.Name, "Input.Date")
            .Add(x => x.Label, "Date")
            .Add(x => x.For, () => model.Date));
        Assert.Equal("2030-04-12", dateCut.Find("input").GetAttribute("value"));

        var dateTimeCut = Render<VelleDatepicker>(p => p
            .Add(x => x.Name, "Input.Timestamp")
            .Add(x => x.Label, "Timestamp")
            .Add(x => x.Type, VelleDatepickerType.DateTime)
            .Add(x => x.For, () => model.Timestamp));
        Assert.Equal("2030-04-12 14:30", dateTimeCut.Find("input").GetAttribute("value"));

        var offsetCut = Render<VelleDatepicker>(p => p
            .Add(x => x.Name, "Input.OffsetTimestamp")
            .Add(x => x.Label, "Offset")
            .Add(x => x.Type, VelleDatepickerType.DateTime)
            .Add(x => x.For, () => model.OffsetTimestamp));
        Assert.Equal("2030-04-12 09:15", offsetCut.Find("input").GetAttribute("value"));

        var timeCut = Render<VelleDatepicker>(p => p
            .Add(x => x.Name, "Input.Time")
            .Add(x => x.Label, "Time")
            .Add(x => x.Type, VelleDatepickerType.Time)
            .Add(x => x.For, () => model.Time));
        Assert.Equal("08:45", timeCut.Find("input").GetAttribute("value"));

        var textCut = Render<VelleDatepicker>(p => p
            .Add(x => x.Name, "Input.TextDate")
            .Add(x => x.Label, "Range")
            .Add(x => x.Mode, VelleDatepickerMode.Range)
            .Add(x => x.For, () => model.TextDate));
        Assert.Equal("2030-05-01 to 2030-05-05", textCut.Find("input").GetAttribute("value"));

        var emptyModel = new AppointmentModel();
        var nullCut = Render<VelleDatepicker>(p => p
            .Add(x => x.Name, "Input.Date")
            .Add(x => x.Label, "Empty")
            .Add(x => x.For, () => emptyModel.Date));
        Assert.False(nullCut.Find("input").HasAttribute("value"));
    }

    [Fact]
    public void ExplicitValueOverridesExpressionValue()
    {
        var model = new AppointmentModel { Date = new DateOnly(2030, 4, 12) };

        var cut = Render<VelleDatepicker>(parameters => parameters
            .Add(p => p.Name, "Input.Date")
            .Add(p => p.Label, "Appointment date")
            .Add(p => p.For, () => model.Date)
            .Add(p => p.Value, "2031-01-20"));

        Assert.Equal("2031-01-20", cut.Find("input").GetAttribute("value"));
    }

    [Fact]
    public void AppliesValidationAttributesFromCascadingEditContextViaForExpression()
    {
        var model = new AppointmentModel();
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(AppointmentModel.Date)), "Choose a date.");

        var cut = Render<VelleDatepicker>(parameters => parameters
            .AddCascadingValue(editContext)
            .Add(p => p.Name, "Input.Date")
            .Add(p => p.Label, "Appointment date")
            .Add(p => p.For, () => model.Date));

        var input = cut.Find("input");
        Assert.Equal("true", input.GetAttribute("aria-invalid"));
        Assert.Contains("invalid", input.GetAttribute("class")!.Split(' '));
    }

    [Fact]
    public void AppliesValidationAttributesFromCascadingEditContextViaNameFallback()
    {
        var model = new AppointmentModel();
        var editContext = new EditContext(model);
        var messages = new ValidationMessageStore(editContext);
        messages.Add(editContext.Field(nameof(AppointmentModel.Date)), "Choose a date.");

        var cut = Render<VelleDatepicker>(parameters => parameters
            .AddCascadingValue(editContext)
            .Add(p => p.Name, "Input.Date")
            .Add(p => p.Label, "Appointment date"));

        var input = cut.Find("input");
        Assert.Equal("true", input.GetAttribute("aria-invalid"));
        Assert.Contains("invalid", input.GetAttribute("class")!.Split(' '));
    }

    [Fact]
    public void MergesClassWrapperClassAndSplatsAdditionalAttributesOntoInput()
    {
        var cut = Render<VelleDatepicker>(parameters => parameters
            .Add(p => p.Id, "custom-date")
            .Add(p => p.Name, "Input.Date")
            .Add(p => p.Label, "Date")
            .Add(p => p.Class, "input--sm")
            .Add(p => p.WrapperClass, "field-group")
            .Add(p => p.AdditionalAttributes, new Dictionary<string, object>
            {
                ["class"] = "extra-input",
                ["required"] = true,
                ["aria-describedby"] = "date-help",
            }));

        Assert.Equal("flex flex-col gap field-group", cut.Find("div[x-data='velleDatepicker']").GetAttribute("class"));

        var input = cut.Find("input#custom-date");
        Assert.Equal("input input--sm extra-input", input.GetAttribute("class"));
        Assert.True(input.HasAttribute("required"));
        Assert.Equal("date-help", input.GetAttribute("aria-describedby"));
    }
}
