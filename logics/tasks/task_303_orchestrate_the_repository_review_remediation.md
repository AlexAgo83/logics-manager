## task_303_orchestrate_the_repository_review_remediation - Orchestrate the repository review remediation
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-07

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Cache the project switcher scan: a shipped regression, and the smallest change here.
- [x] 2. Make the coverage signals report the truth, or stop implying a measurement is taken.
- [x] 3. Add the Python linter and the function-length ceiling, before any large move.
- [x] 4. Add the model-divergence detector, so a merge stays unnecessary.
- [x] 5. Extract the session cockpit and workshop routes last, under the guardrails the earlier slices put in place.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_603_cache_the_project_switcher_s_per_project_scan`
- `item_604_make_the_coverage_signals_report_the_truth`
- `item_605_add_a_python_linter_and_a_function_length_ceiling`
- `item_606_detect_divergence_between_the_document_models`
- `item_607_move_the_session_cockpit_and_workshop_routes_out_of_the_viewer_module`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC8 -> `item_603_cache_the_project_switcher_s_per_project_scan`. Proof deferred to slice closeout.
- request-AC2, request-AC3, request-AC8 -> `item_604_make_the_coverage_signals_report_the_truth`. Proof deferred to slice closeout.
- request-AC4, request-AC5, request-AC8 -> `item_605_add_a_python_linter_and_a_function_length_ceiling`. Proof deferred to slice closeout.
- request-AC6, request-AC8 -> `item_606_detect_divergence_between_the_document_models`. Proof deferred to slice closeout.
- request-AC7, request-AC8 -> `item_607_move_the_session_cockpit_and_workshop_routes_out_of_the_viewer_module`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`
- request-AC2 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`
- request-AC3 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`
- request-AC4 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`
- request-AC5 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`
- request-AC6 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`
- request-AC7 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`
- request-AC8 -> This task. Proof: Delivered across commits 541b4b88 (cached switcher scan, honest coverage signals, ruff and the function-length ceiling, model-divergence detector) and 2825ca97 (cockpit and workshop route extraction). Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (927 passed) at 75% coverage against a 73% floor, and npx vitest run (760 passed). Source: `2825ca97`

# Validation
- (no validation recorded yet)
- command: `ruff && check_function_length && pytest tests/python && vitest run` | result: passed | date: 2026-08-07
- Finish workflow executed on 2026-08-07.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-07.
- Linked backlog item(s): `item_603_cache_the_project_switcher_s_per_project_scan`, `item_604_make_the_coverage_signals_report_the_truth`, `item_605_add_a_python_linter_and_a_function_length_ceiling`, `item_606_detect_divergence_between_the_document_models`, `item_607_move_the_session_cockpit_and_workshop_routes_out_of_the_viewer_module`
- Related request(s): `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`

# AI Context
- Summary: Orchestrate the repository review remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)
