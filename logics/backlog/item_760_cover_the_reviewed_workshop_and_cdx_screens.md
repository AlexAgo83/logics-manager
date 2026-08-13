## item_760_cover_the_reviewed_workshop_and_cdx_screens - Cover the reviewed Workshop and CDX screens
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 17%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: None of these screens is covered, and the control theming reaches every screen in the product -- including unreviewed ones and the Terminals tab this request must leave unchanged.
- Keywords: campaign coverage, wait and prove, terminals unchanged check, three viewports, control theming blast radius
- Use when: Extending the campaign to the Workshop or CDX screens, or proving a global style change left a screen unchanged.
- Skip when: New check kinds, and coverage of screens this request does not touch.

# Problem
- None of these screens is covered, and the control theming touches every screen in the product including ones nobody has reviewed and one this request must not change.

# Scope
- In:
  - Reach the reviewed screens at the three viewports, waiting for each and proving which one was captured.
  - Include a check that the Terminals tab is unchanged by the control theming.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - New check kinds beyond what the layout checks already provide, and coverage of screens this request does not touch.

# Acceptance criteria
- AC14: The reviewed screens hold at three viewports and the campaign proves what it captured.
- AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC14: The reviewed screens hold at three viewports and the campaign proves what it captured.
- request-AC15 -> This backlog slice. Proof: AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)
- Request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Primary task(s): `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
