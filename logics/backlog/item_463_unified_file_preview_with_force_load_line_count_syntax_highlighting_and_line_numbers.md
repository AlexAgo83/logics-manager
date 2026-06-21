## item_463_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers - Unified file preview with force-load, line count, syntax highlighting and line numbers
> From version: 2.12.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Maintenance edit: Normalize stale workflow reference paths.

# Problem
File preview surfaces truncate silently at hard-coded byte limits (`logics_manager/viewer.py:191-197`: `FILE_PREVIEW_MAX_BYTES=300000`, `WORKSPACE_PREVIEW_MAX_BYTES=30000`, `GIT_FILE_PREVIEW_MAX_BYTES=30000`). The payload already flags `truncated: true` and the client shows a static "truncated" placeholder (`clients/viewer/browser-host.js:3445,3462,6268`), but there is no way to load the rest, no line count, and the content renders as flat text — no syntax highlighting and no line numbers. Operators hit the limit often and lose context, and reading code in the Explorer is uncomfortable.

# Scope
- In:
  - A shared preview component reused by Explorer preview, git file preview, and CDX log/artifact preview.
  - A "load anyway" / "load full file" control wherever `truncated` is true, which refetches without the default cap, bounded by a hard safety ceiling (server-enforced) to avoid OOM on pathological files.
  - A discreet line count shown on every file-viewer surface.
  - Syntax highlighting for the main code languages via a locally bundled highlight.js (no CDN; works on LAN/offline), with a sensible language subset and graceful fallback to plain text for unknown/oversized content.
  - Per-line numbers (online-editor feel), aligned and non-selectable so copy/paste stays clean.
- Out:
  - A full in-browser editor (editing/saving files).
  - Rich rendering of binary/non-text formats beyond a clear "binary, not previewable" state.
  - Markdown WYSIWYG (separate concern).

# Acceptance criteria
- AC1: Explorer preview, git file preview, and CDX log/artifact preview all render through one shared component with consistent chrome (line count, truncation handling, highlighting, line numbers).
- AC2: Wherever content is truncated, a visible "load anyway" control appears; activating it loads the full content up to a documented hard cap, and the cap (when reached) is communicated rather than failing silently.
- AC3: Every file viewer shows a discreet, accurate line count.
- AC4: Known code extensions (a defined main-language set) are syntax-highlighted; unknown or oversized content falls back to readable plain text without errors.
- AC5: Each rendered line shows its line number; line numbers are excluded from text selection/copy.
- AC6: highlight.js is bundled locally and loads with no external network dependency; tests cover truncation + force-load, line count, highlight application, and the dual-copy `viewer_assets/` sync.

# AC Traceability
- request-AC2 -> This backlog slice delivers the unified preview with force-load, line count, highlighting, and line numbers. Proof: AC1, AC2, AC3, AC4, AC5.
- request-AC7 -> No regression / bundled offline. Proof: AC6 (tests pass; local bundle; dual-copy synced).

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Recommended (vendored dependency + shared component boundary)
- Architecture signals: bundling highlight.js into the viewer assets, hard-cap policy for force-load
- Architecture follow-up: Note the vendoring approach and the force-load hard cap in an ADR if the bundling/policy is non-obvious during implementation.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`
- Primary task(s): `task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers`

# AI Context
- Summary: One shared file-preview component with force-load (hard-capped), line count, local highlight.js highlighting, and per-line numbers.
- Keywords: file preview, truncated, force load, hard cap, line count, syntax highlighting, highlight.js, line numbers, explorer, git preview, cdx logs
- Use when: Implementing or reviewing the viewer's file/preview rendering.
- Skip when: The change is unrelated to file preview surfaces.

# Priority
- Impact: High — most visible day-to-day reading improvement.
- Urgency: Medium.

# Notes
- Hybrid rationale: Derived from request `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md` and kept bounded to the file-preview slice.
- Source file: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`.
- Task `task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers`
