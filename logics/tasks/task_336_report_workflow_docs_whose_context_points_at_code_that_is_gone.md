## task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone - Report workflow docs whose context points at code that is gone
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 05:28:43

# AI Context
- Summary: Implement report workflow docs whose context points at code that is gone.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_700_report_workflow_docs_whose_context_points_at_code_that_is_gone`

# Acceptance criteria
- AC1: An open workflow doc citing a repo-relative path that does not exist is reported once, naming the document and the path.
- AC2: A symbol cited in backticks and not found anywhere in the repository is reported at a lower confidence than a missing path, with wording that says it is a hint rather than a fact.
- AC3: Line numbers are never validated, and their presence never produces a finding.
- AC4: Documents that are Done, archived, or otherwise closed produce no findings, so historical accuracy is never confused with current accuracy.
- AC5: Every finding is a warning that cannot block `lint`, `audit`, or a closeout gate, and the report stays silent on a corpus with no unresolvable anchors.
- AC6: Tests cover a missing path, an existing path, a missing symbol, a symbol that exists only in a comment, a Done document with rotted anchors producing nothing, and a line number never being checked.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone.md` after implementation.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_700_report_workflow_docs_whose_context_points_at_code_that_is_gone`
- Related request(s): `req_339_report_workflow_docs_whose_context_points_at_code_that_is_gone`

# AC Traceability
- request-AC1 -> This task. Proof: `code_anchor_path_missing` names the doc and the path, once per path. Verified on this corpus: exactly one finding, `logics/task` cited by req_335. `test_audit_reports_code_anchors_that_no_longer_resolve` asserts the message verbatim and that an existing path produces nothing. Source: `5adf3612`
- request-AC2 -> This task. Proof: `code_anchor_symbol_not_found` is a separate, lower-confidence code whose message ends "a hint that the citation is stale, not a fact", and carries `deferred=True` so it is withheld from the default report. Same test asserts the wording, the flag, and that a symbol appearing only inside a comment still counts as found. Source: `5adf3612`
- request-AC3 -> This task. Proof: `_strip_locator` removes a trailing `:123`/`:12-34` before resolution; no line-number rule exists. Test cites `src/real.py:9999` on a file whose line 9999 does not exist and asserts no finding mentions 9999. Source: `5adf3612`
- request-AC4 -> This task. Proof: The loop skips `_is_done` and `_is_abandoned` docs. `test_audit_leaves_closed_documents_code_anchors_alone` gives a Done request two rotted anchors and asserts zero `code_anchor_*` findings. Source: `5adf3612`
- request-AC5 -> This task. Proof: Both codes are `severity="warning"`, so `payload["ok"]` stays True and neither lint nor a closeout gate can be blocked. `test_audit_stays_silent_when_every_code_anchor_resolves` asserts the string `code_anchor` is absent from the rendered report on a healthy corpus. Source: `5adf3612`
- request-AC6 -> This task. Proof: Three tests in `tests/python/test_audit_cli.py` cover all six cases: missing path, existing path, missing symbol, comment-only symbol, Done doc with rotted anchors, and a line number. Full suite 1315 passed; `npm run check:line-budget` passes with the ceiling raised and reasoned. Source: `5adf3612`

# Links
- Request: `req_339_report_workflow_docs_whose_context_points_at_code_that_is_gone`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
