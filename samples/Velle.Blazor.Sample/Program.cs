using Velle.Blazor;
using Velle.Blazor.Sample.Components;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorComponents();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}

app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseAntiforgery();
app.MapStaticAssets();
app.MapRazorComponents<App>();

// Demo attachment endpoint for VelleEditor's .NET upload bridge (returns an inline data URL for sample testing).
app.MapPost("/api/demo-upload", async (IFormFile file) =>
{
    await using var buffer = new MemoryStream();
    await file.CopyToAsync(buffer);
    var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;
    var dataUrl = $"data:{contentType};base64,{Convert.ToBase64String(buffer.ToArray())}";
    return Results.Ok(new VelleAttachmentResult(
        Url: dataUrl,
        Filename: file.FileName,
        ContentType: contentType,
        ByteSize: file.Length,
        Previewable: contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)));
});

app.Run();
