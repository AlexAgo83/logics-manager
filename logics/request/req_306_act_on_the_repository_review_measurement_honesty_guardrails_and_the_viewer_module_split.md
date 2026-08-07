## req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split - Act on the repository review: measurement honesty, guardrails, and the viewer module split
> From version: 2.19.7
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Repository health and maintainability guardrails
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Fix a performance regression introduced with the project switcher's per-project scan.
- Make the project's own quality measurements say something true: report the coverage that is actually measured, and explain the one that deliberately is not.
- Add the automated guardrails a codebase this size is missing, before splitting its largest module.
- Detect divergence between the several document models rather than merging them, and split the one module that has grown past what a reviewer can hold.

# Context
- A review of the repository measured its shape rather than judging it, and found four defects plus one structural concern.
- The project switcher's per-project scan takes about six seconds across thirty-three sibling corpora and runs again on every menu open, although the viewer already has a time-to-live cache used for its git, CI, and session panels.
- Continuous integration installs Python coverage tooling under a step named for it, then runs the test suite without ever invoking it, so no Python coverage is measured anywhere while the step name claims otherwise. Measured directly, it is around seventy-five percent.
- The browser host bundle is excluded from JavaScript coverage. That exclusion is correct but undocumented: the tests load the built bundle rather than its sources, so instrumenting the sources reports under two percent for code that has several thousand lines of real tests behind it. A future reader will otherwise redo that diagnosis and may act on the misleading number.
- There is no Python linter at all across roughly twenty-seven thousand lines, while the JavaScript linter covers only the editor extension sources. A minimal static pass found no bare exception handlers but seventeen functions longer than a hundred and twenty lines, the largest being a request handler at nearly five hundred.
- Six independent implementations parse the same workflow documents into six different models. They currently agree exactly on which documents exist and on their statuses, so the cost today is maintenance rather than incorrectness. The derived fields are where it has already gone wrong once, with two staleness thresholds disagreeing across surfaces.
- The viewer module is around six thousand lines, and the majority of its routes belong to two subsystems that are not the viewer: the session cockpit and the workshop terminal. A sibling module already demonstrates the extraction pattern.

# Acceptance criteria
- AC1: The project switcher's per-project scan reuses the viewer's existing cache instead of rescanning on every menu open.
- AC2: Continuous integration measures Python coverage and fails below an agreed floor, or stops installing tooling it never invokes.
- AC3: The reason the browser host is excluded from JavaScript coverage is recorded where the exclusion is configured.
- AC4: A Python linter runs in continuous integration with a rule set the current codebase can pass.
- AC5: A function-length ceiling prevents new violations without requiring the existing ones to be rewritten.
- AC6: A test detects divergence between the document models rather than merging them.
- AC7: The session cockpit and workshop routes live outside the viewer module, with no behavior change.
- AC8: Every change is observable in continuous integration, so a regression fails a build rather than waiting for a review.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_013_cli_primary_usage_audit_and_hardening.md
- logics/product/prod_038_post_release_viewer_hardening.md
- logics/product/prod_053_one_workflow_signal_every_logics_surface.md

# AI Context
- Summary: Act on the repository review: measurement honesty, guardrails, and the viewer module split
- Keywords: request-chain-scaffold, act on the repository review: measurement honesty, guardrails, and the viewer module split, development-ready
- Use when: You need to implement or review the scaffolded workflow for Act on the repository review: measurement honesty, guardrails, and the viewer module split.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_603_cache_the_project_switcher_s_per_project_scan`
- `item_604_make_the_coverage_signals_report_the_truth`
- `item_605_add_a_python_linter_and_a_function_length_ceiling`
- `item_606_detect_divergence_between_the_document_models`
- `item_607_move_the_session_cockpit_and_workshop_routes_out_of_the_viewer_module`
