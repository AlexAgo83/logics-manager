## item_865_migrate_the_viewer_surface_state_from_a_boolean_to_a_tri_state - Migrate the viewer surface state from a boolean to a tri-state
> From version: 2.22.4
> Schema version: 1.0
> Status: In progress
> Understanding: 92
> Confidence: 88
> Progress: 95%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 13:40:03

# AI Context
- Summary: Replaces the two-state surface slider and its boolean with a control and a state that can hold three surfaces, before any third surface exists.
- Keywords: migrate, viewer, surface, state, boolean, tri
- Use when: touching the Activity/Project surface control, the surface body classes, or anything reading `activityPanelIsOpen()`.
- Skip when: building the Review screen itself, which is the sibling slice that consumes this state.

# Problem
- What the docs call the Activity/Project surface switcher is a 40x20 pill slider (`#activity-toggle`, `.toolbar__view-slider`) whose knob is a `::after` translated 20px on `data-current-mode="project"`. It cannot express a third choice.
- Behind it the surface is a boolean: `activityPanelIsOpen()` plus the body classes `viewer-screen-activity` and `viewer-screen-project`. Seventeen call sites across `index.js`, `render.js`, `git.js`, `util.js`, and `viewer.css` read it, `returnToProjectSurface()` included.
- Doing this migration inside the Review slot slice would mix a five-file refactor with a new feature, so a review that stalls on the refactor stalls the feature with it.

# Scope
- In:
  - Replace the `#activity-toggle` pill slider with a segmented surface control that can carry more than two choices, keeping the current two choices and their behavior identical for the operator.
  - Replace the boolean surface state with a named tri-state-capable value, and move all seventeen call sites onto it, `returnToProjectSurface()` included.
  - Keep the `viewer-screen-*` body classes as the rendered projection of that state so existing CSS and the visual campaign keep working.
  - Give the new control a visible non-colour selected cue, `aria-current` or equivalent, and the phone fallback the request already decided (existing topbar menu/sheet pattern, no wrapped grid).
  - Cover the control and the state transitions in browser-host tests, including that no reader of the old boolean is left behind.
- Out:
  - Adding the `Review` surface itself, its data, or its screen: this slice ships two surfaces through a three-capable control.
  - Any change to the Activity panel's contents, the Project screen, or the Git cockpit.
  - New CSS beyond what the segmented control needs; reuse existing tokens and button styles.

# Acceptance criteria
- AC1: The pill slider is replaced by a segmented surface control that accepts a third choice without another rewrite, and the two existing surfaces behave exactly as before for the operator.
- AC2: No call site reads the old boolean surface state; a search for `activityPanelIsOpen` and the raw body-class checks returns only the new state's own implementation.
- AC3: The `viewer-screen-activity` and `viewer-screen-project` body classes are still applied, so existing CSS and the visual campaign are unaffected.
- AC4: The control carries a visible non-colour selected cue and `aria-current` or equivalent, and falls back to the existing topbar menu/sheet pattern at the phone breakpoint.
- AC5: The layout holds at 1440x900, 820x1180, and 390x844 with no overlap, clipped labels, or horizontal page scroll.
- AC6: Browser-host tests cover the control's rendering and both transitions, and assert that the surface state is read from one place.
- AC7: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run test:viewer-smoke` pass for this slice.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The pill slider is replaced by a segmented surface control that accepts a third choice without another rewrite, and the two existing surfaces behave exactly as before for the operator.
- request-AC9 -> This backlog slice. Proof: AC5: The layout holds at 1440x900, 820x1180, and 390x844 with no overlap, clipped labels, or horizontal page scroll.
- request-AC11 -> This backlog slice. Proof: AC6: Browser-host tests cover the control's rendering and both transitions, and assert that the surface state is read from one place.
- request-AC12 -> This backlog slice. Proof: AC7: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run test:viewer-smoke` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_110_a_review_slot_for_project_change_timelines`
- Architecture decision(s): (none yet)
- Request: `req_381_add_a_review_slot_for_project_change_timelines`
- Primary task(s): `task_393_orchestrate_the_review_slot_change_timeline`

# Priority
- Priority: High
- Rationale: `item_858` cannot add a third surface until the control and the state can hold one, so this slice runs first.

# Notes
- Split out of `item_858_build_the_review_slot_timeline_ui` before implementation: the refactor and the new surface have different risk profiles and are reviewed separately.
