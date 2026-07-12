## item_544_enable_safe_editing_of_supported_json_translation_catalogs - Enable safe editing of supported JSON translation catalogs
> From version: 2.17.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Translation editing
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Inspection alone still requires users to leave the viewer for routine missing-value corrections.
- Naive whole-file writes risk overwriting concurrent changes, escaping the intended files, or corrupting catalog structure.

# Scope
- In:
  - Add cell-level edit and save interactions for conventions explicitly marked editable.
  - Submit the locale, key, new string value, and last-read revision rather than accepting an arbitrary path or full file body.
  - Resolve the target exclusively from the current detected capability and reject stale revisions with a reload prompt.
  - Rebuild and validate nested JSON, preserve established indentation and terminal newline where practical, and atomically replace the file.
  - Reuse origin, loopback or paired-device write authorization, and viewer read-only state controls.
  - Report validation and write failures without discarding the user's unsaved cell value.
- Out:
  - Creating or deleting locale files.
  - Renaming or deleting translation keys.
  - Batch machine translation or multi-cell transactions.
  - Writing JavaScript or TypeScript translation modules.

# Acceptance criteria
- An authorized local edit updates only the detected locale file and preserves unrelated keys and nested objects.
- Read-only viewer modes, unsupported conventions, arbitrary paths, invalid value types, path escapes, and stale revisions are rejected.
- A failed validation or write leaves the original file intact.
- Successful saves refresh diagnostics and clear the cell's dirty state.
- Tests cover authorization, conflict, validation, atomic-write failure, and successful nested JSON updates.

# AC Traceability
- request-Supported locale catalogs can be searched, compared by key, filtered for missing or extra entries, and edited without losing nested JSON structure. -> This backlog slice. Proof: An authorized local edit updates only the detected locale file and preserves unrelated keys and nested objects.
- request-Every write is limited to detected files inside the selected repository, requires the existing viewer mutation authorization, detects stale revisions, validates the new representation, and replaces the target atomically. -> This backlog slice. Proof: Read-only viewer modes, unsupported conventions, arbitrary paths, invalid value types, path escapes, and stale revisions are rejected.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Primary task(s): `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery`

# AI Context
- Summary: Enable safe editing of supported JSON translation catalogs
- Keywords: scaffolded-backlog, enable safe editing of supported json translation catalogs, implementation-ready
- Use when: Implementing the scaffolded slice for Enable safe editing of supported JSON translation catalogs.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
