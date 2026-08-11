## item_696_name_every_workflow_directory_the_same_way - Name every workflow directory the same way
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Name every workflow directory the same way
- Keywords: backlog-groom, request, name every workflow directory the same way, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Name every workflow directory the same way.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Under `logics/`, five directories are singular (`request`, `backlog`, `product`, `runbook`, `architecture`) and two are plural (`tasks`, `specs`). There is no rule to infer, so the name has to be memorised per directory.
It costs a wrong turn every time. Observed 2026-08-11 in a consuming project: `logics/task/task_048*.md` matched nothing, and finding the file took an extra `find` across the corpus. Small, but paid by every agent and every shell one-liner, indefinitely.
The cost lands hardest on agents, which reconstruct paths from a pattern rather than from memory, and which are the intended primary readers of this corpus.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: Every command that accepts a workflow path resolves the singular and plural form of a directory to the same canonical location, so `logics/task/...` and `logics/tasks/...` behave identically.
- AC2: Nothing on disk is renamed, moved, or created by this change; the canonical form written by the tool is unchanged.
- AC3: If both forms exist as real directories, the canonical one is used and the duplicate is reported as a corpus anomaly by `health` rather than silently ignored.
- AC4: The alias set is derived from one declared mapping rather than hardcoded per call site, so a future directory cannot be added with only one of its forms handled.
- AC5: Documentation states the canonical name for each directory in one place, and says the alternate form is accepted.
- AC6: Tests cover resolution of both forms for every workflow directory, the both-exist anomaly, and the absence of any filesystem mutation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Every command that accepts a workflow path resolves the singular and plural form of a directory to the same canonical location, so `logics/task/...` and `logics/tasks/...` behave identically.
- request-AC2 -> This backlog slice. Proof: AC2: Nothing on disk is renamed, moved, or created by this change; the canonical form written by the tool is unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: If both forms exist as real directories, the canonical one is used and the duplicate is reported as a corpus anomaly by `health` rather than silently ignored.
- request-AC4 -> This backlog slice. Proof: AC4: The alias set is derived from one declared mapping rather than hardcoded per call site, so a future directory cannot be added with only one of its forms handled.
- request-AC5 -> This backlog slice. Proof: AC5: Documentation states the canonical name for each directory in one place, and says the alternate form is accepted.
- request-AC6 -> This backlog slice. Proof: AC6: Tests cover resolution of both forms for every workflow directory, the both-exist anomaly, and the absence of any filesystem mutation.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_335_name_every_workflow_directory_the_same_way.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_335_name_every_workflow_directory_the_same_way` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_335_name_every_workflow_directory_the_same_way.md`.
- Generated locally by logics-manager.
- Task `task_332_name_every_workflow_directory_the_same_way` was finished via `logics-manager flow finish task` on 2026-08-11.

# Tasks
- `task_332_name_every_workflow_directory_the_same_way`
