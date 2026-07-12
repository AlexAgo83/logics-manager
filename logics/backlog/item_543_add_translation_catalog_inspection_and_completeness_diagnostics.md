## item_543_add_translation_catalog_inspection_and_completeness_diagnostics - Add translation catalog inspection and completeness diagnostics
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Translation viewer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Translation catalogs are difficult to compare across locale files, and missing or surplus keys are only visible through manual file inspection.
- The viewer has no project-oriented tabular surface for this data.

# Scope
- In:
  - Add a repository-scoped read endpoint that returns normalized translation keys, locale values, source locale, diagnostics, and revision identifiers for the detected catalog.
  - Flatten nested JSON to stable dotted keys for comparison while retaining enough metadata to reconstruct the original nested shape.
  - Add a conditional Project navigation group and a Translations screen using existing document-screen lifecycle, refresh, minimize, and project-switch behavior.
  - Provide locale columns, text/key search, missing and extra filters, counts, and clear read-only messaging for non-editable conventions.
  - Keep large payload handling bounded with documented file, locale, key, and size limits.
- Out:
  - Automatic translation suggestions.
  - ICU message compilation or runtime application rendering.
  - Editing translation catalogs in this backlog slice.

# Acceptance criteria
- Nested JSON catalogs render as aligned locale columns with deterministic dotted-key ordering.
- Missing, empty, and extra values are visually distinct and filterable.
- Search matches both translation keys and visible values.
- Changing projects invalidates prior payloads and reloads capability state without showing stale repository data.
- Browser-host and Python tests cover navigation visibility, rendering, diagnostics, bounds, and read-only states.

# AC Traceability
- request-Project navigation shows Translations and Theme only when their corresponding capability is available, in both standalone and VS Code embedded viewer contexts. -> This backlog slice. Proof: Nested JSON catalogs render as aligned locale columns with deterministic dotted-key ordering.
- request-Supported locale catalogs can be searched, compared by key, filtered for missing or extra entries, and edited without losing nested JSON structure. -> This backlog slice. Proof: Missing, empty, and extra values are visually distinct and filterable.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Primary task(s): `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery`

# AI Context
- Summary: Add translation catalog inspection and completeness diagnostics
- Keywords: scaffolded-backlog, add translation catalog inspection and completeness diagnostics, implementation-ready
- Use when: Implementing the scaffolded slice for Add translation catalog inspection and completeness diagnostics.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery` was finished via `logics-manager flow finish task` on 2026-07-13.
