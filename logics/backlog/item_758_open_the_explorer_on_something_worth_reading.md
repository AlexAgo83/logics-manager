## item_758_open_the_explorer_on_something_worth_reading - Open the explorer on something worth reading
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 17%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The root directory is selected by default and a directory preview is one count, so the pane holding three quarters of the width is empty on arrival -- the same shape as the Git screen opening on its empty domain.
- Keywords: workshop explorer, default selection, empty preview pane, pane widths, directory listing, dimmed ignored dirs
- Use when: Changing what the Explorer selects on arrival, its pane proportions, or how a directory is previewed.
- Skip when: Editing files from the Explorer, and the file preview's rendering rules.

# Problem
- The root directory is selected by default and a directory's preview is a single count, so the preview pane is empty on arrival while holding three quarters of the width -- the same shape as the Git screen opening on its empty domain.

# Scope
- In:
  - Select something with content on arrival.
  - Balance the pane widths against which side carries the content.
  - Report a directory's contents usefully rather than as one count.
  - Keep the dimming of ignored and generated directories.
- Out:
  - Editing files from the explorer, and the file preview's own rendering rules.

# Acceptance criteria
- AC8: The preview pane holds content on arrival and the widths reflect it.
- AC9: A directory reports its contents usefully.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC8: The preview pane holds content on arrival and the widths reflect it.
- request-AC9 -> This backlog slice. Proof: AC9: A directory reports its contents usefully.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)
- Request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Primary task(s): `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
