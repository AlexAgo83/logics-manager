## task_069_add_a_minimal_claude_code_bridge_for_logics_agents - Add a minimal Claude Code bridge for Logics agents
> From version: 1.10.3
> Status: Done
> Understanding: 97%
> Confidence: 94%
> Progress: 100%
> Complexity: Medium
> Theme: Agent orchestration and Claude Code compatibility
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_064_add_a_minimal_claude_code_bridge_for_logics_agents`.
- Source file: `logics/backlog/item_064_add_a_minimal_claude_code_bridge_for_logics_agents.md`.
- Related request(s): `req_055_add_a_minimal_claude_code_bridge_for_logics_agents`.
- This task should make Logics more natively usable from Claude Code without turning `.claude/` into a second source of truth.
- The real workflow memory and conventions must stay anchored in `logics/`, with `.claude/` limited to a thin project-level adapter.
- The first pass should cover the workflow-oriented entrypoints needed to discover and run the Logics request flow from Claude Code.

```mermaid
flowchart LR
    Backlog[Backlog item] --> Contract[Define ownership contract]
    Contract --> Agent[Add thin Claude agent bridge]
    Contract --> Command[Add thin Claude command bridge]
    Agent --> Validation[Validate docs and workflow]
    Command --> Validation
    Validation --> Done[Ready for implementation closeout]
```

# Plan
- [x] 1. Define the minimal `.claude/agents` and `.claude/commands` structure needed for this repo.
- [x] 2. Add thin Claude bridge files that explicitly point back to `logics/instructions.md`, the relevant `SKILL.md`, and existing workflow scripts.
- [x] 3. Ensure the bridge does not duplicate detailed prompts already owned by `openai.yaml` and `SKILL.md`.
- [x] 4. Document the ownership and maintenance rule between `logics/` and `.claude/`.
- [x] 5. Validate the bridge shape and update linked Logics docs.
- [x] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Define a minimal `.claude/` layout without moving the real workflow source out of `logics/`. Proof: the implementation adds only `.claude/agents/logics-flow-manager.md`, `.claude/commands/logics-request.md`, and `.claude/commands/logics-flow.md`.
- AC2 -> Keep Claude bridge files thin and explicitly anchored to `logics/instructions.md`, `SKILL.md`, and workflow scripts. Proof: each bridge file points back to `logics/instructions.md`, `logics/skills/logics-flow-manager/SKILL.md`, and `logics_flow.py`.
- AC3 -> Avoid duplicating detailed prompts and conventions across Claude files, `openai.yaml`, and `SKILL.md`. Proof: the bridge files remain short, reference canonical docs, and avoid reproducing the detailed Logics workflow rules locally.
- AC4 -> Cover at least the first workflow-oriented Claude entrypoint around request and flow management. Proof: the implementation provides a request-authoring command and a generic flow command anchored to the existing flow manager.
- AC5 -> Document the source-of-truth contract between `logics/` and `.claude/`. Proof: the agent bridge file explicitly states that `logics/` remains canonical and `.claude/` stays derivative.
- AC6 -> Preserve current Codex-oriented plugin behavior and manifest contracts. Proof: the delivery adds only `.claude/*` files and leaves the existing `openai.yaml` plugin contract untouched.
- AC7 -> Keep the bridge small enough to remain maintainable manually or to be generated later without changing ownership. Proof: the bridge stays intentionally small with one agent and two commands.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Required
- Architecture signals: data model and persistence, contracts and integration, state and sync
- Architecture follow-up: Create or link an architecture decision before irreversible implementation work starts.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): `adr_006_keep_claude_code_bridge_files_thin_and_derivative_of_logics`
- Backlog item: `item_064_add_a_minimal_claude_code_bridge_for_logics_agents`
- Request(s): `req_055_add_a_minimal_claude_code_bridge_for_logics_agents`

# Validation
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --legacy-cutoff-version 1.1.0 --group-by-doc`
- Run any Claude bridge-specific validation added during implementation.
- Finish workflow executed on 2026-03-17.
- Linked backlog/request close verification passed.

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results recorded.
- [x] Linked request/backlog/task docs updated consistently.
- [x] Status is `Done` and progress is `100%`.

# Report
- Added a thin Claude agent bridge in `.claude/agents/logics-flow-manager.md`.
- Added `.claude/commands/logics-request.md` for request authoring and `.claude/commands/logics-flow.md` for the generic flow-manager entrypoint.
- Kept `.claude/` derivative by pointing back to `logics/instructions.md`, `logics/skills/logics-flow-manager/SKILL.md`, and the existing workflow script.
- Validated the doc chain with Logics lint and workflow audit.
- Finished on 2026-03-17.
- Linked backlog item(s): `item_064_add_a_minimal_claude_code_bridge_for_logics_agents`
- Related request(s): `req_055_add_a_minimal_claude_code_bridge_for_logics_agents`
