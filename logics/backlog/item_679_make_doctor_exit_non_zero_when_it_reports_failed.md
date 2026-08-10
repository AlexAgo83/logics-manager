## item_679_make_doctor_exit_non_zero_when_it_reports_failed - Make doctor exit non-zero when it reports FAILED
> From version: 2.21.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 09:24:11

# AI Context
- Summary: Make doctor exit non-zero when it reports FAILED
- Keywords: backlog-groom, request, make doctor exit non-zero when it reports failed, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Make doctor exit non-zero when it reports FAILED.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`logics-manager doctor` prints `Logics doctor: FAILED` with 308 issues and exits 0; `doctor --format json` reports `"ok": false` and exits 0. The cause is two sibling branches of the same function: `logics_manager/cli.py:575` (the `doctor packaging` branch) ends `return 0 if payload["ok"] else 1`, while `logics_manager/cli.py:585` (the plain `doctor` branch) ends with a bare `return 0`. v2.20.0 made this exact correction for `health` (the comment recording it is still at `logics_manager/cli.py:901`) and its release note claimed the new behaviour was "what every other command already did" — `doctor` is the counter-example.

# Scope
- In:
  - Return a non-zero exit from the plain `doctor` branch whenever `payload["ok"]` is false, matching the sibling `doctor packaging` branch fifteen lines above it.
  - Cover both `--format text` and `--format json` in a regression test.
- Out:
  - The `flow` dispatcher's exit policy — that is `item_680`.
  - Making the corpus pass doctor — that is `item_675` under `req_325`.

# Acceptance criteria
- AC1: `logics-manager doctor` exits non-zero whenever it prints `FAILED` or reports `"ok": false`, in both text and json formats, with a regression test.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `cli.py`'s doctor branch builds the payload, renders it through the new `render_doctor_payload`, and returns `0 if doctor_result["ok"] else 1` -- the shape its `doctor packaging` sibling already used, computing the payload once rather than twice. `test_doctor_exits_non_zero_when_it_reports_a_problem` and `test_doctor_exits_zero_on_a_clean_corpus`, both parametrized over text and json.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_326_review_findings_commands_that_report_failure_and_exit_zero`
- Primary task(s): `task_323_orchestrate_the_exit_code_honesty_corrections`

# Priority
- Priority: High
- Rationale: Set while scoping req_326's review findings.

# Notes
- Hybrid rationale: Derived from request `req_326_review_findings_commands_that_report_failure_and_exit_zero` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_326_review_findings_commands_that_report_failure_and_exit_zero.md`.
- Generated locally by logics-manager.
