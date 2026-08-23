## item_873_turn_the_surface_buttons_into_one_segmented_control - Turn the surface buttons into one segmented control
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 93%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 16:05:27

# AI Context
- Summary: Rebuilds the three surface buttons as one segmented control with tab-list semantics.
- Keywords: turn, surface, buttons, segmented, control
- Use when: styling or labelling the Activity/Project/Review control.
- Skip when: changing what each surface renders.

# Problem
- The three choices are independent bordered buttons separated by a gap, and the selected one uses the primary button fill, the same as the toolbar's action buttons, so the current surface reads as a call to action.
- Three mutually exclusive options carry `aria-pressed`, which announces three independent toggles rather than one of three.

# Scope
- In:
  - Render one bordered container with flush options, rounding on the outer edges only, and a divider between options.
  - Give the selected option a quieter treatment than a primary button, plus a non-colour cue.
  - Replace `aria-pressed` with `role="tablist"` and `aria-selected`, keeping keyboard reachability.
  - Keep the control aligned with the other toolbar controls and reachable at the phone breakpoint.
  - Cover the roles and the selected state in browser-host tests.
- Out:
  - Adding a fourth surface or changing what each surface shows.
  - Restyling the rest of the toolbar.
  - The phone menu/sheet fallback, which is unchanged.

# Acceptance criteria
- AC1: The three options render inside one bordered container, flush, rounded on the outer edges only.
- AC2: The selected option is visibly distinct from the toolbar's primary action buttons and carries a non-colour cue.
- AC3: The control exposes `role="tablist"` with `aria-selected` on the options.
- AC4: The control stays reachable and unclipped at 1440x900, 820x1180 and 390x844.
- AC5: Browser-host tests cover the roles and the selected state.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: The three options render inside one bordered container, flush, rounded on the outer edges only.
- request-AC7 -> This backlog slice. Proof: AC3: The control exposes `role="tablist"` with `aria-selected` on the options.
- request-AC8 -> This backlog slice. Proof: AC4: The control stays reachable and unclipped at 1440x900, 820x1180 and 390x844.
- request-AC9 -> This backlog slice. Proof: AC5: Browser-host tests cover the roles and the selected state.
- request-AC11 -> This backlog slice. Proof: AC2: The selected option is visibly distinct from the toolbar's primary action buttons and carries a non-colour cue.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_114_review_as_a_real_viewer_surface`
- Architecture decision(s): (none yet)
- Request: `req_385_render_review_in_the_main_pane_and_repair_the_explorer_detail_pane_and_surface_control`
- Primary task(s): `task_397_orchestrate_the_review_main_pane_move_and_the_explorer_and_control_repairs`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_397_orchestrate_the_review_main_pane_move_and_the_explorer_and_control_repairs`

# Notes
- Task `task_397_orchestrate_the_review_main_pane_move_and_the_explorer_and_control_repairs` was finished via `logics-manager flow finish task` on 2026-08-23.
