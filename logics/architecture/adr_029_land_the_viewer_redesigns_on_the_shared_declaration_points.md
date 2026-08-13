## adr_029_land_the_viewer_redesigns_on_the_shared_declaration_points - Land the viewer redesigns on the shared declaration points
> Date: 2026-08-13
> Status: Proposed
> Related request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
> Related backlog: (none yet)
> Related task: (none yet)
> Drivers: five viewer requests opened in one day, each touching the same host source; the operator's question of whether this is the occasion for a viewer refactor
> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.

# Overview
- Five requests now change the viewer at once. Rather than open a sixth to restructure it, each of them lands on the declaration point that already exists for what it changes, and the existing line budget stays the gate. No speculative refactor is scheduled.

```mermaid
flowchart TB
    R344[req_344 fleet home] --> Frame[Panel framing, decided once]
    Frame --> R345[req_345 board and panel]
    Frame --> R347[req_347 Git CI Release Settings]
    R346[req_346 failure feedback] --> Action[withPrimaryAction, one path]
    Action --> R348[req_348 connector diagnostics]
    Reg[screenRegistry, logicsModel, openProjectPickerModal] --> Reuse[Shared behaviour implemented once]
    Reuse --> R345
    Reuse --> R347
    Budget[line budget and function length] --> Gate[A redesign that breaks it splits the file itself]
```

# Context
- Five requests were opened on 2026-08-13 against the viewer: `req_344` (fleet home), `req_345` (board, details panel, activity), `req_346` (fleet root, failure feedback, fleet flag), `req_347` (Git, CI, Release, Settings), `req_348` (connector diagnostics, update cache). The operator asked, reasonably, whether returning to this code so often is the occasion for a refactor.
- **The measurement does not support a refactor request on size grounds.** `scripts/check-source-line-budget.mjs` passes today. The largest files are `clients/viewer/viewer.css` at 5 321 lines, `clients/viewer/src/browser-host/index.js` at 4 447, `logics_manager/viewer.py` at 3 620 and `clients/viewer/src/browser-host/cdx.js` at 3 057. The repository has a budget for exactly this and has already judged these sizes acceptable. Opening a request to split them would be inventing work the project's own gate does not ask for.
- **The structural levers these five requests need already exist, and were built deliberately.** `screenRegistry` in the browser host declares every screen once, with how it refreshes -- added by `req_313` precisely so that adding a screen stops meaning edits in three places. `logicsModel.js` already distinguishes `isPrimaryFlowStage` from `isCompanionStage`, which is the split `req_345` needs for the board. `withPrimaryAction` is already the single path every primary action's failure takes. `openProjectPickerModal` is already the recovery the fleet root picker fails to reach. In each case the abstraction is present and the defect is that one call site does not use it.
- **The real risk is not size but divergence.** Four of the five requests independently propose the same corrections: a screen framed as a dismissable panel over a board, a verdict stated before its facts, status carried by colour rather than a repeated string, green collapsing while red expands. Delivered screen by screen, those become four similar implementations that drift. That is the cost worth spending an architecture decision on, not the line count.

# Decision
- No viewer-refactor request is opened. The five in flight are the work.
- The panel framing is decided once, in `req_344`, and inherited by every other screen. `req_347` states this explicitly and must not re-decide it.
- Where a redesign needs a behaviour that more than one screen shares -- the framing, the verdict header, the status encoding, the collapse-when-green rule, the failure-feedback path -- it is implemented once at the existing declaration point and reused, not copied per screen. A second implementation of any of these is a review finding, not a variation.
- `scripts/check-source-line-budget.mjs` and `scripts/check_function_length.py` remain the gate. A redesign that pushes a file past its budget splits that file as part of its own delivery, rather than deferring it to a refactor that has not been scheduled.
- The shared behaviours are proven where they are shared: the viewer UI campaign covers them across screens, so a screen that diverges fails a run rather than being caught by review.

# Consequences
- Delivery order acquires a dependency it did not have: `req_344`'s framing decision gates part of `req_345` and `req_347`. This is already reflected in both requests and in their orchestration tasks.
- Some of these requests will do slightly more than their own screen needs, because they are the first to reach a shared behaviour. That cost is accepted here rather than argued per request.
- If a file does cross its budget during delivery, the split lands inside the request that caused it. This may make one backlog item larger than its siblings; that is preferred to a refactor request nobody has scoped.
- Revisit if a sixth viewer request opens without an obvious home: that would be evidence the declaration points are missing one, and at that point a restructuring request would have something concrete to restructure.

# References
- Related request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Related backlog: (none yet)
- Related task: (none yet)
- Also constrains: `logics/request/req_344_make_the_fleet_home_read_as_the_product_s_first_screen.md`, `logics/request/req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing.md`, `logics/request/req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question.md`, `logics/request/req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update.md`
