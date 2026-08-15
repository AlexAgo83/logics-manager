## task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings - Stop capping content to a fixed width on task/reader, Getting Started, and Settings
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:40:22
> Owner: assistant

# AI Context
- Summary: Several screens cap content to a fixed width instead of using available space — on a task/reader screen this pushes the side menu to the right instead of the left; on Getting Started it leaves a dead column on the right of every stage card.
- Keywords: fixed width layout, fluid layout, reader side panel, getting started dead column, settings width
- Use when: Implementing this task.
- Skip when: Any content/copy change on these screens — this is layout width only.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_793_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings`

# Acceptance criteria
- AC1: On a task/reader screen, the side menu/TOC renders on the left, and content expands to use the available width to its right, at common desktop viewport widths.
- AC2: Getting Started's stage cards use the full available width with no persistent dead column on the right.
- AC3: Settings' layout uses the available width rather than capping to a fixed value.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts`: 228/228 passed (unaffected: pure CSS layout change).
- Visual confirmation via headless Chrome (`--use-mock-keychain`) at 1440px: Settings and Getting Started both fill the available width (Getting Started's stage card box, not just its prose, now spans the remaining space -- confirmed a second, deeper bug the initial investigation missed: `.viewer-onboarding__layout`'s grid TRACK, not only its paragraphs, was capped to 68ch). Reader: DOM measurement confirms `.markdown-preview__contents` (TOC) sits at `x=43` (left edge) with the prose column starting after it -- reversed from the reported right-side placement.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Reader (`clients/viewer/viewer.css`, `.markdown-preview--reading`/`.markdown-preview__contents`/`.markdown-preview__prose`): swapped the two grid tracks so the TOC nav is track 1 (fixed ~260px, left) and prose is track 2 (flexible `1fr`, right); moved the 72ch reading measure from the grid track onto the prose element itself, so non-prose children (tables/diagrams, already excluded) and the track's own width are unaffected by it. Fixed the `max-width: 1100px` collapse media query to re-target `grid-column: 1` for prose once the contents nav is hidden and only one track remains.
- Getting Started (`.viewer-onboarding`): removed the whole-screen `max-width: 920px` cap. Caught a second bug not in the original investigation: `.viewer-onboarding__layout`'s own second grid track was `minmax(0, 68ch)` -- the *track*, not just the `p` elements inside it, was capped to the prose measure, so the entire stage-card box (border, example-prompt buttons -- none of it prose) was squeezed. Changed to `minmax(0, 1fr)`; the existing `p` selectors keep their own 68ch measure.
- Settings (`.viewer-settings-screen`): removed the whole-screen `max-width: 980px` cap; `__grid`'s existing `auto-fit, minmax(220px, 1fr)` already reflows the cards into the reclaimed width.
- Ran `npm run build:assets` to regenerate `viewer_assets/`.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_793_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC5 -> This task. Proof: See item_793's proof -- same three fixes (reader grid-track swap, Getting Started's outer + inner track caps removed, Settings' outer cap removed), verified by headless-Chrome screenshots and a DOM measurement of the reader's TOC position.
