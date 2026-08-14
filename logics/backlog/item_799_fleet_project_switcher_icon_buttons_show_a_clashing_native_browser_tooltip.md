## item_799_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip - Fleet project switcher: icon buttons show a clashing native browser tooltip
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:45:53

# AI Context
- Summary: The fleet project switcher's icon-only buttons (favorite star, remove fleet root) rely on the native `title` attribute for their hint, producing the browser's own plain tooltip that overlaps adjacent row text and clashes with the app's dark theme.
- Keywords: native title tooltip, viewer-project-switcher__favorite, fleet root remove, icon button hint
- Use when: Implementing this backlog item.
- Skip when: Anything about Fleet home's layout/content itself — that's req_359/item_791, unrelated.

# Problem
Reported directly by the operator with a screenshot: hovering the "×" remove-fleet-root button in the fleet project switcher shows a plain dark rectangle reading "Remove fleet root", positioned by the browser itself, overlapping the row's own project-path text. Root cause: `clients/viewer/src/browser-host/index.js` sets a bare `title="..."` on both the remove-fleet-root button and the favorite-star button — the native browser tooltip, with no awareness of the dropdown's own compact layout or dark theme. No custom tooltip system exists anywhere in this dropdown to reuse.

# Scope
- In:
  - Replace the native `title`-attribute hint on the remove-fleet-root button and the favorite-star button with a small, reusable, styled hint consistent with the dropdown's dark theme, sized to fit its ~250-300px width.
  - Preserve the existing `aria-label` (or an equally accessible replacement) so assistive tech is unaffected.
- Out:
  - Any other icon-only button elsewhere in the viewer — scope this to the fleet project switcher only unless the same pattern is trivially reusable, in which case note it but don't chase it here.
  - Fleet home's layout/content redesign — separate request (req_359/item_791).

# Acceptance criteria
- AC1: Hovering (or focusing) the "remove fleet root" button shows a hint that is styled consistently with the viewer's own dark theme, not the browser's native tooltip, and does not overlap the row's own text.
- AC2: The favorite-star button's hint (Add/Remove favorite) gets the same treatment, since it has the identical root cause.
- AC3: The hint remains available to assistive tech (the existing `aria-label` is preserved or the replacement mechanism is equally accessible).

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Hovering (or focusing) the "remove fleet root" button shows a hint that is styled consistently with the viewer's own dark theme, not the browser's native tooltip, and does not overlap the row's own text.
- request-AC2 -> This backlog slice. Proof: AC2: The favorite-star button's hint (Add/Remove favorite) gets the same treatment, since it has the identical root cause.
- request-AC3 -> This backlog slice. Proof: AC3: The hint remains available to assistive tech (the existing `aria-label` is preserved or the replacement mechanism is equally accessible).

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
- Request: `logics/request/req_361_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip.md`
- Primary task(s): (none yet)

# Priority
- Priority: Low
- Rationale: Visual/cosmetic clash with no functional impact (both buttons still work) and a narrow, well-understood fix.

# Notes
- Hybrid rationale: Derived from request `req_361_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_361_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip.md`.
- Generated locally by logics-manager.

# Tasks
- `task_370_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`
