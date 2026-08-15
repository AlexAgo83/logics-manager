## req_363_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track - Redesign the viewer's scrollbars: custom, discreet, no visible track
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 85%
> Confidence: 80%
> Complexity: Medium
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 02:17:41

# AI Context
- Summary: The viewer has no custom scrollbar styling anywhere -- every scrollable region (document panel, board columns, workshop panels, modals, etc.) renders the browser/OS's own default scrollbar, whose look (and track visibility) varies by platform and browser. The operator wants one consistent, discreet, custom scrollbar used everywhere a scrollbar can appear, with the track background never visible.
- Keywords: scrollbar, ::-webkit-scrollbar, scrollbar-width, scrollbar-color, custom scrollbar, discreet scrollbar
- Use when: Designing or implementing a shared scrollbar treatment for the viewer.
- Skip when: Any specific screen's content/layout — this is purely the scrollbar's own visual treatment, applied broadly.

# Needs
- As an operator, I need every scrollbar in the viewer to look the same regardless of platform/browser, so scrolling doesn't visually clash with the rest of the app's own dark theme.
- As an operator, I need the scrollbar's track to never show its own background -- only the thumb (the draggable part) should be visible, and discreetly so.

# Context
- Reported directly by the operator while reviewing board colour fixes. Confirmed by direct search: no `::-webkit-scrollbar`, `scrollbar-width`, or `scrollbar-color` rule exists anywhere in `clients/viewer/viewer.css` or `clients/shared-web/media/css/*.css` -- every scrollable region in the viewer (the document panel, board columns, workshop terminal/command lists, modals, the reader's contents nav, etc.) is 100% unstyled, rendering whatever the host OS/browser defaults to.
- Chromium-based browsers (which the viewer targets, both standalone and the VS Code webview) support the `::-webkit-scrollbar`/`-thumb`/`-track` pseudo-elements for a fully custom scrollbar, and the standard `scrollbar-width`/`scrollbar-color` properties as a lighter-weight fallback. A shared rule block (thin thumb, transparent track, subtle hover state) applied broadly (e.g. on `*` or a small set of known-scrollable containers) would cover every scrollable region at once without needing to find and tag each one individually.
- Out of scope for this request: any change to what scrolls, how much, or when — this is the scrollbar's own paint only.

# Acceptance criteria
- AC1: Every scrollable region in the viewer (document panel, board columns, workshop panels, modals, reader contents nav, and any other scrollable container) renders the same custom scrollbar style, not the browser/OS default.
- AC2: The scrollbar's track never shows a visible background -- only the thumb is visible, and only a thin, discreet one.
- AC3: The custom scrollbar renders consistently across the browsers/hosts the viewer targets (standalone Chromium-based browser, VS Code webview).

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- clients/viewer/viewer.css
- clients/shared-web/media/css/board.css
- clients/shared-web/media/css/toolbar.css

# Backlog
- `item_803_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`
