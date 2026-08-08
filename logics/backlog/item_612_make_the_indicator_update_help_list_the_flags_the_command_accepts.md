## item_612_make_the_indicator_update_help_list_the_flags_the_command_accepts - Make the indicator update help list the flags the command accepts
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Discoverable command contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08

# Problem
- Every help screen is a hand-written list of flags, maintained separately from the flags the command actually declares, and the two have drifted apart. The reported instance is the indicator update command, whose re-baseline flag lint itself recommends: an operator who checks the help before following that remediation is told the flag does not exist.
- Comparing declared flags against the printed screens finds nine flags missing across seven commands: the re-baseline and relation flags on indicator update, the handoff flag on the context pack, the three structured validation flags on closeout, the closeout verification flag on all four repair kinds, the inline validation flag on the request-chain scaffold, and the orchestration summary flag on the request split.
- Listing the nine by hand is nine corrections that drift again at the next flag added. Deriving the list from the parser is less code than the block it replaces, and removes the drift rather than resetting it.

# Scope
- In:
  - Derive the flag section of each help screen from the flags the command declares, instead of maintaining a parallel hand-written list.
  - Keep the rest of each screen as authored: its summary, usage line, accepted values, and examples, which say things a flag list cannot.
  - Keep the existing meaning of the re-baseline flag: re-baseline a reviewed body edit without inventing an indicator value change.
  - Cover the drift with a test that compares declared flags against the printed screen for every subcommand, so a new flag cannot be added without appearing.
- Out:
  - Changing the behavior of any flag.
  - Replacing the hand-authored parts of the help screens with generated text.
  - Reformatting screens beyond what deriving the flag section requires.

# Acceptance criteria
- AC1: Every flag a command declares appears on that command's help screen, including the nine currently missing.
- AC2: The flag section is derived from the command's declared flags, so adding a flag needs no second edit.
- AC3: The hand-authored summary, usage, accepted values and examples of each screen are preserved.
- AC4: A test compares declared flags against the printed screen for every subcommand, and fails against the current code.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Every flag a command declares appears on that command's help screen, including the nine currently missing.
- request-AC7 -> This backlog slice. Proof: AC4: A test compares declared flags against the printed screen for every subcommand, and fails against the current code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)
- Request: `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`
- Primary task(s): `task_305_orchestrate_the_honest_outcome_corrections`

# AI Context
- Summary: Make the indicator update help list the flags the command accepts
- Keywords: scaffolded-backlog, make the indicator update help list the flags the command accepts, implementation-ready
- Use when: Implementing the scaffolded slice for Make the indicator update help list the flags the command accepts.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - the tool recommends a flag its own help denies
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_305_orchestrate_the_honest_outcome_corrections`
