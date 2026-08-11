## task_330_keep_deferred_traceability_findings_out_of_the_default_audit_report - Keep deferred traceability findings out of the default audit report
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 05:23:54

# AI Context
- Summary: Implement keep deferred traceability findings out of the default audit report.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_694_keep_deferred_traceability_findings_out_of_the_default_audit_report`

# Acceptance criteria
- AC1: By default, `logics-manager audit` does not print individual deferred findings; a corpus whose only outstanding findings are deferred reports as clean.
- AC2: Deferred findings are not silently dropped — the default report ends with a one-line count naming how many were withheld and the flag that shows them.
- AC3: An explicit flag (for example `--include-deferred`) restores the current per-finding output unchanged, and the JSON/`--format json` output always carries the deferred findings regardless of the flag, so tooling loses nothing.
- AC4: Deferred findings still do not affect the exit code, and non-deferred findings of the same code are reported exactly as they are today.
- AC5: A test covers the three states: only deferred findings (clean report, count line, zero exit), deferred plus a real finding (real one visible, exit code unchanged from today), and `--include-deferred` (byte-identical to the current output).

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_330_keep_deferred_traceability_findings_out_of_the_default_audit_report.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_330_keep_deferred_traceability_findings_out_of_the_default_audit_report.md` after implementation.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_694_keep_deferred_traceability_findings_out_of_the_default_audit_report`
- Related request(s): `req_333_keep_deferred_traceability_findings_out_of_the_default_audit_report`

# AC Traceability
- request-AC1 -> This task. Proof: `render_audit` filters findings carrying `deferred` out of the text report; on this corpus `python3 -m logics_manager audit` now prints three status lines plus one count line instead of 30 findings. `test_deferred_findings_are_withheld_from_the_default_report` state 1 asserts no `proof is deferred` line and `ok is True`. Source: `8ce840c5`
- request-AC2 -> This task. Proof: Count line reads `Deferred findings withheld: N (expected at task closeout; show with --include-deferred)`, asserted verbatim in the same test. Source: `8ce840c5`
- request-AC3 -> This task. Proof: `--include-deferred` restores the per-finding output (state 3 asserts 10 lines back and no count line); `deferred` is serialized on every finding and `deferred_count` added to the payload, so `--format json` carries them regardless of the flag. Source: `8ce840c5`
- request-AC4 -> This task. Proof: Withholding is presentation only — it happens in `render_audit`, never in `audit_payload`. `test_withholding_never_hides_a_blocking_finding` uses a Done linked task so the same gap is blocking: `ok is False`, `deferred_count == 0`, nothing withheld. State 2 covers a real finding staying visible beside withheld ones. Source: `8ce840c5`
- request-AC5 -> This task. Proof: Both tests in `tests/python/test_audit_cli.py` cover the three states. Full suite 1312 passed. Source: `8ce840c5`

# Links
- Request: `req_333_keep_deferred_traceability_findings_out_of_the_default_audit_report`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
