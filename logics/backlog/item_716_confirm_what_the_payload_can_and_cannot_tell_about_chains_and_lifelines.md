## item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines - Confirm what the payload can and cannot tell about chains and lifelines
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 95%
> Progress: 40%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Two proposals assume data that may not exist -- per-event operation and chain, and per-beat lifeline dates; settle what the payload can honestly support before either is designed in.
- Keywords: activity payload, event provenance, chain grouping, lifeline dates, indicators, feasibility check
- Use when: Before designing the activity chain thread or the document lifeline, or when deciding whether either needs backend work.
- Skip when: Any board, card or panel work that does not depend on those two answers.

# Problem
- Two proposals in this request assume data that may not exist: a chain thread needs each activity event to know which operation and which chain produced it, and a lifeline needs a date per beat rather than the current state alone. Designing either before checking would build a screen on an assumption.

# Scope
- In:
  - Establish what the activity payload records per event, and whether operation and chain are recoverable.
  - Establish whether per-beat dates are derivable from indicators and provenance, or only the current state is.
  - Record the answer where the two dependent items can act on it, including what to render when the data is partial.
- Out:
  - Adding the data if it is missing; that is a decision this item informs, not one it takes.

# Findings

Answered 2026-08-13 by reading the activity path and measuring the item payload against
this corpus (1 593 documents).

## Activity events carry nothing about what produced them

The activity history is not served by the backend. `updateStoredActivity` in
`clients/viewer/src/browser-host/index.js` builds it client-side by diffing the previous
snapshot, held in `localStorage`, against the items of the current poll. An entry is
`{ path, at, status, previousStatus, type }` where `type` is `status-change` or
`updated`; git entries add `{ id, action, title, label, meta, updatedAt }`. Nothing
records which command wrote a document.

So ten documents written by one scaffold produce ten independent `updated` entries,
because the client only knows that ten paths are new since the last poll.

**Grouping by chain is possible today.** Every changed document's `references` and
`usedBy` are already in the item payload, so the client can look up which chain a changed
document belongs to and group by that, with no backend change.

**Grouping by operation is not.** Two scaffolds inside one poll window are
indistinguishable, and always will be from a snapshot diff. Recording the operation
requires the backend to emit an event when it writes, which is a different piece of work
from anything else in this request.

## A lifeline has no dates to draw

Measured across 1 593 documents: **one** has a non-empty `provenance`, and its keys are
`externalUrl` and `origin` -- an external tracker link, not lifecycle history. The
indicator set is `Complexity, Confidence, From version, Indicators reviewed, Maintenance
edit, Priority, Reminder, Schema version, Status, Theme, Understanding`. `Indicators
reviewed` is the timestamp of the last review, not the date a beat was reached.

There is no per-beat date anywhere in the payload. The client's own history holds
`previousStatus -> status` transitions, but only from the moment this browser first saw
the document, and only in this browser's `localStorage`.

Two ways to get one, neither in scope here:
- **Derive from git.** Every document is versioned, so `git log --follow` over a path plus
  the `Status` indicator at each commit reconstructs the real beats. Accurate and
  retroactive; costs a git walk per document opened.
- **Record forward.** Emit a lifecycle event when a status changes. Cheap per event,
  correct only from the day it ships, and blind to the 1 382 documents already finished.

# Decision for the dependent slices

- `item_724` delivers a chain thread grouped by **workflow chain**, not by operation, using
  `references` and `usedBy`. It states that limit rather than implying an operation was
  captured.
- `item_722` cannot draw a dated lifeline from what exists. It shows the beats a document
  has reached and the beat it is on -- both derivable from `Status` -- and marks the dates
  as unavailable rather than inventing them. Whether to fund the git walk or the forward
  event log is a separate decision, and this slice must not quietly assume either.

# Acceptance criteria
- AC9: What a lifeline can honestly show today is established, including the fallback when a beat has no date.
- AC12: Whether events carry their operation and chain is established, with the cost of adding it if they do not.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC9: What a lifeline can honestly show today is established, including the fallback when a beat has no date.
- request-AC12 -> This backlog slice. Proof: AC12: Whether events carry their operation and chain is established, with the cost of adding it if they do not.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
