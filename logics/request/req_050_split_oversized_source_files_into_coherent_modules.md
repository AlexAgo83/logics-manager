## req_050_split_oversized_source_files_into_coherent_modules - Split oversized source files into coherent modules
> From version: 1.10.0
> Status: In progress
> Understanding: 99%
> Confidence: 97%
> Complexity: High
> Theme: Codebase modularity and maintainability
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Reduce the maintenance cost of a few oversized source files that currently concentrate too many responsibilities.
- Make core plugin logic easier to reason about, review, test, and evolve safely.
- Keep module size in a healthier range, with a target of roughly `500` to `1000` lines max for the largest files after refactoring.

# Context
Several files have grown beyond a comfortable maintenance size and now mix multiple concerns:
- `src/extension.ts` — `2164` lines
- `tests/webview.harness-a11y.test.ts` — `1790` lines
- `media/main.js` — `1595` lines
- `logics/skills/logics-flow-manager/scripts/logics_flow.py` — `1393` lines
- `logics/skills/logics-react-render-pwa-bootstrapper/scripts/bootstrap_react_render_project.py` — `1256` lines

The issue is not only line count.
These files also act as aggregation points for unrelated responsibilities, which increases the risk of regressions, makes code review noisier, and slows down targeted changes.

This refactor should be done intelligently:
- split by coherent responsibility boundaries,
- preserve readability and discoverability,
- avoid replacing one giant file with many trivial fragments,
- and keep the resulting structure aligned with the existing architecture direction.

# Acceptance criteria
- AC1: Each targeted oversized file is split into smaller modules with coherent responsibility boundaries.
- AC2: The resulting largest modules are kept within an intended range of roughly `500` to `1000` lines, except where a documented exception remains justified.
- AC3: The refactor does not change user-visible behavior or workflow semantics.
- AC4: The new module structure makes ownership clearer for extension logic, webview logic, tests, and skill scripts.
- AC5: Imports, entry points, and public interfaces remain understandable and do not become fragmented or circular.
- AC6: Existing tests still pass after the refactor, and new targeted tests are added if boundaries need protection.

# Scope
- In:
  - Split `src/extension.ts` into focused modules such as activation/bootstrap, commands/actions, watcher/workspace lifecycle, preview/render helpers, and relation/doc maintenance helpers where appropriate.
  - Split `media/main.js` into clearer units such as UI state, event wiring, filtering/search/sort selectors, persistence, and high-level orchestration.
  - Split `tests/webview.harness-a11y.test.ts` into smaller suites organized by behavior domains instead of one monolithic harness file.
  - Split `logics_flow.py` by workflow orchestration concerns, parser/helpers, command handlers, or reporting/output responsibilities as appropriate.
  - Split `bootstrap_react_render_project.py` by bootstrap phases such as inputs/config, generation steps, file writers, and validations as appropriate.
  - Update the file layout and imports accordingly.
- Out:
  - Changing product behavior under the cover of the refactor.
  - Broad renaming churn with little architectural value.
  - Splitting files into excessively tiny modules that hurt navigation more than they help.

# Dependencies and risks
- Dependency: the split should stay aligned with the plugin architecture direction documented in `adr_004`.
- Dependency: shared helpers must not introduce circular dependencies between extension, webview, test, or skill modules.
- Risk: a mechanical split by line count would make the codebase harder to navigate, not easier.
- Risk: entry-point files could become thin but opaque if too much logic is pushed behind weakly named helpers.
- Risk: test refactors could accidentally lower behavioral coverage if suites are reorganized carelessly.
- Risk: Python skill scripts may have implicit coupling through globals or CLI flow that needs to be made explicit before splitting.

# Clarifications
- The goal is not “small files at any cost”; the goal is coherent modules with healthier size and clearer ownership.
- A resulting file slightly above `1000` lines can still be acceptable if the boundary is justified, but the default target should be below that.
- Entry points should remain easy to locate:
  - `extension.ts` should still read as the extension bootstrap entry,
  - `main.js` should still read as the webview entry,
  - the Python scripts should still keep a discoverable CLI entry.
- The split should follow responsibility seams, for example:
  - `extension.ts`: activation/bootstrap, command registration, watcher/workspace lifecycle, preview helpers, doc mutation helpers
  - `main.js`: state/store, persistence, filtering/search/sort/group logic, toolbar/actions wiring, render coordination
  - `webview.harness-a11y.test.ts`: view mode/layout, filters/search/grouping, details/actions, persistence/accessibility
  - `logics_flow.py`: CLI parsing, workflow orchestration, file operations, reporting/output
- `bootstrap_react_render_project.py`: prompt/config intake, project plan/build steps, file generation, validation/final reporting
- The result should improve maintainability for the upcoming backlog, not just satisfy a line-count target.

# References
- Architecture decision(s): `logics/architecture/adr_004_scale_the_plugin_around_a_derived_model_and_explicit_ui_state.md`

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_055_split_extension_host_entrypoint_into_focused_modules.md`
- `logics/backlog/item_056_split_webview_entrypoint_into_state_selector_and_orchestration_modules.md`
- `logics/backlog/item_057_split_monolithic_webview_harness_tests_by_behavior_domain.md`
- `logics/backlog/item_058_split_logics_flow_manager_script_into_cli_and_workflow_modules.md`
- `logics/backlog/item_059_split_react_render_bootstrap_script_into_bootstrap_phase_modules.md`
