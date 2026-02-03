## task_009_rename_entry_name_suffix - Allow renaming request/backlog/task entry names
> From version: 1.0.4
> Understanding: 85%
> Confidence: 80%
> Progress: 0%

# Context
Derived from `logics/backlog/item_005_rename_entry_name_suffix.md`.
Implement suffix-only rename for Logics entries, triggered from details view, with reference updates and safe file operations.

# Plan
- [ ] 1. Define rename constraints and normalization rules (suffix-only edit, allowed chars, duplicate filename handling).
- [ ] 2. Add details-panel CTA (edit/pencil icon near entry name) and rename interaction UX.
- [ ] 3. Implement extension handler to rename the target Markdown file while preserving the `<type>_<num>_` prefix.
- [ ] 4. Update managed references/used-by links that target the renamed entry across Logics docs.
- [ ] 5. Refresh/reindex board data after save while keeping the current selection when possible.
- [ ] 6. Add robust error paths for invalid suffix, collisions, and IO failures.
- [ ] FINAL: Manual verification in VS Code for CTA placement, rename flow, reference updates, and refresh behavior.

# Validation
- Manual: not run yet (needs verification in VS Code).
- Manual: edit/pencil CTA appears next to the entry name in details.
- Manual: rename UI only edits suffix after `<type>_<num>_`.
- Manual: successful rename updates Markdown filename and displayed title/path.
- Manual: managed `References` / `Used by` links still resolve to the renamed entry.
- Manual: invalid names and collisions are blocked with explicit feedback.
- Manual: changes persist after refresh/reload.
- Automated: `npm run compile`.

# Report
TBD.

# Notes
- Keep backward compatibility with existing relation parsing formats.
