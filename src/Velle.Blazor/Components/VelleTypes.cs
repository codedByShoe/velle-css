using Microsoft.AspNetCore.Components;

namespace Velle.Blazor;

/// <summary>
/// Visual style variant for <see cref="VelleButton"/>.
/// </summary>
public enum VelleButtonVariant
{
    /// <summary>Outlined default button.</summary>
    Default,
    /// <summary>Solid primary action button.</summary>
    Primary,
    /// <summary>Muted, borderless secondary button.</summary>
    Secondary,
    /// <summary>Transparent button that highlights on hover.</summary>
    Borderless,
    /// <summary>Destructive/negative action button.</summary>
    Negative,
    /// <summary>Unstyled text-like button.</summary>
    Plain,
}

/// <summary>
/// Size preset for <see cref="VelleButton"/>.
/// </summary>
public enum VelleButtonSize
{
    /// <summary>Default button size.</summary>
    Default,
    /// <summary>Extra-small button size.</summary>
    ExtraSmall,
    /// <summary>Small button size.</summary>
    Small,
    /// <summary>Large button size.</summary>
    Large,
}

/// <summary>
/// Semantic variant for <see cref="VelleAlert"/>.
/// </summary>
public enum VelleAlertVariant
{
    /// <summary>Default informational alert.</summary>
    Default,
    /// <summary>Error or destructive alert.</summary>
    Negative,
}

/// <summary>
/// Visual style variant for <see cref="VelleBadge"/>.
/// </summary>
public enum VelleBadgeVariant
{
    /// <summary>Outlined default badge.</summary>
    Default,
    /// <summary>Solid primary badge.</summary>
    Primary,
    /// <summary>Muted, borderless secondary badge.</summary>
    Secondary,
    /// <summary>Destructive/negative badge.</summary>
    Negative,
}

/// <summary>
/// Size preset for <see cref="VelleAvatar"/>.
/// </summary>
public enum VelleAvatarSize
{
    /// <summary>Default avatar size.</summary>
    Default,
    /// <summary>Small avatar (1.5rem).</summary>
    Small,
    /// <summary>Large avatar (2.5rem).</summary>
    Large,
}

/// <summary>
/// Orientation for layout primitives such as <see cref="VelleSeparator"/> and <see cref="VelleGroup"/>.
/// </summary>
public enum VelleOrientation
{
    /// <summary>Horizontal layout.</summary>
    Horizontal,
    /// <summary>Vertical layout.</summary>
    Vertical,
}

/// <summary>
/// Visual style variant for <see cref="VelleListRow"/>.
/// </summary>
public enum VelleListRowVariant
{
    /// <summary>Outlined default row.</summary>
    Default,
    /// <summary>Muted shaded row.</summary>
    Muted,
    /// <summary>Borderless transparent row.</summary>
    Borderless,
}

/// <summary>
/// Size preset for <see cref="VelleSwitch"/>.
/// </summary>
public enum VelleSwitchSize
{
    /// <summary>Default switch size.</summary>
    Default,
    /// <summary>Small switch size.</summary>
    Small,
}

/// <summary>
/// Represents a single collapsible section inside <see cref="VelleAccordion"/>.
/// </summary>
/// <param name="Title">Summary heading displayed for the section.</param>
/// <param name="Content">Body content revealed when expanded.</param>
/// <param name="Open">Whether the section starts expanded.</param>
/// <param name="Disabled">Whether the section is marked disabled.</param>
public sealed record VelleAccordionItem(string Title, RenderFragment Content, bool Open = false, bool Disabled = false);

/// <summary>
/// Represents a single crumb inside <see cref="VelleBreadcrumb"/>.
/// </summary>
/// <param name="Label">Visible breadcrumb text.</param>
/// <param name="Href">Optional destination URL. Omit for the current page item.</param>
public sealed record VelleBreadcrumbItem(string Label, string? Href = null);

/// <summary>
/// Represents an option inside <see cref="VelleCombobox"/>.
/// </summary>
/// <param name="Value">Submitted option value.</param>
/// <param name="Label">Visible option label.</param>
/// <param name="Disabled">Whether the option is disabled.</param>
/// <param name="Group">Optional <c>&lt;optgroup&gt;</c> label for grouping options.</param>
public sealed record VelleSelectOption(string Value, string Label, bool Disabled = false, string? Group = null);

/// <summary>
/// Edge from which a <see cref="VelleSheet"/> slides into view.
/// </summary>
public enum VelleSheetSide
{
    /// <summary>Slides in from the right edge (<c>sheet--right</c>).</summary>
    Right,
    /// <summary>Slides in from the left edge (<c>sheet--left</c>).</summary>
    Left,
}

/// <summary>
/// Anchor placement for <see cref="VellePopover"/> and <see cref="VelleDropdown"/>.
/// </summary>
public enum VellePopoverPlacement
{
    /// <summary>Below the trigger, aligned to its start edge (<c>popover--block-end-start</c>).</summary>
    BlockEndStart,
    /// <summary>Below the trigger, centered (<c>popover--block-end-center</c>).</summary>
    BlockEndCenter,
    /// <summary>Below the trigger, aligned to its end edge (<c>popover--block-end-end</c>).</summary>
    BlockEndEnd,
    /// <summary>Above the trigger, aligned to its start edge (<c>popover--block-start-start</c>).</summary>
    BlockStartStart,
    /// <summary>Above the trigger, centered (<c>popover--block-start-center</c>).</summary>
    BlockStartCenter,
    /// <summary>Above the trigger, aligned to its end edge (<c>popover--block-start-end</c>).</summary>
    BlockStartEnd,
    /// <summary>Unanchored popover positioned manually (<c>popover--unanchored</c>).</summary>
    Unanchored,
}

