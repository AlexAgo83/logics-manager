## item_852_let_a_draft_request_hold_acceptance_criteria_without_a_chain - Let a Draft request hold acceptance criteria without a chain
> From version: 2.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Audit scope
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: let, draft, request, hold, acceptance, criteria, chain
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `ac_no_linked_backlog` and `ac_no_linked_tasks` fire on any in-scope request with acceptance criteria and no chain, whatever its status. A Draft request has no chain by definition.
- The finding is BLOCKING, so a parked request keeps the whole corpus audit red until someone slices work nobody decided to do.

# Scope
- In:
  - Skip the missing-chain findings for requests still in Draft, the same way `_is_abandoned` already skips terminal ones.
  - Keep both findings exactly as they are for every other status.
  - Tests for a Draft request with acceptance criteria and no chain, and the same request promoted out of Draft.
- Out:
  - Any change to the acceptance-criteria traceability rules themselves.
  - Suppressing findings for requests that are Ready or beyond.

# Acceptance criteria
- AC1: A Draft request with acceptance criteria and no linked backlog or task produces no blocking audit issue about the missing chain.
- AC2: The same request in Ready produces `ac_no_linked_backlog` exactly as it does today.
- AC3: req_377 audits clean without any further hand-editing of its links.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A Draft request with acceptance criteria and no linked backlog or task produces no blocking audit issue about the missing chain.
- request-AC2 -> This backlog slice. Proof: AC2: The same request in Ready produces `ac_no_linked_backlog` exactly as it does today.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_108_checks_that_read_the_corpus_the_way_it_is_written`
- Architecture decision(s): (none yet)
- Request: `req_378_stop_reporting_a_deferred_request_and_a_prose_mention_as_corpus_defects`
- Primary task(s): `task_388_make_both_checks_read_the_corpus_as_written`

# Priority
- Priority: Medium - one blocking finding today, on a request that is correct as written
- Rationale: Set by scaffold input or defaulted for grooming.

# Validation
- 2026-08-16: tests/python/test_honest_outcomes.py -- a Draft request with ACs and no chain reports neither ac_no_linked_backlog nor ac_no_linked_tasks (AC1); the same request in Ready still reports ac_no_linked_backlog (AC2). A third case surfaced while restoring the pointers: a chain running through an Obsolete slice was reporting a Done task to the request that inherited its research, putting six ACs due on work nobody had started -- abandoned items no longer contribute linked tasks. req_377 now audits clean with its links intact (AC3): 0 blocking findings.
