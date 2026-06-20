## task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers - Unified file preview with force-load, line count, syntax highlighting and line numbers
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 80%
> Progress: 0%
> Complexity: High
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] Extract a shared preview renderer (chrome: line count, truncation banner, highlight, line numbers) and use it from Explorer preview, git file preview, and CDX log/artifact preview (`clients/viewer/browser-host.js:3445,3462,6268`).
- [ ] Server: accept a "full"/force flag on the preview endpoints to bypass the default cap (`logics_manager/viewer.py:793,841`), enforced by a hard safety ceiling; return whether the hard cap was hit.
- [ ] Client: render a "load anyway" control whenever `truncated` is true; on activate, refetch full and show a clear notice if the hard cap is reached.
- [ ] Add a discreet, accurate line count to every file-viewer surface.
- [ ] Vendor highlight.js locally (no CDN) with a main-language subset; apply highlighting by extension with plain-text fallback for unknown/oversized content.
- [ ] Render per-line numbers, excluded from selection/copy (CSS `user-select: none` on the gutter).
- [ ] Tests cover truncation + force-load + hard-cap notice, line count, highlight application, and line-number gutter; `viewer_assets/` synced.

# Backlog
- `item_463_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers`

# Acceptance criteria
- AC1: Explorer, git, and CDX previews share one component with consistent chrome.
- AC2: A "load anyway" control appears on truncated content and loads full up to a documented hard cap, communicating the cap when reached.
- AC3: Every file viewer shows a discreet, accurate line count.
- AC4: Main-language code is highlighted; unknown/oversized content falls back to plain text without errors.
- AC5: Per-line numbers render and are excluded from selection/copy.
- AC6: highlight.js is bundled locally with no external dependency; tests + `viewer_assets/` sync pass.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run` and the python viewer tests; verify offline (no network) highlight.
- Run `python3 -m logics_manager flow finish task task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers.md` after implementation.

# Report
- Pending implementation.

# AI Context
- Summary: One shared preview component with hard-capped force-load, line count, local highlight.js, and per-line numbers.
- Keywords: file preview, force load, hard cap, line count, highlight.js, line numbers, shared component
- Use when: You need the bounded implementation task for unified file preview.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
