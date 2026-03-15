## task_061_split_webview_entrypoint_into_state_selector_and_orchestration_modules - Split webview entrypoint into state, selector, and orchestration modules
> From version: 1.10.0
> Status: Ready
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: High
> Theme: Webview modularity and UI-state architecture
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_056_split_webview_entrypoint_into_state_selector_and_orchestration_modules`.
- Source file: `logics/backlog/item_056_split_webview_entrypoint_into_state_selector_and_orchestration_modules.md`.
- Related request(s): `req_050_split_oversized_source_files_into_coherent_modules`.
- Architectural direction in `adr_004_scale_the_plugin_around_a_derived_model_and_explicit_ui_state`.

# Plan
- [ ] 1. Keep `main.js` as the webview bootstrap/composition shell.
- [ ] 2. Extract modules for UI state, persistence, selectors, and high-level orchestration.
- [ ] 3. Preserve shared behavioral rules across board, list, details, and auxiliary panels.
- [ ] 4. Keep the split aligned with `adr_004` and avoid circular or overly fragmented dependencies.
- [ ] FINAL: Update related Logics docs

# Links
- Backlog item: `item_056_split_webview_entrypoint_into_state_selector_and_orchestration_modules`
- Request(s): `req_050_split_oversized_source_files_into_coherent_modules`
- Architecture decision(s): `adr_004_scale_the_plugin_around_a_derived_model_and_explicit_ui_state`

# Validation
- `npm run compile`
- `npm test`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status and progress updated.
