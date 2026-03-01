## item_012_web_debug_harness_simulate_vs_code_controls_with_browser_native_behavior - Web debug harness: simulate VS Code controls with browser-native behavior
> From version: 1.2.0
> Status: In progress
> Understanding: 99%
> Confidence: 96%
> Progress: 92%
> Complexity: Medium
> Theme: Debug Harness UX Parity
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
In web debug mode, many controls currently post VS Code messages without meaningful browser fallback, so actions look clickable but do nothing useful.

# Scope
- In:
  - Detect harness/runtime context and route key actions to browser-native behavior.
  - Add fallback flow for `Change Project Root` (filesystem picker and/or path prompt guidance).
  - Add fallback behavior for `Open`/`Edit` to open target file content in a new browser tab.
  - Provide explicit user feedback when browser capabilities are unavailable.
- Out:
  - Full replacement of extension-host business logic in browser mode.
  - Persisting project-wide mutations outside controlled debug actions.

# Acceptance criteria
- In harness mode, key controls no longer behave as silent no-ops.
- `Change Project Root` provides a browser fallback path selection/input flow.
- `Open` and `Edit` open a useful target view in a new browser tab.
- Runtime behavior remains context-aware (real VS Code path unchanged).
- Unsupported capabilities show clear user feedback and fallback guidance.

# AC Traceability
- AC1 -> Runtime-detection and action routing in `media/main.js` and harness scripts.
- AC2 -> Root selection fallback flow implemented in harness context.
- AC3 -> Open/Edit fallback tab behavior implemented and validated.
- AC4 -> Tests/manual checks capture both harness and VS Code contexts.

# Priority
- Impact:
  - High: directly improves debug productivity and action discoverability.
- Urgency:
  - Medium-High: needed to make harness mode practically usable.

# Notes
- Derived from `logics/request/req_012_web_debug_harness_simulate_vs_code_controls_with_browser_native_behavior.md`.

# Tasks
- `logics/tasks/task_014_orchestration_delivery_for_req_012_and_req_013_harness_controls_and_accessibility.md`
