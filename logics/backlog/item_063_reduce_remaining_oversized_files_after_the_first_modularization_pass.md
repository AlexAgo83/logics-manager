## item_063_reduce_remaining_oversized_files_after_the_first_modularization_pass - Reduce remaining oversized files after the first modularization pass
> From version: 1.10.1
> Status: Ready
> Understanding: 97%
> Confidence: 95%
> Progress: 0%
> Complexity: Medium
> Theme: Second-pass modularity and ownership clarity
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The first modularization pass removed the worst monoliths, but a few remaining source files still sit above the intended comfort zone and continue to aggregate multiple responsibilities:
- `src/logicsViewProvider.ts`
- `media/main.js`
- `logics/skills/logics-flow-manager/scripts/logics_flow_support.py`

These files are smaller than before, but they still concentrate enough unrelated concerns to slow down navigation, increase refactor risk, and make future feature work gravitate back toward oversized hubs.

# Scope
- In:
  - Extract one or more coherent responsibility modules from `src/logicsViewProvider.ts`.
  - Extract one or more coherent responsibility modules from `media/main.js`.
  - Extract one or more coherent responsibility modules from `logics_flow_support.py`.
  - Preserve entrypoint readability and explicit ownership boundaries.
  - Update tests and validation where an extracted boundary needs direct protection.
- Out:
  - Repo-wide modularization beyond the remaining oversized files.
  - Purely mechanical line-count splitting with weak ownership.
  - Behavioral changes hidden behind structural refactors.

# Acceptance criteria
- AC1: Each targeted file is reduced by extracting one or more coherent responsibility modules instead of continuing to centralize unrelated logic.
- AC2: The resulting files move toward the intended `500` to `1000` line ceiling, with any remaining exception explicitly justified by boundary clarity.
- AC3: The host/webview/kit entry points remain easy to discover and still read as the main orchestration entry for their domain.
- AC4: No user-visible behavior or workflow semantics change as a side effect of the refactor.
- AC5: Imports and module boundaries remain understandable and do not introduce circular or opaque indirection.
- AC6: Existing validation stays green, and targeted regression tests are updated or added where a newly extracted boundary needs protection.

# Priority
- Impact:
  - Medium: these files are no longer catastrophic monoliths, but they still accumulate enough concerns to create maintenance drag.
- Urgency:
  - Medium: this is best handled before the next feature wave regrows the same aggregation points.

# Notes
- Derived from `logics/request/req_054_reduce_remaining_oversized_files_after_the_first_modularization_pass.md`.
- Related architecture decision(s):
  - `logics/architecture/adr_004_scale_the_plugin_around_a_derived_model_and_explicit_ui_state.md`
  - `logics/architecture/adr_005_define_responsive_layout_scroll_and_sizing_rules_for_plugin_views.md`
- Preferred seams:
  - `src/logicsViewProvider.ts`: provider actions, prompt flows, mutation helpers, HTML/data assembly.
  - `media/main.js`: orchestration state changes, host-message handling, rerender scheduling, UI action wiring.
  - `logics_flow_support.py`: workflow guidance/report text, companion-doc heuristics, shared mutation or normalization helpers.

# Tasks
- `logics/tasks/task_068_reduce_remaining_oversized_files_after_the_first_modularization_pass.md`

# AC Traceability
- AC1 -> Extract focused modules from each remaining oversized file. Proof: TODO.
- AC2 -> Leave each entrypoint near the target ceiling, or document any justified exception. Proof: TODO.
- AC3 -> Keep the resulting top-level files readable as orchestration entrypoints. Proof: TODO.
- AC4 -> Preserve behavior while refactoring structure only. Proof: TODO.
- AC5 -> Keep imports and boundaries clear and non-circular. Proof: TODO.
- AC6 -> Update validation and regression tests for any extracted seams. Proof: TODO.
