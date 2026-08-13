## item_756_make_the_command_list_readable_at_the_size_it_actually_is - Make the command list readable at the size it actually is
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
