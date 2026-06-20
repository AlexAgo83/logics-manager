## task_257_readable_recent_activity_cells_and_document_classification_badges - Readable Recent Activity cells and document classification badges
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 100%
> Confidence: 96%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] In the shared renderer (`clients/shared-web/media/renderBoardApp.js`, `createCardTitle`/`getDocumentPrefix`), make the classification prefix self-explanatory: full stage name in `title`/`aria-label` (e.g. "Architecture decision · A003") plus a `data-stage` colour.
- [x] Make the Recent Activity marker (`clients/shared-web/media/webviewChrome.js` `renderActivityPanel`) decodable (stage name in tooltip/aria-label + per-stage colour) and clarify the cell meta line.
- [x] Change applies through the shared renderer so the VS Code webview and the browser viewer stay consistent (mirrored to `viewer_assets/media`).
- [x] Tests cover the prefix labelling/`aria-label`/`data-stage`; full suite green.

# Backlog
- `item_464_readable_recent_activity_cells_and_document_classification_badges`

# Acceptance criteria
- AC1: The classification badge conveys meaning without prior knowledge of the letter codes (label/icon + accessible tooltip), staying compact.
- AC2: The activity cell communicates document, change kind, status transition (when applicable), and a readable timestamp.
- AC3: The change is in the shared renderer; webview and browser viewer stay consistent.
- AC4: No regression; tests cover badge labelling and activity cell; `viewer_assets/` synced.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run` (board/activity + viewer tests).
- Run `python3 -m logics_manager flow finish task task_257_readable_recent_activity_cells_and_document_classification_badges.md` after implementation.

# Report
- Implemented: `createCardTitle` now sets `title`/`aria-label` ("Stage · ID") and `data-stage` on `.card__title-prefix` (new `stageLabelByStage` map); `renderActivityPanel` marker gets a stage tooltip/aria-label, `data-stage`, and the meta line reads "Change · Stage · id". Added per-stage colour CSS for both the activity marker (`toolbar.css`) and the card prefix (`board.css`).
- Validation: extended the board-renderer test to assert the prefix tooltip/aria-label/data-stage; full vitest suite green (638). Mirrored the four edited `shared-web/media` files into `viewer_assets/media`.

# AI Context
- Summary: Make the P/A/... pills and the Recent Activity cell self-explanatory in the shared renderer.
- Keywords: recent activity, classification badge, getDocumentPrefix, readability, aria-label, shared renderer
- Use when: You need the bounded implementation task for activity/badge readability.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC2 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC3 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC4 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC5 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC6 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC7 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
