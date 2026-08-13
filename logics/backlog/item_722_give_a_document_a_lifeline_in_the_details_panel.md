## item_722_give_a_document_a_lifeline_in_the_details_panel - Give a document a lifeline in the details panel
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 70%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 21:33:43

# AI Context
- Summary: Show the beats a document has reached, the one it is on, and when each was reached, within what item_716 established is honestly available -- degrading legibly rather than inventing a date.
- Keywords: document lifeline, lifecycle beats, provenance, indicators reviewed, degraded rendering
- Use when: Adding or changing the lifeline in the details panel.
- Skip when: Recording new lifecycle events, unless the feasibility check shows the lifeline is otherwise not renderable.

# Problem
- The panel reports the current status and the last update, so answering "where is this document in its life" means reading the document.

# Scope
- In:
  - Show the beats a document has reached, the beat it is on, and when each was reached, within what the preceding investigation established is honestly available.
  - Degrade legibly when a beat has no recorded date rather than inventing one.
- Out:
  - Recording new lifecycle events, unless the investigation shows the lifeline is otherwise not renderable.

# Delivery notes
- Delivered within `item_716`'s finding and no further: there is no per-beat date anywhere in the payload, so the lifeline draws the sequence a stage declares and where the document sits in it, and states in as many words that no dates are recorded. A lifeline that stayed silent about that would read as one that had them.
- The beats come from `logics_manager/statuses.json`, which was already the single source of truth but only generated a TypeScript module. The generator now also writes `clients/shared-web/media/workflowStatuses.generated.js`, covered by the same `check:status-constants` drift gate -- a hand-written second list is a list that eventually disagrees, which is the mistake `item_721` had just finished undoing elsewhere.
- **Blocked, Obsolete, Rejected and Superseded are drawn as exits, not as later beats.** A document does not pass through Blocked on its way to Done, so when the status is one of them the sequence before it is left unmarked. Claiming those beats were reached would be the same invention the dates were rejected for, in a different place.
- Reached is a position in the declared sequence, not a recorded event. That is the strongest claim `Status` alone supports, and the panel says so rather than implying history it does not have.
- Two defects found and fixed while checking the result, both recorded because neither was this slice's subject:
  - **The reference index from `item_717` did not scroll.** Reported by the operator: entries ran off the bottom with no way to follow them. It shipped with `grid-column: 1 / -1`, and `.board` is a flex row rather than a grid, so the rule did nothing, the index sized to its content, and `.board`'s `overflow-y: hidden` clipped the rest away without a scrollbar. It takes the columns' own shape now: full height, and the part that grows is the part that scrolls.
  - **Long slugs in the panel's label column drew on top of the value beside them.** The column is capped at 116px and `createLinkedIndicatorRow` puts `stage - <slug>` in it; with `overflow-wrap: normal` the slug had nowhere to break. A test already asserted `normal` on that rule, protecting indicator names like "Understanding" from being broken mid-word -- a premise that held until linked rows started using the same column. That test now asserts `anywhere` and carries the reason, rather than a second test being added to contradict it.

# Acceptance criteria
- AC9: The lifeline shows reached beats, the current beat, and the date of each, degrading legibly where a date is absent.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC9: The lifeline shows reached beats, the current beat, and the date of each, degrading legibly where a date is absent.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
