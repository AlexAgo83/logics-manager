## task_008_add_references_and_used_by_links - Add references and used-by links on request/backlog/task entries
> From version: 0.0.0
> Understanding: 80%
> Confidence: 80%
> Progress: 0%

# Context
Derived from `logics/backlog/item_004_add_references_and_used_by_links.md`.
Allow users to add and persist `References` and `Used by` links directly from the details panel.
UX decision: place `+` actions in `References` / `Used by` section headers, with inline CTA fallback when a section is empty.

# Plan
- [ ] 1. Define the Markdown write format for manual `References` and `Used by` links while preserving compatibility with current parsed relation formats.
- [ ] 2. Add contextual `+` actions in `References` and `Used by` section headers (details panel), and keep global bottom actions unchanged.
- [ ] 3. Add inline empty-state CTAs (`+ Add reference` / `+ Add used by`) when those sections have no entries.
- [ ] 4. Wire extension handlers to update target Markdown files, then refresh/reindex while keeping selection stable.
- [ ] 5. Extend indexer parsing where needed so manual links are displayed with existing promoted/derived/backlog relations.
- [ ] FINAL: Manual verification in VS Code for placement, empty states, add/save/refresh behavior, and backward compatibility.

# Validation
- Manual: not run yet (needs verification in VS Code).
- Manual: `+` actions are visible in `References` and `Used by` section headers of the details panel.
- Manual: user can add one or more `References` links from the details panel.
- Manual: user can add one or more `Used by` links from the details panel.
- Manual: empty `References`/`Used by` sections show inline CTA to add the first link.
- Manual: links are written to disk and still present after refresh/reload.
- Manual: existing relation formats still render correctly in details.

# Report
TBD.

# Notes
- UI placement: contextual section-header buttons, not bottom action-bar buttons.
