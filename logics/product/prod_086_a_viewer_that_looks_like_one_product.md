## prod_086_a_viewer_that_looks_like_one_product - A viewer that looks like one product
> Date: 2026-08-13
> Status: Settled
> Related request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
> Related backlog: `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`, `item_756_make_the_command_list_readable_at_the_size_it_actually_is`, `item_757_make_the_runbooks_screen_do_what_its_tab_claims`, `item_758_open_the_explorer_on_something_worth_reading`, `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`, `item_760_cover_the_reviewed_workshop_and_cdx_screens`
> Related task: `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-14 19:07:50

# Overview
Forty controls rendering in the browser's default light theme, a tab that promises three capabilities and offers one, and two screens that open on their emptiest state all say the same thing to an operator: parts of this were finished and parts were not. Consistency is not decoration here; it is the difference between a tool that reads as maintained and one that reads as a prototype.

```mermaid
flowchart TB
    Root[One colour-scheme declaration at the root] --> All[Every native control, on every screen]
    All --> Future[Including controls added later]
    Label[A tab's own title] --> Match{Does the screen do it?}
    Match -- no --> Fix[Build it, or stop claiming it]
    Open[A screen opens] --> Sel{Is the default selection empty?}
    Sel -- yes --> Pick[Select something with content]
    Good[CDX status: table, strip, next action] --> Copy[Copied by the other screens]
    Good -.- NotInvent[Not reinvented per screen]
```

# Goals
- Every control belongs to the interface it sits in.
- A screen does what its own label says it does.
- A screen opens on something worth looking at.
- Where one screen has already solved a problem well, the others copy it instead of inventing.

# Non-goals
- The Workshop Terminals tab, excluded by instruction.
- The document reader and editor, the new-document modal, the filter panel, the minimized dock, the project tools and the LAN banner.
- Changing what any command, runbook or mission does.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- A native control on any viewer screen is drawn in the interface's palette, whatever colour scheme the host resolves to. Held by one `color-scheme` declaration at the root, so a control added later is covered without anyone remembering.
- A list of thirty scripts is something an operator can scan: the command beside its name, grouped by the prefix the names carry, filterable, and no constant repeated per row.
- A screen does what its tab title claims. Runbooks claimed search, browse and verify and offered search; it offers all three.
- A pane that occupies most of the screen holds something worth reading on arrival -- the explorer opens on a README, and a directory lists what is in it rather than counting it.
- A disabled action says why it is disabled, on the screen rather than in a tooltip only a pointer can reach.
- Measured after: campaign desktop run at 203 checks, 0 failures, with five Workshop and CDX surfaces now covered.
- Not yet true, and recorded rather than implied: History, Memory and Disk have not adopted the shape the status screen establishes.

# References
- Product back-reference: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Task back-reference: `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens`
