## item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision - Make the corpus insights headline count only what needs a decision
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 44%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 08:31:09

# AI Context
- Summary: The headline counts defects and in-flight work together, `NEEDS ATTENTION 96` sits beside `QUALITY FINDINGS 87` which is one of its own components, and a listed document never says which signal listed it.
- Keywords: insights headline, needs attention, quality findings, 7 plus 2 plus 87, flow health list, signal attribution
- Use when: Changing what Corpus insights counts, how it groups, or how it lists flagged documents.
- Skip when: Which signals exist, and the operator actions the screen links to.

# Problem
- The headline counts defects and in-flight work together; `NEEDS ATTENTION 96` and `QUALITY FINDINGS 87` are presented as peers when the second is a component of the first; and a document listed under Flow health shows only its status, never which signal listed it.

# Scope
- In:
  - Group signals by the classification the preceding item establishes, and count only defects in the headline.
  - Make the relationship between a total and its components legible.
  - State which signal listed each document.
- Out:
  - Which signals exist, and the operator actions the screen links to.

# Delivery notes
- The headline counts `blocked + chains overdue + broken references + missing status + quality findings`. Chains still in flight are reported on their own row, with the threshold named in the label -- `Chains untouched for 14+ days` beside `Chains in flight` -- so a reader sees the queue without the headline claiming it needs a decision. Nothing is hidden; one row became two, split by the rule `item_746` recorded.
- `Promotion gaps` is gone as a separate row. It counted the same documents as `Incomplete workflow chains` filtered to the two stages that make up almost all of them, so the screen reported one fact twice under two names.
- **AC3:** `Needs attention` is the sum of the signals listed below it, and sat in the tile row as though it were one more of them. It is labelled `Needs attention (total)`.
- **The first version of the regression was not load-bearing, and I nearly kept it.** It read the count off the headline and then compared that number to itself, so it passed whether or not the classification was applied at all -- reintroducing the defect left it green. It compares two corpora now: the same three chains, aged so that all three are overdue in one and only one is in the other, and asserts the headline differs by exactly two. That version fails when the classification is removed.
- The test harness could not express this: the viewer's items came from a fixed fixture, so a test about signal classification had to assert against whatever the demo corpus happened to contain. `createViewerDom` takes an `items` override now.

# Acceptance criteria
- AC2: The headline counts what needs a decision.
- AC3: No total is presented as a peer of its own component.
- AC4: A listed document states which signal listed it.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: The headline counts what needs a decision.
- request-AC3 -> This backlog slice. Proof: AC3: No total is presented as a peer of its own component.
- request-AC4 -> This backlog slice. Proof: AC4: A listed document states which signal listed it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
