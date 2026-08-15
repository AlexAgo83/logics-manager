## item_812_one_menu_button_on_the_phone_header - One menu button on the phone header
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: The viewport with the least to spare
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: menu, button, phone, header
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- At 420px and below the header's screen buttons become a two-column grid, spending a block of the viewport on navigation on the viewport that can least afford it.
- The controls are also pushed off the selector's row, so the header reads as two unrelated things stacked.

# Scope
- In:
  - One menu button on the project selector's own row at phone widths.
  - It opens the navigation the viewer already has -- the existing nav menu panels -- rather than a second copy of them.
  - Keyboard and screen-reader reachable, like the menus it opens.
- Out:
  - Changing the navigation at desktop widths.
  - Changing what the menus contain.

# Acceptance criteria
- AC1: At phone widths the header shows the selector and one menu button on one row, and no grid of screen buttons.
- AC2: The menu opens the same navigation entries the desktop header offers, from the same markup.
- AC3: Desktop widths are unchanged.

# Report
- At phone widths the screen buttons become a sheet under one Menu button on the project selector's own row. Same markup: the sheet is `.viewer-topbar__actions` presented differently, so choosing an entry runs the handler it already had and no second navigation exists to drift.
- Measured live at a 390px emulated viewport: the Menu button sits at y=8 with the selector at y=10 -- one row -- the actions are hidden at rest, and opening yields the real entries (Workshop, Terminals, Commands, Explorer, Corpus, Getting Started).
- Caught by driving it rather than reading the rule: the base `display: none` had been appended at the end of the stylesheet, after the breakpoint that reveals the button. Same specificity, so the later rule won and the button was hidden at every width, including the one it exists for. Declared with the other topbar rules now, and a test asserts that order.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: At phone widths the header shows the selector and one menu button on one row, and no grid of screen buttons.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_096_a_viewer_that_says_what_it_is_doing`
- Architecture decision(s): (none yet)
- Request: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
- Primary task(s): `task_376_orchestrate_the_loading_feedback_and_navigation_polish`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_376_orchestrate_the_loading_feedback_and_navigation_polish` was finished via `logics-manager flow finish task` on 2026-08-15.
