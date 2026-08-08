## item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails - Report a closed task as closed even when a post-close check fails
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Unambiguous command outcomes
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Closeout runs the optional repository-wide audit after finishing the task and propagating the chain. Any blocking finding in the repository, including one belonging to an unrelated corpus, turns the returned outcome false while the task is closed and its changes are on disk.
- A caller reading only that outcome cannot tell this from a closeout that never happened, and the printed line reads FAILED for a task that reached done. The earlier failure mode, where preflight rolls the writes back, is genuinely a non-closure and must stay distinguishable from this one.

# Scope
- In:
  - Report whether the task actually closed, separately from whether the post-close checks passed.
  - Report explicitly when the closure succeeded and a post-close check then failed.
  - Make the printed outcome say the task closed and the post-close validation failed, rather than reporting a failure to close.
  - Keep the overall outcome false in that case, so existing callers gating a commit on it keep gating.
- Out:
  - Preflighting the repository-wide audit before mutating, which an unrelated corpus could then use to block every closeout.
  - Narrowing the audit to the closed task's own documents.
  - Changing the rollback behavior on a failed preflight, which is a real non-closure.

# Acceptance criteria
- AC1: An otherwise-valid closeout with an unrelated repository audit blocker reports the task as closed and the post-close validation as failed.
- AC2: The overall outcome stays false in that case.
- AC3: A closeout rolled back by a failed preflight reports the task as not closed, distinctly from the case above.
- AC4: A dry run reports the task as not closed, since it changed nothing.
- AC5: The printed outcome for a closed task with a failing post-close check does not read as a failure to close.
- AC6: A regression test covers the otherwise-valid closeout with an unrelated audit blocker, and fails against the current code.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: An otherwise-valid closeout with an unrelated repository audit blocker reports the task as closed and the post-close validation as failed.
- request-AC6 -> This backlog slice. Proof: AC2: The overall outcome stays false in that case.
- request-AC7 -> This backlog slice. Proof: AC3: A closeout rolled back by a failed preflight reports the task as not closed, distinctly from the case above.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)
- Request: `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`
- Primary task(s): `task_305_orchestrate_the_honest_outcome_corrections`

# AI Context
- Summary: Report a closed task as closed even when a post-close check fails
- Keywords: scaffolded-backlog, report a closed task as closed even when a post-close check fails, implementation-ready
- Use when: Implementing the scaffolded slice for Report a closed task as closed even when a post-close check fails.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a successful closeout is indistinguishable from a failed one
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_305_orchestrate_the_honest_outcome_corrections`
