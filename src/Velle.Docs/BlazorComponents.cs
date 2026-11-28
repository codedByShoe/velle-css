namespace Velle.Docs;

internal sealed record BlazorComponentDoc(
    string Slug,
    string Name,
    string Category,
    string Summary,
    string[] Badges,
    string? CssComponent,
    BlazorExampleDoc[] Examples,
    BlazorParameterDoc[] Parameters,
    BlazorTypeDoc[] Types,
    string[] Notes);

internal sealed record BlazorExampleDoc(
    string Id,
    string Title,
    string Description,
    string PreviewHtml,
    string RazorCode);

internal sealed record BlazorParameterDoc(
    string Name,
    string Type,
    bool Required,
    string Default,
    string Description);

internal sealed record BlazorTypeDoc(
    string Name,
    string Kind,
    string Description,
    BlazorMemberDoc[] Members);

internal sealed record BlazorMemberDoc(string Name, string Description);

internal static class BlazorComponents
{
    public static readonly string[] Categories = ["Elements", "Forms", "Overlays", "Layout", "Behaviors"];

    public static readonly IReadOnlyList<BlazorComponentDoc> All =
    [
        // Setup
        new(
            Slug: "velle-styles",
            Name: "VelleStyles",
            Category: "Setup",
            Summary: "Renders fingerprinted stylesheet links for Velle's core design tokens, component CSS, and optional datepicker styles inside App.razor.",
            Badges: ["Blazor Static SSR", "Head Asset Helper"],
            CssComponent: null,
            Examples:
            [
                new("basic-styles", "Include core and datepicker stylesheets",
                    "Place <VelleStyles /> inside <head> in Components/App.razor. It resolves fingerprinted URLs via Blazor's built-in Assets collection.",
                    "",
                    """
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <base href="/" />
                        <VelleStyles IncludeDatepicker="true" />
                        <link rel="stylesheet" href="@Assets["app.css"]" />
                        <HeadOutlet />
                    </head>
                    """),
            ],
            Parameters:
            [
                new("IncludeDatepicker", "bool", false, "false", "When true, also renders the locally bundled Flatpickr CSS and Velle's datepicker theme stylesheet."),
                new("IncludeEditor", "bool", false, "false", "When true, also renders the locally bundled Lexxy stylesheet and Velle's editor theme stylesheet."),
            ],
            Types: [],
            Notes:
            [
                "Requires app.MapStaticAssets() in Program.cs so @Assets[...] resolves fingerprinted static web assets.",
                "JavaScript loads automatically through blazor.web.js via _content/Velle.Blazor/Velle.Blazor.lib.module.js.",
            ]),

        // Elements
        new(
            Slug: "velle-accordion",
            Name: "VelleAccordion",
            Category: "Elements",
            Summary: "Vertically stacked collapsible sections built on native <details> and <summary> elements.",
            Badges: ["Blazor Static SSR", "Native HTML"],
            CssComponent: "accordion",
            Examples:
            [
                new("accordion-basic", "Exclusive accordion group",
                    "Set GroupName so only one section stays open at a time using native <details name=\"...\">.",
                    """
                    <div class="accordion" style="max-inline-size: 26rem">
                      <details name="docs-faq" open>
                        <summary>Does Velle require a SignalR circuit?</summary>
                        <div class="pbe-4"><p>No. Every component is designed for Blazor Static SSR with zero circuit overhead.</p></div>
                      </details>
                      <details name="docs-faq">
                        <summary>How does interactivity work?</summary>
                        <div class="pbe-4"><p>Native HTML primitives handle disclosures and modals; Alpine.js CSP enhances interactive widgets.</p></div>
                      </details>
                    </div>
                    """,
                    """
                    <VelleAccordion GroupName="faq" Items="FaqItems" />

                    @code {
                        private IReadOnlyList<VelleAccordionItem> FaqItems =>
                        [
                            new("Does Velle require a SignalR circuit?", @<p>No. Every component is built for Blazor Static SSR.</p>, Open: true),
                            new("How does interactivity work?", @<p>Native HTML primitives plus Alpine.js CSP.</p>)
                        ];
                    }
                    """),
            ],
            Parameters:
            [
                new("Items", "IReadOnlyList<VelleAccordionItem>", false, "[]", "Collapsible sections rendered as native <details> elements."),
                new("GroupName", "string?", false, "null", "Optional shared name attribute allowing only one section open at a time."),
                new("ChildContent", "RenderFragment?", false, "null", "Optional custom <details> markup."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .accordion."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto the root container."),
            ],
            Types:
            [
                new("VelleAccordionItem", "record", "Defines a single collapsible section.",
                [
                    new("Title (string)", "Summary heading."),
                    new("Content (RenderFragment)", "Body content revealed when expanded."),
                    new("Open (bool)", "Starts expanded when true."),
                    new("Disabled (bool)", "Marks summary aria-disabled=\"true\" with tabindex=\"-1\"."),
                ]),
            ],
            Notes: ["Zero JavaScript required; animations degrade gracefully when ::details-content is unavailable."]),

        new(
            Slug: "velle-alert",
            Name: "VelleAlert",
            Category: "Elements",
            Summary: "Callout box for status updates, confirmations, and validation errors.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "alert",
            Examples:
            [
                new("alert-variants", "Default and negative alerts",
                    "Combine Title, Icon, Variant, and optional Action slots.",
                    """
                    <div class="flex flex-col gap" style="max-inline-size: 32rem">
                      <div class="alert flex items-start" role="alert">
                        <span class="icon icon--circle-check" aria-hidden="true"></span>
                        <div class="flex flex-col mis-2">
                          <h5 class="font-medium leading-none mbe-1">Profile saved</h5>
                          <div class="text-subtle text-balance">Your changes are visible immediately.</div>
                        </div>
                      </div>
                      <div class="alert alert--negative flex items-start" role="alert">
                        <span class="icon icon--circle-alert" aria-hidden="true"></span>
                        <div class="flex flex-col mis-2">
                          <h5 class="font-medium leading-none mbe-1">Unable to process payment</h5>
                          <div class="text-balance">Verify your billing information and try again.</div>
                        </div>
                      </div>
                    </div>
                    """,
                    """
                    <VelleAlert Title="Profile saved" Icon="circle-check">
                        Your changes are visible immediately.
                    </VelleAlert>

                    <VelleAlert Variant="VelleAlertVariant.Negative" Title="Unable to process payment" Icon="circle-alert">
                        Verify your billing information and try again.
                    </VelleAlert>
                    """),
            ],
            Parameters:
            [
                new("Variant", "VelleAlertVariant", false, "Default", "Semantic alert style (Default or Negative)."),
                new("Title", "string?", false, "null", "Optional alert heading."),
                new("Icon", "string?", false, "null", "Optional Velle icon name (e.g. \"circle-check\", \"circle-alert\")."),
                new("Action", "RenderFragment?", false, "null", "Optional trailing action slot (such as a VelleButton)."),
                new("Role", "string", false, "\"alert\"", "ARIA role applied to the container."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .alert."),
                new("ChildContent", "RenderFragment?", false, "null", "Alert body content."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto the container."),
            ],
            Types:
            [
                new("VelleAlertVariant", "enum", "Semantic alert variants.",
                [
                    new("Default", "Standard informational callout."),
                    new("Negative", "Red error/destructive callout."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-avatar",
            Name: "VelleAvatar",
            Category: "Elements",
            Summary: "Circular user image or initials with size presets, optional status badge, and VelleAvatarGroup overlapping stacks.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "avatar",
            Examples:
            [
                new("avatar-basic", "Images, initials, sizes, and status badges",
                    "Pass Src for an image or Initials for text fallback. Wrap multiple avatars in <VelleAvatarGroup> to overlap them.",
                    """
                    <div class="flex items-center flex-wrap gap">
                      <div class="avatar avatar--sm"><span role="img" aria-label="Ada">AL</span></div>
                      <div class="avatar"><img alt="User avatar" src="assets/images/avatar.svg"><span class="avatar__badge" style="--avatar-badge-color: var(--green-600)" aria-label="Online" role="img"></span></div>
                      <div class="avatar avatar--lg"><span role="img" aria-label="Grace">GH</span></div>
                      <div class="avatar-group">
                        <div class="avatar"><span role="img" aria-label="AL">AL</span></div>
                        <div class="avatar"><span role="img" aria-label="GH">GH</span></div>
                        <div class="avatar"><span role="img" aria-label="AT">AT</span></div>
                      </div>
                    </div>
                    """,
                    """
                    <VelleAvatar Initials="AL" Size="VelleAvatarSize.Small" />
                    <VelleAvatar Src="/images/avatar.svg" Alt="Ada Lovelace" BadgeColor="var(--green-600)" BadgeLabel="Online" />
                    <VelleAvatar Initials="GH" Size="VelleAvatarSize.Large" />

                    <VelleAvatarGroup>
                        <VelleAvatar Initials="AL" />
                        <VelleAvatar Initials="GH" />
                        <VelleAvatar Initials="AT" />
                    </VelleAvatarGroup>
                    """),
            ],
            Parameters:
            [
                new("Src", "string?", false, "null", "Image URL. When omitted, Initials is rendered."),
                new("Alt", "string", false, "\"\"", "Accessible alternative text."),
                new("Initials", "string?", false, "null", "Fallback initials shown when Src is omitted."),
                new("Size", "VelleAvatarSize", false, "Default", "Size preset (Small, Default, Large)."),
                new("Badge", "RenderFragment?", false, "null", "Optional custom badge content (e.g. VelleIcon)."),
                new("BadgeColor", "string?", false, "null", "Optional CSS color applied to --avatar-badge-color."),
                new("BadgeLabel", "string?", false, "null", "Accessible label for the status badge."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .avatar."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto the root container."),
            ],
            Types:
            [
                new("VelleAvatarSize", "enum", "Avatar size presets.",
                [
                    new("Small", "1.5rem compact avatar."),
                    new("Default", "Standard avatar size."),
                    new("Large", "2.5rem large avatar."),
                ]),
            ],
            Notes: ["Use <VelleAvatarGroup> to render overlapping avatar rows."]),

        new(
            Slug: "velle-badge",
            Name: "VelleBadge",
            Category: "Elements",
            Summary: "Compact status, tag, and count pill supporting variants, icons, and link rendering.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "badge",
            Examples:
            [
                new("badge-variants", "Variants and links",
                    "Set Href to render a clickable <a> badge.",
                    """
                    <div class="flex items-center flex-wrap gap-half">
                      <span class="badge">Default</span>
                      <span class="badge badge--primary">Primary</span>
                      <span class="badge badge--secondary"><span class="icon icon--circle-check" aria-hidden="true"></span><span>Verified</span></span>
                      <span class="badge badge--negative">Failed</span>
                    </div>
                    """,
                    """
                    <VelleBadge>Default</VelleBadge>
                    <VelleBadge Variant="VelleBadgeVariant.Primary">Primary</VelleBadge>
                    <VelleBadge Variant="VelleBadgeVariant.Secondary">
                        <VelleIcon Name="circle-check" />
                        <span>Verified</span>
                    </VelleBadge>
                    <VelleBadge Variant="VelleBadgeVariant.Negative">Failed</VelleBadge>
                    """),
            ],
            Parameters:
            [
                new("Variant", "VelleBadgeVariant", false, "Default", "Visual style (Default, Primary, Secondary, Negative)."),
                new("Href", "string?", false, "null", "When set, renders an <a> element instead of <span>."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .badge."),
                new("ChildContent", "RenderFragment?", false, "null", "Badge content."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto the rendered element."),
            ],
            Types:
            [
                new("VelleBadgeVariant", "enum", "Visual variants for VelleBadge.",
                [
                    new("Default", "Outlined badge."),
                    new("Primary", "Solid primary badge."),
                    new("Secondary", "Muted borderless badge."),
                    new("Negative", "Red destructive/error badge."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-breadcrumb",
            Name: "VelleBreadcrumb",
            Category: "Elements",
            Summary: "Accessible navigation hierarchy trail with chevron separators and aria-current=\"page\".",
            Badges: ["Blazor Static SSR"],
            CssComponent: "breadcrumb",
            Examples:
            [
                new("breadcrumb-basic", "Hierarchy trail",
                    "Omit Href on the final item to mark the active page.",
                    """
                    <nav class="breadcrumb" aria-label="Breadcrumb">
                      <a href="#">Home</a>
                      <span class="icon icon--chevron-right" aria-hidden="true"></span>
                      <a href="#">Components</a>
                      <span class="icon icon--chevron-right" aria-hidden="true"></span>
                      <span class="text-primary" aria-current="page">Breadcrumb</span>
                    </nav>
                    """,
                    """
                    <VelleBreadcrumb Items="Crumbs" />

                    @code {
                        private IReadOnlyList<VelleBreadcrumbItem> Crumbs =>
                        [
                            new("Home", "/"),
                            new("Components", "/components"),
                            new("Breadcrumb")
                        ];
                    }
                    """),
            ],
            Parameters:
            [
                new("Items", "IReadOnlyList<VelleBreadcrumbItem>", false, "[]", "Ordered trail items from root to current page."),
                new("Label", "string", false, "\"Breadcrumb\"", "Accessible aria-label on <nav>."),
                new("ChildContent", "RenderFragment?", false, "null", "Optional custom breadcrumb markup."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .breadcrumb."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <nav>."),
            ],
            Types:
            [
                new("VelleBreadcrumbItem", "record", "A single breadcrumb entry.",
                [
                    new("Label (string)", "Visible label."),
                    new("Href (string?)", "Optional URL; omit for the active page."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-button",
            Name: "VelleButton",
            Category: "Elements",
            Summary: "Buttons and button-styled links with strongly-typed variants, sizes, icon-only mode, and busy/feedback states.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "button",
            Examples:
            [
                new("button-variants", "Variants, sizes, and links",
                    "Set Type=\"submit\" inside an EditForm, or set Href to render a styled <a> link.",
                    """
                    <div class="flex items-center flex-wrap gap">
                      <button type="button" class="btn">Default</button>
                      <button type="button" class="btn btn--primary">Primary</button>
                      <button type="button" class="btn btn--secondary">Secondary</button>
                      <button type="button" class="btn btn--borderless">Borderless</button>
                      <button type="button" class="btn btn--negative">Negative</button>
                      <button type="button" class="btn btn--plain">Plain</button>
                      <button type="button" class="btn btn--sm btn--primary">Small</button>
                      <button type="button" class="btn btn--icon" aria-label="Search"><span class="icon icon--search" aria-hidden="true"></span></button>
                    </div>
                    """,
                    """
                    <VelleButton>Default</VelleButton>
                    <VelleButton Variant="VelleButtonVariant.Primary" Type="submit">Save</VelleButton>
                    <VelleButton Variant="VelleButtonVariant.Secondary">Secondary</VelleButton>
                    <VelleButton Variant="VelleButtonVariant.Borderless">Borderless</VelleButton>
                    <VelleButton Variant="VelleButtonVariant.Negative">Delete</VelleButton>
                    <VelleButton Variant="VelleButtonVariant.Plain">Cancel</VelleButton>
                    <VelleButton Href="/settings" Size="VelleButtonSize.Small">Settings</VelleButton>
                    <VelleButton IconOnly="true" aria-label="Search"><VelleIcon Name="search" /></VelleButton>
                    """),
            ],
            Parameters:
            [
                new("Variant", "VelleButtonVariant", false, "Default", "Visual variant (Default, Primary, Secondary, Borderless, Negative, Plain)."),
                new("Size", "VelleButtonSize", false, "Default", "Size preset (ExtraSmall, Small, Default, Large)."),
                new("IconOnly", "bool", false, "false", "Applies square padding (btn--icon / btn--icon-*)."),
                new("Feedback", "bool", false, "false", "Adds press scale feedback (btn--feedback)."),
                new("Busy", "bool", false, "false", "Shows spinner styling when disabled inside an aria-busy ancestor."),
                new("Href", "string?", false, "null", "When set, renders an <a> link instead of <button>."),
                new("Type", "string", false, "\"button\"", "Native button type when rendering <button>."),
                new("Disabled", "bool", false, "false", "Disables the button (or sets aria-disabled=\"true\" on links)."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .btn."),
                new("ChildContent", "RenderFragment?", false, "null", "Button content."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <button> or <a>."),
            ],
            Types:
            [
                new("VelleButtonVariant", "enum", "Button style variants.",
                [
                    new("Default", "Outlined default button."),
                    new("Primary", "Solid primary action."),
                    new("Secondary", "Muted borderless surface."),
                    new("Borderless", "Transparent until hovered."),
                    new("Negative", "Red destructive action."),
                    new("Plain", "Minimal text-like button."),
                ]),
                new("VelleButtonSize", "enum", "Button size presets.",
                [
                    new("ExtraSmall", "btn--xs / btn--icon-xs."),
                    new("Small", "btn--sm / btn--icon-sm."),
                    new("Default", "Standard button size."),
                    new("Large", "btn--lg / btn--icon-lg."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-card",
            Name: "VelleCard",
            Category: "Elements",
            Summary: "Bordered surface container with optional Title/Description header, custom Header slot, and edge-to-edge shaded Footer.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "card",
            Examples:
            [
                new("card-basic", "Card with header, body, and footer",
                    "Use Title and Description for standard cards, or Header for custom layouts.",
                    """
                    <div class="card flex flex-col gap" style="max-inline-size: 24rem">
                      <div class="flex flex-col">
                        <h3 class="font-medium leading-none mbe-1">Team notifications</h3>
                        <p class="text-sm text-subtle">Choose how your workspace receives deployment alerts.</p>
                      </div>
                      <p class="text-sm">Daily digests are sent at 9:00 AM UTC.</p>
                      <div class="card__footer flex justify-end gap-half">
                        <button type="button" class="btn btn--sm">Cancel</button>
                        <button type="button" class="btn btn--sm btn--primary">Save</button>
                      </div>
                    </div>
                    """,
                    """
                    <VelleCard Title="Team notifications"
                               Description="Choose how your workspace receives deployment alerts."
                               FooterClass="flex justify-end gap-half">
                        <ChildContent>
                            <p class="text-sm">Daily digests are sent at 9:00 AM UTC.</p>
                        </ChildContent>
                        <Footer>
                            <VelleButton Size="VelleButtonSize.Small">Cancel</VelleButton>
                            <VelleButton Size="VelleButtonSize.Small" Variant="VelleButtonVariant.Primary">Save</VelleButton>
                        </Footer>
                    </VelleCard>
                    """),
            ],
            Parameters:
            [
                new("Title", "string?", false, "null", "Optional heading rendered when Header is not provided."),
                new("Description", "string?", false, "null", "Optional subtitle rendered below Title."),
                new("Header", "RenderFragment?", false, "null", "Custom header markup overriding Title/Description."),
                new("ChildContent", "RenderFragment?", false, "null", "Card body content."),
                new("Footer", "RenderFragment?", false, "null", "Optional shaded footer rendered inside .card__footer."),
                new("FooterClass", "string?", false, "null", "Extra CSS classes merged onto .card__footer."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .card."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto the root container."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-group",
            Name: "VelleGroup",
            Category: "Elements",
            Summary: "Joins buttons, inputs, or toggles into a single segmented control with merged borders and corners.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "group",
            Examples:
            [
                new("group-basic", "Segmented button group",
                    "Supports Horizontal (default) and Vertical orientations.",
                    """
                    <div class="group" role="group" aria-label="View mode">
                      <button type="button" class="btn">Day</button>
                      <button type="button" class="btn">Week</button>
                      <button type="button" class="btn">Month</button>
                    </div>
                    """,
                    """
                    <VelleGroup Label="View mode">
                        <VelleButton>Day</VelleButton>
                        <VelleButton>Week</VelleButton>
                        <VelleButton>Month</VelleButton>
                    </VelleGroup>
                    """),
            ],
            Parameters:
            [
                new("Orientation", "VelleOrientation", false, "Horizontal", "Horizontal (.group) or Vertical (.group-vertical)."),
                new("Label", "string?", false, "null", "Accessible aria-label for role=\"group\"."),
                new("ChildContent", "RenderFragment?", false, "null", "Joined controls."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto the container."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto the container."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-icon",
            Name: "VelleIcon",
            Category: "Elements",
            Summary: "CSS mask icon backed by Velle's bundled Lucide icon set that inherits text color and scales via --icon-size.",
            Badges: ["Blazor Static SSR", "Lucide Icons"],
            CssComponent: "icons",
            Examples:
            [
                new("icon-basic", "Decorative and labeled icons",
                    "Icons default to aria-hidden=\"true\". Provide Label when an icon carries standalone meaning.",
                    """
                    <div class="flex items-center gap">
                      <span class="icon icon--circle-check" aria-hidden="true"></span>
                      <span class="icon icon--search" aria-hidden="true"></span>
                      <span class="icon icon--download" aria-hidden="true"></span>
                      <span class="icon icon--loading" aria-hidden="true"></span>
                    </div>
                    """,
                    """
                    <VelleIcon Name="circle-check" />
                    <VelleIcon Name="search" Label="Search" />
                    <VelleIcon Name="download" />
                    <VelleIcon Name="loading" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Velle icon slug matching .icon--* (e.g. \"circle-check\", \"search\", \"loading\")."),
                new("Label", "string?", false, "null", "Optional accessible label; when omitted, aria-hidden=\"true\" is applied."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto the icon span."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <span>."),
            ],
            Types: [],
            Notes: ["See the Icons CSS reference for the complete gallery of bundled Lucide icon names."]),

        new(
            Slug: "velle-kbd",
            Name: "VelleKbd",
            Category: "Elements",
            Summary: "Styled <kbd> element for keyboard keys and shortcuts.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "keyboard",
            Examples:
            [
                new("kbd-basic", "Inline shortcuts",
                    "Set Tooltip=\"true\" for dark or inverted button/tooltip surfaces.",
                    """
                    <p class="text-sm text-subtle">Press <kbd class="kbd">⌘ K</kbd> or <kbd class="kbd">Ctrl K</kbd> to filter docs.</p>
                    """,
                    """
                    <p class="text-sm text-subtle">
                        Press <VelleKbd>⌘ K</VelleKbd> or <VelleKbd>Ctrl K</VelleKbd> to filter docs.
                    </p>
                    """),
            ],
            Parameters:
            [
                new("Tooltip", "bool", false, "false", "Applies kbd--tooltip colors for dark/inverted surfaces."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .kbd."),
                new("ChildContent", "RenderFragment?", false, "null", "Key label text."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <kbd>."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-list",
            Name: "VelleList",
            Category: "Elements",
            Summary: "Stacked rows for settings, navigation links, and selectable options via VelleList and VelleListRow.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "list",
            Examples:
            [
                new("list-basic", "Rows with variants and links",
                    "Use VelleListRow inside VelleList. Set Href for link rows or Selectable=\"true\" for checkbox/radio rows.",
                    """
                    <div class="list text-sm" style="max-inline-size: 26rem">
                      <a class="list-row list-row--link flex items-center gap" href="#">
                        <span class="icon icon--circle-check" aria-hidden="true"></span>
                        <span class="flex flex-1 flex-col">
                          <span class="leading-none font-medium mbe-1">Read the documentation</span>
                          <span class="text-subtle">Learn how Static SSR components fit together.</span>
                        </span>
                        <span class="icon icon--chevron-right" aria-hidden="true"></span>
                      </a>
                      <div class="list-row list-row--muted flex items-center gap">
                        <span class="icon icon--sun" aria-hidden="true"></span>
                        <span class="flex flex-1 flex-col">
                          <span class="leading-none font-medium mbe-1">Theme tokens</span>
                          <span class="text-subtle">Automatic light and dark surfaces.</span>
                        </span>
                      </div>
                    </div>
                    """,
                    """
                    <VelleList Class="text-sm">
                        <VelleListRow Href="/docs" Title="Read the documentation" Description="Learn Static SSR patterns." Icon="circle-check">
                            <Trailing><VelleIcon Name="chevron-right" /></Trailing>
                        </VelleListRow>
                        <VelleListRow Variant="VelleListRowVariant.Muted" Title="Theme tokens" Description="Automatic light and dark surfaces." Icon="sun" />
                    </VelleList>
                    """),
            ],
            Parameters:
            [
                new("Variant (VelleListRow)", "VelleListRowVariant", false, "Default", "Row surface variant (Default, Muted, Borderless)."),
                new("Href (VelleListRow)", "string?", false, "null", "Renders an interactive <a> row with list-row--link."),
                new("Selectable (VelleListRow)", "bool", false, "false", "Renders a <label class=\"list-row list-row--check\"> wrapper."),
                new("Title / Description (VelleListRow)", "string?", false, "null", "Optional structured heading and subtitle."),
                new("Icon / Media / Trailing (VelleListRow)", "string? / RenderFragment?", false, "null", "Optional leading icon/media and trailing content slots."),
                new("Class / AdditionalAttributes", "string? / Dictionary", false, "null", "Supported on both VelleList and VelleListRow."),
            ],
            Types:
            [
                new("VelleListRowVariant", "enum", "Row surface variants.",
                [
                    new("Default", "Outlined bordered row."),
                    new("Muted", "Subtle shaded surface."),
                    new("Borderless", "Transparent row without border."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-pagination",
            Name: "VellePagination",
            Category: "Elements",
            Summary: "Server-friendly pagination links with automatic page-window ellipsis and disabled boundary controls.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "pagination",
            Examples:
            [
                new("pagination-basic", "Pagination with automatic windowing",
                    "Supply CurrentPage, TotalPages, and a PageUrl generator for enhanced Static SSR navigation.",
                    """
                    <nav class="pagination" aria-label="Pagination">
                      <a class="btn pagination__button" aria-label="Previous page" href="#"><span class="icon icon--chevron-left" aria-hidden="true"></span><span>Previous</span></a>
                      <a class="btn pagination__button" href="#">1</a>
                      <a class="btn pagination__button" aria-current="page" href="#">2</a>
                      <a class="btn pagination__button" href="#">3</a>
                      <div class="inline-flex items-center pi-2" aria-hidden="true"><span class="icon icon--ellipsis"></span></div>
                      <a class="btn pagination__button" href="#">10</a>
                      <a class="btn pagination__button" aria-label="Next page" href="#"><span>Next</span><span class="icon icon--chevron-right" aria-hidden="true"></span></a>
                    </nav>
                    """,
                    """
                    <VellePagination CurrentPage="currentPage"
                                     TotalPages="10"
                                     PageUrl="page => $"/orders?page={page}"" />
                    """),
            ],
            Parameters:
            [
                new("CurrentPage", "int", true, "1", "One-based active page number."),
                new("TotalPages", "int", true, "1", "Total number of pages."),
                new("PageUrl", "Func<int, string>", true, "—", "Function generating the href for each page number."),
                new("Label", "string", false, "\"Pagination\"", "Accessible aria-label on <nav>."),
                new("IconsOnly", "bool", false, "false", "Renders Previous/Next as icon-only buttons."),
                new("PreviousText / NextText", "string", false, "\"Previous\" / \"Next\"", "Text labels for previous and next buttons."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .pagination."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <nav>."),
            ],
            Types: [],
            Notes: ["Generates standard <a> links so Blazor enhanced navigation patches paginated tables smoothly without full reloads."]),

        new(
            Slug: "velle-progress",
            Name: "VelleProgress",
            Category: "Elements",
            Summary: "Native <progress> bar supporting determinate percentages, labeled headers, and animated indeterminate states.",
            Badges: ["Blazor Static SSR", "Native HTML"],
            CssComponent: "progress",
            Examples:
            [
                new("progress-basic", "Determinate, labeled, and indeterminate",
                    "Omit Value to render an indeterminate loading bar.",
                    """
                    <div class="flex flex-col gap" style="max-inline-size: 20rem">
                      <div class="flex flex-wrap gap-half">
                        <span class="text-sm font-medium" id="docs-progress-label">Upload progress</span>
                        <span class="text-sm text-subtle mis-auto">68%</span>
                        <progress value="68" max="100" class="progress" aria-labelledby="docs-progress-label"></progress>
                      </div>
                      <progress class="progress" aria-label="Loading"></progress>
                    </div>
                    """,
                    """
                    <VelleProgress Value="68" Max="100" Label="Upload progress" ShowValue="true" />
                    <VelleProgress Label="Loading" />
                    """),
            ],
            Parameters:
            [
                new("Value", "double?", false, "null", "Current progress value; null renders indeterminate mode."),
                new("Max", "double", false, "100", "Maximum value."),
                new("Label", "string?", false, "null", "Accessible label (also displayed visibly when ShowValue is true)."),
                new("ShowValue", "bool", false, "false", "Renders visible label and computed percentage header."),
                new("Id", "string?", false, "null", "Optional stable prefix for the visible label id."),
                new("Class / WrapperClass", "string?", false, "null", "Extra CSS classes for <progress> or the labeled wrapper."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <progress>."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-separator",
            Name: "VelleSeparator",
            Category: "Elements",
            Summary: "Thin horizontal or vertical visual divider.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "separator",
            Examples:
            [
                new("separator-basic", "Horizontal and vertical dividers",
                    "Use Orientation=\"VelleOrientation.Vertical\" inside flex rows.",
                    """
                    <div class="flex flex-col gap text-sm" style="max-inline-size: 20rem">
                      <span>Velle.Blazor</span>
                      <span class="separator" aria-hidden="true"></span>
                      <div class="flex items-center gap">
                        <span>Settings</span>
                        <span class="separator-vertical" aria-hidden="true"></span>
                        <span>Account</span>
                        <span class="separator-vertical" aria-hidden="true"></span>
                        <span>Help</span>
                      </div>
                    </div>
                    """,
                    """
                    <VelleSeparator />
                    <div class="flex items-center gap">
                        <span>Settings</span>
                        <VelleSeparator Orientation="VelleOrientation.Vertical" />
                        <span>Account</span>
                    </div>
                    """),
            ],
            Parameters:
            [
                new("Orientation", "VelleOrientation", false, "Horizontal", "Horizontal (.separator) or Vertical (.separator-vertical)."),
                new("Class", "string?", false, "null", "Extra CSS classes."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes."),
            ],
            Types:
            [
                new("VelleOrientation", "enum", "Shared orientation enum.",
                [
                    new("Horizontal", "Horizontal layout."),
                    new("Vertical", "Vertical layout."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-skeleton",
            Name: "VelleSkeleton",
            Category: "Elements",
            Summary: "Pulsing placeholder block for streaming SSR or loading states.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "skeleton",
            Examples:
            [
                new("skeleton-basic", "Avatar and text placeholders",
                    "Size with Width/Height parameters or utility classes.",
                    """
                    <div class="flex items-center gap" style="max-inline-size: 20rem">
                      <div class="skeleton rounded-full" style="inline-size: 2.5rem; block-size: 2.5rem" aria-hidden="true"></div>
                      <div class="flex flex-col gap-half">
                        <div class="skeleton" style="inline-size: 10rem; block-size: var(--size-4)" aria-hidden="true"></div>
                        <div class="skeleton" style="inline-size: 7rem; block-size: var(--size-4)" aria-hidden="true"></div>
                      </div>
                    </div>
                    """,
                    """
                    <div class="flex items-center gap">
                        <VelleSkeleton Width="2.5rem" Height="2.5rem" Rounded="true" />
                        <div class="flex flex-col gap-half">
                            <VelleSkeleton Width="10rem" Height="var(--size-4)" />
                            <VelleSkeleton Width="7rem" Height="var(--size-4)" />
                        </div>
                    </div>
                    """),
            ],
            Parameters:
            [
                new("Width", "string?", false, "null", "Optional CSS inline-size."),
                new("Height", "string?", false, "null", "Optional CSS block-size."),
                new("Rounded", "bool", false, "false", "Applies rounded-full for circular placeholders."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .skeleton."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes."),
            ],
            Types: [],
            Notes: ["Pairs cleanly with Blazor Static SSR [StreamRendering] loading templates."]),

        new(
            Slug: "velle-table",
            Name: "VelleTable",
            Category: "Elements",
            Summary: "Responsive scrollable data table wrapper with Caption, Header, Body, and Footer slots.",
            Badges: ["Blazor Static SSR"],
            CssComponent: "table",
            Examples:
            [
                new("table-basic", "Structured table with caption and footer",
                    "Automatically wraps <table> in an overflow-i-auto container.",
                    """
                    <div class="overflow-i-auto">
                      <table class="table">
                        <caption>Recent invoices</caption>
                        <thead><tr><th>Invoice</th><th>Status</th><th class="text-end">Amount</th></tr></thead>
                        <tbody>
                          <tr><th>INV001</th><td>Paid</td><td class="text-end">$250.00</td></tr>
                          <tr><th>INV002</th><td>Pending</td><td class="text-end">$150.00</td></tr>
                        </tbody>
                        <tfoot><tr><td colspan="2">Total</td><td class="text-end">$400.00</td></tr></tfoot>
                      </table>
                    </div>
                    """,
                    """
                    <VelleTable Caption="Recent invoices">
                        <Header>
                            <tr><th>Invoice</th><th>Status</th><th class="text-end">Amount</th></tr>
                        </Header>
                        <Body>
                            <tr><th>INV001</th><td>Paid</td><td class="text-end">$250.00</td></tr>
                            <tr><th>INV002</th><td>Pending</td><td class="text-end">$150.00</td></tr>
                        </Body>
                        <Footer>
                            <tr><td colspan="2">Total</td><td class="text-end">$400.00</td></tr>
                        </Footer>
                    </VelleTable>
                    """),
            ],
            Parameters:
            [
                new("Caption", "string?", false, "null", "Optional <caption> text."),
                new("Header / Body / Footer", "RenderFragment?", false, "null", "Structured <thead>, <tbody>, and <tfoot> slots."),
                new("ChildContent", "RenderFragment?", false, "null", "Optional raw table sections."),
                new("Class / WrapperClass", "string?", false, "null", "Extra CSS classes for <table> or the scroll wrapper."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <table>."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-tabs",
            Name: "VelleTabs",
            Category: "Elements",
            Summary: "WAI-ARIA tablist and tabpanels with roving tabindex, full keyboard navigation, and enhanced-load state preservation.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "tabs",
            Examples:
            [
                new("tabs-basic", "Tabbed sections in Static SSR",
                    "Pass an ordered list of VelleTab records so both the tablist header and tabpanels render in a single deterministic server pass.",
                    """
                    <div class="tabs" data-tabs>
                      <div class="tabs__list" role="tablist" aria-label="Account sections">
                        <button type="button" class="btn tabs__button" role="tab" data-tabs-target="button" data-tabs-action="select keydown.left->prev keydown.right->next keydown.home->first keydown.end->last">Overview</button>
                        <button type="button" class="btn tabs__button" role="tab" data-tabs-target="button" data-tabs-action="select keydown.left->prev keydown.right->next keydown.home->first keydown.end->last">Settings</button>
                        <button type="button" class="btn tabs__button" role="tab" data-tabs-target="button" data-tabs-action="select keydown.left->prev keydown.right->next keydown.home->first keydown.end->last">Billing</button>
                      </div>
                      <div role="tabpanel" data-tabs-target="tab" tabindex="0"><p>Summary of your workspace activity and recent deployments.</p></div>
                      <div role="tabpanel" data-tabs-target="tab" tabindex="0" hidden><p>Manage display name, notifications, and security keys.</p></div>
                      <div role="tabpanel" data-tabs-target="tab" tabindex="0" hidden><p>View invoices and update your payment method.</p></div>
                    </div>
                    """,
                    """
                    <VelleTabs Id="account-tabs" Label="Account sections" Items="Tabs" />

                    @code {
                        private IReadOnlyList<VelleTab> Tabs =>
                        [
                            new("Overview", @<p>Summary of your workspace activity.</p>),
                            new("Settings", @<p>Manage display name and preferences.</p>),
                            new("Billing", @<p>View invoices and payment methods.</p>)
                        ];
                    }
                    """),
            ],
            Parameters:
            [
                new("Id", "string", true, "—", "Unique base id used for the container and generated tab/panel ARIA ids."),
                new("Label", "string", true, "—", "Accessible name applied to role=\"tablist\" via aria-label."),
                new("Items", "IReadOnlyList<VelleTab>", true, "[]", "Ordered list of tab labels and RenderFragment panels."),
                new("SelectedIndex", "int", false, "0", "Zero-based initially selected tab index (clamped to valid bounds)."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto the root container alongside tabs."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto the root container."),
            ],
            Types:
            [
                new("VelleTab", "record", "Represents a single tab button and its associated panel content.",
                [
                    new("Label (string)", "Visible text rendered inside the role=\"tab\" button."),
                    new("Content (RenderFragment)", "Markup rendered inside the corresponding role=\"tabpanel\"."),
                ]),
            ],
            Notes:
            [
                "Why Items instead of child <VelleTabItem> tags? In Blazor Static SSR, child components render after their parent, so passing Items ensures the role=\"tablist\" buttons and role=\"tabpanel\" panels render cleanly in one server pass.",
                "Supports ArrowLeft, ArrowRight, Home, and End keyboard navigation with wrapping focus.",
            ]),

        // Forms
        new(
            Slug: "velle-combobox",
            Name: "VelleCombobox",
            Category: "Forms",
            Summary: "Styled customizable <select> combobox with optgroup grouping, For value binding, and EditContext validation.",
            Badges: ["Blazor Static SSR", "EditForm Ready"],
            CssComponent: "combobox",
            Examples:
            [
                new("combobox-basic", "Bound select with option groups",
                    "Options sharing a Group string are automatically wrapped in <optgroup> elements.",
                    """
                    <div class="flex flex-col gap-half" style="max-inline-size: 18rem">
                      <label class="text-sm font-medium leading-none" for="docs-combobox">Framework</label>
                      <select id="docs-combobox" class="input combobox" name="Input.Framework">
                        <option value="">Choose a framework...</option>
                        <optgroup label=".NET">
                          <option value="blazor" selected>Blazor Static SSR</option>
                          <option value="razor-pages">Razor Pages</option>
                        </optgroup>
                      </select>
                    </div>
                    """,
                    """
                    <VelleCombobox Name="Input.Framework"
                                   Label="Framework"
                                   Placeholder="Choose a framework..."
                                   For="() => Input!.Framework"
                                   Options="FrameworkOptions" />

                    @code {
                        private static readonly IReadOnlyList<VelleSelectOption> FrameworkOptions =
                        [
                            new("blazor", "Blazor Static SSR", Group: ".NET"),
                            new("razor-pages", "Razor Pages", Group: ".NET")
                        ];
                    }
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name bound on POST."),
                new("Id", "string?", false, "Derived from Name", "Stable DOM id derived from Name when omitted."),
                new("Label", "string?", false, "null", "Optional visible label associated via for."),
                new("Placeholder", "string?", false, "null", "Optional empty placeholder option at the top."),
                new("Value", "string?", false, "null", "Explicit selected value; overrides For."),
                new("For", "Expression<Func<object?>>?", false, "null", "Bound model property expression for selection and EditContext validation."),
                new("Options", "IReadOnlyList<VelleSelectOption>?", false, "null", "Structured options (with optional Group and Disabled flags)."),
                new("ChildContent", "RenderFragment?", false, "null", "Optional custom <option>/<optgroup> markup."),
                new("Class / WrapperClass", "string?", false, "null", "Extra CSS classes for <select> or its wrapper."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <select>."),
            ],
            Types:
            [
                new("VelleSelectOption", "record", "Defines a selectable combobox option.",
                [
                    new("Value (string)", "Submitted value."),
                    new("Label (string)", "Visible label."),
                    new("Disabled (bool)", "Disables the option."),
                    new("Group (string?)", "Optional <optgroup> label."),
                ]),
            ],
            Notes: ["Automatically sets aria-invalid=\"true\" and merges EditContext validation classes inside an EditForm."]),

        new(
            Slug: "velle-datepicker",
            Name: "VelleDatepicker",
            Category: "Forms",
            Summary: "Date, date-time, and time picker powered by a locally bundled Flatpickr instance with EditForm/EditContext integration and automatic cleanup on enhanced navigation.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "Bundled Flatpickr"],
            CssComponent: "datepicker",
            Examples:
            [
                new("datepicker-editform", "Bound to DateOnly in an enhanced EditForm",
                    "Pass For=\"() => Input!.Date\" to format DateOnly/DateTime/TimeOnly automatically and mirror EditContext validation state (aria-invalid and CSS classes) onto the visible input.",
                    """
                    <div class="flex flex-col gap" style="max-inline-size: 20rem;">
                      <label for="docs-blazor-datepicker">Appointment date</label>
                      <input id="docs-blazor-datepicker" type="text" class="input" value="2030-04-12" data-datepicker />
                    </div>
                    """,
                    """
                    <EditForm Model="Input!" FormName="appointment" Enhance OnValidSubmit="Save" class="flex flex-col gap">
                        <DataAnnotationsValidator />
                        <VelleDatepicker Name="Input.Date"
                                         Label="Appointment date"
                                         For="() => Input!.Date" />
                        <ValidationMessage For="() => Input!.Date" />
                        <VelleButton Type="submit" Variant="VelleButtonVariant.Primary">Save date</VelleButton>
                    </EditForm>

                    @code {
                        [SupplyParameterFromForm(FormName = "appointment")]
                        private AppointmentInput? Input { get; set; }

                        protected override void OnInitialized() => Input ??= new() { Date = new DateOnly(2030, 4, 12) };
                    }
                    """),
                new("datepicker-range", "Date range and time modes with strongly-typed enums",
                    "Use VelleDatepickerType and VelleDatepickerMode enums for compile-time safety.",
                    "",
                    """
                    <VelleDatepicker Name="Input.TripDates"
                                     Label="Trip dates"
                                     Mode="VelleDatepickerMode.Range"
                                     ShowMonths="2"
                                     DisabledDates="@(["2030-04-14", "2030-04-15"])"
                                     Placeholder="Select start and end dates" />

                    <VelleDatepicker Name="Input.MeetingTime"
                                     Label="Meeting time"
                                     Type="VelleDatepickerType.Time"
                                     For="() => Input!.MeetingTime" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name bound on POST (for example, Input.Date)."),
                new("Label", "string", true, "—", "Visible <label> text associated with the picker input."),
                new("Id", "string?", false, "Derived from Name", "Unique DOM id for the input. Defaults to a stable slug of Name."),
                new("For", "Expression<Func<object?>>?", false, "null", "Model property expression for automatic wire-format formatting and EditContext validation state."),
                new("Value", "string?", false, "null", "Explicit initial value in submitted wire format; overrides For when provided."),
                new("Placeholder", "string?", false, "null", "Placeholder text shown when empty."),
                new("Type", "VelleDatepickerType", false, "Date", "Picker kind controlling UI and wire format (Date, DateTime, Time)."),
                new("Mode", "VelleDatepickerMode", false, "Single", "Calendar selection mode (Single, Range, Multiple)."),
                new("DisabledDates", "IReadOnlyList<string>", false, "[]", "ISO date strings (yyyy-MM-dd) disabled in the calendar."),
                new("ShowMonths", "int", false, "1", "Number of calendar months displayed side by side."),
                new("DateFormat", "string", false, "\"F d, Y\"", "Human-readable Flatpickr display format when Type is Date."),
                new("DateTimeFormat", "string", false, "\"F d, Y H:i\"", "Human-readable Flatpickr display format when Type is DateTime."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto <input> alongside input and EditContext classes."),
                new("WrapperClass", "string?", false, "null", "Extra CSS classes merged onto the outer wrapper <div>."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <input>."),
            ],
            Types:
            [
                new("VelleDatepickerType", "enum", "Controls the picker UI and submitted wire format.",
                [
                    new("Date", "Calendar date submitted as yyyy-MM-dd (binds directly to DateOnly)."),
                    new("DateTime", "Date and time submitted as yyyy-MM-dd HH:mm."),
                    new("Time", "Time of day submitted as HH:mm (binds directly to TimeOnly)."),
                ]),
                new("VelleDatepickerMode", "enum", "Controls single vs. multi-date selection.",
                [
                    new("Single", "Selects a single date."),
                    new("Range", "Selects start and end dates joined by \" to \"."),
                    new("Multiple", "Selects multiple dates joined by \", \"."),
                ]),
            ],
            Notes:
            [
                "Include <VelleStyles IncludeDatepicker=\"true\" /> in App.razor to load Flatpickr's base CSS and Velle's theme.",
                "Flatpickr's JS is bundled locally under _content/Velle.Blazor/lib/flatpickr/ and lazy-loaded on mount.",
            ]),

        new(
            Slug: "velle-input",
            Name: "VelleInput",
            Category: "Forms",
            Summary: "Unified Static SSR form input and textarea with automatic label, helper description, stable IDs, For value binding, and EditContext validation.",
            Badges: ["Blazor Static SSR", "EditForm Ready"],
            CssComponent: "input",
            Examples:
            [
                new("input-basic", "Text, email, and multiline textarea",
                    "Pass For=\"() => Input!.Email\" inside an EditForm for automatic value rendering and aria-invalid validation styling.",
                    """
                    <div class="flex flex-col gap" style="max-inline-size: 22rem">
                      <div class="flex flex-col gap-half">
                        <label class="text-sm font-medium leading-none" for="docs-input-email">Email</label>
                        <input id="docs-input-email" type="email" class="input" placeholder="ada@example.com" />
                        <p class="text-sm text-subtle">We never share your email address.</p>
                      </div>
                      <div class="flex flex-col gap-half">
                        <label class="text-sm font-medium leading-none" for="docs-input-bio">Bio</label>
                        <textarea id="docs-input-bio" rows="3" class="input" placeholder="Tell us about yourself"></textarea>
                      </div>
                    </div>
                    """,
                    """
                    <VelleInput Name="Input.Email"
                                Label="Email"
                                Description="We never share your email address."
                                Type="email"
                                Placeholder="ada@example.com"
                                For="() => Input!.Email" />

                    <VelleInput Name="Input.Bio"
                                Label="Bio"
                                Multiline="true"
                                Rows="3"
                                Placeholder="Tell us about yourself"
                                For="() => Input!.Bio" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name submitted on POST."),
                new("Id", "string?", false, "Derived from Name", "Stable DOM id derived from Name when omitted."),
                new("Label", "string?", false, "null", "Optional visible label rendered above the control."),
                new("Description", "string?", false, "null", "Optional helper text rendered below the control."),
                new("Type", "string", false, "\"text\"", "Native HTML input type (text, email, password, number, checkbox, etc.)."),
                new("Multiline", "bool", false, "false", "When true, renders a <textarea>."),
                new("Rows", "int?", false, "null", "Optional rows attribute for <textarea>."),
                new("Value / Checked", "string? / bool?", false, "null", "Explicit value or checked state; overrides For."),
                new("For", "Expression<Func<object?>>?", false, "null", "Bound model property expression for initial value and EditContext validation."),
                new("Placeholder", "string?", false, "null", "Optional placeholder text."),
                new("Class / WrapperClass", "string?", false, "null", "Extra CSS classes for the control or wrapper."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <input> or <textarea>."),
            ],
            Types: [],
            Notes: ["Automatically sets aria-invalid=\"true\" and merges EditContext.FieldCssClass(...) when validation messages exist."]),

        new(
            Slug: "velle-switch",
            Name: "VelleSwitch",
            Category: "Forms",
            Summary: "Accessible role=\"switch\" boolean toggle with optional description, size preset, hidden false fallback for Static SSR POST binding, and EditContext validation.",
            Badges: ["Blazor Static SSR", "EditForm Ready"],
            CssComponent: "switch",
            Examples:
            [
                new("switch-basic", "Basic and described switches",
                    "Includes a hidden false fallback input by default so unchecking a true-default switch binds false on POST.",
                    """
                    <div class="flex flex-col gap" style="max-inline-size: 24rem">
                      <div class="flex items-center gap">
                        <input type="checkbox" id="docs-switch-basic" class="switch" role="switch" checked />
                        <label class="text-sm font-medium" for="docs-switch-basic">Airplane mode</label>
                      </div>
                      <div class="flex items-start gap">
                        <div class="flex flex-1 flex-col">
                          <label class="text-sm leading-none font-medium mbe-1" for="docs-switch-desc">Email alerts</label>
                          <p class="text-sm text-subtle">Receive summaries when deployments finish.</p>
                        </div>
                        <input type="checkbox" id="docs-switch-desc" class="switch switch--sm" role="switch" />
                      </div>
                    </div>
                    """,
                    """
                    <VelleSwitch Name="Input.AirplaneMode"
                                 Label="Airplane mode"
                                 For="() => Input!.AirplaneMode" />

                    <VelleSwitch Name="Input.EmailAlerts"
                                 Label="Email alerts"
                                 Description="Receive summaries when deployments finish."
                                 Size="VelleSwitchSize.Small"
                                 For="() => Input!.EmailAlerts" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name submitted on POST."),
                new("Label", "string", true, "—", "Visible label associated with the switch."),
                new("Id", "string?", false, "Derived from Name", "Stable DOM id derived from Name when omitted."),
                new("Description", "string?", false, "null", "Optional helper text displayed alongside the label."),
                new("Checked", "bool?", false, "null", "Explicit checked state; overrides For."),
                new("Value", "string", false, "\"true\"", "Submitted value when switched on."),
                new("IncludeHiddenFalse", "bool", false, "true", "Emits a hidden false input so unchecking binds false in Static SSR."),
                new("For", "Expression<Func<object?>>?", false, "null", "Bound boolean property expression."),
                new("Size", "VelleSwitchSize", false, "Default", "Size preset (Default or Small)."),
                new("Class / WrapperClass", "string?", false, "null", "Extra CSS classes."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <input>."),
            ],
            Types:
            [
                new("VelleSwitchSize", "enum", "Switch size presets.",
                [
                    new("Default", "Standard switch size."),
                    new("Small", "Compact switch--sm size."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-toggle",
            Name: "VelleToggle",
            Category: "Forms",
            Summary: "Button-styled pressed toggle backed by a native checkbox for Static SSR forms and VelleGroup toolbars.",
            Badges: ["Blazor Static SSR", "EditForm Ready"],
            CssComponent: "toggle",
            Examples:
            [
                new("toggle-basic", "Single toggle and formatting toolbar",
                    "Combine multiple VelleToggle controls inside <VelleGroup>.",
                    """
                    <div class="group" role="group" aria-label="Formatting">
                      <label class="btn btn--toggle"><input type="checkbox" checked><span class="font-bold">Bold</span></label>
                      <label class="btn btn--toggle"><input type="checkbox"><span>Italic</span></label>
                      <label class="btn btn--toggle"><input type="checkbox"><span>Underline</span></label>
                    </div>
                    """,
                    """
                    <VelleGroup Label="Formatting">
                        <VelleToggle Name="Input.Bold" For="() => Input!.Bold"><span class="font-bold">Bold</span></VelleToggle>
                        <VelleToggle Name="Input.Italic" For="() => Input!.Italic"><span>Italic</span></VelleToggle>
                        <VelleToggle Name="Input.Underline" For="() => Input!.Underline"><span>Underline</span></VelleToggle>
                    </VelleGroup>
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name submitted on POST."),
                new("Id", "string?", false, "Derived from Name", "Stable DOM id for the underlying checkbox."),
                new("Checked", "bool?", false, "null", "Explicit pressed state; overrides For."),
                new("Value", "string", false, "\"true\"", "Submitted value when pressed."),
                new("IncludeHiddenFalse", "bool", false, "true", "Emits a hidden false input for Static SSR boolean binding."),
                new("Disabled", "bool", false, "false", "Disables the toggle checkbox."),
                new("For", "Expression<Func<object?>>?", false, "null", "Bound boolean property expression."),
                new("ChildContent", "RenderFragment?", false, "null", "Toggle label/icon content."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto .btn.btn--toggle."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <label>."),
            ],
            Types: [],
            Notes: []),

        // Overlays
        new(
            Slug: "velle-dialog",
            Name: "VelleDialog",
            Category: "Overlays",
            Summary: "Native modal <dialog> synchronized with Blazor Static SSR form posts and enhanced navigation via Alpine.js CSP.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "dialog",
            Examples:
            [
                new("dialog-form", "Dialog with an enhanced EditForm",
                    "Bind Open to a server boolean so validation errors keep the modal open after an enhanced POST, while successful submissions close it cleanly.",
                    """
                    <button type="button" class="btn" commandfor="docs-blazor-dialog" command="show-modal">Edit profile</button>
                    <dialog id="docs-blazor-dialog" class="dialog" data-dialog data-dialog-action="click->closeOnClickOutside" aria-labelledby="docs-blazor-dialog-title">
                      <div class="dialog__content flex flex-col gap">
                        <h2 id="docs-blazor-dialog-title" class="font-semibold">Edit profile</h2>
                        <form class="flex flex-col gap" action="/profile">
                          <label for="docs-display-name">Display name</label>
                          <input id="docs-display-name" class="input" name="Input.Name" value="Ada Lovelace" />
                          <button type="submit" class="btn btn--primary">Save</button>
                        </form>
                        <button type="button" class="btn btn--plain" commandfor="docs-blazor-dialog" command="close">Close</button>
                      </div>
                    </dialog>
                    """,
                    """
                    <VelleDialog Id="profile-dialog"
                                 Title="Edit profile"
                                 TriggerText="Edit profile"
                                 Open="dialogOpen">
                        <EditForm Model="Input!" FormName="profile" Enhance
                                  OnInvalidSubmit="() => dialogOpen = true"
                                  OnValidSubmit="SaveProfile"
                                  class="flex flex-col gap">
                            <DataAnnotationsValidator />
                            <VelleInput Id="display-name" Name="Input.Name" Label="Display name" For="() => Input!.Name" />
                            <ValidationMessage For="() => Input!.Name" />
                            <VelleButton Type="submit" Variant="VelleButtonVariant.Primary">Save</VelleButton>
                        </EditForm>
                    </VelleDialog>
                    """),
                new("dialog-custom-chrome", "Custom trigger and footer slots",
                    "Supply Trigger or Footer fragments when you need custom button variants, destructive styling, or <form method=\"dialog\"> actions.",
                    "",
                    """
                    <VelleDialog Id="delete-dialog" Title="Delete project" Class="dialog--sm">
                        <Trigger>
                            <VelleButton Variant="VelleButtonVariant.Negative" x-on:click="show">Delete project</VelleButton>
                        </Trigger>
                        <ChildContent>
                            <p>This action permanently removes the project and its deployments.</p>
                        </ChildContent>
                        <Footer>
                            <div class="flex justify-end gap">
                                <VelleButton Variant="VelleButtonVariant.Plain" x-on:click="close">Cancel</VelleButton>
                                <VelleButton Type="submit" form="delete-form" Variant="VelleButtonVariant.Negative">Delete</VelleButton>
                            </div>
                        </Footer>
                    </VelleDialog>
                    """),
            ],
            Parameters:
            [
                new("Id", "string", true, "—", "Unique DOM id for the <dialog> element (used for aria-controls and heading id)."),
                new("Title", "string", true, "—", "Heading rendered inside the dialog and referenced by aria-labelledby."),
                new("TriggerText", "string?", false, "null", "Text for the default trigger button. Omit both TriggerText and Trigger to control solely via Open."),
                new("TriggerClass", "string?", false, "null", "Extra CSS classes merged onto the default trigger button alongside btn."),
                new("Trigger", "RenderFragment?", false, "null", "Custom trigger markup inside the dialog's Alpine scope (add x-on:click=\"show\" to open)."),
                new("Open", "bool", false, "false", "Opens or keeps the modal open after server rendering or enhanced form posts."),
                new("ShowCloseButton", "bool", false, "true", "Renders the default close button when Footer is not provided."),
                new("CloseText", "string", false, "\"Close\"", "Label text for the default close button."),
                new("Footer", "RenderFragment?", false, "null", "Custom footer markup replacing the default close button."),
                new("Class", "string?", false, "null", "Extra CSS classes merged onto <dialog> alongside dialog."),
                new("ChildContent", "RenderFragment?", false, "null", "Main content rendered inside the dialog."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes splatted onto <dialog>."),
            ],
            Types: [],
            Notes:
            [
                "Alpine syncs native modal state on velle-enhanced-load so Blazor DOM patches never leave a modal stuck in the top layer.",
                "Native Escape, backdrop clicks, and <form method=\"dialog\"> buttons fire the close event and reset data-velle-open.",
            ]),

        new(
            Slug: "velle-dropdown",
            Name: "VelleDropdown",
            Category: "Overlays",
            Summary: "Popover dropdown menu combining a native popover trigger with VelleMenu roving keyboard navigation.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "dropdown",
            Examples:
            [
                new("dropdown-basic", "Dropdown with headers, shortcuts, and separators",
                    "Compose VelleMenuHeader, VelleMenuItem, and VelleMenuSeparator inside <VelleDropdown>.",
                    """
                    <button type="button" class="btn" popovertarget="docs-blazor-dropdown" aria-haspopup="true">Account</button>
                    <div popover id="docs-blazor-dropdown" class="popover popover--block-end-start" style="--popover-size: 12rem" role="menu" aria-label="Account">
                      <div class="menu" data-menu>
                        <div class="menu__header">My Account</div>
                        <button type="button" class="btn menu__item" popovertarget="docs-blazor-dropdown" data-menu-target="item" role="menuitem"><span class="icon icon--copy" aria-hidden="true"></span><span>Copy link</span><span class="menu__item-key">⌘C</span></button>
                        <a class="btn menu__item" data-menu-target="item" role="menuitem" href="#">Profile</a>
                        <hr class="menu__separator" role="separator">
                        <button type="button" class="btn menu__item" role="menuitem" aria-disabled="true" tabindex="-1">Archive</button>
                      </div>
                    </div>
                    """,
                    """
                    <VelleDropdown Id="account-menu" Label="Account" TriggerText="Account">
                        <VelleMenuHeader>My Account</VelleMenuHeader>
                        <VelleMenuItem Icon="copy" Shortcut="⌘C">Copy link</VelleMenuItem>
                        <VelleMenuItem Href="/profile">Profile</VelleMenuItem>
                        <VelleMenuSeparator />
                        <VelleMenuItem Disabled="true">Archive</VelleMenuItem>
                    </VelleDropdown>
                    """),
            ],
            Parameters:
            [
                new("Id", "string", true, "—", "Unique DOM id for the dropdown popover."),
                new("Label", "string", true, "—", "Accessible aria-label for role=\"menu\"."),
                new("Placement", "VellePopoverPlacement", false, "BlockEndStart", "Anchor placement relative to the trigger."),
                new("TriggerText / TriggerClass", "string?", false, "null", "Text and extra classes for the default trigger button."),
                new("Trigger", "RenderFragment?", false, "null", "Optional custom trigger markup (include popovertarget=\"@Id\")."),
                new("ChildContent", "RenderFragment?", false, "null", "Menu content (VelleMenuItem, VelleMenuHeader, VelleMenuSeparator)."),
                new("Class / AdditionalAttributes", "string? / Dictionary", false, "null", "Extra classes and HTML attributes applied to the popover."),
            ],
            Types: [],
            Notes: ["Button menu items inside <VelleDropdown> automatically close the dropdown on click via cascaded popovertarget."]),

        new(
            Slug: "velle-flash",
            Name: "VelleFlash",
            Category: "Overlays",
            Summary: "Auto-dismissing toast notification built on popover=\"manual\" and Alpine.js CSP — ideal after enhanced Static SSR form posts.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "flash",
            Examples:
            [
                new("flash-basic", "Render a toast after a form post",
                    "Conditionally render <VelleFlash> when a server submit handler sets a status message; hovering or focusing pauses auto-dismiss.",
                    "",
                    """
                    @if (savedMessage is not null)
                    {
                        <VelleFlash Message="@savedMessage" Icon="circle-check" />
                    }
                    """),
            ],
            Parameters:
            [
                new("Message", "string?", false, "null", "Short status message displayed inside the toast."),
                new("Icon", "string?", false, "null", "Optional Velle icon name (e.g. \"circle-check\", \"circle-alert\")."),
                new("Extended", "bool", false, "false", "Extends visible duration from 5 seconds to 12 seconds (flash--extended)."),
                new("Role", "string", false, "\"status\"", "ARIA role (use \"alert\" for error toasts)."),
                new("ChildContent", "RenderFragment?", false, "null", "Optional custom content inside .flash__content."),
                new("Class / ContentClass / AdditionalAttributes", "string? / Dictionary", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Alpine calls showPopover() on mount and hides the popover when the CSS slide animation finishes."]),

        new(
            Slug: "velle-menu",
            Name: "VelleMenu",
            Category: "Overlays",
            Summary: "Vertical menu container with roving tabindex keyboard navigation (ArrowUp, ArrowDown, Home, End) and VelleMenuItem / VelleMenuHeader / VelleMenuSeparator primitives.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "menu",
            Examples:
            [
                new("menu-basic", "Standalone menu",
                    "Use directly inside custom popovers or sidebars, or via <VelleDropdown>.",
                    """
                    <div class="card" style="max-inline-size: 14rem; --card-padding: var(--size-1)">
                      <div class="menu" data-menu>
                        <div class="menu__header">Edit</div>
                        <button type="button" class="btn menu__item" data-menu-target="item" role="menuitem"><span>Copy</span><span class="menu__item-key">⌘C</span></button>
                        <button type="button" class="btn menu__item" data-menu-target="item" role="menuitem"><span>Download</span><span class="menu__item-key">⌘D</span></button>
                        <hr class="menu__separator" role="separator">
                        <button type="button" class="btn menu__item" role="menuitem" aria-disabled="true" tabindex="-1">Share</button>
                      </div>
                    </div>
                    """,
                    """
                    <VelleMenu>
                        <VelleMenuHeader>Edit</VelleMenuHeader>
                        <VelleMenuItem Shortcut="⌘C">Copy</VelleMenuItem>
                        <VelleMenuItem Shortcut="⌘D">Download</VelleMenuItem>
                        <VelleMenuSeparator />
                        <VelleMenuItem Disabled="true">Share</VelleMenuItem>
                    </VelleMenu>
                    """),
            ],
            Parameters:
            [
                new("Href / Type (VelleMenuItem)", "string? / string", false, "null / \"button\"", "Renders an <a> when Href is set, otherwise <button>."),
                new("Icon / Shortcut (VelleMenuItem)", "string?", false, "null", "Optional leading icon and trailing keyboard shortcut hint."),
                new("Disabled (VelleMenuItem)", "bool", false, "false", "Sets aria-disabled=\"true\" and skips the item during roving focus."),
                new("CloseOnClick / PopoverTarget (VelleMenuItem)", "bool / string?", false, "true / cascaded", "Controls popover dismissal when clicked inside a dropdown."),
            ],
            Types: [],
            Notes: ["Automatically focuses the first enabled item whenever the menu enters the viewport via IntersectionObserver."]),

        new(
            Slug: "velle-popover",
            Name: "VellePopover",
            Category: "Overlays",
            Summary: "Anchored floating panel supporting native click popovers and Alpine hover tooltips/cards.",
            Badges: ["Blazor Static SSR", "Native Popover", "Alpine.js CSP"],
            CssComponent: "popover",
            Examples:
            [
                new("popover-basic", "Click popover and hover tooltip",
                    "Use Placement to anchor above or below the trigger, and TriggerMode=\"VellePopoverTrigger.Hover\" for hover cards or tooltips.",
                    """
                    <div class="flex items-center gap">
                      <button type="button" class="btn" popovertarget="docs-blazor-popover">Open popover</button>
                      <div popover id="docs-blazor-popover" class="popover popover--block-end-start text-sm p-3" role="dialog" aria-label="Dimensions">
                        <div class="flex flex-col">
                          <h3 class="font-medium leading-none mbe-1">Dimensions</h3>
                          <p class="text-subtle">Anchored below the trigger's start edge.</p>
                        </div>
                      </div>
                    </div>
                    """,
                    """
                    <VellePopover Id="dimensions-popover" TriggerText="Open popover" Label="Dimensions">
                        <div class="flex flex-col text-sm p-3">
                            <h3 class="font-medium leading-none mbe-1">Dimensions</h3>
                            <p class="text-subtle">Anchored below the trigger's start edge.</p>
                        </div>
                    </VellePopover>

                    <VellePopover Id="save-tip" TriggerText="Save" TriggerMode="VellePopoverTrigger.Hover" PopoverMode="hint" Role="tooltip" Class="bg-black text-reversed text-xs pb-1 pi-2">
                        Save changes <VelleKbd Tooltip="true">⌘S</VelleKbd>
                    </VellePopover>
                    """),
            ],
            Parameters:
            [
                new("Id", "string", true, "—", "Unique DOM id matched by popovertarget."),
                new("Placement", "VellePopoverPlacement", false, "BlockEndStart", "Anchor alignment relative to the trigger."),
                new("TriggerMode", "VellePopoverTrigger", false, "Click", "Click (native popovertarget) or Hover (Alpine hover controller)."),
                new("PopoverMode", "string", false, "\"auto\"", "HTML popover attribute value (auto, hint, or manual)."),
                new("TriggerText / TriggerClass / Trigger", "string? / RenderFragment?", false, "null", "Default trigger button or custom trigger slot."),
                new("Role / Label", "string?", false, "\"dialog\" / null", "ARIA role and aria-label."),
                new("Class / ChildContent / AdditionalAttributes", "various", false, "null", "Styling and content."),
            ],
            Types:
            [
                new("VellePopoverPlacement", "enum", "Anchor positions for VellePopover and VelleDropdown.",
                [
                    new("BlockEndStart / BlockEndCenter / BlockEndEnd", "Below the trigger (start, center, or end aligned)."),
                    new("BlockStartStart / BlockStartCenter / BlockStartEnd", "Above the trigger (start, center, or end aligned)."),
                    new("Unanchored", "Manual positioning without CSS anchor."),
                ]),
                new("VellePopoverTrigger", "enum", "Popover trigger modes.",
                [
                    new("Click", "Opens via native popovertarget on click."),
                    new("Hover", "Opens on mouseenter and closes on mouseleave via Alpine.js."),
                ]),
            ],
            Notes: []),

        new(
            Slug: "velle-sheet",
            Name: "VelleSheet",
            Category: "Overlays",
            Summary: "Full-height slide-over panel from the left or right edge built on native <dialog> and synchronized with Static SSR via Alpine.js CSP.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "sheet",
            Examples:
            [
                new("sheet-basic", "Right-side sheet drawer",
                    "Set Side=\"VelleSheetSide.Left\" for slide-out navigation drawers, or bind Open for server-driven validation reopens.",
                    """
                    <button type="button" class="btn" commandfor="docs-blazor-sheet" command="show-modal">Open sheet</button>
                    <dialog id="docs-blazor-sheet" class="sheet sheet--right" data-dialog data-dialog-action="click->closeOnClickOutside" aria-labelledby="docs-blazor-sheet-title">
                      <button type="button" class="btn btn--plain sheet__close" commandfor="docs-blazor-sheet" command="close">
                        <span class="icon icon--x" aria-hidden="true"></span>
                        <span class="sr-only">Close</span>
                      </button>
                      <div class="sheet__content flex flex-col gap">
                        <div class="flex flex-col">
                          <h3 id="docs-blazor-sheet-title" class="font-medium leading-none mbe-1">Edit settings</h3>
                          <p class="text-sm text-subtle">Changes apply immediately after saving.</p>
                        </div>
                        <p class="text-sm">Place any form or navigation links inside the sheet body.</p>
                      </div>
                    </dialog>
                    """,
                    """
                    <VelleSheet Id="settings-sheet"
                                Side="VelleSheetSide.Right"
                                Title="Edit settings"
                                Description="Changes apply immediately after saving."
                                TriggerText="Open sheet"
                                Open="sheetOpen">
                        <p class="text-sm">Place any form or navigation links inside the sheet body.</p>
                    </VelleSheet>
                    """),
            ],
            Parameters:
            [
                new("Id", "string", true, "—", "Unique DOM id for the <dialog> element."),
                new("Side", "VelleSheetSide", false, "Right", "Edge from which the sheet slides in (Right or Left)."),
                new("Title / Description", "string?", false, "null", "Optional header text wired to aria-labelledby and aria-describedby."),
                new("Label", "string?", false, "null", "Fallback aria-label when Title is omitted."),
                new("TriggerText / TriggerClass / Trigger", "string? / RenderFragment?", false, "null", "Default trigger button or custom trigger inside Alpine scope."),
                new("Open", "bool", false, "false", "Synchronizes open/closed state on render and enhanced form posts."),
                new("ShowCloseButton / CloseLabel", "bool / string", false, "true / \"Close\"", "Controls the corner close button (.sheet__close)."),
                new("Class / ContentClass / AdditionalAttributes", "various", false, "null", "Styling and extra HTML attributes."),
            ],
            Types:
            [
                new("VelleSheetSide", "enum", "Sheet slide-in edges.",
                [
                    new("Right", "Slides in from the right (sheet--right)."),
                    new("Left", "Slides in from the left (sheet--left)."),
                ]),
            ],
            Notes: ["Reuses the velleDialog Alpine controller so Escape, backdrop clicks, and enhanced form validation behave identically to VelleDialog."]),

        // Interactive Forms (Phase 3)
        new(
            Slug: "velle-input-clearable",
            Name: "VelleInputClearable",
            Category: "Forms",
            Summary: "Text or search input with a clear button that appears automatically whenever the input has a value.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "EditForm Ready"],
            CssComponent: "input_clearable",
            Examples:
            [
                new("clearable-basic", "Clearable search input",
                    "Uses CSS :placeholder-shown to hide the clear button when empty and Alpine.js CSP to clear and refocus on click.",
                    """
                    <div class="input input--clearable input--actor flex items-center gap" style="max-inline-size: 20rem" data-input-clearable>
                      <input type="search" value="Blazor SSR" placeholder="Search..." aria-label="Search" data-input-clearable-target="input">
                      <button type="button" class="btn btn--plain" data-input-clearable-action="clear">
                        <span class="icon icon--x" aria-hidden="true"></span>
                        <span class="sr-only">Clear input</span>
                      </button>
                    </div>
                    """,
                    """
                    <VelleInputClearable Name="Input.Query"
                                         Label="Search"
                                         Placeholder="Search..."
                                         For="() => Input!.Query" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name submitted on POST."),
                new("Id / Label / Placeholder", "string?", false, "Derived / null / \" \"", "DOM id, optional label, and placeholder."),
                new("Type", "string", false, "\"search\"", "HTML input type."),
                new("Value / For", "string? / Expression", false, "null", "Initial value and EditContext validation binding."),
                new("ClearLabel", "string", false, "\"Clear input\"", "Screen-reader label for the clear button."),
                new("Class / WrapperClass / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-input-copyable",
            Name: "VelleInputCopyable",
            Category: "Forms",
            Summary: "Read-only field with a clipboard copy button and built-in confirmation animation.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "input_copyable",
            Examples:
            [
                new("copyable-basic", "Copyable API token",
                    "Copies Value to navigator.clipboard and triggers Velle's .input--copied animation.",
                    """
                    <div class="input input--actor flex items-center gap" style="max-inline-size: 22rem" data-input-copyable>
                      <input type="text" value="velle_live_987654321" readonly aria-label="API token" data-input-copyable-target="input">
                      <button type="button" class="btn btn--plain" data-input-copyable-action="copy">
                        <span class="icon icon--copy" aria-hidden="true"></span>
                        <span class="sr-only">Copy to clipboard</span>
                      </button>
                    </div>
                    """,
                    """
                    <VelleInputCopyable Label="API token" Value="@apiToken" />
                    """),
            ],
            Parameters:
            [
                new("Value", "string", true, "\"\"", "Read-only text copied to the clipboard."),
                new("Name / Id / Label", "string?", false, "null", "Optional form name, DOM id, and visible label."),
                new("CopyLabel", "string", false, "\"Copy to clipboard\"", "Screen-reader label for the copy button."),
                new("Class / WrapperClass / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-input-revealable",
            Name: "VelleInputRevealable",
            Category: "Forms",
            Summary: "Password field with an eye / eye-off button to toggle plaintext visibility via Alpine.js CSP.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "EditForm Ready"],
            CssComponent: "input_revealable",
            Examples:
            [
                new("revealable-basic", "Password input with visibility toggle",
                    "Integrates with EditForm and EditContext validation state.",
                    """
                    <div class="input input--actor input--revealable flex items-center gap" style="max-inline-size: 20rem" data-input-revealable>
                      <input type="password" value="Definitely not 123" aria-label="Password" data-input-revealable-target="input">
                      <button type="button" class="btn btn--plain" data-input-revealable-action="reveal">
                        <span class="icon" aria-hidden="true"></span>
                        <span class="sr-only">Toggle password visibility</span>
                      </button>
                    </div>
                    """,
                    """
                    <VelleInputRevealable Name="Input.Password"
                                          Label="Password"
                                          For="() => Input!.Password" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name submitted on POST."),
                new("Id / Label / Placeholder", "string?", false, "Derived / null", "DOM id, optional label, and placeholder."),
                new("Value / For", "string? / Expression", false, "null", "Initial value and EditContext validation binding."),
                new("ToggleLabel", "string", false, "\"Toggle password visibility\"", "Screen-reader label for the toggle button."),
                new("Class / WrapperClass / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: []),

        new(
            Slug: "velle-input-otp",
            Name: "VelleInputOtp",
            Category: "Forms",
            Summary: "One-time passcode field rendered as visual character slots over a single real <input> for native paste and SMS/email autofill.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "EditForm Ready"],
            CssComponent: "input_otp",
            Examples:
            [
                new("otp-basic", "6-digit OTP split into two groups",
                    "Set GroupSize=\"3\" to insert a visual divider between groups, and Pattern to control allowed characters.",
                    """
                    <div class="input-otp" data-input-otp>
                      <div class="input-otp__group">
                        <div class="input-otp__slot" data-input-otp-target="slot"></div>
                        <div class="input-otp__slot" data-input-otp-target="slot"></div>
                        <div class="input-otp__slot" data-input-otp-target="slot"></div>
                      </div>
                      <div class="input-otp__separator" role="separator"><span class="icon icon--minus" aria-hidden="true"></span></div>
                      <div class="input-otp__group">
                        <div class="input-otp__slot" data-input-otp-target="slot"></div>
                        <div class="input-otp__slot" data-input-otp-target="slot"></div>
                        <div class="input-otp__slot" data-input-otp-target="slot"></div>
                      </div>
                      <input class="input-otp__input" name="code" aria-label="Verification code" data-input-otp-target="input">
                    </div>
                    """,
                    """
                    <VelleInputOtp Name="Input.Code"
                                   Label="Verification code"
                                   Length="6"
                                   GroupSize="3"
                                   Pattern="VelleOtpPattern.Digits"
                                   For="() => Input!.Code" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name submitted on POST."),
                new("Id / Label", "string?", false, "Derived / null", "DOM id and optional visible label."),
                new("Length", "int", false, "6", "Number of character slots."),
                new("GroupSize", "int?", false, "null", "Optional group size to insert .input-otp__separator dividers (e.g. 3 for 3-3)."),
                new("Pattern", "VelleOtpPattern", false, "Digits", "Character filter (Digits, Chars, or DigitsAndChars)."),
                new("Large", "bool", false, "false", "Applies input-otp--lg for larger slots."),
                new("Value / For", "string? / Expression", false, "null", "Initial value and EditContext validation binding."),
                new("Class / WrapperClass / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types:
            [
                new("VelleOtpPattern", "enum", "Character filtering modes for VelleInputOtp.",
                [
                    new("Digits", "Decimal digits only (inputmode=\"numeric\")."),
                    new("Chars", "Unicode letters only."),
                    new("DigitsAndChars", "Letters and digits."),
                ]),
            ],
            Notes: ["Dispatches a bubbling velle:input-otp:complete CustomEvent with { detail: { value } } when all slots are filled."]),

        // Layout
        new(
            Slug: "velle-color-scheme",
            Name: "VelleColorScheme",
            Category: "Layout",
            Summary: "Light, dark, and system theme switcher dropdown that persists the user's choice in localStorage and updates <html data-color-scheme>.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "color_scheme",
            Examples:
            [
                new("color-scheme-basic", "Header theme switcher",
                    "Add data-color-scheme to <html> in App.razor and place <VelleColorScheme /> in your navigation bar.",
                    """
                    <button type="button" class="btn btn--icon" popovertarget="docs-blazor-theme" aria-haspopup="true">
                      <span class="icon icon--sun icon--color-scheme-light" aria-hidden="true"></span>
                      <span class="icon icon--moon icon--color-scheme-dark" aria-hidden="true"></span>
                      <span class="sr-only">Theme</span>
                    </button>
                    <div popover id="docs-blazor-theme" class="popover popover--block-end-start" role="menu" aria-label="Theme">
                      <div class="menu" data-menu>
                        <button type="button" class="btn menu__item" popovertarget="docs-blazor-theme" data-color-scheme-action="setLight" data-menu-target="item" role="menuitem">Light</button>
                        <button type="button" class="btn menu__item" popovertarget="docs-blazor-theme" data-color-scheme-action="setDark" data-menu-target="item" role="menuitem">Dark</button>
                        <button type="button" class="btn menu__item" popovertarget="docs-blazor-theme" data-color-scheme-action="setSystem" data-menu-target="item" role="menuitem">System</button>
                      </div>
                    </div>
                    """,
                    """
                    @* In App.razor: <html lang="en" data-color-scheme> *@
                    <VelleColorScheme Id="site-theme" Placement="VellePopoverPlacement.BlockEndEnd" />
                    """),
            ],
            Parameters:
            [
                new("Id", "string", false, "\"velle-color-scheme\"", "Unique DOM id for the theme popover."),
                new("Placement", "VellePopoverPlacement", false, "BlockEndEnd", "Popover anchor placement."),
                new("Label", "string", false, "\"Theme\"", "Accessible label for the trigger and menu."),
                new("LightText / DarkText / SystemText", "string", false, "\"Light\" / \"Dark\" / \"System\"", "Localized menu labels."),
                new("Class / AdditionalAttributes", "string? / Dictionary", false, "null", "Extra classes and HTML attributes applied to the trigger button."),
            ],
            Types: [],
            Notes: ["Dispatches a velle:color-scheme:change event on document whenever the theme changes."]),

        new(
            Slug: "velle-carousel",
            Name: "VelleCarousel",
            Category: "Elements",
            Summary: "Horizontal CSS scroll-snap carousel with previous/next controls and keyboard arrow navigation.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "carousel",
            Examples:
            [
                new("carousel-basic", "Scroll-snap slide carousel",
                    "Compose VelleCarousel with VelleCarouselItem slides. ArrowLeft and ArrowRight scroll between items.",
                    """
                    <div class="carousel" role="region" aria-roledescription="carousel" aria-label="Featured">
                      <button type="button" class="btn btn--icon"><span class="icon icon--chevron-left" aria-hidden="true"></span><span class="sr-only">Previous slide</span></button>
                      <div class="carousel__content" tabindex="-1">
                        <div class="carousel__item"><div class="card p-4 text-center font-medium">Slide 1</div></div>
                        <div class="carousel__item"><div class="card p-4 text-center font-medium">Slide 2</div></div>
                        <div class="carousel__item"><div class="card p-4 text-center font-medium">Slide 3</div></div>
                      </div>
                      <button type="button" class="btn btn--icon"><span class="icon icon--chevron-right" aria-hidden="true"></span><span class="sr-only">Next slide</span></button>
                    </div>
                    """,
                    """
                    <VelleCarousel Label="Featured releases">
                        <VelleCarouselItem>
                            <VelleCard Title="Slide 1"><p>First highlight.</p></VelleCard>
                        </VelleCarouselItem>
                        <VelleCarouselItem>
                            <VelleCard Title="Slide 2"><p>Second highlight.</p></VelleCard>
                        </VelleCarouselItem>
                        <VelleCarouselItem>
                            <VelleCard Title="Slide 3"><p>Third highlight.</p></VelleCard>
                        </VelleCarouselItem>
                    </VelleCarousel>
                    """),
            ],
            Parameters:
            [
                new("Label", "string", false, "\"Carousel\"", "Accessible aria-label for the carousel region."),
                new("PreviousLabel / NextLabel", "string", false, "\"Previous slide\" / \"Next slide\"", "Screen-reader labels for navigation buttons."),
                new("ChildContent", "RenderFragment?", false, "null", "VelleCarouselItem slides."),
                new("Class / ContentClass / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Uses native CSS scroll-snap on .carousel__content with smooth horizontal scrolling via Alpine.js."]),

        new(
            Slug: "velle-command",
            Name: "VelleCommand",
            Category: "Overlays",
            Summary: "Filterable command palette with grouped options, keyboard navigation, keywords matching, and empty state.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "command",
            Examples:
            [
                new("command-basic", "Searchable command menu",
                    "Nest VelleCommandGroup, VelleCommandItem, and VelleCommandSeparator inside VelleCommand.",
                    """
                    <div class="command" style="max-inline-size: 24rem">
                      <label class="input input--actor flex items-center gap command__input">
                        <span class="icon icon--search" aria-hidden="true"></span>
                        <input type="text" placeholder="Type a command or search…" aria-label="Search commands" />
                      </label>
                      <div class="command__list" role="listbox" aria-label="Commands">
                        <div class="command__group" role="group">
                          <div class="command__heading">Actions</div>
                          <button type="button" class="btn command__item" role="option" data-selected aria-selected="true">
                            <span class="icon icon--settings" aria-hidden="true"></span>
                            <span>Open settings</span>
                            <kbd class="command__item-key">⌘,</kbd>
                          </button>
                          <button type="button" class="btn command__item" role="option">
                            <span class="icon icon--upload" aria-hidden="true"></span>
                            <span>Deploy release</span>
                            <kbd class="command__item-key">⌘⇧D</kbd>
                          </button>
                        </div>
                      </div>
                    </div>
                    """,
                    """
                    <VelleCommand Id="quick-actions" Label="Quick actions">
                        <VelleCommandGroup Heading="Actions">
                            <VelleCommandItem Value="Open settings" Icon="settings" Shortcut="⌘," Href="/settings">
                                Open settings
                            </VelleCommandItem>
                            <VelleCommandItem Value="Deploy release" Keywords="ship publish" Icon="upload" Shortcut="⌘⇧D">
                                Deploy release
                            </VelleCommandItem>
                        </VelleCommandGroup>
                        <VelleCommandSeparator />
                        <VelleCommandGroup Heading="Help">
                            <VelleCommandItem Value="Documentation" Icon="book-open" Href="/docs">
                                Documentation
                            </VelleCommandItem>
                        </VelleCommandGroup>
                    </VelleCommand>
                    """),
            ],
            Parameters:
            [
                new("Id", "string", true, "—", "Unique DOM id prefix for the command listbox ({Id}-list)."),
                new("Label / SearchLabel", "string", false, "\"Commands\" / \"Search commands\"", "Accessible labels for the listbox and search input."),
                new("Placeholder", "string", false, "\"Type a command or search…\"", "Search input placeholder."),
                new("EmptyText", "string", false, "\"No results found.\"", "Message shown when all items are filtered out."),
                new("ChildContent", "RenderFragment?", false, "null", "VelleCommandGroup, VelleCommandItem, and VelleCommandSeparator elements."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Dispatches a bubbling velle:command:select CustomEvent with { detail: { item, value } } when an item is activated."]),

        new(
            Slug: "velle-confirm",
            Name: "VelleConfirm",
            Category: "Overlays",
            Summary: "Styled native alertdialog that automatically intercepts forms, buttons, and links carrying data-confirm.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "confirm",
            Examples:
            [
                new("confirm-basic", "Global confirmation dialog in MainLayout",
                    "Mount one <VelleConfirm /> in your layout, then add data-confirm to any destructive button, form, or link.",
                    """
                    <div class="flex items-center gap">
                      <button type="button" class="btn btn--negative">Delete workspace</button>
                      <span class="text-sm text-subtle">Intercepted via data-confirm on submit or click</span>
                    </div>
                    """,
                    """
                    @* Once in MainLayout.razor *@
                    <VelleConfirm CancelText="Keep" ConfirmText="Delete" />

                    @* On any form or button *@
                    <EditForm Model="Model" FormName="delete-workspace" Enhance OnValidSubmit="DeleteAsync">
                        <VelleButton Type="submit"
                                     Variant="VelleButtonVariant.Negative"
                                     data-confirm="Delete this workspace?"
                                     data-confirm-text="All projects and API keys will be permanently removed.">
                            Delete workspace
                        </VelleButton>
                    </EditForm>
                    """),
            ],
            Parameters:
            [
                new("Id", "string", false, "\"velle-confirm\"", "DOM id for the confirmation <dialog>."),
                new("DefaultText", "string", false, "\"This action cannot be undone...\"", "Fallback body copy when data-confirm-text is omitted."),
                new("CancelText / ConfirmText", "string", false, "\"Cancel\" / \"Continue\"", "Button labels inside the dialog."),
                new("ConfirmVariant", "VelleButtonVariant", false, "Negative", "Visual variant for the confirm button."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Intercepts form submit events and link/button clicks in capture phase, re-submitting cleanly via requestSubmit() once confirmed."]),

        new(
            Slug: "velle-context-menu",
            Name: "VelleContextMenu",
            Category: "Overlays",
            Summary: "Right-click context menu rendered as an unanchored native popover positioned at the pointer.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "context_menu",
            Examples:
            [
                new("context-menu-basic", "Right-click trigger surface",
                    "Wrap any target surface in VelleContextMenu and supply VelleMenuItem entries via MenuContent.",
                    """
                    <div class="card p-6 text-center text-sm text-subtle" style="border-style: dashed; max-inline-size: 20rem">
                      Right-click anywhere in this area
                    </div>
                    """,
                    """
                    <VelleContextMenu Id="file-context" Label="File actions">
                        <ChildContent>
                            <div class="card p-6 text-center text-sm text-subtle" style="border-style: dashed">
                                Right-click anywhere in this area
                            </div>
                        </ChildContent>
                        <MenuContent>
                            <VelleMenuItem Icon="copy" Shortcut="⌘C">Copy</VelleMenuItem>
                            <VelleMenuItem Icon="pencil">Rename</VelleMenuItem>
                            <VelleMenuSeparator />
                            <VelleMenuItem Icon="trash-2">Delete</VelleMenuItem>
                        </MenuContent>
                    </VelleContextMenu>
                    """),
            ],
            Parameters:
            [
                new("Id", "string", true, "—", "Unique DOM id for the floating context menu popover."),
                new("Label", "string", false, "\"Context menu\"", "Accessible aria-label for the menu."),
                new("ChildContent", "RenderFragment?", false, "null", "Target surface that opens the menu on right-click."),
                new("MenuContent", "RenderFragment?", false, "null", "VelleMenuItem, VelleMenuHeader, and VelleMenuSeparator children."),
                new("Class / PopoverClass / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Reuses VelleMenu keyboard roving focus and automatically clamps popover coordinates within the viewport."]),

        new(
            Slug: "velle-lightbox",
            Name: "VelleLightbox",
            Category: "Overlays",
            Summary: "Full-screen modal image viewer backed by native <dialog> with optional download button.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "lightbox",
            Examples:
            [
                new("lightbox-basic", "Image gallery with lightbox preview",
                    "Wrap thumbnail links in VelleLightbox and VelleLightboxLink. Clicking any link opens the full-resolution image in a modal dialog.",
                    """
                    <div class="flex items-center gap">
                      <a href="assets/images/avatar.svg" class="btn">Preview image</a>
                    </div>
                    """,
                    """
                    <VelleLightbox Label="Gallery viewer" ShowDownload="true">
                        <div class="flex gap">
                            <VelleLightboxLink Href="/images/hero-full.jpg" DownloadUrl="/images/hero-raw.jpg">
                                <img src="/images/hero-thumb.jpg" alt="Mountain sunrise" class="rounded-lg" />
                            </VelleLightboxLink>
                        </div>
                    </VelleLightbox>
                    """),
            ],
            Parameters:
            [
                new("Label", "string", false, "\"Image viewer (press Escape to close)\"", "Accessible aria-label for the lightbox <dialog>."),
                new("CloseLabel / DownloadLabel", "string", false, "\"Close image viewer\" / \"Download image\"", "Screen-reader labels for action buttons."),
                new("ShowDownload", "bool", false, "true", "Controls whether the download button is rendered."),
                new("ChildContent", "RenderFragment?", false, "null", "Gallery markup containing VelleLightboxLink anchors."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Modifier-clicks (Cmd/Ctrl/Shift/middle-click) bypass the modal so users can open images in a new tab normally."]),

        new(
            Slug: "velle-dual-range",
            Name: "VelleDualRange",
            Category: "Forms",
            Summary: "Dual-thumb min/max range slider built from two native <input type=\"range\"> elements synchronized by Alpine.js.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "EditContext Ready"],
            CssComponent: "dual_range",
            Examples:
            [
                new("dual-range-basic", "Price range slider",
                    "Bind MinName/MaxName (and optional MinFor/MaxFor expressions) for Static SSR form submission.",
                    """
                    <div class="dual-range" style="max-inline-size: 20rem">
                      <input type="range" min="0" max="50" value="20" data-ready style="--dual-range-position: 40%" aria-label="Minimum" />
                      <input type="range" min="50" max="100" value="80" data-ready style="--dual-range-position: 60%" aria-label="Maximum" />
                    </div>
                    """,
                    """
                    <VelleDualRange MinName="Filter.MinPrice"
                                    MaxName="Filter.MaxPrice"
                                    Min="0"
                                    Max="500"
                                    Step="10"
                                    MinFor="() => Filter!.MinPrice"
                                    MaxFor="() => Filter!.MaxPrice" />
                    """),
            ],
            Parameters:
            [
                new("MinName / MaxName", "string", true, "—", "Form field names submitted for lower and upper bounds."),
                new("Min / Max / Step", "double", false, "0 / 100 / 1", "Range boundaries and increment step."),
                new("MinValue / MaxValue", "double?", false, "null", "Explicit initial values (override MinFor/MaxFor)."),
                new("MinFor / MaxFor", "Expression<Func<object?>>?", false, "null", "Model expressions for initial values and EditContext validation."),
                new("MinLabel / MaxLabel", "string", false, "\"Minimum\" / \"Maximum\"", "Accessible labels for each range thumb."),
                new("Precision / Disabled", "int / bool", false, "3 / false", "Midpoint decimal precision and disabled state."),
            ],
            Types: [],
            Notes: ["Re-initializes cleanly on velle-enhanced-load so server-updated bounds repaint immediately."]),

        new(
            Slug: "velle-dropzone",
            Name: "VelleDropzone",
            Category: "Forms",
            Summary: "Drag-and-drop file upload zone with client-side type, size, and count validation plus removable file previews.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "dropzone",
            Examples:
            [
                new("dropzone-basic", "Validated multi-file dropzone",
                    "Synchronizes accepted files back into the native <input type=\"file\"> via DataTransfer so standard multipart POST works out of the box.",
                    """
                    <div class="dropzone" style="max-inline-size: 24rem">
                      <div class="dropzone__area">
                        <span class="icon icon--upload mbe-2" aria-hidden="true"></span>
                        <span class="text-sm font-medium">Drop files here or click to upload.</span>
                        <span class="text-xs text-subtle">Images or PDFs up to 5 MB.</span>
                      </div>
                    </div>
                    """,
                    """
                    <form method="post" enctype="multipart/form-data">
                        <VelleDropzone Name="Attachments"
                                       Label="Drop files here or click to upload."
                                       Description="Images or PDFs up to 5 MB."
                                       Accept="image/*,.pdf"
                                       MaxFileSizeMb="5"
                                       MaxFiles="3" />
                        <VelleButton Type="submit" Variant="VelleButtonVariant.Primary" Class="mbs-3">
                            Upload
                        </VelleButton>
                    </form>
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name for the underlying <input type=\"file\">."),
                new("Id", "string?", false, "Derived from Name", "DOM id for the file input."),
                new("Label / Description", "string / string?", false, "\"Drop files here...\" / null", "Prompt heading and helper text."),
                new("Accept / Multiple / Disabled", "string? / bool / bool", false, "null / true / false", "File type filter, multi-file flag, and disabled state."),
                new("MaxFileSizeMb / MaxFiles", "double? / int?", false, "null", "Client-side validation limits."),
                new("TypeMessage / SizeMessage / CountMessage", "string?", false, "null", "Optional custom validation error strings."),
            ],
            Types: [],
            Notes: ["Dispatches a bubbling velle:dropzone:change CustomEvent with { detail: { files, rejected } } whenever the queue changes."]),

        new(
            Slug: "velle-check-all",
            Name: "VelleCheckAll",
            Category: "Forms",
            Summary: "Coordinated select-all checkbox group with automatic indeterminate state synchronization.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "check_all",
            Examples:
            [
                new("check-all-basic", "Master and dependant checkboxes",
                    "Mark the master checkbox with data-velle-check-all-dependee and each child checkbox with data-velle-check-all-dependant.",
                    """
                    <div class="flex flex-col gap-half">
                      <label class="flex items-center gap-half text-sm font-medium"><input type="checkbox" class="input" /> Select all</label>
                      <div class="flex gap pis-4">
                        <label class="flex items-center gap-half text-sm"><input type="checkbox" class="input" checked /> Staging</label>
                        <label class="flex items-center gap-half text-sm"><input type="checkbox" class="input" /> Production</label>
                      </div>
                    </div>
                    """,
                    """
                    <VelleCheckAll Class="flex flex-col gap-half">
                        <label class="flex items-center gap-half text-sm font-medium">
                            <input type="checkbox" class="input" data-velle-check-all-dependee />
                            <span>Select all environments</span>
                        </label>
                        <div class="flex gap pis-4">
                            <label class="flex items-center gap-half text-sm">
                                <input type="checkbox" class="input" name="Envs" value="staging" data-velle-check-all-dependant checked />
                                <span>Staging</span>
                            </label>
                            <label class="flex items-center gap-half text-sm">
                                <input type="checkbox" class="input" name="Envs" value="prod" data-velle-check-all-dependant />
                                <span>Production</span>
                            </label>
                        </div>
                    </VelleCheckAll>
                    """),
            ],
            Parameters:
            [
                new("ChildContent", "RenderFragment?", false, "null", "Checkboxes marked with data-velle-check-all-dependee and data-velle-check-all-dependant."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes applied to the wrapper."),
            ],
            Types: [],
            Notes: ["Automatically sets indeterminate = true on mount when only some dependants are initially checked."]),

        new(
            Slug: "velle-resizable",
            Name: "VelleResizable",
            Category: "Layout",
            Summary: "Pointer- and keyboard-resizable split panel container supporting horizontal and vertical layouts.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "resizable",
            Examples:
            [
                new("resizable-basic", "Horizontal two-pane split",
                    "Combine VelleResizable, VelleResizablePanel (with optional InitialSize/MinSize/MaxSize), and VelleResizableHandle.",
                    """
                    <div class="resizable border rounded-lg" style="min-block-size: 5rem; max-inline-size: 26rem">
                      <div class="resizable__panel p-3 text-sm" style="flex-grow: 40">Sidebar</div>
                      <div class="resizable__handle" role="separator" tabindex="0" aria-label="Resize"></div>
                      <div class="resizable__panel p-3 text-sm text-subtle" style="flex-grow: 60">Main content</div>
                    </div>
                    """,
                    """
                    <VelleResizable Class="border rounded-lg" style="min-block-size: 10rem">
                        <VelleResizablePanel InitialSize="35" MinSize="20" MaxSize="60" Class="p-4">
                            Sidebar
                        </VelleResizablePanel>
                        <VelleResizableHandle Label="Resize sidebar" />
                        <VelleResizablePanel Class="p-4">
                            Main content
                        </VelleResizablePanel>
                    </VelleResizable>
                    """),
            ],
            Parameters:
            [
                new("Orientation", "VelleOrientation", false, "Horizontal", "Horizontal or Vertical split direction."),
                new("ChildContent", "RenderFragment?", false, "null", "Direct VelleResizablePanel and VelleResizableHandle children."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Supports Arrow keys (1% step), Shift+Arrow (10% step), Home, and End on focused handles, and dispatches velle:resizable:resize."]),

        new(
            Slug: "velle-auto-animate",
            Name: "VelleAutoAnimate",
            Category: "Behaviors",
            Summary: "Zero-JavaScript container that smoothly animates added, removed, and reordered children via CSS View Transitions.",
            Badges: ["Blazor Static SSR", "CSS Only"],
            CssComponent: "autoanimate",
            Examples:
            [
                new("auto-animate-basic", "Animated list container",
                    "Wrap dynamic server-rendered lists in VelleAutoAnimate to apply view-transition-name: match-element to direct children.",
                    """
                    <div class="auto-animate flex gap-half">
                      <span class="badge">Item A</span>
                      <span class="badge">Item B</span>
                      <span class="badge">Item C</span>
                    </div>
                    """,
                    """
                    <VelleAutoAnimate Class="flex flex-col gap-half">
                        @foreach (var item in Items)
                        {
                            <VelleCard Title="@item.Title" />
                        }
                    </VelleAutoAnimate>
                    """),
            ],
            Parameters:
            [
                new("ChildContent", "RenderFragment?", false, "null", "Direct child elements animated during View Transitions."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes merged onto .auto-animate."),
            ],
            Types: [],
            Notes: ["Pure CSS (.auto-animate > *) with no JavaScript runtime overhead."]),

        new(
            Slug: "velle-local-time",
            Name: "VelleLocalTime",
            Category: "Behaviors",
            Summary: "Renders a semantic <time> element on the server and formats it into the visitor's local browser timezone via Intl.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "local_time",
            Examples:
            [
                new("local-time-basic", "Localized absolute and relative timestamps",
                    "Outputs an ISO-8601 fallback on the server and upgrades to the user's locale and timezone on mount (and on enhanced loads).",
                    """
                    <div class="flex flex-col gap-half text-sm">
                      <span>Absolute: <time datetime="2030-04-12T15:30:00Z">Apr 12, 2030, 3:30 PM</time></span>
                      <span>Relative: <time datetime="2030-04-12T15:30:00Z">5 minutes ago</time></span>
                    </div>
                    """,
                    """
                    <p>Published <VelleLocalTime Value="Article.PublishedAt" Format="VelleLocalTimeFormat.Date" /></p>
                    <p>Updated <VelleLocalTime Value="Article.UpdatedAt" Format="VelleLocalTimeFormat.Ago" /></p>
                    """),
            ],
            Parameters:
            [
                new("Value", "DateTimeOffset", true, "—", "Timestamp to display in the user's local timezone."),
                new("Format", "VelleLocalTimeFormat", false, "DateTime", "Client format: DateTime, Date, ShortDate, Time, or Ago."),
                new("FallbackFormat", "string", false, "\"u\"", ".NET format string used for the server-rendered fallback text."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes on <time>."),
            ],
            Types:
            [
                new("VelleLocalTimeFormat", "enum", "Intl formatting presets for VelleLocalTime.",
                [
                    new("DateTime", "Short date and short time."),
                    new("Date", "Long localized date."),
                    new("ShortDate", "Abbreviated month and day."),
                    new("Time", "Short localized time of day."),
                    new("Ago", "Relative elapsed time, auto-refreshed every 30 seconds."),
                ]),
            ],
            Notes: ["Populates the title attribute with the full localized date and time for hover inspection."]),

        new(
            Slug: "velle-timezone-cookie",
            Name: "VelleTimezoneCookie",
            Category: "Behaviors",
            Summary: "Writes the visitor's browser IANA timezone (e.g. America/Chicago) to a SameSite=Lax cookie for server-side SSR formatting.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "timezone_cookie",
            Examples:
            [
                new("timezone-cookie-basic", "Detect visitor timezone once in MainLayout",
                    "Drop <VelleTimezoneCookie /> in MainLayout.razor and read Request.Cookies[\"timezone\"] in Static SSR pages.",
                    """
                    <p class="text-sm text-subtle">Renders a hidden marker that sets <code>timezone=America%2FChicago; path=/; samesite=lax</code> on mount.</p>
                    """,
                    """
                    @* In MainLayout.razor *@
                    <VelleTimezoneCookie CookieName="timezone" />
                    """),
            ],
            Parameters:
            [
                new("CookieName", "string", false, "\"timezone\"", "Cookie name populated with Intl.DateTimeFormat().resolvedOptions().timeZone."),
                new("AdditionalAttributes", "Dictionary<string, object>?", false, "null", "Extra HTML attributes on the hidden marker element."),
            ],
            Types: [],
            Notes: ["Uses path=/ and samesite=lax so subsequent Static SSR requests receive the user's timezone automatically."]),

        new(
            Slug: "velle-layout",
            Name: "VelleLayout",
            Category: "Layout",
            Summary: "Responsive application shells (Sidebar, Header, and Centered layouts) paired with VelleSidebarMenu.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "layouts",
            Examples:
            [
                new("layout-sidebar", "Collapsible sidebar shell",
                    "Sidebar variant renders #header, #sidebar, and #main with built-in velleToggleClass wiring so any button with x-on:click=\"toggle\" collapses the sidebar.",
                    """
                    <div class="border rounded-lg overflow-hidden" style="max-inline-size: 26rem">
                      <div class="flex items-center justify-between p-3 bg-shade border-be text-sm font-medium">
                        <span>Acme App</span>
                        <span class="badge">Sidebar Layout</span>
                      </div>
                      <div class="flex" style="min-block-size: 6rem">
                        <div class="p-3 border-ie text-xs text-subtle" style="inline-size: 8rem">Sidebar menu</div>
                        <div class="p-3 text-xs text-subtle flex-1">Main scrollable content</div>
                      </div>
                    </div>
                    """,
                    """
                    <VelleLayout Variant="VelleLayoutVariant.Sidebar">
                        <Header>
                            <button type="button" class="btn btn--icon" x-on:click="toggle">
                                <VelleIcon Name="panel-left" />
                                <span class="sr-only">Toggle sidebar</span>
                            </button>
                            <span class="font-bold">Acme</span>
                        </Header>
                        <Sidebar>
                            <VelleSidebarMenu Label="Navigation">
                                <div class="sidebar-menu__group">
                                    <div class="sidebar-menu__group-label">Platform</div>
                                    <ul class="sidebar-menu__items">
                                        <li><a class="btn sidebar-menu__button" href="/" aria-current="page">Dashboard</a></li>
                                        <li><a class="btn sidebar-menu__button" href="/settings">Settings</a></li>
                                    </ul>
                                </div>
                            </VelleSidebarMenu>
                        </Sidebar>
                        <ChildContent>
                            @Body
                        </ChildContent>
                    </VelleLayout>
                    """),
            ],
            Parameters:
            [
                new("Variant", "VelleLayoutVariant", false, "Sidebar", "Shell layout preset: Sidebar, Header, or Centered."),
                new("SidebarClosed", "bool", false, "false", "Starts with the sidebar collapsed (.closed) when Variant is Sidebar."),
                new("Header / Sidebar / ChildContent", "RenderFragment?", false, "null", "Named slots for header, sidebar, and main content."),
                new("Class / HeaderClass / SidebarClass / MainClass", "string?", false, "null", "Optional extra CSS classes for the root and landmark regions."),
            ],
            Types:
            [
                new("VelleLayoutVariant", "enum", "Shell variants for VelleLayout.",
                [
                    new("Sidebar", "Header + collapsible sidebar + main grid (.sidebar-layout)."),
                    new("Header", "Header + main grid (.header-layout)."),
                    new("Centered", "Viewport-centered single panel (.centered-layout)."),
                ]),
            ],
            Notes: ["Pair with <VelleSidebarMenu> inside the Sidebar slot for grouped navigation links and a pinned footer."]),

        new(
            Slug: "velle-collapsible",
            Name: "VelleCollapsible",
            Category: "Elements",
            Summary: "Native <details>/<summary> disclosure enhanced with Alpine.js open, close, and toggle methods for external triggers.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "collapsible",
            Examples:
            [
                new("collapsible-basic", "Disclosure with external toggle button",
                    "Set TriggerText (or a custom Trigger fragment) to control the disclosure from outside the <summary>.",
                    """
                    <div class="flex flex-col gap-half" style="max-inline-size: 24rem">
                      <details open class="border rounded-lg p-3">
                        <summary class="font-medium text-sm cursor-pointer">Release notes</summary>
                        <p class="text-sm text-subtle mbs-2">Added Alpine mask and sort plugins for Static SSR.</p>
                      </details>
                    </div>
                    """,
                    """
                    <VelleCollapsible TriggerText="Toggle notes" Summary="Release notes" Class="flex flex-col gap-half">
                        <p class="text-sm text-subtle">Added Alpine mask and sort plugins for Static SSR.</p>
                    </VelleCollapsible>
                    """),
            ],
            Parameters:
            [
                new("Summary", "string?", false, "null", "Optional heading rendered inside <summary>."),
                new("TriggerText / Trigger", "string? / RenderFragment?", false, "null", "Optional external toggle button or custom trigger markup."),
                new("Open", "bool", false, "false", "Whether the <details> element starts expanded."),
                new("ChildContent", "RenderFragment?", false, "null", "Collapsible body content."),
                new("Class / TriggerClass / DetailsClass / SummaryClass", "string?", false, "null", "Extra CSS classes."),
            ],
            Types: [],
            Notes: ["Works without JavaScript via native <details> while Alpine enables programmatic open(), close(), and toggle() triggers."]),

        new(
            Slug: "velle-input-mask",
            Name: "VelleInputMask",
            Category: "Forms",
            Summary: "Formatted text and currency input powered by the vendored @alpinejs/mask plugin with EditContext integration.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "@alpinejs/mask", "EditContext Ready"],
            CssComponent: "inputmask",
            Examples:
            [
                new("input-mask-basic", "Pattern and money masks",
                    "Use Mode=\"Pattern\" (9 = digit, a = letter, * = alphanumeric) or Mode=\"Money\" for dynamic thousands/decimal formatting.",
                    """
                    <div class="flex flex-col gap" style="max-inline-size: 20rem">
                      <div class="flex flex-col gap-half">
                        <label class="text-sm font-medium leading-none">Phone</label>
                        <input type="text" class="input" placeholder="(555) 123-4567" value="(555) 123-4567" readonly />
                      </div>
                      <div class="flex flex-col gap-half">
                        <label class="text-sm font-medium leading-none">Amount</label>
                        <input type="text" class="input" placeholder="1,234.56" value="12,345.67" readonly />
                      </div>
                    </div>
                    """,
                    """
                    <VelleInputMask Name="Input.Phone"
                                    Label="Phone"
                                    Mask="(999) 999-9999"
                                    Placeholder="(555) 123-4567"
                                    For="() => Input!.Phone" />

                    <VelleInputMask Name="Input.Amount"
                                    Label="Amount"
                                    Mode="VelleInputMaskMode.Money"
                                    DecimalSeparator="."
                                    Precision="2"
                                    For="() => Input!.Amount" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name submitted on POST."),
                new("Id / Label / Description", "string?", false, "Derived / null", "DOM id, label, and helper text."),
                new("Mode", "VelleInputMaskMode", false, "Pattern", "Pattern (static x-mask) or Money (dynamic currency formatting)."),
                new("Mask", "string?", false, "null", "Mask pattern when Mode is Pattern (9 = digit, a = letter, * = alphanumeric)."),
                new("DecimalSeparator / ThousandsSeparator / Precision", "string / string? / int", false, "\".\" / \",\" / 2", "Currency formatting options when Mode is Money."),
                new("Value / For / Placeholder", "various", false, "null", "Initial value, EditContext binding, and placeholder."),
            ],
            Types:
            [
                new("VelleInputMaskMode", "enum", "Masking strategies for VelleInputMask.",
                [
                    new("Pattern", "Static mask string using 9, a, and * placeholders."),
                    new("Money", "Dynamic currency/number grouping with configurable separators."),
                ]),
            ],
            Notes: ["Uses the officially vendored @alpinejs/mask plugin — zero npm setup or external CDN required."]),

        new(
            Slug: "velle-sortable",
            Name: "VelleSortable",
            Category: "Elements",
            Summary: "Drag-and-drop reorderable list powered by the vendored @alpinejs/sort plugin with hidden form-order sync and optional fetch persistence.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "@alpinejs/sort"],
            CssComponent: "sortable",
            Examples:
            [
                new("sortable-basic", "Drag handles and EditForm order sync",
                    "Set OrderName to keep a hidden input synced with comma-separated item keys, or set Url to PATCH order changes directly.",
                    """
                    <div class="flex flex-col gap-half" style="max-inline-size: 22rem">
                      <div class="border rounded-md pi-3 pb-2 flex items-center gap-half text-sm">
                        <span class="sortable-handle"><span class="icon icon--grip-vertical" aria-hidden="true"></span></span>
                        <span>Backlog item 1</span>
                      </div>
                      <div class="border rounded-md pi-3 pb-2 flex items-center gap-half text-sm">
                        <span class="sortable-handle"><span class="icon icon--grip-vertical" aria-hidden="true"></span></span>
                        <span>Backlog item 2</span>
                      </div>
                    </div>
                    """,
                    """
                    <VelleSortable OrderName="Input.ItemOrder" Group="tasks">
                        <VelleSortableItem Key="task-1" Class="border rounded-md pi-3 pb-2 flex items-center gap-half">
                            <VelleSortableHandle />
                            <span>Design tokens</span>
                        </VelleSortableItem>
                        <VelleSortableItem Key="task-2" Class="border rounded-md pi-3 pb-2 flex items-center gap-half">
                            <VelleSortableHandle />
                            <span>Static SSR forms</span>
                        </VelleSortableItem>
                    </VelleSortable>
                    """),
            ],
            Parameters:
            [
                new("Group", "string?", false, "null", "Shared group name enabling cross-list dragging."),
                new("OrderName", "string?", false, "null", "Optional hidden input name updated with comma-separated item keys on reorder."),
                new("Url / Method / ParentId", "string? / string / string?", false, "null / \"PATCH\" / null", "Optional endpoint configuration for background persistence."),
                new("ShowGhost", "bool", false, "true", "Keeps the .sortable-ghost placeholder visible while dragging."),
                new("ChildContent", "RenderFragment?", false, "null", "VelleSortableItem elements (optionally containing VelleSortableHandle)."),
            ],
            Types: [],
            Notes: ["Powered by @alpinejs/sort (vendored locally) and dispatches bubbling velle:sortable:move, velle:sortable:success, and velle:sortable:error events."]),

        new(
            Slug: "velle-upload-preview",
            Name: "VelleUploadPreview",
            Category: "Forms",
            Summary: "Image file picker with instant client-side thumbnail preview, clear button, and hidden removal flag.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "upload_preview",
            Examples:
            [
                new("upload-preview-basic", "Avatar upload with live preview",
                    "Displays a local object URL immediately on file selection and resets back to DefaultImage when cleared.",
                    """
                    <div class="flex items-center gap">
                      <span class="btn btn--icon"><span class="icon icon--camera" aria-hidden="true"></span></span>
                      <span class="avatar" style="--avatar-size: 4rem"><img src="assets/images/avatar.svg" alt="Avatar" /></span>
                      <span class="btn btn--icon btn--negative"><span class="icon icon--minus" aria-hidden="true"></span></span>
                    </div>
                    """,
                    """
                    <VelleUploadPreview Name="AvatarFile"
                                        RemoveName="RemoveAvatar"
                                        CurrentImage="@Model.AvatarUrl"
                                        DefaultImage="/images/avatar-placeholder.svg"
                                        Alt="Profile photo" />
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name for the <input type=\"file\">."),
                new("DefaultImage", "string", true, "—", "Fallback image URL restored when cleared."),
                new("CurrentImage", "string?", false, "null", "Optional initial image URL (defaults to DefaultImage)."),
                new("RemoveName", "string?", false, "null", "Optional hidden input name set to \"true\" when cleared."),
                new("Accept / PreviewSize / ShowRemove / Disabled", "various", false, "\"image/*\" / \"6rem\" / true / false", "File filter, avatar size token, remove toggle, and disabled state."),
            ],
            Types: [],
            Notes: ["Automatically revokes object URLs once the preview <img> finishes loading to prevent memory leaks."]),

        new(
            Slug: "velle-autosave",
            Name: "VelleAutosave",
            Category: "Forms",
            Summary: "Debounced automatic form persistence supporting both background fetch and Blazor Enhanced EditForm submission.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "autosave",
            Examples:
            [
                new("autosave-basic", "Enhanced EditForm autosave",
                    "Set Mode=\"Submit\" to invoke form.requestSubmit() through Blazor's Enhanced EditForm pipeline, or Mode=\"Fetch\" for silent background saves.",
                    """
                    <p class="text-sm text-subtle">Wraps any form and saves automatically after changes pause for <code>IntervalMs</code>.</p>
                    """,
                    """
                    <VelleAutosave IntervalMs="2000" Mode="VelleAutosaveMode.Submit">
                        <EditForm Model="Draft" FormName="draft-notes" Enhance OnValidSubmit="SaveDraft">
                            <VelleInput Name="Draft.Notes" Label="Notes" Multiline="true" For="() => Draft!.Notes" />
                        </EditForm>
                    </VelleAutosave>
                    """),
            ],
            Parameters:
            [
                new("IntervalMs", "int", false, "3000", "Delay in milliseconds after a change before saving."),
                new("Mode", "VelleAutosaveMode", false, "Fetch", "Fetch (background fetch) or Submit (form.requestSubmit() for Enhanced EditForm)."),
                new("ChildContent", "RenderFragment?", false, "null", "Wrapped form content."),
            ],
            Types:
            [
                new("VelleAutosaveMode", "enum", "Autosave submission modes.",
                [
                    new("Fetch", "Background fetch() setting aria-busy=\"true\" and dispatching velle:autosave:success/error."),
                    new("Submit", "Calls form.requestSubmit() for native Blazor Enhanced EditForm integration."),
                ]),
            ],
            Notes: ["Flushes pending dirty changes cleanly if the component is torn down during navigation."]),

        new(
            Slug: "velle-form-helper",
            Name: "VelleFormHelper",
            Category: "Forms",
            Summary: "Lightweight Alpine form helper providing debounced submit, validity-gated submit buttons, reset, and cancel triggers.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "form",
            Examples:
            [
                new("form-helper-basic", "Debounced search form",
                    "Wrap a GET search form in VelleFormHelper and wire x-on:input=\"debouncedSubmit\" on the search input.",
                    """
                    <p class="text-sm text-subtle">Exposes <code>submit</code>, <code>debouncedSubmit</code>, <code>validate</code>, <code>reset</code>, <code>cancel</code>, and <code>select</code> inside Alpine scope.</p>
                    """,
                    """
                    <VelleFormHelper DebounceMs="300">
                        <form method="get" action="/search">
                            <VelleInput Name="q" Label="Filter results" Placeholder="Type to search…" x-on:input="debouncedSubmit" />
                        </form>
                    </VelleFormHelper>
                    """),
            ],
            Parameters:
            [
                new("DebounceMs", "int", false, "300", "Debounce window in milliseconds for debouncedSubmit."),
                new("ChildContent", "RenderFragment?", false, "null", "Form markup using helper actions."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Mark a submit button with data-velle-form-submit to toggle its disabled state via x-on:input=\"validate\"."]),

        new(
            Slug: "velle-auto-select",
            Name: "VelleAutoSelect",
            Category: "Behaviors",
            Summary: "Automatically highlights the text inside a wrapped input or textarea when focused on mount or enhanced navigation.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "autoselect",
            Examples:
            [
                new("auto-select-basic", "Select text on focus/mount",
                    "Wrap an input with autofocus (or set Always=\"true\") so its existing value is pre-selected for quick replacement.",
                    """
                    <input type="text" class="input" value="https://velle.dev/share/abc123" style="max-inline-size: 20rem" readonly />
                    """,
                    """
                    <VelleAutoSelect Always="true">
                        <VelleInput Name="ShareUrl" Label="Share link" Value="https://velle.dev/share/abc123" />
                    </VelleAutoSelect>
                    """),
            ],
            Parameters:
            [
                new("Always", "bool", false, "false", "When true, selects text even when the inner input does not have autofocus."),
                new("ChildContent", "RenderFragment?", false, "null", "Wrapped input or textarea."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Re-runs automatically on velle-enhanced-load events."]),

        new(
            Slug: "velle-fullscreen",
            Name: "VelleFullscreen",
            Category: "Behaviors",
            Summary: "Fullscreen toggle button that enters or exits the Fullscreen API and hides itself when unsupported.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "fullscreen",
            Examples:
            [
                new("fullscreen-basic", "Toggle document or container fullscreen",
                    "Leave TargetSelector null to toggle document.documentElement, or pass any CSS selector such as #preview-stage.",
                    """
                    <button type="button" class="btn"><span class="icon icon--maximize" aria-hidden="true"></span><span>Fullscreen</span></button>
                    """,
                    """
                    <VelleFullscreen Label="Fullscreen" TargetSelector="#preview-stage" />
                    """),
            ],
            Parameters:
            [
                new("TargetSelector", "string?", false, "null", "Optional CSS selector to expand into fullscreen (defaults to the document root)."),
                new("Label / Variant / ChildContent", "various", false, "\"Fullscreen\" / Default / null", "Button label, visual variant, or custom body."),
                new("Class / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types: [],
            Notes: ["Automatically sets hidden on browsers where Fullscreen API is unavailable."]),

        new(
            Slug: "velle-hotkey",
            Name: "VelleHotkey",
            Category: "Behaviors",
            Summary: "Global keyboard shortcut wrapper that clicks or focuses a wrapped control while ignoring typing inside inputs.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "hotkey",
            Examples:
            [
                new("hotkey-basic", "Focus search input on '/'",
                    "Use mod+k for Cmd+K on macOS and Ctrl+K on Windows/Linux, or a single key such as '/'.",
                    """
                    <div class="flex items-center gap-half" style="max-inline-size: 20rem">
                      <input type="search" class="input" placeholder="Press / to focus" readonly />
                      <kbd class="kbd">/</kbd>
                    </div>
                    """,
                    """
                    <VelleHotkey Keys="/" Action="VelleHotkeyAction.Focus">
                        <VelleInput Name="q" Placeholder="Press / to focus" />
                    </VelleHotkey>
                    """),
            ],
            Parameters:
            [
                new("Keys", "string", true, "—", "Shortcut combo such as \"/\", \"mod+k\", or \"alt+n\"."),
                new("Action", "VelleHotkeyAction", false, "Click", "Whether pressing the shortcut clicks or focuses the target."),
                new("ChildContent", "RenderFragment?", false, "null", "Wrapped target button, link, or input."),
            ],
            Types:
            [
                new("VelleHotkeyAction", "enum", "Actions triggered by VelleHotkey.",
                [
                    new("Click", "Calls click() on the target element."),
                    new("Focus", "Calls focus() on the target element."),
                ]),
            ],
            Notes: ["Ignores shortcuts while focus is inside <input>, <textarea>, <select>, or [contenteditable] elements."]),

        new(
            Slug: "velle-toggle-class",
            Name: "VelleToggleClass",
            Category: "Behaviors",
            Summary: "Declarative Alpine wrapper that toggles, adds, or removes a CSS class on itself or a target selector.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "toggle_class",
            Examples:
            [
                new("toggle-class-basic", "Toggle a CSS state class",
                    "Bind x-on:click=\"toggle\", \"add\", or \"remove\" on any button inside VelleToggleClass.",
                    """
                    <div class="flex items-center gap">
                      <button type="button" class="btn">Toggle class</button>
                      <span class="border rounded-md pi-3 pb-1 text-sm">Target element</span>
                    </div>
                    """,
                    """
                    <VelleToggleClass ClassName="bg-shade" TargetSelector="#preview-box" Class="flex items-center gap">
                        <button type="button" class="btn" x-on:click="toggle">Toggle highlight</button>
                        <div id="preview-box" class="border rounded-md pi-3 pb-1">Target element</div>
                    </VelleToggleClass>
                    """),
            ],
            Parameters:
            [
                new("ClassName", "string", false, "\"closed\"", "CSS class toggled on the target."),
                new("TargetSelector", "string?", false, "null", "Optional CSS selector for the target element (defaults to the wrapper itself)."),
                new("ChildContent", "RenderFragment?", false, "null", "Triggers and content inside the Alpine scope."),
            ],
            Types: [],
            Notes: ["Used internally by VelleLayout (Sidebar variant) to toggle the .closed sidebar state."]),

        new(
            Slug: "velle-web-share",
            Name: "VelleWebShare",
            Category: "Behaviors",
            Summary: "Native OS share sheet button using navigator.share() that automatically hides on unsupported browsers.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP"],
            CssComponent: "web_share",
            Examples:
            [
                new("web-share-basic", "Share current page or file",
                    "Provide Title, Text, Url, and optional FileUrl. The button hides itself automatically when navigator.share is absent unless AlwaysShow is true.",
                    """
                    <button type="button" class="btn"><span class="icon icon--share" aria-hidden="true"></span><span>Share</span></button>
                    """,
                    """
                    <VelleWebShare Title="Velle.Blazor"
                                   Text="Plain CSS + Alpine.js CSP components for Blazor Static SSR."
                                   Url="https://codedbyshoe.github.io/velle-css/" />
                    """),
            ],
            Parameters:
            [
                new("Title / Text / Url / FileUrl", "string?", false, "null", "Share payload fields passed to navigator.share()."),
                new("Label / Variant / ChildContent", "various", false, "\"Share\" / Default / null", "Default button label, style variant, or custom content."),
                new("AlwaysShow", "bool", false, "false", "Keeps the button visible even when navigator.share is unavailable."),
            ],
            Types: [],
            Notes: ["Swallows AbortError silently when the visitor cancels the native share sheet."]),

        new(
            Slug: "velle-chart",
            Name: "VelleChart",
            Category: "Elements",
            Summary: "Lazy-loaded Chart.js canvas component automatically styled from Velle's CSS tokens and reactive to light/dark theme changes.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "Chart.js (Lazy)"],
            CssComponent: "chart",
            Examples:
            [
                new("chart-basic", "Bar and line charts with C# data objects",
                    "Chart.js (vendored locally) is dynamically imported only on pages that render <VelleChart> — zero bytes downloaded otherwise.",
                    """
                    <div class="border rounded-lg p-4 text-sm text-subtle text-center" style="max-inline-size: 24rem">
                      Canvas chart rendered lazily via vendored Chart.js with Velle CSS tokens.
                    </div>
                    """,
                    """
                    <div style="block-size: 16rem">
                        <VelleChart Type="VelleChartType.Bar"
                                    Label="Quarterly signups"
                                    Data="ChartData"
                                    Options="ChartOptions" />
                    </div>

                    @code {
                        private static readonly object ChartData = new
                        {
                            Labels = new[] { "Q1", "Q2", "Q3", "Q4" },
                            Datasets = new[]
                            {
                                new { Label = "Signups", Data = new[] { 120, 195, 260, 340 }, BackgroundColor = "#2563eb" }
                            }
                        };

                        private static readonly object ChartOptions = new
                        {
                            Responsive = true,
                            MaintainAspectRatio = false
                        };
                    }
                    """),
            ],
            Parameters:
            [
                new("Data", "object", true, "—", "Chart.js data object serialized as camelCase JSON."),
                new("Type", "VelleChartType", false, "Line", "Visualization type: Line, Bar, Doughnut, Pie, Radar, PolarArea, Scatter, or Bubble."),
                new("Options", "object?", false, "null", "Optional Chart.js options object serialized as camelCase JSON."),
                new("Label", "string", false, "\"Chart\"", "Accessible aria-label applied to the <canvas> element."),
                new("Class / CanvasClass / AdditionalAttributes", "various", false, "null", "Extra classes and HTML attributes."),
            ],
            Types:
            [
                new("VelleChartType", "enum", "Supported Chart.js chart types.",
                [
                    new("Line / Bar / Doughnut / Pie", "Core Cartesian and circular charts."),
                    new("Radar / PolarArea / Scatter / Bubble", "Additional Chart.js visualizations."),
                ]),
            ],
            Notes:
            [
                "Destroys and recreates cleanly across Blazor enhanced navigations and updates theme colors on velle:color-scheme:change.",
                "Dispatches a bubbling velle:chart:ready CustomEvent with { detail: { chart } } for advanced customization.",
            ]),

        new(
            Slug: "velle-editor",
            Name: "VelleEditor",
            Category: "Forms",
            Summary: "Rich-text editor powered by 37signals' Lexxy (Meta Lexical) with native Markdown shortcuts, tables, code highlighting, and a built-in .NET attachment upload bridge.",
            Badges: ["Blazor Static SSR", "Alpine.js CSP", "Lexxy (Lazy)", "EditContext Ready"],
            CssComponent: "editor",
            Examples:
            [
                new("editor-basic", "EditForm integration with Markdown shortcuts and .NET uploads",
                    "Enable <VelleStyles IncludeEditor=\"true\" /> in App.razor. Pass UploadUrl to enable file/image attachments backed by any ASP.NET Core Minimal API endpoint returning VelleAttachmentResult.",
                    """
                    <div class="border rounded-lg p-3 text-sm" style="max-inline-size: 28rem">
                      <div class="flex gap-half border-be pbe-2 mbe-2 text-subtle text-xs">
                        <strong>B</strong> <em>I</em> <code>&lt;/&gt;</code> <span>H2</span> <span>Table</span> <span>Markdown</span>
                      </div>
                      <p>Rich text powered by <strong>&lt;lexxy-editor&gt;</strong> with live Markdown shortcuts and semantic HTML output.</p>
                    </div>
                    """,
                    """
                    @* In App.razor: <VelleStyles IncludeEditor="true" /> *@
                    <EditForm Model="Article!" FormName="article" Enhance OnValidSubmit="SaveAsync" class="flex flex-col gap">
                        <VelleEditor Name="Article.Body"
                                     Label="Article body"
                                     Placeholder="Write with Markdown shortcuts like # Heading or **bold**…"
                                     UploadUrl="/api/uploads"
                                     For="() => Article!.Body" />
                        <VelleButton Type="submit" Variant="VelleButtonVariant.Primary">Publish</VelleButton>
                    </EditForm>

                    @* Minimal API upload endpoint in Program.cs *@
                    @* app.MapPost("/api/uploads", async (IFormFile file) => Results.Ok(new VelleAttachmentResult(url, file.FileName, file.ContentType, file.Length))); *@
                    """),
            ],
            Parameters:
            [
                new("Name", "string", true, "—", "Form field name synchronized into a hidden input for Blazor EditForm POSTs."),
                new("Id / Label / Description", "string?", false, "Derived / null", "DOM id, label, and helper text."),
                new("Value / For", "string? / Expression", false, "null", "Initial HTML value and EditContext validation binding."),
                new("Placeholder", "string?", false, "null", "Placeholder shown when empty."),
                new("Markdown / Tables / CodeBlocks / Toolbar", "bool", false, "true", "Toggle Lexxy's inline Markdown shortcuts, tables, fenced code highlighting, and toolbar."),
                new("UploadUrl / UploadFieldName / PermittedAttachmentTypes", "string?", false, "null / \"file\" / null", "ASP.NET Core upload endpoint returning VelleAttachmentResult; enables attachments automatically when set."),
                new("Required / Disabled", "bool", false, "false", "Validation and disabled state."),
            ],
            Types:
            [
                new("VelleAttachmentResult", "record", "JSON payload returned by UploadUrl endpoints.",
                [
                    new("Url", "Public URL where the uploaded file or image can be loaded."),
                    new("Filename / ContentType / ByteSize", "Optional file metadata rendered on attachment previews."),
                    new("Previewable / SignedId", "Optional inline preview flag and application attachment identifier."),
                ]),
            ],
            Notes:
            [
                "Lexxy JS is lazy-loaded only on pages containing <VelleEditor>; add <VelleStyles IncludeEditor=\"true\" /> in App.razor for its Velle-themed stylesheet.",
                "Automatically normalizes empty <p><br></p> state to \"\" so ASP.NET Core [Required] validation works accurately.",
                "Forwards the nearest form's __RequestVerificationToken header automatically when uploading attachments to UploadUrl.",
            ]),
    ];

    public static BlazorComponentDoc? ByCssComponent(string cssName) =>
        All.FirstOrDefault(component => string.Equals(component.CssComponent, cssName, StringComparison.Ordinal));
}
