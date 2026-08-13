## item_765_make_the_panel_and_the_board_agree_on_what_is_shown - Make the panel and the board agree on what is shown
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
- Summary: The panel reports `1574 of 1576 docs shown` while the columns behind it read ten-of-349, ten-of-760 and ten-of-341 -- two meanings of the word shown, on one screen, three inches apart.
- Keywords: shown count, panel versus columns, docs shown, column pagination, count reconciliation
- Use when: Reconciling what the filter panel and the board columns each report as shown.
- Skip when: How many documents a column renders, decided by the board's own request.

# Problem
- The panel reports `1574 of 1576 docs shown` while the columns behind it read ten-of-349, ten-of-760 and ten-of-341. Two different meanings of the word shown, on one screen, three inches apart.

# Scope
- In:
  - Reconcile the two counts and explain the one the columns display.
- Out:
  - How many documents a column renders, which the board's own request decides.

# Acceptance criteria
- AC11: Panel and board agree, and the panel explains the columns' count.

# AC Traceability
- request-AC11 -> This backlog slice. Proof: AC11: Panel and board agree, and the panel explains the columns' count.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_087_surfaces_that_read_like_they_were_finished`
- Architecture decision(s): (none yet)
- Request: `req_351_make_the_reader_readable_and_the_filter_panel_say_something`
- Primary task(s): `task_348_deliver_the_reader_the_modal_and_the_filter_panel`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
