## req_036_add_instant_local_search_to_the_plugin - Add instant local search to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Complexity: Medium
> Theme: Navigation speed and findability
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Add a fast local search input to filter visible Logics items instantly.
- Improve findability when the workspace contains many requests, backlog items, tasks, and companion docs.
- Reduce scanning time in both board mode and list mode.

# Context
The plugin currently relies on structural navigation:
- board columns;
- grouped list mode;
- filters;
- and manual scanning.

That works at small scale, but it becomes inefficient once the workspace grows.
Users need a direct way to find items by typing fragments of:
- title;
- id;
- stage;
- references or `used by` links;
- and a small set of key indicators where useful.

This request is not about remote search or full-text indexing across every file body.
It is about fast local UI-level search over the already indexed Logics data so the plugin behaves like a practical orchestration surface.

# Acceptance criteria
- AC1: The plugin exposes a search input for local item filtering.
- AC2: Typing into the search input updates visible results immediately without a manual refresh.
- AC3: Search works in both board mode and list mode.
- AC4: Search matches at least item title, id, stage, references or `used by` metadata, and a small first set of key indicators such as `Status`.
- AC5: Search combines predictably with existing filters instead of bypassing them.
- AC6: Clearing the search restores the previously visible filtered view.
- AC7: Search remains responsive with realistic workspace data volume.
- AC8: Automated tests cover core search filtering behavior where practical.

# Scope
- In:
  - Add a local search control to the plugin UI.
  - Filter visible items from already indexed data.
  - Integrate search with current board/list rendering and filters.
  - Add regression coverage for search behavior.
- Out:
  - Full-text file-content search.
  - Remote search.
  - Search result ranking based on advanced relevance heuristics.

# Dependencies and risks
- Dependency: the current indexed item model is the source for searchable fields.
- Dependency: existing filter logic and rendering paths will need a clean way to compose with search.
- Risk: naive search integration can make filtering logic harder to reason about if it is bolted on separately.
- Risk: poor search-field choice can create noisy matches and reduce trust.
- Risk: UI placement of the search field can clutter the header if not handled carefully.

# Clarifications
- The target is instant local search over the plugin’s known item data.
- The preferred experience is incremental filtering as the user types.
- Search should narrow the current view, not replace the current filtering model.
- The first useful scope should already cover title, id, stage, and lightweight relationship metadata so the search is operationally useful from day one.
- The recommended matching model is simple case-insensitive containment first, not fuzzy ranking or typo-tolerant heuristics.
- The recommended first UX is one global search field rather than scoped search modes or query-language complexity.
- Existing structural filters should apply first, with search narrowing the already-visible dataset rather than reintroducing filtered-out items.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_041_add_instant_local_search_to_the_plugin.md`
