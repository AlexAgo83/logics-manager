## item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme - Give the viewer's native controls the interface's own colour scheme
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:26

# AI Context
- Summary: `main.css` declares `color-scheme: light dark` while the standalone viewer's palette is unconditionally dark, so on a host resolving to light all forty native controls render light on dark; the fix belongs in `viewer.css`, which only the standalone loads.
- Keywords: color-scheme dark, accent-color, unstyled inputs, white search field, white checkbox, root declaration, terminals verification
- Use when: Styling any native control, or fixing a control that renders light on the dark interface.
- Skip when: Restyling hand-themed controls, and changing the Terminals tab's rendering.

# Problem
`clients/shared-web/media/main.css` declares `color-scheme: light dark`, telling the browser the page follows the host's preference. The VS Code webview does follow the editor theme, so that is right there. The standalone viewer does not: every colour in `clients/viewer/viewer.css` is a `var(--vscode-*, <dark fallback>)` and those variables are undefined outside the extension host, so the palette is unconditionally dark.
On any host resolving to light, the browser therefore draws all forty native controls light on a dark interface -- most visibly a white search field across the Runbooks screen and white checkboxes on the screen that launches an agent against the repository.
The fix is scoped: `viewer.css` is loaded only by `clients/viewer/index.html`, so the declaration belongs there and the webview keeps following the editor theme.

# Scope
- In:
  - Declare the colour scheme once at the root of the stylesheet the standalone viewer alone loads, so every control inherits it and the webview is untouched.
  - Give text and search fields the border and background the hand-styled fields already use.
  - Verify the result against the Terminals tab, which this request must not otherwise change.
- Out:
  - Restyling controls that are already themed by hand, and any change to the Terminals tab's own rendering.

# Delivery notes
- `:root { color-scheme: dark }` in `clients/viewer/viewer.css`, and nothing else. Every native control inherits it; not one is styled individually.
- Declared in `viewer.css` rather than `media/main.css` because `main.css` is shared with the VS Code webview, whose palette really does follow the editor theme -- `light dark` is correct there. `viewer.css` is loaded only by `clients/viewer/index.html`, so the standalone viewer is fixed without changing what the webview does.
- The premise this rests on: every colour in `viewer.css` is a `var(--vscode-*, <dark fallback>)`, and outside the extension host those variables are undefined, so the fallback always wins. The palette is unconditionally dark whatever the host says, and the declaration now says so too.

# Acceptance criteria
- AC1: No control renders as a light-mode widget.
- AC2: The theming is declared once at the root.
- AC3: Terminals renders as it does today, verified rather than assumed.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: No control renders as a light-mode widget.
- request-AC2 -> This backlog slice. Proof: AC2: The theming is declared once at the root.
- request-AC3 -> This backlog slice. Proof: AC3: Terminals renders as it does today, verified rather than assumed.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)
- Request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Primary task(s): `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens` was finished via `logics-manager flow finish task` on 2026-08-14.
