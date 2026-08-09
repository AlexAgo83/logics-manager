## task_323_orchestrate_the_exit_code_honesty_corrections - Orchestrate the exit-code honesty corrections
> From version: 2.21.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Exit-code honesty across the CLI
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement orchestrate the exit-code honesty corrections.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Context
- Orchestrate the two delivery slices captured by req_326's review findings.
- Cross-request ordering: `item_679` must land before `item_676` (under req_325), which adds the full `doctor` to CI. Until doctor exits non-zero, that CI step can never fail.

# Plan
- [ ] 1. `item_679`: make the plain `doctor` branch in `cli.py` exit non-zero on `ok: false`, matching its `doctor packaging` sibling.
- [ ] 2. `item_680`: derive every `flow` subcommand's exit status from `payload["ok"]` instead of the two-command allow-list.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and the full test suite pass, and until a release note records the exit-status change as breaking.

# Backlog
- `item_679_make_doctor_exit_non_zero_when_it_reports_failed`
- `item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_679_make_doctor_exit_non_zero_when_it_reports_failed`. Proof: see that item's AC Traceability.
- request-AC2 -> `item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list`. Proof: see that item's AC Traceability.
- request-AC3 -> `item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list`. Proof: see that item's AC Traceability.
- request-AC4 -> `item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list`. Proof: see that item's AC Traceability.
- request-AC5 -> `item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list`. Proof: see that item's AC Traceability.
- request-AC6 -> `item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list`. Proof: see that item's AC Traceability.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: (none yet)
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
