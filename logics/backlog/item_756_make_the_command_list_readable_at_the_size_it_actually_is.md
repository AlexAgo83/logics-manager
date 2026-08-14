## item_756_make_the_command_list_readable_at_the_size_it_actually_is - Make the command list readable at the size it actually is
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:26

# AI Context
- Summary: Every row repeats `package.json` and `IDLE`, the command sits third inside a nested box, each script costs ~110px, and about thirty scripts have no filter and no grouping although their names group by prefix.
- Keywords: workshop commands, npm scripts, repeated constant, IDLE state, prefix grouping, script filter, row height
- Use when: Changing how discovered commands are listed, grouped, filtered or run from the Workshop.
- Skip when: Which commands are discovered, and how they execute.

# Problem
- Every row repeats `package.json` and `IDLE`, the command sits third inside a nested box, each script costs about 110px, and roughly thirty scripts have no filter and no grouping although their names group themselves by prefix.

# Scope
- In:
  - Put the command beside its name, group by the prefix the names already carry, and allow filtering.
  - Stop printing the default state on every row; show a running script's state and how long it has been running.
- Out:
  - Which commands are discovered, and how they are executed.

# Delivery notes
- **The command moved beside its name.** It was in a box of its own below, which cost every script about 110px of height for two short strings; on one line the list is something you can see thirty of. Ellipsised with the full command in the tooltip, since a long command should not set the row height for all the others.
- **`package.json` stopped being printed on every row.** It is one fact about the whole list, and it is stated once, above it.
- **Grouping is by the prefix the names already carry** -- `check:`, `build:`, `test:` -- not by source. Grouping by source put thirty scripts under one heading called `npm scripts`, which is the same as not grouping. Each group states its count.
- **A filter, held in state rather than in the DOM.** A running script's log arriving re-renders the list, and a filter whose value lived in the input would be thrown away every time a line was printed. Focus and caret are restored across the re-render for the same reason: a box that loses the caret on every keystroke is unusable rather than merely awkward. The filter states what it left out instead of quietly showing fewer rows.
- **`idle` is no longer printed.** It is what a script is unless something is happening, so thirty rows carried one word meaning "nothing to report". A state shows when it is not the default.
- **A running script says how long it has been running**, which the row could not answer at all before. The timestamp is taken when the state first becomes a running one, not on every patch -- the log lines that follow are patches too, and restamping would reset the duration to zero every time the script printed something.

# Acceptance criteria
- AC4: Command beside name, grouped, filterable.
- AC5: No constant repeated per row; a non-default state is visible with its duration.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: Command beside name, grouped, filterable.
- request-AC5 -> This backlog slice. Proof: AC5: No constant repeated per row; a non-default state is visible with its duration.

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

# Notes
- Task `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens` was finished via `logics-manager flow finish task` on 2026-08-14.
