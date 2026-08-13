## item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme - Give the viewer's native controls the interface's own colour scheme
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Grepping both stylesheets for `color-scheme`, `accent-color` and input selectors returns nothing; the host emits 18 checkboxes, 8 selects, 2 text and 2 search inputs, and index.html adds 10 more, all rendering light on dark.
- Keywords: color-scheme dark, accent-color, unstyled inputs, white search field, white checkbox, root declaration, terminals verification
- Use when: Styling any native control, or fixing a control that renders light on the dark interface.
- Skip when: Restyling hand-themed controls, and changing the Terminals tab's rendering.

# Problem
- No stylesheet declares a colour scheme and no native control is styled, so about forty controls render as light-mode widgets on a dark interface -- most visibly a white search field across the Runbooks screen and white checkboxes on the screen that launches an agent against the repository.

# Scope
- In:
  - Declare the colour scheme and accent once at the root so every control inherits it.
  - Give text and search fields the border and background the hand-styled fields already use.
  - Verify the result against the Terminals tab, which this request must not otherwise change.
- Out:
  - Restyling controls that are already themed by hand, and any change to the Terminals tab's own rendering.

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
