## req_383_rework_the_explorer_screen_into_an_anchored_file_list_with_an_independent_detail_pane - Rework the Explorer screen into an anchored file list with an independent detail pane
> From version: 2.22.4
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer explorer
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Stops the Explorer rebuilding both panes on every file click, gives the list and the detail their own scroll, and adds a Raw/Preview switch for markdown.
- Keywords: rework, explorer, screen, anchored, file, list, independent, detail, pane
- Use when: changing the Explorer sub-tab's layout, its selection and scroll behavior, or how it renders a markdown file.
- Skip when: changing the workspace tree or preview payloads on the Python side, or any other Workshop sub-tab.

# Needs
- The Explorer's left file list should read as one list anchored to the left edge of the screen, not as a card nested inside other cards.
- The left list and the right detail should scroll independently, so reading a long file never scrolls the list out of view.
- Changing file should leave the list exactly where it is: same scroll offset, same focus, no reload, no flicker, so the operator can keep moving through files.
- Changing file should reset the detail pane to the top, so each file starts at its beginning instead of inheriting the previous file's scroll position.
- Markdown files should be readable as rendered output, not only as source, through a switch anchored at the top right of the detail view.

# Context
- The Explorer is no longer a top-level screen: it is the `explorer` sub-tab of Workshop, so its usable height comes from the Workshop panel below the sub-tab strip, not from the viewport.
- `openWorkspacePreview()` refetches the directory tree and reassigns `container.innerHTML = renderWorkspace(tree, preview)` on every file click. Both panes are destroyed and rebuilt, which is the direct cause of the list jumping to the top, losing focus, and flickering, plus one wasted round trip when the directory has not changed.
- The left pane is not a nested tree today: it is a breadcrumb plus a flat one-level listing of the current directory, with a `..` parent row. That model is kept; only its chrome, scrolling, and re-render behavior change.
- The scroll decision: the `overflow-y: auto` currently on the Explorer panel moves onto each pane, with `overscroll-behavior: contain` so a pane that reaches its end does not start scrolling the page behind it.
- The selection decision: selecting a file must be a class and `aria-current` change on the existing list rows, never a re-render of the list. Selecting a directory is a genuine navigation and may still re-render the list, and then the list scroll starts at the top.
- The focus decision: on file change the detail pane resets its scroll but must not take focus. Focus stays where the operator put it — typically the list row — and the change is announced through an existing `aria-live` region.
- The markdown decision: the switch is gated by file extension, not by size, so a control does not blink in and out between neighbouring files. Size governs the default mode instead: rendered preview by default, raw source by default at or above 100 KB, where rendering and highlighting a large document is what makes the pane stall. The operator's explicit choice is remembered through the existing viewer preferences.
- The responsive decision: two independent scrollers do not fit a phone. At the phone breakpoint the Explorer keeps one scroll axis, with the file list collapsed into an expandable header above the detail — the same call already made for the Review slot.
- Out of scope on purpose: an expandable nested tree, keyboard traversal of the list, a draggable splitter, list virtualisation, and in-place editing. They are worth doing only once this layout is in place.

# Acceptance criteria
- AC1: The Explorer file list and detail pane are separate scroll containers: the panel itself no longer scrolls as one region, and scrolling a long file leaves the list fully visible and unmoved.
- AC2: The file list reads as one anchored list against the left edge — breadcrumb and parent row as its sticky header, rows flush below — without a card nested inside the Workshop panel card.
- AC3: Selecting a file updates only the detail pane. The list's DOM nodes, scroll offset, and focused element are untouched, and no directory listing is refetched when the file's directory has not changed.
- AC4: The selected row carries a visible non-colour cue and `aria-current`, and selection moves between rows without re-rendering the list.
- AC5: On file change the detail pane's scroll position resets to the top, focus is not moved, and the change is announced through the existing live region.
- AC6: Navigating to another directory still replaces the list, resets the list scroll to the top, and keeps the breadcrumb and parent-row behavior that exists today.
- AC7: For `.md` and `.markdown` files, the detail header shows a two-choice Raw/Preview control anchored at its top right and staying reachable while the file body is scrolled; Preview renders through the existing markdown API and Raw keeps the current code viewer.
- AC8: The default mode is Preview below 100 KB and Raw at or above it; an explicit operator choice overrides the default and is remembered across files and sessions through the existing viewer preferences.
- AC9: The control is absent for non-markdown files, and the existing directory, image, oversized, truncated, unavailable, and error states keep rendering as they do today.
- AC10: The Explorer layout holds at 1440x900, 820x1180, and 390x844 without overlap, clipped labels, or horizontal page scroll, and the phone width keeps a single scroll axis with the list collapsed above the detail.
- AC11: Browser-host tests cover independent scrolling, non-destructive file selection, detail scroll reset without focus theft, directory navigation, the markdown switch in both modes, the size-based default, and the remembered preference.
- AC12: The generated browser host bundle is updated and `npm run bundle:viewer-host`, `npm run check:viewer-host`, the targeted vitest checks, `npm run test:viewer-smoke`, and `logics-manager lint --require-status` pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_112_an_anchored_explorer_with_a_readable_detail_pane`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/src/browser-host/workshop.js` mounts the Explorer as a Workshop sub-tab (`renderWorkshopPanel("explorer")`) and loads it through `loadWorkshopExplorer()`.
- `clients/viewer/src/browser-host/index.js` owns `openWorkspaceTree()` and `openWorkspacePreview()`, which both refetch the tree and replace the whole Explorer container with `renderWorkspace(tree, preview)`.
- `clients/viewer/src/browser-host/render.js` renders `renderWorkspace()`, `renderWorkspaceTree()`, and `renderWorkspacePreview()`, including the preview header that currently ends in a plain size `<em>`.
- `clients/viewer/viewer.css` puts the only scroll container on `.viewer-workshop__panel[data-viewer-workshop-panel="explorer"]`, so the list and the detail scroll as one region.
- `clients/viewer/src/browser-host/util.js` exposes `markdownApi()`, which returns `window.createCdxLogicsMarkdownApi()` with `renderMarkdownToHtml`, served from `clients/shared-web/media/renderMarkdown.js` under the viewer's media route.
- `clients/viewer/src/browser-host/cdx.js` already ships the raw/preview two-mode pattern for the CDX memory pane, including the `markdown-preview` body class.
- `host.updateViewerPreferences()` already persists per-viewer choices such as `workshopActiveTab`, so a remembered Explorer view mode needs no new storage.
- `tests/run_local_viewer_visual_smoke.mjs` (npm run test:viewer-smoke) is the local viewer visual campaign that judges layouts at desktop, tablet, and phone widths.

# Backlog
- `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`
- `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`
