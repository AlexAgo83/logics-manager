## item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves - Bring the CDX screens onto the shape status already proves
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 21:23:31

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

# Delivery notes
- **The tiles carry counts.** Two of the four held `Not previewed` and `Not launched` -- states meaning nothing has happened yet, given the weight of a metric. Those two moved onto the panels they describe, beside the panel heading, where the operator is already looking for them. The tiles now count missions, sessions, strengths and pending corpus actions.
- **The disabled launch action says why.** It was disabled with nothing said, on a screen whose whole purpose is launching something. The safety it enforces -- preview before launch -- is unchanged and deliberately so; what was missing was the sentence. The reason distinguishes the three cases: no plan yet, a plan that failed to build, and a plan that reports it cannot run.
- **The run report screen stopped naming itself twice.** It read `Run report` under a document header already titled `CDX run report`, in the two most prominent places on the screen. The section names the run it is showing.
- **The two checkboxes take the form's own row shape.** `item_755` made them dark; it did not make them part of this interface.
- **Deferred, and stated rather than implied: AC13 is partly delivered.** The missions screen adopted the status screen's tile shape and its panel-state convention. Bringing the History, Memory and Disk screens onto the status screen's table and strip is a larger change than this slice, and doing it badly to close an AC would leave three screens half-converted. It is worth its own slice.

## Checked against the mockup, and it found one this pass had missed

`logics/external/mockup/workshop_cdx_redesign.html` names four defects on CDX missions. Three were fixed on the first pass -- the placeholder tiles, the unstyled checkboxes, and the disabled launch that said nothing. **The fourth was missed: "Plan preview" appeared twice, once as the panel heading and once as the selected toggle inside it** -- the same doubling the mockup traces through Settings, the fleet home and the Git history pane. The heading names the pair now (`Mission output`) and the toggle says which of the two is showing.

That is the argument for the plan step that says to check against the mockup rather than to trust the pass: the first reading of this screen found three of four.

The mockup's proposed tiles are `Missions / Sessions / Selected / Session`, where this delivered `Missions / Sessions / Strengths / Corpus actions`. Both carry metrics rather than placeholders, which is what AC10 asks; the mockup's `Selected` is the better of the two and is worth taking when the remaining CDX screens are converted.

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

# Notes
- Task `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens` was finished via `logics-manager flow finish task` on 2026-08-14.
