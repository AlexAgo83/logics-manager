## req_378_stop_reporting_a_deferred_request_and_a_prose_mention_as_corpus_defects - Stop reporting a deferred request and a prose mention as corpus defects
> From version: 2.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Audit and closeout signal accuracy
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:52:57

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: reporting, deferred, request, prose, mention, corpus, defects
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Needs
- Let a request be parked in Draft with its acceptance criteria intact, without the audit calling that a blocking defect.
- Stop a prose mention of another request from being read as a delivery link, which puts that request's acceptance criteria due at someone else's closeout.

# Context
- Found while closing task_387 on 2026-08-16. `adr_031_one_mcp_transport_per_client_class` deliberately deferred the public-HTTPS-door work into `req_377`, Draft, with its research and acceptance criteria written down and nothing built. The audit reports that as BLOCKING `ac_no_linked_tasks` -- a request has acceptance criteria but no linked tasks -- which is the definition of Draft, not a defect.
- The same closeout also demanded proofs for req_377's six acceptance criteria against task_387, which delivers none of them. The path was a prose sentence in two backlog items -- `Skip when: anything about the public HTTPS door -- see req_377_...` -- because ref extraction scans the whole document text and cannot tell a pointer from a link.
- Both were worked around by hand: the mentions now go through the ADR instead of naming the ref, and two Obsolete slices had their primary-task link removed. The corpus is now less legible than it was, to satisfy checks that were reading it wrong.
- The audit rule is `logics_manager/audit.py:1199-1217`; `_is_strict_scope`/`_is_abandoned` already gate it, and neither knows about Draft. Closeout's ref collection is `validate_closeout_payload` in `logics_manager/flow/__init__.py:460`, which unions `_extract_refs` over the task text and every linked backlog item's text.

# Acceptance criteria
- AC1: A Draft request with acceptance criteria and no backlog or task reports no blocking audit issue for the missing chain.
- AC2: The same request, once it leaves Draft, reports the missing chain exactly as it does today.
- AC3: A backlog item that mentions another request in prose does not make that request's acceptance criteria due at this task's closeout.
- AC4: A backlog item that genuinely delivers a request -- naming it where links are declared -- still carries that request into closeout unchanged.
- AC5: The pointers hand-edited around these two findings are restored to naming their ref directly, and both suites still pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_108_checks_that_read_the_corpus_the_way_it_is_written`
- Architecture decision(s): (none yet)

# References
- logics/architecture/adr_031_one_mcp_transport_per_client_class.md
- logics/request/req_377_expose_the_mcp_surface_to_hosted_web_clients_through_a_public_https_door.md

# Backlog
- `item_852_let_a_draft_request_hold_acceptance_criteria_without_a_chain`
- `item_853_tell_a_delivery_link_from_a_mention_at_closeout`
