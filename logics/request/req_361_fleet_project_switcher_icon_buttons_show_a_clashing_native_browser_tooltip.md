## req_361_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip - Fleet project switcher: icon buttons show a clashing native browser tooltip
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The fleet project switcher's icon-only buttons (favorite star, remove fleet root) render their hint via the native HTML `title` attribute, producing the browser's own plain tooltip instead of a styled one — it overlaps adjacent row text and visually clashes with the app's dark theme.
- Keywords: native title tooltip, viewer-project-switcher__favorite, fleet root remove, icon button hint
- Use when: Fixing the fleet project switcher's icon-button hints, or building a reusable tooltip pattern for icon-only buttons elsewhere in the viewer.
- Skip when: Anything about the Fleet home redesign's layout/content itself — that's req_359/item_791, unrelated to this tooltip mechanism.

# Needs
- As an operator opening the fleet project switcher (top-left), I need the "remove fleet root" and favorite-star button hints to render consistently with the app's own styling, not as a plain, differently-shaded browser tooltip that overlaps the row's path text.

# Context
- Reported directly by the operator with a screenshot: opening the fleet switcher and hovering the "×" remove-fleet-root button shows a plain dark rectangle reading "Remove fleet root" floating over the row, overlapping the project path text shown below it — visually inconsistent with the dropdown's own rounded, padded, dark-themed rows.
- Root cause: `clients/viewer/src/browser-host/index.js` sets `title="Remove fleet root"` (and `title="Remove fleet root ${root}"` at a second call site) on the remove-fleet-root button, and `title="${favorite ? "Remove favorite" : "Add favorite"}"` on the favorite-star button — both rely entirely on the native browser tooltip (`title` attribute), which the OS/browser renders and positions itself, with no awareness of the dropdown's own layout or theme.
- No custom tooltip system exists anywhere in this dropdown or, from what this review found, elsewhere in the viewer's CSS — this is the only hint mechanism in play, so the fix is either building a small reusable styled-tooltip pattern or dropping the visual tooltip in favour of the `aria-label` already present (which already carries the same information for assistive tech) plus something more delayed than instant like a `title` (a delayed custom bubble), whichever is cheaper.
- Both affected buttons are dense, icon-only (a star, an "×"), inside a narrow (~250-300px) dropdown row — any styled-tooltip replacement needs to fit that constraint without itself overflowing the dropdown.

# Acceptance criteria
- AC1: Hovering (or focusing) the "remove fleet root" button shows a hint that is styled consistently with the viewer's own dark theme, not the browser's native tooltip, and does not overlap the row's own text.
- AC2: The favorite-star button's hint (Add/Remove favorite) gets the same treatment, since it has the identical root cause.
- AC3: The hint remains available to assistive tech (the existing `aria-label` is preserved or the replacement mechanism is equally accessible).

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- clients/viewer/viewer.css

# Backlog
- `item_799_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`
