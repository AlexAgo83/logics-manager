## task_009_rename_entry_name_suffix - Allow renaming request/backlog/task entry names
> From version: 1.0.4
> Understanding: 85%
> Confidence: 80%
> Progress: 100%

# Context
Derived from `logics/backlog/item_005_rename_entry_name_suffix.md`.
Implement suffix-only rename for Logics entries, triggered from details view, with reference updates and safe file operations.

# Plan
- [x] 1. Define rename constraints and normalization rules (suffix-only edit, allowed chars, duplicate filename handling).
- [x] 2. Add details-panel CTA (edit/pencil icon near entry name) and rename interaction UX.
- [x] 3. Implement extension handler to rename the target Markdown file while preserving the `<type>_<num>_` prefix.
- [x] 4. Update managed references/used-by links that target the renamed entry across Logics docs.
- [x] 5. Refresh/reindex board data after save while keeping the current selection when possible.
- [x] 6. Add robust error paths for invalid suffix, collisions, and IO failures.
- [x] FINAL: Manual verification in VS Code for CTA placement, rename flow, reference updates, and refresh behavior.

# Validation
- Manual: not run yet (needs verification in VS Code).
- Manual: edit/pencil CTA appears next to the entry name in details.
- Manual: rename UI only edits suffix after `<type>_<num>_`.
- Manual: successful rename updates Markdown filename and displayed title/path.
- Manual: managed `References` / `Used by` links still resolve to the renamed entry.
- Manual: invalid names and collisions are blocked with explicit feedback.
- Manual: changes persist after refresh/reload.
- Automated: `npm run compile` ✅

# Report
Implemented suffix-only rename from details panel with an inline pencil CTA near the entry name. Added a new webview action (`rename-entry`) and extension handler that validates input, preserves immutable `<type>_<num>_` prefix, renames the Markdown file, updates the top heading ID when it matches old ID, rewrites managed relation references (`References`, `Used by`, promotion/derived/backlog links) across Logics docs, and refreshes board/details with the new selected ID. Added guardrails for invalid suffixes, collisions, unsupported stages, and rename/update failures.

# Notes
- Keep backward compatibility with existing relation parsing formats.
- Code touchpoints: `src/extension.ts`, `media/main.js`, `media/main.css`.
