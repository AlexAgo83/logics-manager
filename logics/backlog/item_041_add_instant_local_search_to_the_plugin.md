## item_041_add_instant_local_search_to_the_plugin - Add instant local search to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Medium
> Theme: Navigation speed and findability
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The current plugin relies mainly on structural navigation and visual scanning. As the workspace grows, that becomes too slow for finding a specific item quickly.

Users need a direct search path over the already indexed item metadata so they can narrow the visible set immediately without manually scanning columns or long grouped lists.

# Scope
- In:
  - Add a local search control to the plugin UI.
  - Filter visible items from already indexed data.
  - Support board mode and list mode.
  - Compose search with existing filters.
  - Add regression coverage for search behavior.
- Out:
  - Full-text document-body search.
  - Remote search.
  - Advanced search ranking beyond practical field matching.

# Acceptance criteria
- AC1: The plugin exposes a search input for local item filtering.
- AC2: Typing updates visible results immediately without manual refresh.
- AC3: Search works in both board mode and list mode.
- AC4: Search matches at least item title, id, stage, lightweight relationship metadata, and a small first set of key indicators such as `Status`.
- AC5: Search combines predictably with existing filters.
- AC6: Clearing search restores the previous filtered view.
- AC7: Search remains responsive with realistic workspace data volume.
- AC8: Automated tests cover core search filtering behavior where practical.

# AC Traceability
- AC1/AC2 -> local search input and incremental filtering are added to the webview. Proof: TODO.
- AC3/AC4 -> board/list rendering uses the same searchable item subset. Proof: TODO.
- AC5/AC6 -> search composes cleanly with existing filters and reset behavior. Proof: TODO.
- AC7 -> implementation avoids visibly slow filtering on realistic data sets. Proof: TODO.
- AC8 -> tests cover the main search paths. Proof: TODO.

# Priority
- Impact:
  - High: strong productivity gain in larger workspaces.
- Urgency:
  - Medium: broadly valuable feature with moderate implementation effort.

# Notes
- Derived from `logics/request/req_036_add_instant_local_search_to_the_plugin.md`.
- The recommended first implementation is a single global search field using simple case-insensitive containment over the already visible filtered dataset.

# Tasks
- `logics/tasks/task_035_add_instant_local_search_to_the_plugin.md`
