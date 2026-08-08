## item_621_say_what_a_status_option_selects_and_what_it_would_return - Say what a status option selects, and what it would return
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Honest options
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The status option Done asks whether a document is closed rather than whether its status is Done, so the 85 Settled documents answer yes and the option counts 1311 where 1226 are Done. Terminal is not the same as Done, which is the distinction the audit already had to learn.
- The status options that return nothing on this corpus return nothing because no document carries that status. That is correct, and from the operator's side it is indistinguishable from the broken filters sitting next to it.

# Scope
- In:
  - Select Done by status, leaving the other terminal statuses to their own options.
  - State on each status option how many documents it would return, or mark it unavailable with the reason.
  - Derive those numbers from the loaded documents, so a new status is covered without editing the control.
- Out:
  - Changing the status vocabulary.
  - Hiding options that return nothing, which would make an empty corpus look like a short menu.
  - Reworking the other filter groups' options.

# Acceptance criteria
- AC1: Done selects documents whose status is Done, and not documents that are merely closed.
- AC2: Each status option states what it would return, or says why it is unavailable.
- AC3: Those numbers are derived from the loaded documents, shown by a test adding a status and seeing it covered without editing the control.
- AC4: A test pins the Done-versus-closed distinction and fails against the current implementation.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: `selects Done by status rather than by being closed` in `tests/viewer.browser-host.test.ts`; Settled and Archived no longer answer to Done.
- request-AC5 -> This backlog slice. Proof: `says on each filter option what it would return` and `never disables the option currently chosen` in the same file.
- request-AC8 -> This backlog slice. Proof: `counts an option added to the markup later without being edited`; all four tests fail against the previous implementation.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_058_a_filter_that_means_the_board`
- Architecture decision(s): (none yet)
- Request: `req_310_make_the_board_filters_answer_with_what_the_board_actually_shows`
- Primary task(s): `task_307_orchestrate_the_board_filter_corrections`

# AI Context
- Summary: Say what a status option selects, and what it would return
- Keywords: scaffolded-backlog, say what a status option selects, and what it would return, implementation-ready
- Use when: Implementing the scaffolded slice for Say what a status option selects, and what it would return.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - two options that quietly mean something else
- Rationale: Set by scaffold input or defaulted for grooming.
