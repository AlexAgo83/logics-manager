## item_464_readable_recent_activity_cells_and_document_classification_badges - Readable Recent Activity cells and document classification badges
> From version: 2.12.0
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The Recent Activity screen and the board cards show opaque single-letter classification pills (P, A, ...). They come from `getDocumentPrefix()` (`clients/shared-web/media/renderBoardApp.js:826`), which maps stage to a letter (R=request, I=backlog, T=task, P=product, A=architecture, S=spec) plus a zero-padded number. An operator who doesn't know the internal stage codes cannot decode them, and the activity cell as a whole (what changed, from which status to which, when) is hard to scan.

# Scope
- In:
  - Make the classification badge self-explanatory: keep it compact but add a clear label (full stage name and/or an icon) and an accessible tooltip/`aria-label` (e.g. "Architecture · A003"), so the meaning is reachable without prior knowledge. Applied in the shared renderer so both the VS Code webview and the browser viewer benefit.
  - Redesign the Recent Activity cell to be scannable: clearly show the document, what changed (created/updated/status-change), the status transition (from -> to) when applicable, and a human-friendly time.
- Out:
  - Changing the underlying stage model or ID scheme.
  - A full board card redesign beyond the classification badge readability.

# Acceptance criteria
- AC1: The classification badge conveys its meaning without prior knowledge of the letter codes (visible label and/or icon plus an accessible tooltip/`aria-label`), while staying compact.
- AC2: The Recent Activity cell clearly communicates the document, the kind of change, the status transition when applicable, and a readable timestamp.
- AC3: The readability change is made in the shared renderer so the VS Code webview and the browser viewer stay consistent.
- AC4: No regression in existing board/activity behavior; tests cover the badge labelling and the activity cell rendering, and the dual-copy `viewer_assets/` stays in sync.

# AC Traceability
- request-AC3 -> This backlog slice delivers readable activity cells and classification badges. Proof: AC1, AC2, AC3.
- request-AC7 -> No regression. Proof: AC4 (tests pass; dual-copy synced).
- request-AC5 -> This backlog slice. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC6 -> This backlog slice. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`
- Primary task(s): `task_257_readable_recent_activity_cells_and_document_classification_badges`

# AI Context
- Summary: Make the P/A/... classification pills and the Recent Activity cell self-explanatory in the shared renderer.
- Keywords: recent activity, classification badge, stage prefix, getDocumentPrefix, readability, tooltip, aria-label, shared renderer
- Use when: Implementing or reviewing activity/board readability.
- Skip when: The change is unrelated to activity/board presentation.

# Priority
- Impact: Medium — improves comprehension for every operator.
- Urgency: Medium.

# Notes
- Hybrid rationale: Derived from request `req_263_...` and kept bounded to the activity/badge readability slice.
- Source file: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`.
- Task `task_257_readable_recent_activity_cells_and_document_classification_badges` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_257_readable_recent_activity_cells_and_document_classification_badges`
