## req_385_render_review_in_the_main_pane_and_repair_the_explorer_detail_pane_and_surface_control - Render Review in the main pane and repair the Explorer detail pane and surface control
> From version: 2.22.4
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Moves Review out of the floating screen overlay into the main pane, and repairs the Explorer selected row, the detail pane scrolling and the surface control.
- Keywords: render, review, main, pane, repair, explorer, detail, surface, control
- Use when: changing where a viewer surface renders, or the Explorer detail pane and surface control styling.
- Skip when: changing the Review timeline's data or keyboard behavior, or the Explorer's selection logic.

# Needs
- Review must open in the main pane the way Activity and Project do, not in the floating screen window that Workshop and the Git cockpit use.
- The selected file row in the Explorer must stay readable: one line, its icon and its name where every other row puts them.
- The Explorer detail pane must not drift sideways, and its header must stay put while the file scrolls.
- The three surface choices must read as one control with one option selected, not as three separate action buttons.

# Context
- Operator testing after the previous repair found three defects that no acceptance criterion covered, because every criterion so far specified behavior and none specified where the surface renders or how it looks.
- Review renders through `host.setDocument("Review", ...)`. `setDocument` is the screen pattern: it fills `.viewer-document`, a fixed overlay inset 64px from the top with its own Refresh, Minimize and Close chrome. Activity and Project are not screens; they are regions inside `<main class="layout__main">`, switched by a body class. Review is a surface and was wired as a screen.
- Main-pane visibility decision: `mainCore.js` re-asserts `board.hidden` from the shared-web state on every render, so a JavaScript assignment from the browser host would be overwritten. Region visibility is therefore driven from the `viewer-screen-*` body classes in CSS, which survive any render, rather than from a `hidden` property the other layer owns.
- Explorer selected row: the selection cue was added as `.viewer-workspace__item.is-selected::before` with `grid-row: 1; grid-column: 1`. The row is a two-column grid, so the pseudo-element takes the icon's cell, the icon is pushed to column two and the name wraps to a second row where it is clipped. A selection cue must not occupy a grid cell.
- Explorer detail pane: `.viewer-workspace__preview` uses `overflow: auto`, which scrolls both axes, while `position: sticky; top: 0` only pins the vertical one. A wide line scrolls the pane sideways and the header slides out from under the content, leaving the code visible beside its own background. The pane owns the vertical scroll; the code and markdown blocks own the horizontal one.
- Surface control: the three buttons each carry their own border and radius with a 6px gap, and the selected one uses the primary button background, the same fill as Workshop, Remote, CDX and Settings in the same toolbar, so the selected surface reads as a call to action. A segmented control is one bordered container with flush options and a selected surface that is quieter than a primary button.
- Accessibility decision: three mutually exclusive options are a tab list, not three independent toggles. `aria-pressed` on each is replaced by `role="tablist"` with `aria-selected`, so a screen reader announces one of three.
- Out of scope: the Review timeline's own rendering, data and keyboard behavior, the Explorer's selection and scroll behavior, and the seven visual campaign failures that predate this work.

# Acceptance criteria
- AC1: Selecting Review renders the timeline inside `<main class="layout__main">`; `.viewer-document` is not displayed at any point of that path, and no Refresh, Minimize or Close chrome appears around Review.
- AC2: Switching between Activity, Project and Review shows exactly one main-pane region at a time, and the visibility survives a shared-web render that re-asserts `board.hidden` or `activityPanel.hidden`.
- AC3: Opening a screen such as Workshop or Git from the Review surface still works, and closing it returns to Review rather than to a blank pane.
- AC4: The selected Explorer row keeps the single-line layout of every other row: its icon in the icon column, its full name on the same line, truncated with an ellipsis rather than wrapped, and its selection cue visible without occupying a grid cell.
- AC5: The Explorer detail pane does not scroll horizontally; a long code line or wide table scrolls inside its own block, and the pane header stays fixed at the top of the pane while the body scrolls.
- AC6: The three surface choices render as one segmented control: a single bordered container, flush options, rounding on the outer edges only, and a selected option that is visibly distinct from the toolbar's primary action buttons.
- AC7: The surface control exposes `role="tablist"` with `aria-selected` on the options, and the selected option carries a non-colour cue.
- AC8: The layout holds at 1440x900, 820x1180 and 390x844 with no overlap, clipped labels or horizontal page scroll, and the phone breakpoint keeps the control reachable.
- AC9: Browser-host tests cover the Review container, the region switching including a re-render, the selected-row markup and the surface control's roles and state.
- AC10: The visual campaign asserts that Review renders in the main pane with no visible `.viewer-document`, and its run reports only the seven failures that predate this work.
- AC11: The bundle is regenerated and `npm run bundle:viewer-host`, `npm run check:viewer-host`, the targeted vitest checks, `npm run test:viewer-smoke`, `npm run lint` and `logics-manager lint --require-status` pass, each criterion closed with a proof naming what exercised it.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_114_review_as_a_real_viewer_surface`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/index.html` holds `<main class="layout__main">` with `#board` and `#activity-panel`, the two regions Activity and Project actually render into, and the `.toolbar__view` group with the three surface buttons.
- `clients/shared-web/media/css/layout.css` styles `.layout__main` as a flex row whose children are the main-pane regions.
- `clients/viewer/viewer.css` styles `.viewer-document` as `position: fixed; inset: 64px 20px 20px; z-index: 40`, the floating screen container, and holds `.toolbar__view-option`, `.viewer-workspace__item.is-selected::before`, and `.viewer-workspace__preview`.
- `clients/viewer/src/browser-host/git.js` renders the Review timeline through `host.setDocument("Review", ...)`, the same call Workshop, Git, CDX and Insights use for their screens.
- `clients/viewer/src/browser-host/index.js` holds `setViewerSurface()`, which already toggles the `viewer-screen-activity`, `viewer-screen-project` and `viewer-screen-review` body classes.
- `clients/shared-web/media/mainCore.js` re-asserts `board.hidden = state.activityPanelOpen` on every render, and `clients/shared-web/media/webviewChrome.js` re-asserts `activityPanel.hidden`, so main-pane visibility has to survive renders it does not control.
- `tests/run_local_viewer_visual_smoke.mjs` has the `review timeline` and `workshop explorer markdown preview` cases added by the previous repair.

# Backlog
- `item_871_move_review_from_the_screen_overlay_into_the_main_pane`
- `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`
- `item_873_turn_the_surface_buttons_into_one_segmented_control`
