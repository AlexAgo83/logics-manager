## req_272_add_a_start_work_ownership_signal_for_active_tasks_and_items - Add a start-work / ownership signal for active tasks and items
> From version: 2.12.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Give agents a first-class, discoverable way to signal "I am actively working on this task/item now" and who is working on it, so active docs stop sitting at `Ready` while work happens.
- Make the signal usable for coordination when multiple agents (e.g. Claude and Codex) work the same corpus in parallel: an operator must be able to see, at a glance, who currently owns each in-progress doc.

# Context
- The status field already supports `In progress` (see `logics_manager/lint.py` status sets), and the only clean way to set it is `logics-manager sync update-indicators <ref> --status "In progress"`.
- That command is undocumented in the agent-facing guidance: neither `logics/instructions.md` nor the `AGENTS.md`/`LOGICS.md` managed bridge mentions a "start work" step. The documented lifecycle jumps straight from `flow promote` to `flow finish` with nothing in between.
- Worse, the guidance explicitly forbids hand-editing indicator lines (`logics/instructions.md:18`, `LOGICS.md:12`). A disciplined agent that wants to mark `In progress` is therefore stuck: manual edit is forbidden and the correct command is never surfaced — so the step is skipped.
- Observed symptom: `logics-manager status` reports tasks as "active" while they remain `[Ready]` (e.g. task_267, task_268). This matches operator-reported friction.
- Distinct gap for parallel agents: `In progress` is a *state*, not a *claim*. There is no owner concept, so two agents can both be "in progress" on the same doc with no visibility or coordination.

# Acceptance criteria
- AC1: A discoverable `logics-manager flow start <ref>` command exists, symmetrical to `flow finish`, that transitions a Draft/Ready doc to `In progress` through the managed indicator path (no hand-editing).
- AC2: `flow start` records an owner on the doc. Owner resolves from a `LOGICS_AGENT` environment variable by default and can be overridden with an explicit `--owner <agent>` flag; an absent owner is allowed but surfaced as a warning.
- AC3: When a doc is already `In progress` under a different owner, `flow start` warns clearly (e.g. "already owner=codex") and still proceeds (warn + override), without requiring `--force`.
- AC4: `logics-manager status` and `flow list` display the owner for in-progress docs (e.g. `task_267 [In progress] owner=codex`).
- AC5: The agent-facing guidance (`logics/instructions.md` and the `AGENTS.md`/`LOGICS.md` managed bridge) documents the "start work" step alongside the existing "finish" step.
- AC6: Lint/audit accept the owner indicator without flagging it as an unknown/hand-edited line.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Scope
- In scope: `flow start` command; owner indicator (managed) with env + flag resolution; warn+override collision behavior; owner display in `status`/`flow list`; guidance updates in instructions + bridge.
- Out of scope: hard locking/mutual exclusion between agents; real-time presence; any networked coordination service. The signal is advisory, not a lock.

# Dependencies and risks
- Dependency: owner indicator must round-trip through lint/audit and the Obsidian frontmatter projection (`logics_manager/obsidian.py`) without being treated as a hand-edited indicator.
- Risk: adding an indicator line touches schema expectations; needs a schema/version check so older docs without `Owner` stay valid.
- Risk: env-based owner could leak a stale identity if `LOGICS_AGENT` is misconfigured; the explicit `--owner` override and the warning mitigate this.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow/_parser_and_commands.py` (command wiring, alongside `_finish.py`)
- `logics_manager/flow/_listing.py` (status/owner display in `flow list`)
- `logics_manager/lint.py` (status sets, indicator validation)
- `logics_manager/index.py`, `logics_manager/insights.py` (status/progress parsing)
- `logics_manager/obsidian.py` (frontmatter projection of indicators)
- `logics/instructions.md`, `AGENTS.md`, `LOGICS.md` (agent-facing guidance)
- `tests/python/test_logics_manager_cli.py`

# AI Context
- Summary: Draft a bounded request for add a start-work / ownership signal for active tasks and items.
- Keywords: request-draft, logics-manager, python runtime, bundled CLI
- Use when: You need a new bounded request doc for the Logics workflow.
- Skip when: The work already has an existing request or should go straight to a backlog slice.

# Backlog
- none
- `item_481_add_a_start_work_ownership_signal_for_active_tasks_and_items`
