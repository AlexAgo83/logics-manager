## req_039_improve_ui_state_persistence_in_the_plugin - Improve UI state persistence in the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Complexity: Medium
> Theme: UI continuity and workflow stability
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Preserve more of the user’s working context across refreshes and view changes.
- Reduce the feeling that the plugin “forgets” useful UI state too easily.
- Make the orchestration surface feel steadier during repeated daily use.

# Context
The plugin already persists some state, but there is still room to make the experience more continuous.
Useful state that may deserve better restoration includes:
- selection;
- scroll position;
- expanded/collapsed groups or sections;
- view mode;
- other local UI preferences.

Users working repeatedly in the same project should not have to reconstruct their view every time the plugin refreshes or re-renders.
Better persistence would make the surface feel more intentional and reduce repetitive friction.

# Acceptance criteria
- AC1: The plugin preserves a broader set of high-value UI state across normal refreshes and reloads.
- AC1a: Persisted UI state remains scoped to the current workspace rather than acting like a global cross-project preference bucket.
- AC2: Persisted state restores cleanly without creating inconsistent UI.
- AC3: State restoration remains compatible with current filters and responsive behavior.
- AC4: Selection persistence is improved where technically safe.
- AC5: Scroll and expansion state persistence are improved where applicable and understandable.
- AC6: The persistence model remains predictable and does not restore stale or misleading state when underlying data changes significantly.
- AC7: Tests cover the most important restored state paths where practical.

# Scope
- In:
  - Improve persistence for high-value UI state.
  - Restore state coherently after refresh/reload.
  - Keep restoration logic predictable and safe.
  - Add regression coverage for persisted state behavior.
- Out:
  - Persisting every possible transient UI detail.
  - Introducing remote sync of UI preferences.
  - Reworking the entire state model of the plugin if not needed.

# Dependencies and risks
- Dependency: current webview state persistence is the basis for the improvement.
- Dependency: persistence should remain understandable across board/list/responsive variants.
- Risk: restoring too much state can feel wrong when the underlying dataset has changed significantly.
- Risk: over-persistence can reintroduce stale context that confuses the user.
- Risk: state keys can become fragmented if new persistence is added without structure.

# Clarifications
- The request is to improve meaningful continuity, not to memorize every transient visual detail.
- Restoration should favor states that save real effort for the user.
- Persisted state must remain safe in the face of data changes, not blindly restored at all costs.
- The preferred outcome is “stable and helpful”, not “maximally sticky”.
- The recommended first set of restored state is: view mode, filters, search, collapsed groups or sections, selected item if it still exists, and scroll position where the target surface is still stable enough to restore safely.
- When restored state conflicts with the current dataset, the preferred behavior is to drop the invalid fragment of state quietly rather than force stale context back into the UI.
- The first persistence goal is continuity across refresh, rerender, and workspace reopening, not an aggressively sticky long-term memory of every transient view detail.
- Responsive overrides may temporarily force a different presentation, but the underlying user preference should still be preserved and restored when the forced condition no longer applies.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_044_improve_ui_state_persistence_in_the_plugin.md`
