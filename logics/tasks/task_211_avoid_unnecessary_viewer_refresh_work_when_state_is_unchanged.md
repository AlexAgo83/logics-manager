## task_211_avoid_unnecessary_viewer_refresh_work_when_state_is_unchanged - Avoid unnecessary viewer refresh work when state is unchanged
> From version: 2.7.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_403_avoid_unnecessary_viewer_refresh_work_when_state_is_unchanged`

# Acceptance criteria
- AC1: The viewer defines a stable state signature for the refresh-relevant data it already observes, covering at minimum corpus item identity/status timestamps, Git branch/count/badge state, and project capability state.
- AC2: When a refresh produces the same signature as the previous refresh, the viewer avoids replacing the active document/panel content and avoids reloading selected detail content solely because refresh was requested.
- AC3: When the signature changes, the viewer performs the normal update path and the UI reflects the new Git/CDX/CI/health/corpus state.
- AC4: Manual refresh still provides visible feedback that a check occurred, even when no state changed.
- AC5: A force-refresh path or equivalent escape hatch can bypass the unchanged-state shortcut for debugging or recovery.
- AC6: The signature comparison is deterministic and ignores volatile fields that should not trigger UI rerenders on their own, such as "checked at" timestamps or transient fetch bookkeeping.
- AC7: Tests cover unchanged refresh, changed refresh, manual no-change feedback, and at least one active-panel preservation case.
- AC8: The implementation does not introduce persistent cache complexity or stale-state risk beyond the current in-memory viewer session.

# Implementation plan
- Identify current refresh entry points in `clients/viewer/browser-host.js`, especially item hydration, Git badge/status refresh, capability refresh, and secondary panel refresh.
- Add a deterministic in-memory signature helper for the subset of payload fields that should trigger rerendering.
- Store the last observed signature per viewer project/context and compare it after lightweight probes complete.
- Preserve active document/panel content and selected detail state when a refresh returns the same signature.
- Ensure manual refresh still updates status text such as "Checked just now" or equivalent without replacing content.
- Add a force-refresh path for debugging/recovery that bypasses the unchanged-state shortcut.
- Mirror browser-host changes into `logics_manager/viewer_assets/viewer/browser-host.js`.
- Add browser-host tests for unchanged refresh, changed refresh, manual no-change feedback, and active Git/CDX panel preservation.

# Validation
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_211_avoid_unnecessary_viewer_refresh_work_when_state_is_unchanged.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement deterministic no-change refresh detection in the local viewer to avoid redundant rerenders.
- Keywords: viewer refresh, state signature, rerender skip, active panel preservation, manual refresh feedback
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_237_avoid_unnecessary_viewer_refresh_work_when_state_is_unchanged`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: planned task acceptance criterion covers: The viewer defines a stable state signature for the refresh-relevant data it already observes, covering at minimum corpus item identity/status timestamps, Git branch/count/badge state, and project capability state.
- request-AC2 -> This task. Proof: planned task acceptance criterion covers: When a refresh produces the same signature as the previous refresh, the viewer avoids replacing the active document/panel content and avoids reloading selected detail content solely because refresh was requested.
- request-AC3 -> This task. Proof: planned task acceptance criterion covers: When the signature changes, the viewer performs the normal update path and the UI reflects the new Git/CDX/CI/health/corpus state.
- request-AC4 -> This task. Proof: planned task acceptance criterion covers: Manual refresh still provides visible feedback that a check occurred, even when no state changed.
- request-AC5 -> This task. Proof: planned task acceptance criterion covers: A force-refresh path or equivalent escape hatch can bypass the unchanged-state shortcut for debugging or recovery.
- request-AC6 -> This task. Proof: planned task acceptance criterion covers: The signature comparison is deterministic and ignores volatile fields that should not trigger UI rerenders on their own, such as "checked at" timestamps or transient fetch bookkeeping.
- request-AC7 -> This task. Proof: planned task acceptance criterion covers: Tests cover unchanged refresh, changed refresh, manual no-change feedback, and at least one active-panel preservation case.
- request-AC8 -> This task. Proof: planned task acceptance criterion covers: The implementation does not introduce persistent cache complexity or stale-state risk beyond the current in-memory viewer session.
