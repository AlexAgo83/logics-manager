## item_614_let_a_same_day_re_baseline_actually_clear_the_indicator_gate - Let a same-day re-baseline actually clear the indicator gate
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90
> Confidence: 80
> Progress: 0
> Complexity: Low
> Theme: Truthful audit verdicts
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08

# Problem
- The re-baseline flag records that indicators were reviewed by writing a date, at day granularity. A second reviewed edit to the same document on the same day writes the same date, so the diff the gate inspects contains no indicator change and the blocking finding stays. Running the recommended remediation again cannot clear it, which leaves the operator with no honest exit: the remaining ones are to relabel a semantic edit as non-semantic, or to move an indicator value that did not actually move.
- Once the work is committed and the tree is clean, the gate stops looking at the working tree and judges the last commit instead. A finding then persists against history that can no longer be edited in place, and the only way out is to rewrite that commit.
- Observed while revising a scaffolded corpus twice in one afternoon: the second revision could only be landed by squashing it into the commit that carried the first re-baseline.

# Scope
- In:
  - Let a reviewed body edit be re-baselined even when the document was already re-baselined earlier the same day.
  - Keep the marker readable: an operator scanning the document should still see when indicators were last reviewed.
  - Keep the gate itself as strict: an edit with no review at all is still blocked.
  - Cover the same-day second edit in a test that fails against the current implementation.
- Out:
  - Removing or weakening the modified-without-updating-indicators gate.
  - Changing which indicators each document kind requires.
  - Changing how the gate chooses between the working tree and the last commit when the tree is clean.

# Acceptance criteria
- AC1: A second reviewed edit on the same day is re-baselined by the same command, and the gate clears.
- AC2: The document still shows when its indicators were last reviewed, in a form an operator can read.
- AC3: An edit made with no re-baseline and no non-semantic marker is still blocked, exactly as today.
- AC4: A regression test performs two same-day edits with a re-baseline after each, and fails against the current implementation.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: A second reviewed edit on the same day is re-baselined by the same command, and the gate clears.
- request-AC7 -> This backlog slice. Proof: AC4: A regression test performs two same-day edits with a re-baseline after each, and fails against the current implementation.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)
- Request: `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`
- Primary task(s): `task_305_orchestrate_the_honest_outcome_corrections`

# AI Context
- Summary: Let a same-day re-baseline actually clear the indicator gate
- Keywords: backlog, promote, slice, let a same-day re-baseline actually clear the indicator gate
- Use when: You need a bounded backlog item for Let a same-day re-baseline actually clear the indicator gate.
- Skip when: The change should go straight to implementation detail.

# Priority
- Priority: Medium - the recommended remediation cannot clear the finding it is recommended for
- Rationale: Blocks a same-day second revision; the workaround is rewriting a commit.

# Notes
- Generated locally by logics-manager.

# Tasks
- `task_305_orchestrate_the_honest_outcome_corrections`
