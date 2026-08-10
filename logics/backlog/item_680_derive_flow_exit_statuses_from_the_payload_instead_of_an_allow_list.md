## item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list - Derive flow exit statuses from the payload instead of an allow-list
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
- Summary: Derive flow exit statuses from the payload instead of an allow-list
- Keywords: backlog-groom, request, derive flow exit statuses from the payload instead of an allow-list, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Derive flow exit statuses from the payload instead of an allow-list.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`logics_manager/flow/__init__.py:3188-3193` is the entire exit-status policy for every `flow` subcommand: it returns 1 only when the command is literally `closeout` or `validate-closeout` and its payload is not ok, and returns 0 for everything else that returned a dict. Eight payload sites in that module set `"ok"` from a real condition (`:554`, `:942`, `:1835`, `:2120` among them); six can never influence the exit code. Observed consequences: `flow validate` reports two findings prefixed `blocking:` and exits 0 (reproduced by removing `req_324`'s backlog link, then restoring it); `flow roadmap validate` prints `Roadmap validation: FAILED` with six issues and exits 0. Any validator added to `flow` inherits "always succeeds" unless someone remembers to extend the allow-list.

# Scope
- In:
  - Derive the exit status from `payload["ok"]` for every subcommand that publishes one, replacing the two named special cases.
  - Decide and document what `flow validate` treats as failure: blocking findings yes, deferred and warning-level findings no.
  - Assert the general rule in a test — every `flow` subcommand publishing `ok: false` exits non-zero — rather than testing the three commands named here.
  - Confirm `health`, `lint`, and `audit` keep their current, correct behaviour in the same test.
- Out:
  - The `doctor` branch in `cli.py` — that is `item_679`.
  - Rewriting the final `return 0 if isinstance(payload, dict) else 1` fallback: all 26 `cmd_*` handlers return dicts today, so it is a latent trap, not a live defect. Fix it only if the rewrite makes it natural to.

# Acceptance criteria
- AC2: `flow validate` exits non-zero when it reports at least one blocking finding, and stays zero when only deferred or warning-level findings are present.
- AC3: `flow roadmap validate` exits non-zero when it prints `FAILED`.
- AC4: The `flow` dispatcher derives the exit status from `payload["ok"]` for every subcommand that publishes one, so a newly added validator is honest by default.
- AC5: A test asserts the general rule across `flow` subcommands rather than the individual commands fixed here.
- AC6: `health`, `lint`, and `audit` keep their current exit behaviour, proven by the same test.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: The dispatcher reads `payload["ok"]`. Verified against a real blocking finding: removing req_324's backlog link made `flow validate` report findings prefixed `blocking:` and exit 1; restored, it exits 0. `test_flow_validate_refuses_ambiguous_ac_traceability_fix` asserted exit 0 alongside `ok: False` and now asserts 1.
- request-AC3 -> This backlog slice. Proof: `test_flow_roadmap_validate_exits_non_zero_on_a_broken_roadmap` and `test_flow_roadmap_validate_exits_zero_on_a_valid_roadmap`.
- request-AC4 -> This backlog slice. Proof: `flow/__init__.py` main() ends `return 0 if payload.get("ok", True) else 1`, with a non-dict payload returning 1. The `closeout`/`validate-closeout` special cases are gone.
- request-AC5 -> This backlog slice. Proof: `test_flow_exit_status_follows_the_payload_verdict` drives the dispatcher with a stub handler over four payload shapes (ok False, ok True, no verdict, non-dict), asserting the rule rather than today's command list.
- request-AC6 -> This backlog slice. Proof: `test_health_lint_and_audit_keep_their_exit_behaviour` runs all three against a clean corpus and asserts 0.

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
- Priority: Medium
- Rationale: Set while scoping req_326's review findings.

# Notes
- Hybrid rationale: Derived from request `req_326_review_findings_commands_that_report_failure_and_exit_zero` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_326_review_findings_commands_that_report_failure_and_exit_zero.md`.
- Generated locally by logics-manager.
