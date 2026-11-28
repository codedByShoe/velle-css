namespace Velle.Blazor;

/// <summary>
/// Specifies how many dates a <see cref="VelleDatepicker"/> can select.
/// </summary>
public enum VelleDatepickerMode
{
    /// <summary>
    /// Selects a single date.
    /// </summary>
    Single,

    /// <summary>
    /// Selects a start and end date range separated by <c>" to "</c>.
    /// </summary>
    Range,

    /// <summary>
    /// Selects multiple dates separated by <c>", "</c>.
    /// </summary>
    Multiple,
}
