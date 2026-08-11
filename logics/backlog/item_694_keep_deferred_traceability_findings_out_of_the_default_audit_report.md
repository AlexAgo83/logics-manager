## item_694_keep_deferred_traceability_findings_out_of_the_default_audit_report - Keep deferred traceability findings out of the default audit report
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Keep deferred traceability findings out of the default audit report
- Keywords: backlog-groom, request, keep deferred traceability findings out of the default audit report, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Keep deferred traceability findings out of the default audit report.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
An operator running `logics-manager audit` on a healthy corpus needs an empty report to mean "nothing to do", and a non-empty report to mean "look at this". Today a corpus whose only open request is still `Draft` produces a report made entirely of findings the tool itself labels as expected.
Observed in a consuming project (`cdx-manager`, 2026-08-11): eight findings, all `ac_missing_task_traceability`, all reading "*proof is deferred — expected at task closeout; no linked task is Done yet*". That was 100% of the audit output, and every line described a situation that is structurally impossible to fix at that point in the lifecycle.
The risk is not the noise itself. It is that an operator who sees eight expected warnings on every run learns to skim the report, and the first genuine finding to appear alongside them is the one that gets missed.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: By default, `logics-manager audit` does not print individual deferred findings; a corpus whose only outstanding findings are deferred reports as clean.
- AC2: Deferred findings are not silently dropped — the default report ends with a one-line count naming how many were withheld and the flag that shows them.
- AC3: An explicit flag (for example `--include-deferred`) restores the current per-finding output unchanged, and the JSON/`--format json` output always carries the deferred findings regardless of the flag, so tooling loses nothing.
- AC4: Deferred findings still do not affect the exit code, and non-deferred findings of the same code are reported exactly as they are today.
- AC5: A test covers the three states: only deferred findings (clean report, count line, zero exit), deferred plus a real finding (real one visible, exit code unchanged from today), and `--include-deferred` (byte-identical to the current output).

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: By default, `logics-manager audit` does not print individual deferred findings; a corpus whose only outstanding findings are deferred reports as clean.
- request-AC2 -> This backlog slice. Proof: AC2: Deferred findings are not silently dropped — the default report ends with a one-line count naming how many were withheld and the flag that shows them.
- request-AC3 -> This backlog slice. Proof: AC3: An explicit flag (for example `--include-deferred`) restores the current per-finding output unchanged, and the JSON/`--format json` output always carries the deferred findings regardless of the flag, so tooling loses nothing.
- request-AC4 -> This backlog slice. Proof: AC4: Deferred findings still do not affect the exit code, and non-deferred findings of the same code are reported exactly as they are today.
- request-AC5 -> This backlog slice. Proof: AC5: A test covers the three states: only deferred findings (clean report, count line, zero exit), deferred plus a real finding (real one visible, exit code unchanged from today), and `--include-deferred` (byte-identical to the current output).

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
- Request: `logics/request/req_333_keep_deferred_traceability_findings_out_of_the_default_audit_report.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_333_keep_deferred_traceability_findings_out_of_the_default_audit_report` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_333_keep_deferred_traceability_findings_out_of_the_default_audit_report.md`.
- Generated locally by logics-manager.
- Task `task_330_keep_deferred_traceability_findings_out_of_the_default_audit_report` was finished via `logics-manager flow finish task` on 2026-08-11.

# Tasks
- `task_330_keep_deferred_traceability_findings_out_of_the_default_audit_report`
