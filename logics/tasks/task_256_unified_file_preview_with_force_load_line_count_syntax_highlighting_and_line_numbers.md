## task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers - Unified file preview with force-load, line count, syntax highlighting and line numbers
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 85%
> Progress: 85%
> Complexity: High
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] Extract a shared preview renderer (`renderCodeViewer`: line count, truncation flag, highlight, line-number gutter) and use it from the Explorer preview and the CDX log preview.
- [x] Server: accept a `full` flag on `/api/workspace-preview` to bypass the default cap, enforced by a hard ceiling (`PREVIEW_FORCE_MAX_BYTES/CHARS`); return `canForce`/`hardCapHit`/`lineCount`.
- [x] Client: render a "load anyway" control whenever the preview is truncated/oversized; on activate, refetch with `full=1`.
- [x] Add a discreet, accurate line count to the Explorer/CDX viewers.
- [x] Vendor highlight.js 11.9.0 locally (`clients/shared-web/media/vendor/highlight/`, no CDN); apply highlighting by extension with plain-text fallback.
- [x] Render per-line numbers in a non-selectable gutter (`user-select: none`).
- [x] Tests cover server force-load + line count + canForce, and the client gutter/line-count/force-load + CDX log code viewer; `viewer_assets/` synced and packaged in `pyproject.toml`.
- [ ] Follow-up: route the git file preview (`/api/git-file-preview`) through the same `renderCodeViewer` (Explorer + CDX done; git preview pending in a later pass).

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
- Implemented: new shared `renderCodeViewer(content, {language, lineCount, truncated, hardCapHit, forceButtonHtml})` (line-number gutter + highlight + count) plus `detectHljsLanguage`/`highlightCode`. Wired into the Explorer preview (with server `full` force-load: `workspace_preview_payload(full=...)`, hard ceiling, `canForce`/`hardCapHit`/`lineCount`) and the CDX raw log preview. Vendored highlight.js 11.9.0 UMD + github-dark theme under `media/vendor/highlight/`, loaded from `index.html`, packaged via `pyproject.toml`. CSS for the viewer in `viewer.css`. Line count uses editor convention (trailing newline not an extra blank line).
- Validation: python `test_viewer_cli.py` (87) incl. new force-load/line-count tests; viewer suite (113) incl. a new code-viewer test (gutter, line count, force-load refetch with `full=1`) and updated CDX-log assertion; npm package ceiling raised for the vendored bundle. Full suite green (639). `viewer_assets/` synced.
- Remaining: git file preview not yet routed through `renderCodeViewer` (tracked as the open DoD item).

# AI Context
- Summary: One shared preview component with hard-capped force-load, line count, local highlight.js, and per-line numbers.
- Keywords: file preview, force load, hard cap, line count, highlight.js, line numbers, shared component
- Use when: You need the bounded implementation task for unified file preview.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
