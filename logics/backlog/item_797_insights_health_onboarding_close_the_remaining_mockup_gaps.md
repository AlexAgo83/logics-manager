## item_797_insights_health_onboarding_close_the_remaining_mockup_gaps - Insights/Health/Onboarding: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:19:56

# AI Context
- Summary: Insights, Health, and Getting Started have each shipped substantial parts of their approved redesign; this slice closes the remaining tile-shape, grouping, and action-button gaps.
- Keywords: insights verdict card, health fixable count, stat tile strip, getting started action pair
- Use when: Implementing this backlog item.
- Skip when: Any other screen family.

# Problem
The mockup review found Insights, Health, and Getting Started had each already shipped real parts of their redesign (Insights' reconciled arithmetic and stage-coloured bars, Health's verdict-first grouped-by-file layout and dropped "Release ready" tile, Getting Started's left TOC with real per-stage counts and capped reading width), with these gaps remaining:
- Insights: the summary card has no `verdict--ok/warn/bad` treatment (coloured left border, inline primary action button); stat tiles are still large 2×2 blocks instead of a thin horizontal strip; "Flow health" is one flat list, not grouped into "needs a decision" vs. "expected while work is in flight" with the latter dimmed.
- Health: no "Fixable" count anywhere — "Apply fixes…" doesn't say how many or what it will do; stat tiles are still 2×2 blocks instead of a thin strip.
- Getting Started: each stage offers only one action button instead of the proposed create+look pair (e.g. "New request" + "Open requests").

# Scope
- In: all findings listed above.
- Out:
  - Getting Started's dead right-hand column — that's the fixed-width layout bug, fixed in item_793; do not duplicate that fix here, only the action-button pairing.

# Acceptance criteria
- AC1: Insights' summary card shows a `verdict--ok/warn/bad` treatment with an inline primary action button; stat tiles render as a thin horizontal strip; "Flow health" is grouped into "needs a decision" vs. "expected while work is in flight", with the latter visually dimmed.
- AC2: Health shows a "Fixable" count, and "Apply fixes…" states how many findings it would address; stat tiles render as a thin strip.
- AC3: Each Getting Started stage offers a create-action + look-action pair, not a single button.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: Each of the per-screen findings listed under Workshop/CDX, Reader/modal/filters, Remote/Settings, and Insights/Health/Onboarding above is either resolved to match its mockup's "Proposed" design, or explicitly deferred with a stated reason (e.g. a state genuinely unreachable in this corpus, or a deliberate design deviation from the mockup).

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Primary task(s): (none yet)

# Priority
- Priority: Low
- Rationale: Polish on screens whose core redesign already shipped; the "Fixable" count is the one finding with real operator-facing ambiguity (unclear what a button does).

# Tasks
- `task_368_insights_health_onboarding_close_the_remaining_mockup_gaps`

# Notes
- Task `task_368_insights_health_onboarding_close_the_remaining_mockup_gaps` was finished via `logics-manager flow finish task` on 2026-08-15.
