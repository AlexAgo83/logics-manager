## task_014_orchestration_delivery_for_req_012_and_req_013_harness_controls_and_accessibility - Orchestration delivery for req_012 and req_013 harness controls and accessibility
> From version: 1.2.0
> Status: Ready
> Understanding: 97%
> Confidence: 94%
> Progress: 0%
> Complexity: Medium-High
> Theme: Harness UX and Accessibility Orchestration
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from:
- `logics/backlog/item_012_web_debug_harness_simulate_vs_code_controls_with_browser_native_behavior.md`
- `logics/backlog/item_013_accessibility_hardening_improve_discoverability_and_descriptions_for_controls.md`

This task coordinates two coupled improvements:
- make harness mode controls truly usable with browser-native fallback behavior;
- raise baseline accessibility/discoverability across primary controls.

Constraint:
- keep runtime behavior context-aware (no regression for real VS Code webview path).

# Plan
- [ ] 1. Implement harness context detection and action routing fallback for key controls.
- [ ] 2. Implement browser-native `Change Project Root` fallback and clear capability/error guidance.
- [ ] 3. Implement `Open`/`Edit` fallback opening target files/views in new tabs in harness mode.
- [ ] 4. Run a11y control audit and apply consistent labels/tooltips/ARIA state fixes.
- [ ] 5. Add or update tests for harness fallback behavior and critical a11y expectations.
- [ ] 6. Validate in both harness and VS Code runtime contexts.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1 (harness controls usable) -> fallback action handlers in `media/main.js`/harness scripts.
- AC2 (root picker/path fallback) -> browser fallback flow with explicit guidance.
- AC3 (open/edit new tab) -> fallback target opening behavior in harness runtime.
- AC4 (a11y discoverability) -> tooltip/title + ARIA/name coverage updates in UI controls.
- AC5 (no runtime regression) -> manual parity checks for VS Code-hosted webview.

# Validation
- `npm run compile`
- `npm run test`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
- Manual (harness): validate change-root and open/edit fallbacks.
- Manual (VS Code): validate default message-based behavior remains unchanged.
- Manual (a11y): keyboard-only navigation and control discoverability checks.

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.

# Report
- Risks:
  - drift between harness behavior and VS Code runtime behavior.
  - browser capability differences for filesystem APIs.
- Mitigation:
  - keep explicit runtime-branching and fallback guidance.
  - document unsupported capability behavior clearly in debug docs.
