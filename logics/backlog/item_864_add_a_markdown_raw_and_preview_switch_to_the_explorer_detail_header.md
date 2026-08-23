## item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header - Add a markdown raw and preview switch to the Explorer detail header
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 88%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer explorer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Adds a Raw/Preview control to the Explorer detail header for markdown, reusing the renderer the CDX memory pane already uses.
- Keywords: add, markdown, raw, preview, switch, explorer, detail, header
- Use when: rendering markdown inside the Explorer or choosing its default mode by file size.
- Skip when: working on the Explorer's scroll and selection behavior, which is the sibling slice.

# Problem
- This repository is mostly markdown, but the Explorer only ever shows source, so reading a document means mentally rendering it or leaving the screen.
- The viewer already renders markdown for CDX memory and Logics docs, so the missing piece is a control in the Explorer detail header, not a renderer.

# Scope
- In:
  - Add a two-choice Raw/Preview control to the Explorer detail header for `.md` and `.markdown` files, anchored at its top right.
  - Keep the header sticky at the top of the detail pane so the control stays reachable while the body scrolls.
  - Render Preview through the existing `markdownApi().renderMarkdownToHtml`, reusing the `markdown-preview` body styling, and fall back to the current code viewer when the markdown API is absent.
  - Default to Preview below 100 KB and Raw at or above it, using the size already present on the preview payload.
  - Persist an explicit operator choice through `updateViewerPreferences` and apply it to later markdown files in the session and after reload.
  - Keep the control absent for non-markdown files and for directory, image, oversized, unavailable, and error states.
  - Cover both modes, the size-based default, the remembered preference, the missing-renderer fallback, and truncated markdown in browser-host tests.
- Out:
  - A markdown editor or any write path.
  - Rendering markdown for any surface other than the Explorer detail pane.
  - Replacing the shared markdown renderer or adding a new dependency.
  - Rendering markdown for a file the backend returned truncated as if it were complete: the truncation notice stays visible in both modes.

# Acceptance criteria
- AC1: A markdown file shows a Raw/Preview control at the top right of the detail header, and the header stays visible while the body scrolls.
- AC2: Preview renders through the existing markdown API; Raw renders the current code viewer unchanged.
- AC3: The default mode is Preview below 100 KB and Raw at or above it.
- AC4: An explicit choice overrides the default, survives switching files, and survives a reload.
- AC5: Non-markdown files, directories, images, oversized files, and unavailable states show no control and keep their current rendering.
- AC6: A truncated markdown file keeps its truncation notice and its load-anyway control in both modes.
- AC7: With no markdown API present, the pane falls back to the code viewer instead of rendering an empty body.
- AC8: Browser-host tests cover both modes, the size-based default, the remembered choice, the truncation notice, the absent control, and the missing-renderer fallback.
- AC9: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run test:viewer-smoke` pass for this slice.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: A markdown file shows a Raw/Preview control at the top right of the detail header, and the header stays visible while the body scrolls.
- request-AC8 -> This backlog slice. Proof: AC3: The default mode is Preview below 100 KB and Raw at or above it, and AC4: an explicit choice overrides it and survives a reload.
- request-AC9 -> This backlog slice. Proof: AC5: Non-markdown files, directories, images, oversized files, and unavailable states show no control and keep their current rendering.
- request-AC11 -> This backlog slice. Proof: AC8: Browser-host tests cover both modes, the size-based default, the remembered choice, the truncation notice, the absent control, and the missing-renderer fallback.
- request-AC12 -> This backlog slice. Proof: AC9: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run test:viewer-smoke` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_112_an_anchored_explorer_with_a_readable_detail_pane`
- Architecture decision(s): (none yet)
- Request: `req_383_rework_the_explorer_screen_into_an_anchored_file_list_with_an_independent_detail_pane`
- Primary task(s): `task_395_orchestrate_the_explorer_layout_and_markdown_preview_rework`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
