## item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves - Bring the CDX screens onto the shape status already proves
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 17%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: CDX missions puts `Not previewed` and `Not launched` in metric tiles, prints its panel title twice and carries two unstyled checkboxes -- while CDX status has already built the table, strip and next-action shape the rest of the product is being asked to adopt.
- Keywords: cdx missions, cdx status reference, placeholder tiles, duplicate title, disabled launch, preview before launch, table and strip
- Use when: Changing any CDX screen other than adopting the status screen's established shape.
- Skip when: What a mission does, session management, and the Terminals tab a mission launches into.

# Problem
- CDX missions puts two placeholders in metric tiles, prints its panel title twice, and carries two unstyled checkboxes -- while CDX status has already built the table, strip and next-action shape the rest of the product is being asked to adopt.

# Scope
- In:
  - Move states that mean nothing has happened yet out of the metric tiles and onto the panel they describe.
  - Have the disabled launch action state why it is disabled, keeping the preview-before-launch safety.
  - Print each screen title once.
  - Adopt the status screen's table and strip shape across the other CDX screens rather than inventing per screen.
- Out:
  - What a mission does, how sessions are managed, and the Terminals tab a mission can launch into.

# Acceptance criteria
- AC10: Tiles carry metrics, not placeholders.
- AC11: The disabled action explains itself and the safety is preserved.
- AC12: Titles are printed once.
- AC13: The other CDX screens adopt the status shape.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC10: Tiles carry metrics, not placeholders.
- request-AC11 -> This backlog slice. Proof: AC11: The disabled action explains itself and the safety is preserved.
- request-AC12 -> This backlog slice. Proof: AC12: Titles are printed once.
- request-AC13 -> This backlog slice. Proof: AC13: The other CDX screens adopt the status shape.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)
- Request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Primary task(s): `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
