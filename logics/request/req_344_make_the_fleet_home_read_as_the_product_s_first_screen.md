## req_344_make_the_fleet_home_read_as_the_product_s_first_screen - Make the fleet home read as the product's first screen
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The `--fleet` entry screen presents as a dismissable panel over an unchosen project and spends ~360px per project to show three digits; this reframes it as the root view and redraws the list as rows triageable at a glance.
- Keywords: fleet home, browser host, viewer css, screen density, status colour, viewer ui campaign, extension host parity
- Use when: changing what `view --fleet` renders, the fleet row or card layout, the fleet toolbar, or the campaign's screen coverage.
- Skip when: working on the board, the document screens, the project switcher menu, or the demo project's visibility.

# Needs
- Reported by the operator, 2026-08-13: `view --fleet` is the first thing a user sees, and it does not look like a first screen.
- The full review, with captures of the current state at three viewports and a side-by-side mockup of the proposal, is in `logics/external/fleet_home_visual_review_2026_08_13.md` and `logics/external/mockup/fleet_home_redesign.html`. This request delivers that proposal.
- Two things are wrong at once and they are worth separating. The screen is *framed* as something dismissable layered over a project the operator has not chosen, and the list itself is *drawn* at a density that stops working at the fleet sizes `--fleet` exists to serve.
- The fleet home is where an operator decides where to look next. Today that decision requires reading three numbers per project, on a screen that fits two projects.

# Context
- **The screen mechanism is fine; its framing as a launch view is not.** `screenRegistry` in `clients/viewer/src/browser-host/index.js` declares Fleet alongside every other screen, and req_313 made that single declaration deliberate. The defect is narrower: when `payload.fleetHome` is set, the payload render draws the project board first and *then* calls `showFleetHome`, so the fleet home arrives as a document panel over a board the operator never asked for, carrying Refresh / Minimize / Close chrome. Closing it lands them on that board. The topbar meanwhile still shows the launch project's pill, so the screen and the chrome give two different answers to "where am I".
- **Density, measured rather than asserted.** `renderFleetHome` emits `renderMetricCards` with three entries per project, and `.viewer-fleet__project` stacks them; each project costs roughly 360px to show three digits. Captured at 1440x900 that is two projects with ~60% of the screen empty, and at 390x844 it is one project per screen.
- **Absence is drawn as loudly as presence.** A zero renders at 26px bold inside its own bordered tile, so a clean project and one with four issues carry identical visual weight. Nothing on the screen is coloured, so "where do I look first" has to be computed by reading every card rather than seen.
- **Nothing narrows the grid.** The sort is favorites-then-source-order and there is no filter, which is adequate at two projects and unusable at twenty -- and twenty is the case the fleet home exists for.
- **The data is already there.** The projects and projects-state endpoints in `logics_manager/viewer.py` already return every field the proposed rows use (name, root, active, hasLogics, message, openCount, issueCount, staleCount). This is a rendering and framing change, not a new capability, and it should not need a new endpoint.
- **Why no check reported any of this.** `tests/run_local_viewer_visual_smoke.mjs` drives `view`, never `view --fleet`, so the fleet home is outside the sweep entirely. The layout checks in `tests/helpers/viewer-layout-checks.mjs` read their targets from the interface rather than a hand-written list, so they would cover the fleet home the moment the campaign visits it. Adding that visit is what stops this from recurring, and it is worth doing before the redraw so the campaign observes the change rather than being written around it.
- Out of scope: the board, the document screens, and the project switcher menu, which keeps its current behaviour; and the demo project visible in the captures, tracked separately in `logics/request/req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact.md`.
- Known risk: `clients/viewer/browser-host.js` is a build output of `clients/viewer/src/browser-host/index.js` via `scripts/build/build-viewer-browser-host.mjs`, and the same source feeds both the standalone viewer and the extension host. A change made in the built file would be silently lost, and a change that only looks right in one surface is not done.

# Acceptance criteria
- AC1: Started with `--fleet`, the viewer presents the fleet home as its root view: no Close or Minimize chrome on it, and no project board rendered behind it.
- AC2: On that screen the topbar identifies the fleet rather than naming a project the operator has not chosen, and the screen's title appears once.
- AC3: Each project occupies one row carrying its name, path, state and counts, so at 1440x900 at least eight projects are visible without scrolling where two are visible today.
- AC4: A project's state is legible without reading its numbers -- clean, stale, issues, and no-corpus are distinguishable at a glance -- and counts of zero are visually subordinate to counts that are not.
- AC5: The path is visible on the row without a disclosure click, truncated rather than wrapped, and the favorite control reads as set or unset at a glance.
- AC6: The screen can be narrowed by a filter and ordered so projects needing attention come first, and the configured fleet roots are managed from the toolbar rather than a stacked section above the grid.
- AC7: A project with no Logics corpus offers to bootstrap, a project that cannot be read reports that it cannot be read, and the two are not drawn the same; with no root configured the screen explains what a fleet root is and offers the picker.
- AC8: The screen holds at 1440x900, 820x1180 and 390x844 with no overlap, clipping or sideways scroll.
- AC9: The viewer UI campaign visits the fleet home and applies its existing layout checks there, so a regression on AC3 through AC8 fails a run.
- AC10: The change is made in the browser-host source and rebuilt, and the fleet home behaves the same in the standalone viewer and in the extension host.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_080_a_fleet_home_an_operator_can_triage_from`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- clients/viewer/viewer.css
- logics_manager/viewer.py
- scripts/build/build-viewer-browser-host.mjs
- tests/run_local_viewer_visual_smoke.mjs
- tests/helpers/viewer-layout-checks.mjs
- logics/external/fleet_home_visual_review_2026_08_13.md
- logics/external/mockup/fleet_home_redesign.html

# Backlog
- `item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode`
- `item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form`
- `item_713_keep_the_fleet_home_usable_past_a_dozen_projects`
- `item_714_give_the_fleet_home_s_empty_and_degraded_states_something_to_say`
- `item_715_bring_the_fleet_home_inside_the_viewer_ui_campaign`
