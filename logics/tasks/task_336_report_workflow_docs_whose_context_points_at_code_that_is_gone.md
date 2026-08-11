## task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone - Report workflow docs whose context points at code that is gone
> From version: 2.21.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement report workflow docs whose context points at code that is gone.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_700_report_workflow_docs_whose_context_points_at_code_that_is_gone`

# Acceptance criteria
- AC1: An open workflow doc citing a repo-relative path that does not exist is reported once, naming the document and the path.
- AC2: A symbol cited in backticks and not found anywhere in the repository is reported at a lower confidence than a missing path, with wording that says it is a hint rather than a fact.
- AC3: Line numbers are never validated, and their presence never produces a finding.
- AC4: Documents that are Done, archived, or otherwise closed produce no findings, so historical accuracy is never confused with current accuracy.
- AC5: Every finding is a warning that cannot block `lint`, `audit`, or a closeout gate, and the report stays silent on a corpus with no unresolvable anchors.
- AC6: Tests cover a missing path, an existing path, a missing symbol, a symbol that exists only in a comment, a Done document with rotted anchors producing nothing, and a line number never being checked.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_339_report_workflow_docs_whose_context_points_at_code_that_is_gone`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
