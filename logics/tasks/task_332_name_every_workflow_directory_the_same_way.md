## task_332_name_every_workflow_directory_the_same_way - Name every workflow directory the same way
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 05:41:27

# AI Context
- Summary: Implement name every workflow directory the same way.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

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
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_696_name_every_workflow_directory_the_same_way`
- Related request(s): `req_335_name_every_workflow_directory_the_same_way`

# Links
- Request: `req_335_name_every_workflow_directory_the_same_way`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# Evidence
- AC1 | date: 2026-08-11 | command: `pytest -k alias_resolves_to_the_same_file` | result: passed | logics/task/... and logics/tasks/... resolve to the same file through flow, sync and audit path scoping
- AC2 | date: 2026-08-11 | command: `pytest -k alias_resolves_to_the_same_file` | result: passed | resolving an alias creates and renames nothing; the test asserts logics/task does not exist afterwards and the directory listing is unchanged
- AC3 | date: 2026-08-11 | command: `pytest -k alias_directory_that_exists_beside` | result: passed | duplicate_workflow_dirs reports logics/task beside logics/tasks and health prints it as an anomaly; the canonical form still wins resolution
- AC4 | date: 2026-08-11 | command: `pytest -k every_workflow_directory_resolves` | result: passed | WORKFLOW_DIR_ALIASES is derived from WORKFLOW_DIRS; the test asserts every non-dot directory has exactly one alias, so a new directory cannot ship half-handled
- AC5 | date: 2026-08-11 | command: `grep -n 'Workflow directory names' docs/cli.md` | result: found | docs/cli.md gained a Workflow directory names table listing canonical and accepted forms for all nine directories, in one place
- AC6 | date: 2026-08-11 | command: `python3 -m pytest tests/python/ -q` | result: 1326 passed | three tests cover both-form resolution across every directory, the both-exist anomaly, and the absence of filesystem mutation

# AC Traceability
- request-AC1 -> This task. Proof: date: 2026-08-11 | command: `pytest -k alias_resolves_to_the_same_file` | result: passed | logics/task/... and logics/tasks/... resolve to the same file through flow, sync and audit path scoping Source: `8297e530`
- request-AC2 -> This task. Proof: date: 2026-08-11 | command: `pytest -k alias_resolves_to_the_same_file` | result: passed | resolving an alias creates and renames nothing; the test asserts logics/task does not exist afterwards and the directory listing is unchanged Source: `8297e530`
- request-AC3 -> This task. Proof: date: 2026-08-11 | command: `pytest -k alias_directory_that_exists_beside` | result: passed | duplicate_workflow_dirs reports logics/task beside logics/tasks and health prints it as an anomaly; the canonical form still wins resolution Source: `8297e530`
- request-AC4 -> This task. Proof: date: 2026-08-11 | command: `pytest -k every_workflow_directory_resolves` | result: passed | WORKFLOW_DIR_ALIASES is derived from WORKFLOW_DIRS; the test asserts every non-dot directory has exactly one alias, so a new directory cannot ship half-handled Source: `8297e530`
- request-AC5 -> This task. Proof: date: 2026-08-11 | command: `grep -n 'Workflow directory names' docs/cli.md` | result: found | docs/cli.md gained a Workflow directory names table listing canonical and accepted forms for all nine directories, in one place Source: `8297e530`
- request-AC6 -> This task. Proof: date: 2026-08-11 | command: `python3 -m pytest tests/python/ -q` | result: 1326 passed | three tests cover both-form resolution across every directory, the both-exist anomaly, and the absence of filesystem mutation Source: `8297e530`
