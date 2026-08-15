## task_388_make_both_checks_read_the_corpus_as_written - Make both checks read the corpus as written
> From version: 2.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:52:58

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: both, checks, read, corpus, written
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. 1. Scope the audit's missing-chain findings out of Draft.
- [x] 2. 2. Collect closeout's request refs from declared links rather than from any mention.
- [x] 3. 3. Restore the four documents edited around these findings, and confirm audit, lint and task_387's closeout all stay clean.
- [x] 4. 4. Run both suites.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_852_let_a_draft_request_hold_acceptance_criteria_without_a_chain`
- `item_853_tell_a_delivery_link_from_a_mention_at_closeout`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_852_let_a_draft_request_hold_acceptance_criteria_without_a_chain`. Proof: `test_a_draft_request_is_not_asked_for_a_chain_it_has_not_been_given` -- a Draft request with ACs and no chain reports neither missing-chain code; req_377 audits clean with its links intact.
- request-AC2 -> `item_852_let_a_draft_request_hold_acceptance_criteria_without_a_chain`. Proof: `test_a_ready_request_is_asked_for_its_chain` -- the same request in Ready still reports `ac_no_linked_backlog`.
- request-AC3 -> `item_853_tell_a_delivery_link_from_a_mention_at_closeout`. Proof: task_387's closeout preflight passes with item_850 and item_851 naming req_377 in prose again; closeout reads only the declared link sections.
- request-AC4 -> `item_853_tell_a_delivery_link_from_a_mention_at_closeout`. Proof: task_387 still carries req_376 through its `# Links` Request line, and its closeout validates unchanged.
- request-AC5 -> `item_853_tell_a_delivery_link_from_a_mention_at_closeout`. Proof: item_847, item_848, item_850 and item_851 name their refs directly again; pytest 1448 passed, vitest 976 passed, audit 0 blocking.

# Validation
- (no validation recorded yet)
- pytest tests/python passed on 2026-08-16: 1448 passed; npx vitest run passed on 2026-08-16: 976 passed; logics audit passed with 0 blocking findings
- Finish workflow executed on 2026-08-16.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-16.
- Linked backlog item(s): `item_852_let_a_draft_request_hold_acceptance_criteria_without_a_chain`, `item_853_tell_a_delivery_link_from_a_mention_at_closeout`
- Related request(s): `req_378_stop_reporting_a_deferred_request_and_a_prose_mention_as_corpus_defects`

# Links
- Request: `req_378_stop_reporting_a_deferred_request_and_a_prose_mention_as_corpus_defects`
- Product brief(s): `prod_108_checks_that_read_the_corpus_the_way_it_is_written`
- Architecture decision(s): (none yet)
