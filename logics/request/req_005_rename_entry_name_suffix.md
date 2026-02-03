## req_005_rename_entry_name_suffix - Allow renaming request/backlog/task entry names
> From version: 1.0.4
> Understanding: 90%
> Confidence: 85%

# Needs
- Give users the ability to rename entry names for `request`, `item`, and `task`.

# Context
- Entry filenames follow an identifier pattern with an immutable prefix (`<type>_<num>_...`).
- Users currently cannot adjust naming after creation, which makes refinement and readability harder over time.

# Clarifications
- Only allow editing the suffix part after `<type>_<num>_` (example: `item_012_<editable-name>`).
- Keep `<type>_<num>_` unchanged during rename.
- Trigger rename from a CTA in the details page, ideally an edit/pencil icon near the current name.
- Persist rename in the source Markdown file and refresh the board/details view.
- Propagate the new name anywhere it is displayed or referenced by the extension.

# Backlog
- `logics/backlog/item_005_rename_entry_name_suffix.md`
