## item_546_enable_safe_editing_of_css_custom_property_theme_tokens - Enable safe editing of CSS custom-property theme tokens
> From version: 2.17.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Theme editing
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Theme review becomes more useful when a designer or developer can make a bounded token adjustment and see the preview immediately.
- Generic CSS rewriting can destroy comments, formatting, or unrelated rules, so edits must target only an existing detected declaration.

# Scope
- In:
  - Add token-value editing only for existing CSS custom-property declarations in an editable detected source.
  - Submit selector, property name, new value, and last-read revision rather than arbitrary CSS or a file path.
  - Validate the value as a bounded single CSS declaration value and reject rule delimiters, comments, or structural syntax.
  - Replace only the matched declaration value, preserve surrounding source text, and atomically write after revision verification.
  - Update the isolated preview optimistically and reconcile it with the saved server payload.
- Out:
  - Adding, deleting, or renaming CSS variables or selectors.
  - A general CSS editor, parser, formatter, or design-token conversion system.
  - Editing Tailwind configuration or TypeScript theme objects.

# Acceptance criteria
- An authorized edit changes exactly one existing declaration value and preserves comments, ordering, whitespace outside the value, and unrelated CSS.
- Structural CSS input, unknown selectors or properties, duplicate ambiguous declarations, stale revisions, and unauthorized requests are rejected.
- Failed edits leave the source file intact and keep the proposed value visible for correction.
- The preview refreshes from the persisted source after a successful save.
- Focused tests cover safe replacement, ambiguous matches, malicious values, authorization, conflicts, and atomic-write failure.

# AC Traceability
- request-Supported CSS custom-property themes can be previewed by semantic category and edited with validation, while source-defined theme modes remain read-only. -> This backlog slice. Proof: An authorized edit changes exactly one existing declaration value and preserves comments, ordering, whitespace outside the value, and unrelated CSS.
- request-Every write is limited to detected files inside the selected repository, requires the existing viewer mutation authorization, detects stale revisions, validates the new representation, and replaces the target atomically. -> This backlog slice. Proof: Structural CSS input, unknown selectors or properties, duplicate ambiguous declarations, stale revisions, and unauthorized requests are rejected.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Primary task(s): `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery`

# AI Context
- Summary: Enable safe editing of CSS custom-property theme tokens
- Keywords: scaffolded-backlog, enable safe editing of css custom-property theme tokens, implementation-ready
- Use when: Implementing the scaffolded slice for Enable safe editing of CSS custom-property theme tokens.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
