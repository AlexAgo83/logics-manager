## task_269_add_a_start_work_ownership_signal_for_active_tasks_and_items - Add a start-work / ownership signal for active tasks and items
> From version: 2.12.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] `flow start <ref>` wired in `logics_manager/flow/_parser_and_commands.py` with a handler module mirroring `_finish.py` (`_start.py`); transitions Draft/Ready -> In progress via the managed indicator path. [AC1]
- [ ] Owner resolution implemented: default from `LOGICS_AGENT` env, override via `--owner`, absent owner allowed with a warning. [AC2]
- [ ] Collision handling: existing In progress + different owner emits a clear warning and proceeds (warn + override, no `--force`). [AC3]
- [ ] Owner surfaced in `logics_manager/flow/_listing.py` (`flow list`) and the `status` command output. [AC4]
- [ ] Owner indicator parsed by `logics_manager/index.py` / `logics_manager/insights.py` and projected by `logics_manager/obsidian.py` without breaking existing docs. [AC4]
- [ ] Lint/audit accept the `Owner` indicator line (not flagged as unknown/hand-edited); schema/version guard keeps owner-less docs valid. [AC6]
- [ ] Guidance updated: "start work" step added to `logics/instructions.md` and the managed bridge in `AGENTS.md`/`LOGICS.md`, symmetrical to the existing "finish" step. [AC5]
- [ ] Tests added in `tests/python/test_logics_manager_cli.py` covering start transition, env/flag owner resolution, and collision warning.
- [ ] Validation passes (`lint --require-status`, `audit --group-by-doc`).

# Backlog
- `item_481_add_a_start_work_ownership_signal_for_active_tasks_and_items`

# Acceptance criteria
- AC1: A discoverable `logics-manager flow start <ref>` command exists, symmetrical to `flow finish`, that transitions a Draft/Ready doc to `In progress` through the managed indicator path (no hand-editing).
- AC2: `flow start` records an owner on the doc. Owner resolves from a `LOGICS_AGENT` environment variable by default and can be overridden with an explicit `--owner <agent>` flag; an absent owner is allowed but surfaced as a warning.
- AC3: When a doc is already `In progress` under a different owner, `flow start` warns clearly (e.g. "already owner=codex") and still proceeds (warn + override), without requiring `--force`.
- AC4: `logics-manager status` and `flow list` display the owner for in-progress docs (e.g. `task_267 [In progress] owner=codex`).
- AC5: The agent-facing guidance (`logics/instructions.md` and the `AGENTS.md`/`LOGICS.md` managed bridge) documents the "start work" step alongside the existing "finish" step.
- AC6: Lint/audit accept the owner indicator without flagging it as an unknown/hand-edited line.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_269_add_a_start_work_ownership_signal_for_active_tasks_and_items.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement add a start-work / ownership signal for active tasks and items.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_272_add_a_start_work_ownership_signal_for_active_tasks_and_items`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
