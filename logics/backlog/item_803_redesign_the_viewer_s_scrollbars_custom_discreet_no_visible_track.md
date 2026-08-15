## item_803_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track - Redesign the viewer's scrollbars: custom, discreet, no visible track
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 02:18:02

# AI Context
- Summary: No custom scrollbar styling exists anywhere in the viewer's CSS -- every scrollable region renders the browser/OS default. Add one shared, discreet custom scrollbar (thin thumb, invisible track) applied broadly so it covers every scrollable region without hunting down each container individually.
- Keywords: scrollbar, ::-webkit-scrollbar, scrollbar-width, scrollbar-color
- Use when: Implementing this backlog item.
- Skip when: Any change to scroll behaviour/content itself -- this is the scrollbar's paint only.

# Problem
As an operator, I need every scrollbar in the viewer to look the same regardless of platform/browser, so scrolling doesn't visually clash with the rest of the app's own dark theme.
As an operator, I need the scrollbar's track to never show its own background -- only the thumb (the draggable part) should be visible, and discreetly so.

# Scope
- In:
  - A shared rule block (e.g. `::-webkit-scrollbar`/`-thumb`/`-track` plus `scrollbar-width`/`scrollbar-color` fallback) covering every scrollable region in the viewer at once.
  - Verify it renders correctly in the standalone viewer's Chromium-based browser and in the VS Code webview.
- Out:
  - Any change to what scrolls, how much, or when -- scroll behaviour itself is untouched.
  - Any content/layout change on the screens the scrollbars appear in.

# Acceptance criteria
- AC1: Every scrollable region in the viewer (document panel, board columns, workshop panels, modals, reader contents nav, and any other scrollable container) renders the same custom scrollbar style, not the browser/OS default.
- AC2: The scrollbar's track never shows a visible background -- only the thumb is visible, and only a thin, discreet one.
- AC3: The custom scrollbar renders consistently across the browsers/hosts the viewer targets (standalone Chromium-based browser, VS Code webview).

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Every scrollable region in the viewer (document panel, board columns, workshop panels, modals, reader contents nav, and any other scrollable container) renders the same custom scrollbar style, not the browser/OS default.
- request-AC2 -> This backlog slice. Proof: AC2: The scrollbar's track never shows a visible background -- only the thumb is visible, and only a thin, discreet one.
- request-AC3 -> This backlog slice. Proof: AC3: The custom scrollbar renders consistently across the browsers/hosts the viewer targets (standalone Chromium-based browser, VS Code webview).

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
- Request: `logics/request/req_363_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track.md`
- Primary task(s): (none yet)

# Priority
- Priority: Low
- Rationale: Pure visual polish, no functional risk; a shared CSS rule covers every scrollable region at once.

# Notes
- Hybrid rationale: Derived from request `req_363_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_363_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track.md`.
- Generated locally by logics-manager.

# Tasks
- `task_374_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`
