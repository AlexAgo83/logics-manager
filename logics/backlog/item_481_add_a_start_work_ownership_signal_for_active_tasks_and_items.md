## item_481_add_a_start_work_ownership_signal_for_active_tasks_and_items - Add a start-work / ownership signal for active tasks and items
> From version: 2.12.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Give agents a first-class, discoverable way to signal "I am actively working on this task/item now" and who is working on it, so active docs stop sitting at `Ready` while work happens.
Make the signal usable for coordination when multiple agents (e.g. Claude and Codex) work the same corpus in parallel: an operator must be able to see, at a glance, who currently owns each in-progress doc.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: A discoverable `logics-manager flow start <ref>` command exists, symmetrical to `flow finish`, that transitions a Draft/Ready doc to `In progress` through the managed indicator path (no hand-editing).
- AC2: `flow start` records an owner on the doc. Owner resolves from a `LOGICS_AGENT` environment variable by default and can be overridden with an explicit `--owner <agent>` flag; an absent owner is allowed but surfaced as a warning.
- AC3: When a doc is already `In progress` under a different owner, `flow start` warns clearly (e.g. "already owner=codex") and still proceeds (warn + override), without requiring `--force`.
- AC4: `logics-manager status` and `flow list` display the owner for in-progress docs (e.g. `task_267 [In progress] owner=codex`).
- AC5: The agent-facing guidance (`logics/instructions.md` and the `AGENTS.md`/`LOGICS.md` managed bridge) documents the "start work" step alongside the existing "finish" step.
- AC6: Lint/audit accept the owner indicator without flagging it as an unknown/hand-edited line.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A discoverable `logics-manager flow start <ref>` command exists, symmetrical to `flow finish`, that transitions a Draft/Ready doc to `In progress` through the managed indicator path (no hand-editing).
- request-AC2 -> This backlog slice. Proof: AC2: `flow start` records an owner on the doc. Owner resolves from a `LOGICS_AGENT` environment variable by default and can be overridden with an explicit `--owner <agent>` flag; an absent owner is allowed but surfaced as a warning.
- request-AC3 -> This backlog slice. Proof: AC3: When a doc is already `In progress` under a different owner, `flow start` warns clearly (e.g. "already owner=codex") and still proceeds (warn + override), without requiring `--force`.
- request-AC4 -> This backlog slice. Proof: AC4: `logics-manager status` and `flow list` display the owner for in-progress docs (e.g. `task_267 [In progress] owner=codex`).
- request-AC5 -> This backlog slice. Proof: AC5: The agent-facing guidance (`logics/instructions.md` and the `AGENTS.md`/`LOGICS.md` managed bridge) documents the "start work" step alongside the existing "finish" step.
- request-AC6 -> This backlog slice. Proof: AC6: Lint/audit accept the owner indicator without flagging it as an unknown/hand-edited line.

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
- Request: `logics/request/req_272_add_a_start_work_ownership_signal_for_active_tasks_and_items.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Add a start-work / ownership signal for active tasks and items
- Keywords: backlog-groom, request, add a start-work / ownership signal for active tasks and items, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add a start-work / ownership signal for active tasks and items.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_272_add_a_start_work_ownership_signal_for_active_tasks_and_items` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_272_add_a_start_work_ownership_signal_for_active_tasks_and_items.md`.
- Generated locally by logics-manager.

# Tasks
- `task_269_add_a_start_work_ownership_signal_for_active_tasks_and_items`
