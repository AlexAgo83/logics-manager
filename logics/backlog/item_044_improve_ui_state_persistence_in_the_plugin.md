## item_044_improve_ui_state_persistence_in_the_plugin - Improve UI state persistence in the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Medium
> Theme: UI continuity and workflow stability
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin already persists some UI state, but it still loses too much working context across refreshes and view changes. That forces users to reconstruct their view repeatedly.

Improving persistence would make the plugin feel steadier and more helpful during repeated daily use, especially around selection, scroll, expansion state, and other high-value UI preferences.

# Scope
- In:
  - Improve persistence for high-value UI state.
  - Restore that state coherently after refresh or reload.
  - Keep the persisted state scoped to the current workspace.
  - Keep restoration predictable and safe when data changes.
  - Add regression coverage for important restored-state paths.
- Out:
  - Persisting every transient UI detail.
  - Remote preference sync.
  - Replacing the current state model wholesale unless needed.

# Acceptance criteria
- AC1: The plugin preserves a broader set of high-value UI state across normal refreshes and reloads.
- AC1a: Persisted UI state remains scoped to the current workspace rather than acting like a global cross-project preference bucket.
- AC2: Persisted state restores cleanly without creating inconsistent UI.
- AC3: State restoration remains compatible with current filters and responsive behavior.
- AC4: Selection persistence is improved where technically safe.
- AC5: Scroll and expansion state persistence are improved where applicable and understandable.
- AC6: The persistence model remains predictable and does not restore stale or misleading state when underlying data changes significantly.
- AC7: Tests cover the most important restored-state paths where practical.

# AC Traceability
- AC1/AC2 -> persistence scope is extended and restoration is validated. Proof: TODO.
- AC3 -> restored state composes cleanly with existing filters/layout behavior. Proof: TODO.
- AC4 -> selection recovery is improved without misleading stale selection. Proof: TODO.
- AC5 -> scroll/expansion persistence is applied where valuable. Proof: TODO.
- AC6 -> restoration rules remain guarded when data changed. Proof: TODO.
- AC7 -> tests cover important continuity paths. Proof: TODO.

# Priority
- Impact:
  - Medium-High: makes the plugin feel substantially more stable in daily use.
- Urgency:
  - Medium: valuable quality improvement with moderate complexity.

# Notes
- Derived from `logics/request/req_039_improve_ui_state_persistence_in_the_plugin.md`.
- The first restored-state target set is view mode, filters, search, collapsed groups or sections, selected item when still valid, and scroll state where safe.
- Invalid restored fragments should be dropped quietly, and responsive overrides may temporarily supersede a stored preference without erasing it.

# Tasks
- `logics/tasks/task_038_improve_ui_state_persistence_in_the_plugin.md`
