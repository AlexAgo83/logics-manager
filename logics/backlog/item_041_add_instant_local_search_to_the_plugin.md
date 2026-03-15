## item_041_add_instant_local_search_to_the_plugin - Add instant local search to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Progress: 100%
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
- AC1/AC2 -> the webview now exposes a toolbar search input and filters results immediately as the query changes. Proof: `src/extension.ts`, `media/main.js`.
- AC3/AC4 -> board and list modes both use the same search-aware visibility pipeline across title, id, stage, relationship metadata, and indicators. Proof: `media/main.js`.
- AC5/AC6 -> search narrows the current filtered dataset and clearing the field restores the pre-search filtered view. Proof: `media/main.js`, `tests/webview.harness-a11y.test.ts`.
- AC7 -> the first implementation stays responsive by using simple case-insensitive containment over already indexed in-memory item metadata. Proof: `media/main.js`.
- AC8 -> harness tests cover instant filtering and filter composition in both board and list modes. Proof: `tests/webview.harness-a11y.test.ts`.

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
