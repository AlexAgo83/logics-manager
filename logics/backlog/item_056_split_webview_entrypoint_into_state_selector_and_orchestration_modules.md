## item_056_split_webview_entrypoint_into_state_selector_and_orchestration_modules - Split webview entrypoint into state, selector, and orchestration modules
> From version: 1.10.0
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: High
> Theme: Webview modularity and UI-state architecture
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
[main.js](/Users/alexandreagostini/Documents/cdx-logics-vscode/media/main.js) is currently the largest concentration of webview state, event wiring, persistence, filtering, and top-level UI coordination.

That creates the exact architecture pressure identified in `adr_004`: new UX work tends to land in the bootstrap file instead of behind clearer boundaries such as explicit UI state, derived selectors, and presentation-focused renderers.

# Scope
- In:
  - Keep `main.js` as the webview bootstrap/composition shell.
  - Extract coherent modules for UI-state ownership, persistence, view-control state, filtering/search/sort/group selectors, and high-level action wiring where appropriate.
  - Preserve the current renderer split and strengthen the boundary between orchestration and derived logic.
  - Keep the shared model/selector direction compatible with `adr_004`.
- Out:
  - Rewriting the webview with a framework.
  - Changing current UX behavior as part of the split.
  - Duplicating logic across board/list/details while extracting modules.

# Acceptance criteria
- AC1: `main.js` becomes materially smaller and primarily acts as the webview entrypoint/composition shell.
- AC2: UI state, persistence, and derived viewing logic move into clearer modules with explicit ownership.
- AC3: The resulting structure reduces the need to add future features directly into `main.js`.
- AC4: Board, list, details, and auxiliary panels continue to share the same behavioral rules after refactoring.
- AC5: The extracted modules remain understandable and do not introduce circular or overly fragmented dependencies.

# Priority
- Impact:
  - High: this is the main webview maintainability bottleneck.
- Urgency:
  - High: upcoming UI backlog items depend directly on this boundary being healthier.

# Notes
- Derived from `logics/request/req_050_split_oversized_source_files_into_coherent_modules.md`.
- This item should be explicitly aligned with `adr_004` and should prefer real state/selector seams over cosmetic helper extraction.
- `main.js` should still be easy to locate as the bootstrap entry; the goal is not to hide orchestration behind opaque modules.

# References
- Architecture decision(s): `logics/architecture/adr_004_scale_the_plugin_around_a_derived_model_and_explicit_ui_state.md`

# Tasks
- `logics/tasks/task_061_split_webview_entrypoint_into_state_selector_and_orchestration_modules.md`