/// <summary>
/// Trigger interaction mode for <see cref="VellePopover"/>.
/// </summary>
public enum VellePopoverTrigger
{
    /// <summary>Opens and closes on click via native <c>popovertarget</c>.</summary>
    Click,
    /// <summary>Opens on pointer hover and closes on leave via Alpine.js.</summary>
    Hover,
}

/// <summary>
/// Character filter for <see cref="VelleInputOtp"/>.
/// </summary>
public enum VelleOtpPattern
{
    /// <summary>Accepts decimal digits only (<c>digits</c>).</summary>
    Digits,
    /// <summary>Accepts Unicode letters only (<c>chars</c>).</summary>
    Chars,
    /// <summary>Accepts Unicode letters and decimal digits (<c>digits-and-chars</c>).</summary>
    DigitsAndChars,
}

/// <summary>
/// Display format for <see cref="VelleLocalTime"/>.
/// </summary>
public enum VelleLocalTimeFormat
{
    /// <summary>Short localized date and time (<c>datetime</c>).</summary>
    DateTime,
    /// <summary>Long localized date (<c>date</c>).</summary>
    Date,
    /// <summary>Short month and day (<c>shortdate</c>).</summary>
    ShortDate,
    /// <summary>Short localized time of day (<c>time</c>).</summary>
    Time,
    /// <summary>Relative elapsed time such as <c>"5 minutes ago"</c>, refreshed every 30 seconds (<c>ago</c>).</summary>
    Ago,
}

/// <summary>
/// Application shell layout variant for <see cref="VelleLayout"/>.
/// </summary>
public enum VelleLayoutVariant
{
    /// <summary>Header + collapsible sidebar + scrollable main grid (<c>sidebar-layout</c>).</summary>
    Sidebar,
    /// <summary>Header + scrollable main grid (<c>header-layout</c>).</summary>
    Header,
    /// <summary>Viewport-centered single panel layout (<c>centered-layout</c>).</summary>
    Centered,
}

/// <summary>
/// Action triggered by <see cref="VelleHotkey"/> when its shortcut matches.
/// </summary>
public enum VelleHotkeyAction
{
    /// <summary>Triggers <c>click()</c> on the target element.</summary>
    Click,
    /// <summary>Moves keyboard focus via <c>focus()</c> to the target element.</summary>
    Focus,
}

/// <summary>
/// Submission strategy for <see cref="VelleAutosave"/>.
/// </summary>
public enum VelleAutosaveMode
{
    /// <summary>Sends the form asynchronously via <c>fetch()</c> without replacing the page.</summary>
    Fetch,
    /// <summary>Calls <c>form.requestSubmit()</c> to integrate with Blazor Enhanced <c>EditForm</c>.</summary>
    Submit,
}

/// <summary>
/// Masking mode for <see cref="VelleInputMask"/> powered by <c>@alpinejs/mask</c>.
/// </summary>
public enum VelleInputMaskMode
{
    /// <summary>Static pattern mask using <c>9</c> (digit), <c>a</c> (letter), and <c>*</c> (alphanumeric).</summary>
    Pattern,
    /// <summary>Dynamic currency/number formatting with thousands and decimal separators.</summary>
    Money,
}

/// <summary>
/// Chart visualization type for <see cref="VelleChart"/> powered by Chart.js.
/// </summary>
public enum VelleChartType
{
    /// <summary>Line chart (<c>line</c>).</summary>
    Line,
    /// <summary>Bar chart (<c>bar</c>).</summary>
    Bar,
    /// <summary>Doughnut chart (<c>doughnut</c>).</summary>
    Doughnut,
    /// <summary>Pie chart (<c>pie</c>).</summary>
    Pie,
    /// <summary>Radar chart (<c>radar</c>).</summary>
    Radar,
    /// <summary>Polar area chart (<c>polarArea</c>).</summary>
    PolarArea,
    /// <summary>Scatter plot (<c>scatter</c>).</summary>
    Scatter,
    /// <summary>Bubble chart (<c>bubble</c>).</summary>
    Bubble,
}

/// <summary>
/// JSON response payload returned by an ASP.NET Core upload endpoint configured on <see cref="VelleEditor.UploadUrl"/>.
/// </summary>
/// <param name="Url">Public URL where the uploaded file or image can be loaded.</param>
/// <param name="Filename">Optional original file name shown on file attachments.</param>
/// <param name="ContentType">Optional MIME content type (for example, <c>"image/png"</c> or <c>"application/pdf"</c>).</param>
/// <param name="ByteSize">Optional file size in bytes.</param>
/// <param name="Previewable">Optional flag indicating whether the file should render an inline preview.</param>
/// <param name="SignedId">Optional application-specific attachment identifier stored on the attachment element.</param>
public sealed record VelleAttachmentResult(
    string Url,
    string? Filename = null,
    string? ContentType = null,
    long? ByteSize = null,
    bool? Previewable = null,
    string? SignedId = null);
