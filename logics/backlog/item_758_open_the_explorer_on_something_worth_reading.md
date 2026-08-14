## item_758_open_the_explorer_on_something_worth_reading - Open the explorer on something worth reading
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 15:01:16

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

# Delivery notes
- **A directory reports its contents.** Its preview was the string `12 item(s)` across three quarters of the screen, which answers nothing an operator opens a folder to ask. It lists what is in it -- directories first, then files, each with the size that decides whether to open it -- and each entry opens.
- Capped at 200 entries and it says so when it caps. A listing that stops silently reads as a folder with 200 things in it.
- Ignored and generated directories stay dimmed here exactly as they are in the tree, rather than being listed as though they were worth opening.
- **The explorer opens on a file.** It opened on the root, whose preview was that count, so the pane arrived empty -- the same shape as the Git screen opening on its empty domain. It opens on the root's README if there is one, since that is the file a repository puts there to be read first, and otherwise on the first previewable file at the root.
- The widths were already right (260px tree against the rest) and are unchanged. They read as wrong because the wide side held one sentence; with content in it the proportion is the one the screen wanted.
- `workspace_preview_payload` went over the function-length ceiling with the listing in it, so the directory branch is its own function. That is where it belonged anyway: it is the one thing on that path that does not need the file-size caps the rest of the function is about.

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
