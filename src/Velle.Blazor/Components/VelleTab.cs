using Microsoft.AspNetCore.Components;

namespace Velle.Blazor;

/// <summary>
/// Represents a single tab label and panel content rendered by <see cref="VelleTabs"/>.
/// </summary>
/// <param name="Label">Visible label rendered inside the tab button.</param>
/// <param name="Content">Panel content rendered when the tab is active.</param>
public sealed record VelleTab(string Label, RenderFragment Content);
