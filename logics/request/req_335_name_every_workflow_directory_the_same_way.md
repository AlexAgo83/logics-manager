## req_335_name_every_workflow_directory_the_same_way - Name every workflow directory the same way
> From version: 2.21.6
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Corpus layout
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: `logics/tasks` and `logics/specs` are plural while `request`, `backlog`, `product`, `runbook` and `architecture` are singular, so anyone reaching for a file by path guesses wrong roughly half the time.
- Keywords: corpus-layout, directory-naming, path-resolution, agent-ergonomics
- Use when: Deciding how workflow directories are named or resolved from a path.
- Skip when: The work addresses document references (`task_048_...`), which are unaffected.

# Needs
- Under `logics/`, five directories are singular (`request`, `backlog`, `product`, `runbook`, `architecture`) and two are plural (`tasks`, `specs`). There is no rule to infer, so the name has to be memorised per directory.
- It costs a wrong turn every time. Observed 2026-08-11 in a consuming project: `logics/task/task_048*.md` matched nothing, and finding the file took an extra `find` across the corpus. Small, but paid by every agent and every shell one-liner, indefinitely.
- The cost lands hardest on agents, which reconstruct paths from a pattern rather than from memory, and which are the intended primary readers of this corpus.

# Context
- The canonical list is `WORKFLOW_DIRS` in `logics_manager/bootstrap.py`: `("request", "backlog", "tasks", "specs", "product", "roadmap", "architecture", "runbook", "external", ".cache")`. The same inconsistency is repeated where directories are mapped per kind, for example `insights.py` mapping `"task"` to `logics/tasks`.
- **A rename is not being proposed, and the reason is measured**: about 469 occurrences of these paths exist across `logics_manager`, `clients`, and `tests`, before counting consuming projects, external tooling, documentation, and every git history link. The disruption is out of proportion to a naming papercut.
- What is proposed instead is tolerance: accept the other form wherever a path is resolved, so a wrong guess costs nothing. That keeps the corpus untouched and makes the inconsistency stop mattering.
- Out of scope: renaming any directory, moving any file, changing document reference syntax, and changing what `bootstrap` creates.
- Known risk: tolerance must not create ambiguity if both `logics/task/` and `logics/tasks/` exist on disk. The canonical form has to win, and the situation should be reported rather than silently resolved.

# Acceptance criteria
- AC1: Every command that accepts a workflow path resolves the singular and plural form of a directory to the same canonical location, so `logics/task/...` and `logics/tasks/...` behave identically.
- AC2: Nothing on disk is renamed, moved, or created by this change; the canonical form written by the tool is unchanged.
- AC3: If both forms exist as real directories, the canonical one is used and the duplicate is reported as a corpus anomaly by `health` rather than silently ignored.
- AC4: The alias set is derived from one declared mapping rather than hardcoded per call site, so a future directory cannot be added with only one of its forms handled.
- AC5: Documentation states the canonical name for each directory in one place, and says the alternate form is accepted.
- AC6: Tests cover resolution of both forms for every workflow directory, the both-exist anomaly, and the absence of any filesystem mutation.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/bootstrap.py`
- `logics_manager/insights.py`
- `logics_manager/assist_support.py`
- `logics_manager/path_utils.py`

# Backlog
- none
- `item_696_name_every_workflow_directory_the_same_way`
