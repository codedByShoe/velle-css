namespace Velle.Blazor;

/// <summary>
/// Specifies the kind of value selected by a <see cref="VelleDatepicker"/>.
/// </summary>
public enum VelleDatepickerType
{
    /// <summary>
    /// Selects a calendar date submitted as <c>yyyy-MM-dd</c>.
    /// </summary>
    Date,

    /// <summary>
    /// Selects a date and time submitted as <c>yyyy-MM-dd HH:mm</c>.
    /// </summary>
    DateTime,

    /// <summary>
    /// Selects a time of day submitted as <c>HH:mm</c>.
    /// </summary>
    Time,
}
