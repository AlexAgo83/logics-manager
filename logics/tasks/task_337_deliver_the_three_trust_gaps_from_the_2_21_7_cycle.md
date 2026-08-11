## task_337_deliver_the_three_trust_gaps_from_the_2_21_7_cycle - Deliver the three trust gaps from the 2.21.7 cycle
> From version: 2.21.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 10:46:38

# AI Context
- Summary: Deliver the three slices in order: the runtime-drift notice first, since it is the only one that produces a wrong answer rather than a delay.
- Keywords: runtime-drift, git-hooks, ac-coverage, orchestration
- Use when: Coordinating the three trust-gap slices, or deciding which to build first.
- Skip when: Implementing one slice in isolation.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Start with the runtime-drift notice: it is the only one of the three that produces a wrong answer rather than a delay.
- [ ] 2. Then the local guard and the hooks configuration, which are independent and small.
- [ ] 3. Finish with criterion coverage, which touches the audit's chain logic and benefits from the other two being settled.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_701_report_a_runtime_that_disagrees_with_the_repository_it_audits`
- `item_702_make_every_guard_reachable_before_the_push`
- `item_703_report_a_request_criterion_no_linked_document_accounts_for`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: date: 2026-08-11 | command: `pytest tests/python/test_runtime_drift.py -k names_both_versions` | result: passed | a mismatch is reported once, naming both versions and both ways out Source: `61fff93f`
- request-AC2 -> This task. Proof: date: 2026-08-11 | command: `pytest -k never_changes_the_exit_code` | result: passed | same repo, same command, drifting vs agreeing runtime: identical exit code and identical JSON stdout; the notice goes to stderr Source: `61fff93f`
- request-AC3 -> This task. Proof: date: 2026-08-11 | command: `npm run lint` | result: passed | check:function-length added to package.json and chained into npm run lint, beside check:line-budget; named in docs/development.md Source: `61fff93f`
- request-AC4 -> This task. Proof: date: 2026-08-11 | command: `npx vitest run tests/localGuardReachability.test.ts` | result: 7 passed | prepare no longer sets .githooks; it clears the stale value only when it still reads .githooks and that directory is absent, leaving a contributor's own hooks path untouched Source: `61fff93f`
- request-AC5 -> This task. Proof: date: 2026-08-11 | command: `pytest -k no_linked_document_names_is_reported` | result: passed | ac_not_covered_by_chain names the uncovered criterion and every document checked; reproduces the item_695 case (6 declared, 5 covered) Source: `61fff93f`
- request-AC6 -> This task. Proof: date: 2026-08-11 | command: `python3 -m logics_manager audit` | result: 0 blocking, 0 ac_not_covered_by_chain | severity=warning with ok=True, silent on a fully covered chain and on this corpus (0 findings) Source: `61fff93f`
- request-AC7 -> This task. Proof: date: 2026-08-11 | command: `python3 -m pytest tests/python/ -q && npx vitest run` | result: 1345 + 862 passed | 7 runtime-drift tests, 7 guard-reachability tests, 4 coverage tests; python 1345 passed, vitest 862 passed Source: `61fff93f`

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_701_report_a_runtime_that_disagrees_with_the_repository_it_audits`, `item_702_make_every_guard_reachable_before_the_push`, `item_703_report_a_request_criterion_no_linked_document_accounts_for`
- Related request(s): `req_340_close_the_three_trust_gaps_the_2_21_7_cycle_exposed`

# Links
- Request: `req_340_close_the_three_trust_gaps_the_2_21_7_cycle_exposed`
- Product brief(s): `prod_076_tooling_that_tells_the_truth_about_itself`
- Architecture decision(s): (none yet)

# Evidence
- AC1 | date: 2026-08-11 | command: `pytest tests/python/test_runtime_drift.py -k names_both_versions` | result: passed | a mismatch is reported once, naming both versions and both ways out
- AC2 | date: 2026-08-11 | command: `pytest -k never_changes_the_exit_code` | result: passed | same repo, same command, drifting vs agreeing runtime: identical exit code and identical JSON stdout; the notice goes to stderr
- AC3 | date: 2026-08-11 | command: `npm run lint` | result: passed | check:function-length added to package.json and chained into npm run lint, beside check:line-budget; named in docs/development.md
- AC4 | date: 2026-08-11 | command: `npx vitest run tests/localGuardReachability.test.ts` | result: 7 passed | prepare no longer sets .githooks; it clears the stale value only when it still reads .githooks and that directory is absent, leaving a contributor's own hooks path untouched
- AC5 | date: 2026-08-11 | command: `pytest -k no_linked_document_names_is_reported` | result: passed | ac_not_covered_by_chain names the uncovered criterion and every document checked; reproduces the item_695 case (6 declared, 5 covered)
- AC6 | date: 2026-08-11 | command: `python3 -m logics_manager audit` | result: 0 blocking, 0 ac_not_covered_by_chain | severity=warning with ok=True, silent on a fully covered chain and on this corpus (0 findings)
- AC7 | date: 2026-08-11 | command: `python3 -m pytest tests/python/ -q && npx vitest run` | result: 1345 + 862 passed | 7 runtime-drift tests, 7 guard-reachability tests, 4 coverage tests; python 1345 passed, vitest 862 passed
