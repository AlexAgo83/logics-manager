## item_016_reliability_hardening_layout_hostapi_a11y_ci_and_debug_observability - Reliability hardening: layout state, host API abstraction, a11y, CI, and debug observability
> From version: 1.4.0
> Status: Ready
> Understanding: 99%
> Confidence: 96%
> Progress: 0%
> Complexity: High
> Theme: Reliability and maintainability hardening
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The extension still has fragile paths across layout/splitter state transitions, mixed runtime behavior between VS Code and web-debug, uneven accessibility baseline, and CI/test coverage gaps on critical UI flows.

# Scope
- In:
  - Consolidate layout/splitter behavior around a single explicit UI state model.
  - Separate runtime interactions through a host adapter (`vscode` vs browser/web-debug).
  - Expand regression tests for critical interactions and state transitions.
  - Improve accessibility metadata and keyboard/focus behavior on controls.
  - Enforce stricter CI validation gates.
  - Harden bootstrap recovery and board/list UX persistence.
  - Add optional debug observability for state transitions.
- Out:
  - Full visual redesign of the extension UI.
  - New unrelated feature modules.
  - Remote telemetry or external log collection backend.

# Acceptance criteria
- Layout/splitter behavior is deterministic and fully derived from explicit state.
- Splitter is hidden/disabled in incompatible modes and drag state is reset on switches.
- Automated tests cover orientation, collapse, splitter guards, double-click open, status actions, and root-control disabled state.
- Host adapter cleanly separates VS Code APIs from web-debug fallbacks.
- Accessibility baseline is enforced for controls (`title`, `aria-*`, keyboard/focus behavior).
- CI gates cover install/compile/tests and additional project validations defined by this hardening effort.
- Bootstrap remains recoverable when git is missing and tools expose re-run path.
- Board/list mode persistence and active-state feedback work without regressions.
- Debug logs are available behind a flag and disabled by default.

# AC Traceability
- AC1 -> explicit UI state model and deterministic layout rendering.
- AC2 -> mode guards and splitter drag reset logic.
- AC3 -> extended regression tests and assertions.
- AC4 -> host API abstraction boundaries and runtime adapters.
- AC5 -> accessibility attributes and keyboard/focus validations.
- AC6 -> CI workflow and local validation alignment.
- AC7 -> bootstrap fallback flow and tools action availability.
- AC8 -> persisted display mode + active state UX checks.
- AC9 -> debug-flagged observability hooks.

# Priority
- Impact:
  - High: affects reliability, debuggability, and UX quality across core workflows.
- Urgency:
  - High: recurring issues and regression risk justify hardening now.

# Notes
- Derived from `logics/request/req_016_reliability_hardening_layout_hostapi_a11y_ci_and_debug_observability.md`.

# Tasks
- `logics/tasks/task_017_orchestration_delivery_for_req_016_reliability_hardening.md`
