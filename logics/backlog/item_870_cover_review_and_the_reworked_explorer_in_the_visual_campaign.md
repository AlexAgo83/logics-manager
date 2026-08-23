## item_870_cover_review_and_the_reworked_explorer_in_the_visual_campaign - Cover Review and the reworked Explorer in the visual campaign
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 15:14:52

# AI Context
- Summary: Puts Review and the reworked Explorer under the visual campaign the closed criteria said judged them.
- Keywords: cover, review, reworked, explorer, visual, campaign
- Use when: adding or extending viewer visual campaign cases for these two surfaces.
- Skip when: fixing the seven campaign failures that predate this work.

# Problem
- Both requests closed layout criteria that require the visual campaign to exercise the new surfaces. `run_local_viewer_visual_smoke.mjs` was never touched and `npm run test:viewer-smoke` was not in the recorded validation.
- The campaign currently fails seven checks in workshop commands, cdx missions, cdx status, and the new request modal. Those failures are identical before and after the delivery, so they are the campaign's own backlog, not this work's.

# Scope
- In:
  - Add a Review case that reaches the surface, proves the burst rail, the file list, and the diff pane are rendered, and judges them at all three viewport sizes.
  - Extend the existing `workshop explorer` case to prove the anchored list, the independent scrollers, and the markdown switch.
  - Assert what the criteria name: no blank surface, no sibling-control overlap, no viewport clipping, no horizontal page scroll, heading structure present, and no colour-only state.
  - Record the seven pre-existing failures explicitly in the slice, so a later run can tell a new failure from an old one.
- Out:
  - Fixing the seven pre-existing failures.
  - Changing the campaign's harness, capture, or reporting.
  - Adding cases for surfaces outside Review and the Explorer.

# Acceptance criteria
- AC1: The campaign has a Review case and an extended Explorer case, both judged at 1440x900, 820x1180, and 390x844.
- AC2: The cases assert blank surfaces, sibling-control overlap, viewport clipping, horizontal page scroll, heading structure, and colour-only state.
- AC3: `npm run test:viewer-smoke` reports the same seven pre-existing failures and no new ones.
- AC4: The seven pre-existing failures are named in this slice so a later run can distinguish them.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC1: The campaign has a Review case and an extended Explorer case, both judged at 1440x900, 820x1180, and 390x844. Also: AC2: The cases assert blank surfaces, sibling-control overlap, viewport clipping, horizontal page scroll, heading structure, and colour-only state.
- request-AC15 -> This backlog slice. Proof: AC3: `npm run test:viewer-smoke` reports the same seven pre-existing failures and no new ones.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)
- Request: `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`
- Primary task(s): `task_396_orchestrate_the_review_and_explorer_repair`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_396_orchestrate_the_review_and_explorer_repair`

# Notes
- Task `task_396_orchestrate_the_review_and_explorer_repair` was finished via `logics-manager flow finish task` on 2026-08-23.
