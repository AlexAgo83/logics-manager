## item_005_rename_entry_name_suffix - Allow renaming request/backlog/task entry names
> From version: 1.0.4
> Understanding: 90%
> Confidence: 85%
> Progress: 0%

# Problem
Allow users to rename entry names for `request`, `item`, and `task` while keeping stable identifiers.

# Scope
- In:
  - Add a rename CTA (edit/pencil icon) in the details panel near the current entry name.
  - Open a rename action that only edits the suffix after `<type>_<num>_` (example: `item_012_<editable-name>`).
  - Keep `<type>_<num>_` immutable during rename.
  - Persist the rename by updating the source Markdown filename.
  - Update references to the renamed entry anywhere they are managed by the extension (relations/links in Logics docs).
  - Refresh index/board/details after save, keeping selection stable when possible.
  - Prevent invalid names and filename collisions.
- Out:
  - Renaming the entry type (`req`/`item`/`task`) or numeric identifier.
  - Bulk renaming multiple entries in one action.
  - Refactoring arbitrary free-text mentions not represented as managed links/relations.

# Acceptance criteria
- The details panel exposes a rename CTA (edit/pencil icon) next to the entry name.
- Triggering rename lets the user edit only the suffix segment after `<type>_<num>_`.
- Saving a valid new suffix renames the underlying Markdown file and keeps `<type>_<num>_` unchanged.
- Renamed entry title/path is refreshed in board columns and details view immediately after save.
- References/used-by links managed by the extension point to the new entry path after rename.
- If the new name is invalid or already exists, the action is blocked with a clear error.
- Rename changes persist after refresh/reload.

# Priority
- Impact:
- High - improves maintenance quality and readability of Logics entries over time.
- Urgency:
- Medium - needed to support iterative naming/refinement after creation.

# Notes
- Derived from `logics/request/req_005_rename_entry_name_suffix.md`.
- Related task:
  - `logics/tasks/task_009_rename_entry_name_suffix.md`
