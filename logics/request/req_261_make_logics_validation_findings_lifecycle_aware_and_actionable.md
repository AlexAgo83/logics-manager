## req_261_make_logics_validation_findings_lifecycle_aware_and_actionable - Make Logics validation findings lifecycle-aware and actionable
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The single most recurring friction across assistant sessions (confirmed in the transcript logs of multiple profiles) is that Logics validation gates read like dead-ends: a correctly-formed, dev-ready request→backlog→task chain still reports BLOCKING findings, and the messages do not say whether action is needed now or later.
- Concretely, `audit` and `flow validate` report `ac_missing_item_traceability` / `ac_missing_task_traceability` ("with proof") as BLOCKING on a request whose linked tasks have not been implemented yet — even though proof (test results) cannot honestly exist before the work is done. Assistants repeatedly try to "fix" these or seek workarounds.
- This request makes findings lifecycle-aware (defer proof-required findings until closeout) and actionable (each finding states the exact next step), without weakening the real closeout guarantee.

# Context
- Today `ac_missing_task_traceability` is emitted for any strict-scope request with ACs whose linked tasks lack proof, regardless of task status (`logics_manager/audit.py`, request loop ~`:846-860`; `_doc_has_ac_with_proof`). There is no status/lifecycle gate, so a brand-new dev-ready chain is reported as failing.
- `flow validate` surfaces the same audit + lint findings and classifies fixable ones, but the `ac-traceability` repair is (correctly) refused without `--proof` — leaving the operator with a blocking finding and no clear "this is expected until closeout" signal.
- Verified already-addressed (out of scope here): MCP Content-Length bounding (`mcp.py:1295-1301`), YAML bool coercion `yes/no/on/off` (`config.py:94-96`), `flow validate` registration (`flow.py:2337`), `sync` truncation flag (`sync.py:646-677`), `audit --autofix-structure` targeted recompute (`audit.py:836-873`).
- Out of scope: changing what counts as proof; closeout still requires real proof before a task is finished.

# Acceptance criteria
- AC1: Proof-required traceability findings (`ac_missing_item_traceability`, `ac_missing_task_traceability`) are NOT reported as blocking for a request whose linked tasks are still open (not finished); a correctly-formed dev-ready chain passes `audit` and `flow validate` with zero blocking findings. Such findings are surfaced as informational/deferred instead.
- AC2: The closeout guarantee is preserved — once a task is being finished/closed (or its status is terminal), the same traceability findings DO block until proof is supplied. No path lets a task close without proof.
- AC3: Every relevant finding carries an actionable next step: deferred findings say "expected until task closeout"; deterministically-fixable findings include the exact repair command (e.g. `flow validate <refs> --apply-fixes --proof "..."`); human-required findings state what is needed.
- AC4: No regression — existing lint/audit/validate tests pass, and the new lifecycle classification + messaging are covered by tests (open-chain green, closeout-chain blocking).

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/audit.py` (traceability emission `:846-860`, `_doc_has_ac_with_proof`, autofix `:836-873`)
- `logics_manager/flow.py` (`validate` subcommand `:2337`, fixable classification, ac-traceability repair)
- `logics_manager/lint.py` (finding aggregation, indicator gate)
- `tests/python/test_logics_manager_cli.py` (lint/audit/validate coverage)

# AI Context
- Summary: Make Logics validation findings lifecycle-aware (defer proof-required traceability until task closeout) and actionable (each finding states its exact next step), without weakening the closeout proof guarantee.
- Keywords: validation, audit, flow validate, ac-traceability, lifecycle, closeout, actionable findings, developer ergonomics
- Use when: Reducing false-blocking noise on dev-ready chains and clarifying remediation.
- Skip when: A validation/audit redesign is already in progress or would conflict.

# Backlog
- `item_458_lifecycle_aware_traceability_findings_defer_proof_until_closeout`
- `item_459_actionable_next_step_on_every_validation_finding`
