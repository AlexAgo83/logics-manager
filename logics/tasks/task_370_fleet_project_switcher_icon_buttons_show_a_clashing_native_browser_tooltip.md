## task_370_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip - Fleet project switcher: icon buttons show a clashing native browser tooltip
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:31:08

# AI Context
- Summary: The fleet project switcher's icon-only buttons (favorite star, remove fleet root) rely on the native `title` attribute for their hint, producing the browser's own plain tooltip that overlaps adjacent row text and clashes with the app's dark theme.
- Keywords: native title tooltip, viewer-project-switcher__favorite, fleet root remove, icon button hint
- Use when: Implementing this task.
- Skip when: Anything about Fleet home's layout/content itself — that's req_359/item_791, unrelated.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_799_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`

# Acceptance criteria
- AC1: Hovering (or focusing) the "remove fleet root" button shows a hint that is styled consistently with the viewer's own dark theme, not the browser's native tooltip, and does not overlap the row's own text.
- AC2: The favorite-star button's hint (Add/Remove favorite) gets the same treatment, since it has the identical root cause.
- AC3: The hint remains available to assistive tech (the existing `aria-label` is preserved or the replacement mechanism is equally accessible).

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_370_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_370_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/viewer.reader.test.ts tests/webview.selectors.test.ts tests/webview.layout-collapse.test.ts`: 257/257 passed, including two new cases -- the bubble is driven through the real listener, and the four icon buttons are checked to carry `data-viewer-hint` and no `title`.
- Live check against a running viewer via headless Chrome (`--use-mock-keychain`): switcher opened, star hovered. Measured rects -- bubble (49,137,77x25), its own row's text (69,90,222x45), menu (38,38,260x194). Bubble does not intersect its own row's text (AC1/AC2), stays inside the viewport, and no `[data-viewer-project-favorite][title]` or `[data-viewer-fleet-root-remove][title]` remains in the DOM.
- Bubble carries `aria-hidden="true"` while the trigger keeps `aria-label="Add favorite logics-manager"` (AC3).
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Replaced the native `title` on the four icon-only buttons (favourite star and remove-fleet-root, each rendered at two call sites -- the switcher dropdown and Fleet home) with `data-viewer-hint`, and added `installViewerHints` in `clients/viewer/src/browser-host/util.js` plus a `.viewer-hint` rule in `clients/viewer/viewer.css`.
- One bubble, reused, appended to `document.body` and placed with `position: fixed` from the trigger's rect. Fixed rather than absolute for the reason req_361 raised against a styled replacement: the dropdown holding these buttons is `overflow: auto`, and a scroll container clips an absolutely positioned descendant whatever its containing block. Appending to the body removes the constraint instead of working around it.
- Opens below the trigger, flipping above when the window has no room, and clamps horizontally -- so the hint never covers the control being pointed at and never leaves the window. Measured on a live viewer rather than reasoned about.
- `aria-label` is untouched on every trigger and the bubble is `aria-hidden`: this adds a visual hint for sighted operators and changes nothing for assistive tech, which already had the better label.
- The mechanism is attribute-driven, so any icon-only button elsewhere in the viewer gets the same hint by adding `data-viewer-hint` -- which is the reusable pattern req_361 anticipated.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_799_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`
- Related request(s): `req_361_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`

# AC Traceability
- request-AC1 -> This task. Proof: the remove-fleet-root buttons carry `data-viewer-hint` and no `title`, so the browser draws nothing; the bubble is `.viewer-hint`, styled from the same `--vscode-editorHoverWidget-*` tokens as the rest of the viewer. Measured live: bubble (49,137,77x25) does not intersect its own row's text (69,90,222x45).
- request-AC2 -> This task. Proof: identical treatment on both favourite-star call sites (switcher dropdown and Fleet home). A test asserts all four icon-button lines carry `data-viewer-hint` and none carries `title`, so a half-migration fails.
- request-AC3 -> This task. Proof: `aria-label` is preserved on every trigger and the bubble is `aria-hidden="true"`; asserted in the browser-host test and confirmed live (`aria-label="Add favorite logics-manager"` still on the trigger while the bubble is shown).

# Links
- Request: `req_361_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
