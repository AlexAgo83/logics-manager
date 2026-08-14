## item_764_make_each_filter_say_what_it_would_narrow - Make each filter say what it would narrow
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:27

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

# Delivery notes
- The four counts were all correct and all useless. Each control sat on its neutral option, and a neutral option's count *is* the corpus size by definition -- so the collapsed panel read `All (1574)` and `Any (1574)` three times over: four statements of one number, none of them about the dimension it belonged to.
- The neutral option now names what it is neutral about and how many choices below it would actually match something. Measured live: `All types - 8 to narrow by`, `Any status - 6 to narrow by`, `Any relation - 3 to narrow by`, `Any activity - 1 to narrow by`. Four different statements, each about its own filter.
- Counting choices that *would narrow* rather than choices that exist: offering a value that matches nothing sends the operator to an empty board. A dimension with none says so.
- The per-option counts are untouched. They were never the problem, and they are the only thing telling the operator what a choice costs before making it -- a regression asserts they survive.
- **`Group` is genuinely disabled**, not styled to look it: `webviewChrome.js` disables it outside list mode. The reason existed, in a `title` -- which is to say it existed for people who hover, and for nobody on a touch screen. It is on the screen now, under the control.
- `Clear filters` recedes when no filter is set. It was the panel's loudest control on a panel where nothing had been narrowed.

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

# Notes
- Task `task_348_deliver_the_reader_the_modal_and_the_filter_panel` was finished via `logics-manager flow finish task` on 2026-08-14.
