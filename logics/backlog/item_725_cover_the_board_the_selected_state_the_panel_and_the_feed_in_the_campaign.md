## item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign - Cover the board, the selected state, the panel and the feed in the campaign
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The campaign opens a card and reaches activity, yet none of this request's findings failed a run; extend it to the four surfaces across three viewports before the redraws, so the checks observe the change.
- Keywords: viewer ui campaign, layout checks, baseline before redraw, four surfaces, three viewports, extension host parity
- Use when: Extending the campaign's coverage of the board, selection, details panel or activity feed.
- Skip when: Adding new check kinds beyond what the layout checks already provide.

# Problem
- The campaign opens a card and reaches activity, but nothing in this request's findings failed a run -- so the checks do not yet observe the states these changes alter.

# Scope
- In:
  - Extend the campaign to the four surfaces and the three viewports, applying the existing layout checks to each.
  - Do this before the redraws, so the checks observe the change rather than being written around it.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - New check kinds beyond what the layout checks already provide.

# Acceptance criteria
- AC14: All four surfaces hold at the three viewports and are covered by the campaign.
- AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC14: All four surfaces hold at the three viewports and are covered by the campaign.
- request-AC15 -> This backlog slice. Proof: AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

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
