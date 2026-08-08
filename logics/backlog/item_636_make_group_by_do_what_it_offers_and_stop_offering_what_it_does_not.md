## item_636_make_group_by_do_what_it_offers_and_stop_offering_what_it_does_not - Make Group by do what it offers, and stop offering what it does not
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95
> Confidence: 85
> Progress: 0
> Complexity: Medium
> Theme: Controls that mean something
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Group by offers Type, Status and Theme. On the board it does nothing at all: selecting Status or Theme leaves the same columns, headed Requests, Backlog, Tasks, Product briefs and Architecture decisions. The board renders one column per stage and never consults the mode.
- The grouping it needs already exists. The list view groups by status, so the function is written and used; the board simply iterates the stage list instead of asking for groups.
- Theme is implemented in neither view. It is a third option that has never done anything.
- The mode is part of the render context key, so choosing it resets the paging limits and the board visibly moves. An operator sees something happen and concludes the control worked.

# Scope
- In:
  - Group the board by status when that mode is chosen, reusing the grouping the list view already performs.
  - Remove Theme, which is implemented nowhere, rather than leaving a third option that does nothing.
  - Keep Type as the default, so the view an operator lands on is unchanged.
  - Have the campaign assert that changing a control that claims to regroup changes what the board shows, reading the modes from the control itself.
- Out:
  - Adding a grouping dimension that does not exist today.
  - Changing the list view's grouping, which already works.
  - Changing how columns sort or page.
  - Reworking the toolbar's layout.

# Acceptance criteria
- AC1: Selecting Status regroups the board by status, with one column per status present.
- AC2: Selecting Type restores the stage columns, unchanged from today's default.
- AC3: Theme is gone from the control, and nothing references it.
- AC4: The campaign fails when a mode offered by the control leaves the board's grouping unchanged, walking the modes read from the control.
- AC5: Tests cover both modes and fail against the current implementation.

# AC Traceability
- - request-AC8 -> This backlog slice. Proof deferred to slice closeout.
- - request-AC6 -> This backlog slice. Proof deferred to slice closeout.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_062_say_what_just_happened`
- Architecture decision(s): (none yet)
- Request: `req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done`
- Primary task(s): `task_311_orchestrate_the_attended_tour_findings`

# AI Context
- Summary: Make Group by do what it offers, and stop offering what it does not
- Keywords: backlog, promote, slice, make group by do what it offers, and stop offering what it does not
- Use when: You need a bounded backlog item for Make Group by do what it offers, and stop offering what it does not.
- Skip when: The change should go straight to implementation detail.

# Priority
- Priority: High - a control with three options, two of which do nothing
- Rationale: Measured during the attended tour and confirmed in `webviewSelectors.js`: the board iterates `getVisibleStages()` and never reads the mode.

# Notes
- Generated locally by logics-manager.

# Tasks
- `task_311_orchestrate_the_attended_tour_findings`
