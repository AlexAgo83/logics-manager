## item_764_make_each_filter_say_what_it_would_narrow - Make each filter say what it would narrow
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Four filters read `All (1574)` and `Any (1574)` three times over, `Group` is greyed in a way that reads as broken, and `Clear filters` is the loudest control while no filter is set.
- Keywords: filter panel, identical readings, corpus size repeated, greyed group control, clear filters prominence
- Use when: Changing what the board's filter controls display or how a choice is presented.
- Skip when: Which filters exist and what they filter on.

# Problem
- Four filters read `All (1574)` and `Any (1574)` three times over -- the same count four times, saying nothing about what any one of them would narrow. `Group` is greyed in a way that reads as broken, and `Clear filters` is the loudest control in the panel while no filter is set.

# Scope
- In:
  - Have each filter describe its own dimension rather than restate the corpus size.
  - Present a choice as a choice with its options visible.
  - Let an action recede when there is nothing for it to do.
- Out:
  - Which filters exist and what they filter on.

# Acceptance criteria
- AC10: No two filters read identically when neither is set; each says what it would narrow.
- AC12: A choice is presented as a choice.
- AC13: An action with nothing to do recedes.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC10: No two filters read identically when neither is set; each says what it would narrow.
- request-AC12 -> This backlog slice. Proof: AC12: A choice is presented as a choice.
- request-AC13 -> This backlog slice. Proof: AC13: An action with nothing to do recedes.

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
