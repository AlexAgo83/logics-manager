## task_330_keep_deferred_traceability_findings_out_of_the_default_audit_report - Keep deferred traceability findings out of the default audit report
> From version: 2.21.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement keep deferred traceability findings out of the default audit report.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

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

# Report
- Not started.

# Links
- Request: `req_333_keep_deferred_traceability_findings_out_of_the_default_audit_report`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
