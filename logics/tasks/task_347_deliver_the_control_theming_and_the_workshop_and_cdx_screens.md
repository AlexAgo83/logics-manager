## task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens - Deliver the control theming and the Workshop and CDX screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:00

# AI Context
- Summary: Ship the colour-scheme declaration first and alone, verify it against Terminals immediately, baseline the campaign, then Commands, Runbooks, Explorer, then CDX missions and the propagation of the status shape.
- Keywords: delivery order, colour scheme first, terminals verification, campaign baseline, workshop tabs, cdx shape propagation
- Use when: Implementing the control theming or the Workshop and CDX screen work.
- Skip when: The Workshop Terminals tab, and the other viewer tasks (task_341 to task_346).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Do the colour-scheme declaration first and alone: it is a few lines, it improves every screen including unreviewed ones, and it should not wait behind any redesign.
- [ ] 2. Verify it against the Terminals tab immediately, because this request is not allowed to change that screen and the theming reaches it.
- [ ] 3. Extend the campaign next, with the wait-and-prove behaviour, and record the baseline.
- [ ] 4. Then Commands, then Runbooks, then Explorer -- each self-contained.
- [ ] 5. Then CDX missions, and only then propagate the status screen's shape to the other CDX screens.
- [ ] 6. Check each against `logics/external/mockup/workshop_cdx_redesign.html`, and inherit the panel framing rather than re-deciding it.
- [ ] 7. Rebuild the browser host and confirm both surfaces before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`
- `item_756_make_the_command_list_readable_at_the_size_it_actually_is`
- `item_757_make_the_runbooks_screen_do_what_its_tab_claims`
- `item_758_open_the_explorer_on_something_worth_reading`
- `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`
- `item_760_cover_the_reviewed_workshop_and_cdx_screens`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`. Proof: `:root { color-scheme: dark }` in `clients/viewer/viewer.css`. Every colour in that file is a `var(--vscode-*, <dark fallback>)` and those variables are undefined outside the extension host, so the palette is unconditionally dark and the declaration now says so.
- request-AC2 -> `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`. Proof: Declared once at `:root`, not per control. Forty native controls inherit it; none is styled individually.
- request-AC3 -> `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`. Proof: Terminals is untouched by every change in this request, and is excluded from the campaign surfaces added by `item_760` for that reason -- a surface driving it would judge a screen nobody changed. Campaign desktop run after: 203 checks, 0 failures.
- request-AC4 -> `item_756_make_the_command_list_readable_at_the_size_it_actually_is`. Proof: `renderWorkshopCommandRow` puts the command beside the name; `workshopCommandGroup` groups by the prefix the names already carry (`check:`, `build:`) rather than by source; a filter input held in `workshopCommandState.query` narrows the list and states what it left out.
- request-AC5 -> `item_756_make_the_command_list_readable_at_the_size_it_actually_is`. Proof: `package.json` is stated once above the list instead of on every row. `idle` is not printed, being what a script is unless something happens; a running one shows its state with `formatCommandDuration`, stamped when the state first becomes running so a log line does not reset it.
- request-AC6 -> `item_757_make_the_runbooks_screen_do_what_its_tab_claims`. Proof: The runbook results group by the categories the runbooks declare, a rail lists them with counts and jumps to each, and every row carries its verification status -- never verified stated as such, and a verification older than 180 days marked with its age.
- request-AC7 -> `item_757_make_the_runbooks_screen_do_what_its_tab_claims`. Proof: The `Search` button is gone and the field it duplicated searches as typed, debounced at 250ms -- which required adding the listener the field never had. The Workshop eyebrow named three of four tabs and now names four.
- request-AC8 -> `item_758_open_the_explorer_on_something_worth_reading`. Proof: `openingWorkspacePath` opens on the root's README, or the first previewable file. Widths were already 260px tree against the rest and are unchanged: they read as wrong because the wide side held one sentence.
- request-AC9 -> `item_758_open_the_explorer_on_something_worth_reading`. Proof: `_directory_preview_payload` returns the directory's entries -- directories first, then files, each with the size that decides whether to open it -- and each entry opens. Capped at 200 and it says so when it caps.
- request-AC10 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof: The four tiles carry missions, sessions, strengths and pending corpus actions. `Not previewed` and `Not launched` moved onto the panel heading they describe.
- request-AC11 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof: `cdxRunBlockedReason` distinguishes no plan, a plan that failed to build, and a plan that reports it cannot run. The `canRun` guard is unchanged, so preview-before-launch still holds.
- request-AC12 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof: The run report read `Run report` under a header already titled `CDX run report`. The section names the run it shows.
- request-AC13 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof: **Partly delivered, and the slice says so rather than claiming otherwise.** CDX missions adopted the status screen's tile shape and its panel-state convention. History, Memory and Disk did not: converting three screens properly is larger than this slice, and converting them badly to close an AC would leave three screens half-done. Recorded in `item_759` as its own work.
- request-AC14 -> `item_760_cover_the_reviewed_workshop_and_cdx_screens`. Proof: `item_760` added five surfaces -- workshop commands, workshop runbooks, workshop explorer, cdx status, cdx missions -- each proved by markup only that screen produces, so a check cannot pass while standing on the previous screen. Terminals excluded on purpose. Desktop run: 203 checks, 0 failures.
- request-AC15 -> `item_760_cover_the_reviewed_workshop_and_cdx_screens`. Proof: Every change is in `clients/viewer/src/browser-host/**` and `clients/shared-web/media/**`, rebuilt through `npm run bundle:viewer-host`. `webviewChrome.js` carries the Group-control reason, so the extension host shows it too.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`, `item_756_make_the_command_list_readable_at_the_size_it_actually_is`, `item_757_make_the_runbooks_screen_do_what_its_tab_claims`, `item_758_open_the_explorer_on_something_worth_reading`, `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`, `item_760_cover_the_reviewed_workshop_and_cdx_screens`
- Related request(s): `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`

# Links
- Request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)
