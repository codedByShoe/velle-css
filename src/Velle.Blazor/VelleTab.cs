using Microsoft.AspNetCore.Components;

namespace Velle.Blazor;

public sealed record VelleTab(string Label, RenderFragment Content);
