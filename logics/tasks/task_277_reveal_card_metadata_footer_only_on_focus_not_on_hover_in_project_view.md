## task_277_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view - Reveal card metadata footer only on focus not on hover in project view
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 95
> Confidence: 93
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] **Change the trigger (AC1/AC2)** — `clients/shared-web/media/renderBoardApp.js:1150-1151`: remove the `mouseenter`/`mouseleave` listeners; keep `focus`/`blur` (`:1152-1153`). `.card__preview` now reveals on focus only.
- [x] **Verify no force-open path** — confirm nothing else sets `card--preview-open` / `preview.hidden = false` (e.g. selected state); preview must stay hidden on hover.
- [x] **Regressions (AC3/AC5)** — Escape-to-close (`:1143-1145`) and `.card:focus-visible` outline (`css/board.css:514-518`) still work.
- [x] **Scope decision** — apply globally in `createItemCard()` (recommended) vs gate to project view; if gated, add a view-mode check.
- [x] Validation passes: `lint --require-status` green; manual check in the viewer that hover no longer opens the footer and focus does.

# Backlog
- `item_507_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view`

# Acceptance criteria
- AC1: In the project view, a card's bottom metadata block (Theme/Status/Updated) stays hidden while the pointer merely hovers the card.
- AC2: The metadata block appears when the card receives focus (keyboard Tab or click) and hides again on blur.
- AC3: Escape still closes an open metadata block (no regression to `renderBoardApp.js:1143-1145`).
- AC4: No change to which fields are shown, their order, or the rest of the card (title, badges, linkage row).
- AC5: Keyboard navigation and the focus-visible outline still work; the card stays reachable and operable.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_277_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view.md` after implementation.
- Finish workflow executed on 2026-06-26.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-26.
- Linked backlog item(s): `item_507_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view`
- Related request(s): `req_280_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view`

# AI Context
- Summary: Implement reveal card metadata footer only on focus not on hover in project view.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_280_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: task_277 removed mouseenter/mouseleave preview opening, kept focus/blur and Escape behavior, synced shared web media mirrors, and updated webview tests; validations passed: npm test -- --run tests/webview.board-renderer.test.ts tests/webview.harness-state-and-persistence.test.ts tests/webview.harness-core.test.ts; npm run check:webview-media-mirror; npm run check:viewer-assets; python -m logics_manager lint --require-status.
- request-AC2 -> This task. Proof: task_277 removed mouseenter/mouseleave preview opening, kept focus/blur and Escape behavior, synced shared web media mirrors, and updated webview tests; validations passed: npm test -- --run tests/webview.board-renderer.test.ts tests/webview.harness-state-and-persistence.test.ts tests/webview.harness-core.test.ts; npm run check:webview-media-mirror; npm run check:viewer-assets; python -m logics_manager lint --require-status.
- request-AC3 -> This task. Proof: task_277 removed mouseenter/mouseleave preview opening, kept focus/blur and Escape behavior, synced shared web media mirrors, and updated webview tests; validations passed: npm test -- --run tests/webview.board-renderer.test.ts tests/webview.harness-state-and-persistence.test.ts tests/webview.harness-core.test.ts; npm run check:webview-media-mirror; npm run check:viewer-assets; python -m logics_manager lint --require-status.
- request-AC4 -> This task. Proof: task_277 removed mouseenter/mouseleave preview opening, kept focus/blur and Escape behavior, synced shared web media mirrors, and updated webview tests; validations passed: npm test -- --run tests/webview.board-renderer.test.ts tests/webview.harness-state-and-persistence.test.ts tests/webview.harness-core.test.ts; npm run check:webview-media-mirror; npm run check:viewer-assets; python -m logics_manager lint --require-status.
- request-AC5 -> This task. Proof: task_277 removed mouseenter/mouseleave preview opening, kept focus/blur and Escape behavior, synced shared web media mirrors, and updated webview tests; validations passed: npm test -- --run tests/webview.board-renderer.test.ts tests/webview.harness-state-and-persistence.test.ts tests/webview.harness-core.test.ts; npm run check:webview-media-mirror; npm run check:viewer-assets; python -m logics_manager lint --require-status.
