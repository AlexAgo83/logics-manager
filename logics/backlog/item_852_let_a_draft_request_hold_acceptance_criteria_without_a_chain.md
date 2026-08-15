## item_852_let_a_draft_request_hold_acceptance_criteria_without_a_chain - Let a Draft request hold acceptance criteria without a chain
> From version: 2.22.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
