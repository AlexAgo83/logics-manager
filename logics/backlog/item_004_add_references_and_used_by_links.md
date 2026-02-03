## item_004_add_references_and_used_by_links - Add references and used-by links on request/backlog/task entries
> From version: 1.0.3
> Understanding: 85%
> Confidence: 85%
> Progress: 100%

# Problem
Allow users to add and edit `References` and/or `Used by` links directly on Logics entries across Request, Backlog, and Task stages.

# Scope
- In:
  - Place `+` action buttons in the details panel section headers (`References`, `Used by`), not in the global bottom actions row.
  - Provide a UI action to add one or more references on a selected entry (`request`, `backlog`, `task`).
  - Provide a UI action to add one or more `Used by` links on a selected entry.
  - When a section is empty, show an inline CTA (`+ Add reference` / `+ Add used by`) in that section.
  - Persist those links in the source Markdown file and refresh the board/details view.
  - Keep compatibility with existing relation formats already parsed by the extension.
  - Show newly added links in the details panel sections (`References`, `Used by`).
- Out:
  - Bulk-editing relations across multiple files at once.
  - Automatic inference/sync of all reverse links outside explicit user action.
  - New external relation sources (Jira/Linear/Confluence) in this scope.

# Acceptance criteria
- In the details panel, `References` and `Used by` headers each expose a contextual `+` action.
- From the details panel, a user can add a reference link to a selected request/backlog/task entry.
- From the details panel, a user can add a `Used by` link to a selected request/backlog/task entry.
- If a section has no entries, it shows an inline CTA to add the first link.
- Added links are written to disk in the target Markdown file and survive refresh/reload.
- The details panel shows the new links immediately after save.
- Existing documents with current relation formats still render correctly.

# Priority
- Impact:
- High — improves traceability and manual linkage quality across the flow.
- Urgency:
- Medium — needed for day-to-day maintenance of relations between entries.

# Notes
- Derived from `logics/request/req_004_add_references_and_used_by_links.md`.
- Related task:
  - `logics/tasks/task_008_add_references_and_used_by_links.md`
