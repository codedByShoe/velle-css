using System.Linq.Expressions;
using Microsoft.AspNetCore.Components.Forms;

namespace Velle.Blazor;

internal static class FormFieldUtilities
{
    public static FieldIdentifier? ResolveFieldIdentifier(
        EditContext? editContext,
        Expression<Func<object?>>? forExpression,
        string? name)
    {
        if (forExpression is not null)
        {
            return FieldIdentifier.Create(forExpression);
        }

        if (editContext is not null && !string.IsNullOrWhiteSpace(name))
        {
            var dotIndex = name.LastIndexOf('.');
            var fieldName = dotIndex >= 0 && dotIndex < name.Length - 1
                ? name[(dotIndex + 1)..]
                : name;
            return editContext.Field(fieldName);
        }

        return null;
    }

    public static bool IsInvalid(EditContext? editContext, FieldIdentifier? field) =>
        editContext is not null
        && field is { } identifier
        && editContext.GetValidationMessages(identifier).Any();

    public static string? GetFieldCssClass(EditContext? editContext, FieldIdentifier? field) =>
        editContext is not null && field is { } identifier
            ? editContext.FieldCssClass(identifier)
            : null;

    public static object? EvaluateExpression(Expression<Func<object?>>? forExpression) =>
        forExpression is null ? null : forExpression.Compile().Invoke();
}
