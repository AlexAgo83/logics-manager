## task_341_deliver_the_fleet_home_first_screen_redesign - Deliver the fleet home first-screen redesign
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Extend the campaign to the fleet home first to get a baseline, then reframe it as the root view, then redraw the rows, filtering and states against the mockup in `logics/external/mockup/`.
- Keywords: fleet home redesign, root view, row layout, filter and sort, degraded states, campaign baseline, browser host rebuild
- Use when: Implementing any part of the fleet home first-screen redesign.
- Skip when: Working on the demo project's visibility, which is task_340.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Extend the campaign to the fleet home first, and record what it reports about today's screen -- that baseline is what proves the later items changed anything.
- [x] 2. Do the root-view framing next: it decides the container everything else is drawn inside, and the row work would have to be redone if it landed after.
- [x] 3. Then the row redraw, then filtering and the states, checking each against the mockup in `logics/external/mockup/`.
- [x] 4. Rebuild the browser host and confirm both surfaces, standalone and extension host, before closeout.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode`
- `item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form`
- `item_713_keep_the_fleet_home_usable_past_a_dozen_projects`
- `item_714_give_the_fleet_home_s_empty_and_degraded_states_something_to_say`
- `item_715_bring_the_fleet_home_inside_the_viewer_ui_campaign`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: under `--fleet` the fleet home renders with no Close or Minimize and no board behind it. The rule lives in `updateScreenActions`, which already owned whether minimize is shown -- a second opinion elsewhere lost by ordering on the first attempt. Verified against a live viewer at 1440x900 and 390x844.
- request-AC2 -> This task. Proof: the topbar pill reads `Fleet` on the root screen instead of naming a project the operator has not chosen, and the duplicated `<h2>Fleet</h2>` inside the toolbar was removed so the panel header prints the title once.
- request-AC3 -> This task. Proof: each project is one row of about 55px, replacing a card of about 360px that showed three digits in three stacked tiles. Captured before and after at 1440x900.
- request-AC4 -> This task. Proof: state is carried by the left accent's shape as well as its colour -- full for issues, hollow-centred for stale, a short mark for clean, dashed for no corpus, dimmed for unreadable -- per the decision recorded in `item_767`. Zero counts drop to 38% opacity; non-zero issue and stale counts take colour.
- request-AC5 -> This task. Proof: the path is on the row, monospaced and truncated with a title attribute, with no disclosure; the favourite star is filled and amber when set.
- request-AC6 -> This task. Proof: a filter field narrows the list, ordering is attention-first (issues, unreadable, stale, no-corpus, clean, with favourites and discovery order breaking ties), and fleet roots are toolbar chips rather than a stacked section. Driven rather than assumed: filtering to a non-matching string leaves 0 rows and an empty state naming the string, the count reads `0 of 1 project`, filtering back restores the row, and focus stays in the field across the re-render.
- request-AC7 -> This task. Proof: a folder with no corpus offers `Bootstrap`, one that cannot be read offers `Details` and states why, and an empty fleet explains what a fleet root is and offers the picker. The three are distinct in wording and in accent shape.
- request-AC8 -> This task. Proof: the campaign visits the fleet home and applies every layout check to it at 1440x900 -- 6 checks, all passing, including no overlap, nothing clipped and no sideways scroll. The mobile layout was captured at 390x844 with metrics and the action moving under the title.
- request-AC9 -> This task. Proof: `item_715` built the campaign's screen harness, which the fleet home is the first consumer of. It reaches a screen, waits, proves which screen was captured by its title, and applies the layout checks. 49 checks, 0 failures across four screens.
- request-AC10 -> This task. Proof: every change is in `clients/viewer/src/browser-host/index.js` and `clients/viewer/viewer.css`, rebuilt with `npm run bundle:viewer-host`; `npm run check:viewer-host` reports the bundle in sync.
# Validation
- (no validation recorded yet)
- npm run lint, npx vitest run and the viewer UI campaign passed on 2026-08-13: lint OK, 82 files / 869 tests, campaign 49 checks 0 failures across four screens including the fleet home; every AC verified against a live viewer at 1440x900 and 390x844
- Finish workflow executed on 2026-08-13.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-13.
- Linked backlog item(s): `item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode`, `item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form`, `item_713_keep_the_fleet_home_usable_past_a_dozen_projects`, `item_714_give_the_fleet_home_s_empty_and_degraded_states_something_to_say`, `item_715_bring_the_fleet_home_inside_the_viewer_ui_campaign`
- Related request(s): `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`

# Links
- Request: `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`
- Product brief(s): `prod_080_a_fleet_home_an_operator_can_triage_from`
- Architecture decision(s): (none yet)
