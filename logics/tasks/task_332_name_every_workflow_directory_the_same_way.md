## task_332_name_every_workflow_directory_the_same_way - Name every workflow directory the same way
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
- Summary: Implement name every workflow directory the same way.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_696_name_every_workflow_directory_the_same_way`

# Acceptance criteria
- AC1: Every command that accepts a workflow path resolves the singular and plural form of a directory to the same canonical location, so `logics/task/...` and `logics/tasks/...` behave identically.
- AC2: Nothing on disk is renamed, moved, or created by this change; the canonical form written by the tool is unchanged.
- AC3: If both forms exist as real directories, the canonical one is used and the duplicate is reported as a corpus anomaly by `health` rather than silently ignored.
- AC4: The alias set is derived from one declared mapping rather than hardcoded per call site, so a future directory cannot be added with only one of its forms handled.
- AC5: Documentation states the canonical name for each directory in one place, and says the alternate form is accepted.
- AC6: Tests cover resolution of both forms for every workflow directory, the both-exist anomaly, and the absence of any filesystem mutation.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_332_name_every_workflow_directory_the_same_way.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_332_name_every_workflow_directory_the_same_way.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_335_name_every_workflow_directory_the_same_way`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
