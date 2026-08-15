## item_853_tell_a_delivery_link_from_a_mention_at_closeout - Tell a delivery link from a mention at closeout
> From version: 2.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Closeout ref collection
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:52:58

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: tell, delivery, link, mention, closeout
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `validate_closeout_payload` collects request refs by scanning the full text of the task and of every linked backlog item, so a sentence naming another request pulls that request's acceptance criteria into this closeout.
- It cost real legibility on 2026-08-16: two backlog items now point at the deferred request through the ADR rather than naming it, and two Obsolete slices had their primary-task link removed, purely to keep closeout quiet.

# Scope
- In:
  - Collect the request a task delivers from where links are declared -- the task's `# Links` Request line and each backlog item's -- rather than from anywhere in the text.
  - Keep every other closeout finding working off the same refs it uses today.
  - Restore the pointers this was worked around with, and prove they no longer drag the deferred request into closeout.
  - Tests for a mention-only reference and for a declared one.
- Out:
  - Changing the ref syntax or the `# Links` section format.
  - Changing how the audit (as opposed to closeout) resolves links.
  - A link-kind vocabulary beyond what the sections already express.

# Acceptance criteria
- AC1: A backlog item mentioning a request in prose does not put that request's acceptance criteria due at closeout.
- AC2: A backlog item declaring a request under its links carries it into closeout exactly as today.
- AC3: The pointers in item_850, item_851, item_847 and item_848 name their refs again, and task_387's closeout still validates.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A backlog item mentioning a request in prose does not put that request's acceptance criteria due at closeout.
- request-AC4 -> This backlog slice. Proof: AC2: A backlog item declaring a request under its links carries it into closeout exactly as today.
- request-AC5 -> This backlog slice. Proof: AC3: The pointers in item_850, item_851, item_847 and item_848 name their refs again, and task_387's closeout still validates.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_108_checks_that_read_the_corpus_the_way_it_is_written`
- Architecture decision(s): (none yet)
- Request: `req_378_stop_reporting_a_deferred_request_and_a_prose_mention_as_corpus_defects`
- Primary task(s): `task_388_make_both_checks_read_the_corpus_as_written`

# Priority
- Priority: Medium - it made proofs due for work nobody started
- Rationale: Set by scaffold input or defaulted for grooming.

# Validation
- 2026-08-16: closeout now reads request refs from the declared link sections, reusing the audit's own DECLARED_LINK_SECTIONS map (req_337) rather than a second implementation. The four documents edited around the finding name their refs again -- item_850 and item_851 point at req_377 in prose, item_847 and item_848 declare both their superseding request and the task they were scaffolded under -- and task_387's closeout preflight passes with no blocking issues (AC1, AC2, AC3).

# Tasks
- `task_388_make_both_checks_read_the_corpus_as_written`

# Notes
- Task `task_388_make_both_checks_read_the_corpus_as_written` was finished via `logics-manager flow finish task` on 2026-08-16.
