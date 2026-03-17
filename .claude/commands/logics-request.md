---
description: Create or refine a Logics request doc using the canonical flow manager
argument-hint: [title or need]
---

Use the repository's canonical Logics workflow to create or refine a request.

Rules:
- `logics/` is the source of truth.
- Read `@logics/instructions.md` and `@logics/skills/logics-flow-manager/SKILL.md` first.
- Use `python3 logics/skills/logics-flow-manager/scripts/logics_flow.py new request --title "$ARGUMENTS"` when creating a new request.
- If a matching request already exists, update it instead of creating a duplicate.
- Keep Mermaid, indicators, references, and Logics conventions aligned with the canonical docs.
- After edits, run:
  - `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
  - `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --legacy-cutoff-version 1.1.0 --group-by-doc`

If `$ARGUMENTS` is empty, infer the request title from the user’s latest ask before creating anything.
