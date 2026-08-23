## task_395_orchestrate_the_explorer_layout_and_markdown_preview_rework - Orchestrate the Explorer layout and markdown preview rework
> From version: 2.22.4
> Schema version: 1.0
> Status: In progress
> Understanding: 92%
> Confidence: 88%
> Progress: 95%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-23 13:57:23
> Owner: codex

# AI Context
- Summary: Sequences the Explorer layout fix and the markdown switch, then the bundle rebuild and viewer checks.
- Keywords: orchestrate, explorer, layout, markdown, preview, rework
- Use when: starting or sequencing the implementation of req_383.
- Skip when: grooming unrelated Workshop or workspace-payload work.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Slice A: split the Explorer render path so a file selection touches only the detail region, drop the redundant directory refetch, and move selection to a class and `aria-current` change on the existing rows.
- [ ] 2. Slice A: move the scroll containers from the Explorer panel onto the two panes, flatten the list chrome to one anchored list, and derive the pane height from the Workshop panel rather than the viewport.
- [ ] 3. Slice A: reset the detail scroll on file change without moving focus, announce the change through the existing live region, and keep directory navigation re-rendering the list.
- [ ] 4. Slice A: handle the phone breakpoint with one scroll axis and a collapsible list, then cover the behavior in browser-host tests and the local viewer visual smoke run.
- [ ] 5. Slice B: add the Raw/Preview control to the sticky detail header for markdown files, rendering through the existing markdown API with the code viewer as the fallback.
- [ ] 6. Slice B: apply the 100 KB size default, persist an explicit choice through the existing viewer preferences, and keep the control absent for every non-markdown state.
- [ ] 7. Closeout: regenerate the browser host bundle, then run the targeted vitest checks, `npm run test:viewer-smoke`, `npm run check:viewer-host`, and `logics-manager lint --require-status`.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] Sequencing: `task_393` edits the same four files (`browser-host/index.js`, `render.js`, `viewer.css`, and the generated `clients/viewer/browser-host.js`). It runs first, before `task_393` starts. Never run them in parallel; the generated bundle conflicts on every concurrent rebuild.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`
- `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC2 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC3 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC4 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC5 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC6 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC10 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC11 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC12 -> `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`. Proof deferred to slice closeout.
- request-AC7 -> `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`. Proof deferred to slice closeout.
- request-AC8 -> `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`. Proof deferred to slice closeout.
- request-AC9 -> `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`. Proof deferred to slice closeout.
- request-AC11 -> `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`. Proof deferred to slice closeout.
- request-AC12 -> `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_383_rework_the_explorer_screen_into_an_anchored_file_list_with_an_independent_detail_pane`
- Product brief(s): `prod_112_an_anchored_explorer_with_a_readable_detail_pane`
- Architecture decision(s): (none yet)
