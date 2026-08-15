## task_374_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track - Redesign the viewer's scrollbars: custom, discreet, no visible track
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 02:18:28

# AI Context
- Summary: Add a shared `::-webkit-scrollbar`/`-thumb`/`-track` (plus `scrollbar-width`/`scrollbar-color` fallback) rule block to the viewer's CSS, covering every scrollable region: thin, discreet thumb, no visible track.
- Keywords: scrollbar, ::-webkit-scrollbar, scrollbar-width, scrollbar-color
- Use when: Implementing this task.
- Skip when: Any change to scroll behaviour/content -- this is the scrollbar's paint only.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_803_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`

# Acceptance criteria
- AC1: Every scrollable region in the viewer (document panel, board columns, workshop panels, modals, reader contents nav, and any other scrollable container) renders the same custom scrollbar style, not the browser/OS default.
- AC2: The scrollbar's track never shows a visible background -- only the thumb is visible, and only a thin, discreet one.
- AC3: The custom scrollbar renders consistently across the browsers/hosts the viewer targets (standalone Chromium-based browser, VS Code webview).

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_374_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_374_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track.md` after implementation.

# Validation
- `npx vitest run tests/webview.layout-collapse.test.ts tests/viewer.reader.test.ts tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts`: 255/255 passed.
- Live sweep against a running viewer via headless Chrome (`--use-mock-keychain`), reading `getComputedStyle` rather than the stylesheet: every element with `overflow-x/y: auto|scroll` was sampled on three screens -- board (9 containers), Workshop (10) and Runbooks (9). All 28 reported one single distinct value, `scrollbar-width: thin` with `scrollbar-color: rgba(128, 128, 128, 0.35) rgba(0, 0, 0, 0)`. The second colour is the track: fully transparent.
- Sampled containers span the surfaces AC1 names: `viewer-document__content`, `activity-panel__list`, `column__body` (board columns), `board`, `viewer-project-switcher__menu`.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Added one `*` rule block to `clients/shared-web/media/main.css`: `scrollbar-width: thin` plus `scrollbar-color: <thumb> transparent`, and the matching `::-webkit-scrollbar`/`-thumb`/`-track`/`-corner`/`-button` rules.
- Placed in `main.css` rather than `clients/viewer/viewer.css` because that is the only stylesheet both hosts load -- the standalone viewer's `index.html` and `clients/vscode/src/logicsWebviewHtml.ts` -- which is what AC3 asks for. `viewer.css` would have left the VS Code webview on the browser default. Declared on `*` so a scrollable container added later is covered without anyone remembering to opt it in.
- Both mechanisms are declared deliberately and do not stack: Chromium 121+ ignores the `::-webkit-scrollbar` pseudo-elements once `scrollbar-width`/`scrollbar-color` are set, so modern Chrome and the VS Code webview take the standard properties while older Chromium and Safari take the `-webkit-` block. Both land on the same result.
- Colours prefer VS Code's own `--vscode-scrollbarSlider-*` tokens, already theme-correct and translucent, falling back to neutral grey at low alpha -- which reads on light and dark alike, since a standalone browser defines no such token.
- `::-webkit-scrollbar-button { display: none }` is not decoration: without it Chromium reserves and paints stepper arrows at each end of the track.
- Caught while adding coverage, unrelated to this task: `tests/webview.layout-collapse.test.ts`'s "keeps board columns and cards from widening" had been failing since item_790 (commit `08ab9680`). Its `.card__title` regex was unanchored, so it matched the tail of the `.card--progress-bar .card__title` rule that item_790 added above the bare one, and read the wrong rule body. The CSS was never wrong. The regexes in that test are anchored to line start now.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_803_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`
- Related request(s): `req_363_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`

# AC Traceability
- request-AC1 -> This task. Proof: One `*` rule in `clients/shared-web/media/main.css`, the stylesheet loaded by both hosts. Confirmed by computed-style sweep of all 28 `overflow: auto|scroll` containers across board, Workshop and Runbooks: one single distinct value, no container on a browser default.
- request-AC2 -> This task. Proof: `scrollbar-color`'s second value (the track) is `transparent`, and `::-webkit-scrollbar-track`/`-corner` set `background: transparent` with `-button` set to `display: none`. Confirmed computed as `rgba(0, 0, 0, 0)` on every sampled container; thumb is `thin`.
- request-AC3 -> This task. Proof: the rule lives in `clients/shared-web/media/main.css`, which `clients/viewer/index.html` and `clients/vscode/src/logicsWebviewHtml.ts` both load -- asserted by test rather than by inspection. Standard and `-webkit-` mechanisms are both declared so Chromium 121+, older Chromium and Safari converge on the same paint.

# Links
- Request: `req_363_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
