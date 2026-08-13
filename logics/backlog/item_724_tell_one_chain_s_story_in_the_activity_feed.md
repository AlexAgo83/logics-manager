## item_724_tell_one_chain_s_story_in_the_activity_feed - Tell one chain's story in the activity feed
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 23:01:05

# AI Context
- Summary: One scaffold produced ten peer rows that pushed everything else off screen; collapse an operation into one entry and let a workflow chain's events be read together, reachable from a card.
- Keywords: operation grouping, chain thread, scaffold events, activity from a card, event provenance
- Use when: Grouping activity events by operation or by chain, or linking a card to its chain's history.
- Skip when: Adding event kinds, and the activity retention window.

# Problem
- One scaffold wrote ten documents and produced ten peer rows that pushed everything else off the screen; it was one action, and the documents are its detail.

# Scope
- In:
  - Collapse an operation's events into one entry that names what it produced.
  - Read a workflow chain's events together as that chain's history, reachable from a card.
  - Follow what the preceding investigation established about what the payload can support.
- Out:
  - Adding event kinds, and the activity retention window.

# Delivery notes
- **Delivered as chain grouping, not operation grouping, on `item_716`'s finding.** Activity events are built client-side by diffing the previous snapshot against the current poll, so nothing records which command wrote a document, and two scaffolds inside one poll window are indistinguishable -- always will be, from a snapshot diff. What is recoverable is the workflow chain, from `references` and `usedBy`, which the payload already carries. The collapsed row reads `N documents in one chain`, not `in one run`: a count that implied a run would be the screen asserting something the data cannot support.
- Only **consecutive** same-chain events collapse. A chain touched this morning and again tonight is two moments in its life, not one; merging them across a day would invent an operation exactly where `item_716` said one cannot be recovered.
- The chain resolution lives in `logicsModel.js` rather than in either surface, so the feed and the details panel answer "which chain is this" the same way.
- **A defect the change itself exposed, fixed here.** The feed's `Show next 10` counted events. Once ten events collapsed into one row, the whole allowance was spent on a single line -- the collapse made the feed *shorter* instead of denser, which is the opposite of what it is for. The limit counts rows now. Measured against the real corpus before and after: one row, then eight rows plus two collapsed chains.
- A request belongs to its own chain, so a collapsed group counts the root with the members it produced rather than leaving it outside them. Recorded because the first version of the regression asserted otherwise and was wrong.
- The chain's history is reachable from a card: the details panel carries a `Chain activity` section, with the same note about what is and is not recorded, so nobody reads it as a record of runs.

# Acceptance criteria
- AC12: One operation is one entry, and a chain's history can be read together and reached from a card.

# AC Traceability
- request-AC12 -> This backlog slice. Proof: AC12: One operation is one entry, and a chain's history can be read together and reached from a card.

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

# Tasks
- `task_342_deliver_the_project_view_that_leads_with_live_work`

# Notes
- Task `task_342_deliver_the_project_view_that_leads_with_live_work` was finished via `logics-manager flow finish task` on 2026-08-13.
