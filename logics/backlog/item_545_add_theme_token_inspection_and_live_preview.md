## item_545_add_theme_token_inspection_and_live_preview - Add theme token inspection and live preview
> From version: 2.17.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Theme viewer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A project's visual choices are distributed across token declarations and theme selectors, making the active palette and typography hard to review as a system.
- Source-defined mode maps can be discovered but cannot safely be rewritten with a data-only editor.

# Scope
- In:
  - Add a repository-scoped read endpoint for detected CSS custom properties and read-only source-defined theme mode metadata.
  - Group tokens into colors, typography, spacing, radii, shadows, and uncategorized values using transparent name/value rules.
  - Render swatches, type samples, spacing and radius samples, and a small component preview without executing target-project code.
  - Allow selecting detected light or dark selectors when present and clearly label inferred data.
  - Show source-defined theme modes and their class names as read-only metadata when no editable token convention is available.
- Out:
  - Loading the target application's JavaScript or CSS bundle into the viewer.
  - Pixel-perfect application previews.
  - Editing source-level theme maps or resolving arbitrary CSS build pipelines.

# Acceptance criteria
- Supported CSS variables render in deterministic semantic groups with their raw values and source selector.
- Recognized colors, font declarations, spacing, and radii receive an appropriate preview while unknown values remain visible as text.
- Theme previews are isolated from the viewer's own CSS and cannot restyle the viewer shell.
- Source-defined theme modes are visible but have no edit controls.
- Tests cover multiple selectors, CSS variable references, unknown values, source-defined read-only modes, and style isolation.

# AC Traceability
- request-Project navigation shows Translations and Theme only when their corresponding capability is available, in both standalone and VS Code embedded viewer contexts. -> This backlog slice. Proof: Supported CSS variables render in deterministic semantic groups with their raw values and source selector.
- request-Supported CSS custom-property themes can be previewed by semantic category and edited with validation, while source-defined theme modes remain read-only. -> This backlog slice. Proof: Recognized colors, font declarations, spacing, and radii receive an appropriate preview while unknown values remain visible as text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Primary task(s): `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery`

# AI Context
- Summary: Add theme token inspection and live preview
- Keywords: scaffolded-backlog, add theme token inspection and live preview, implementation-ready
- Use when: Implementing the scaffolded slice for Add theme token inspection and live preview.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
