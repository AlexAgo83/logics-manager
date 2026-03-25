---
description: Run the shared hybrid Logics assist runtime for repetitive delivery operations
argument-hint: [runtime-status|commit-all|summarize-pr|summarize-validation|next-step|triage|handoff|suggest-split|diff-risk|commit-plan|closure-summary|validation-checklist|doc-consistency] ...
---

Use the canonical hybrid assist runtime instead of inventing agent-specific flow logic.

Source of truth:
- `@logics/instructions.md`
- `@logics/skills/logics-hybrid-delivery-assistant/SKILL.md`
- `@logics/skills/logics-flow-manager/scripts/logics_flow.py`

Behavior:
1. Keep `.claude/` thin and derivative.
2. Interpret `$ARGUMENTS` as a shared hybrid assist intent.
3. Prefer `python logics/skills/logics.py flow assist ...` as the stable cross-platform entrypoint.
4. Let the runtime choose `ollama` when healthy and degrade cleanly otherwise.
5. Keep risky actions `suggestion-only` unless explicit user intent requires execution.
6. After any real write or commit, run the relevant validation surface.
