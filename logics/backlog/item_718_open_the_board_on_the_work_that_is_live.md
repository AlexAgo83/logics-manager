## item_718_open_the_board_on_the_work_that_is_live - Open the board on the work that is live
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 93%
> Confidence: 90%
> Progress: 50%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: 91.5% of the corpus is finished, so default the board to live work, fold finished docs per column behind a counted control, and report live-versus-done in the column header.
- Keywords: board default filter, done fold, column header counts, live work, all docs
- Use when: Changing what the board shows on open, or what a column header reports.
- Skip when: Changing the status vocabulary or which statuses count as finished.

# Problem
- 91.5% of this corpus is finished, so opening on every document newest-first buries 13 live items under 1 382 done ones, and a column header reports how many cards are drawn rather than how much work is outstanding.

# Scope
- In:
  - Default the board to live work, with finished documents folded per column behind a control stating the count.
  - Report live and finished counts in the column header.
  - Keep every existing filter reachable, so nothing becomes unviewable.
- Out:
  - Changing the status vocabulary, or which statuses count as finished beyond what the corpus already defines.

# Acceptance criteria
- AC2: The board opens on live work; finished documents fold per column and the fold states how many.
- AC3: Column headers state live and finished counts.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: The board opens on live work; finished documents fold per column and the fold states how many.
- request-AC3 -> This backlog slice. Proof: AC3: Column headers state live and finished counts.

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
