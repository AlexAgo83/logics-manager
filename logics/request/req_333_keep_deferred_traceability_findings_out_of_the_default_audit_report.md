## req_333_keep_deferred_traceability_findings_out_of_the_default_audit_report - Keep deferred traceability findings out of the default audit report
> From version: 2.21.6
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Validation ergonomics
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Stop `audit` from printing findings it already knows cannot be resolved yet, so a non-empty report means something actually needs an operator.
- Keywords: audit, deferred-findings, signal-to-noise, ac-traceability, reporting
- Use when: Changing what `logics-manager audit` reports by default, or triaging why an audit is never clean.
- Skip when: The change is about whether a finding is *correct*, rather than whether it should be *shown*.

# Needs
- An operator running `logics-manager audit` on a healthy corpus needs an empty report to mean "nothing to do", and a non-empty report to mean "look at this". Today a corpus whose only open request is still `Draft` produces a report made entirely of findings the tool itself labels as expected.
- Observed in a consuming project (`cdx-manager`, 2026-08-11): eight findings, all `ac_missing_task_traceability`, all reading "*proof is deferred — expected at task closeout; no linked task is Done yet*". That was 100% of the audit output, and every line described a situation that is structurally impossible to fix at that point in the lifecycle.
- The risk is not the noise itself. It is that an operator who sees eight expected warnings on every run learns to skim the report, and the first genuine finding to appear alongside them is the one that gets missed.

# Context
- The deferral logic already exists and is deliberate: `_ac_traceability_issue` in `logics_manager/audit.py` takes a `deferred` flag and, when no linked task is Done, downgrades `severity` from the `AuditIssue` default (`"blocking"`) to `"warning"` with the explanatory message. That work landed with the lifecycle-aware validation findings chain (request 261, slice 458), which is prior art for this request rather than a dependency of it.
- So this request is not asking to re-litigate the severity decision. Lowering severity made the finding non-blocking; it did not make it quiet. The remaining gap is presentation: a deferred finding is still printed in full, once per AC, on every run.
- The finding is emitted per acceptance criterion, so a well-specified request with eight AC produces eight identical lines that differ only by the AC id. Verbosity scales with the quality of the request, which is the wrong incentive.
- `flow closeout` enforces proof through its own preflight, so hiding deferred findings from the default report does not weaken the gate that actually matters.

# Acceptance criteria
- AC1: By default, `logics-manager audit` does not print individual deferred findings; a corpus whose only outstanding findings are deferred reports as clean.
- AC2: Deferred findings are not silently dropped — the default report ends with a one-line count naming how many were withheld and the flag that shows them.
- AC3: An explicit flag (for example `--include-deferred`) restores the current per-finding output unchanged, and the JSON/`--format json` output always carries the deferred findings regardless of the flag, so tooling loses nothing.
- AC4: Deferred findings still do not affect the exit code, and non-deferred findings of the same code are reported exactly as they are today.
- AC5: A test covers the three states: only deferred findings (clean report, count line, zero exit), deferred plus a real finding (real one visible, exit code unchanged from today), and `--include-deferred` (byte-identical to the current output).

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/audit.py`
- `tests/python/test_audit_cli.py`

# Backlog
- none
- `item_694_keep_deferred_traceability_findings_out_of_the_default_audit_report`
