---
description: Run the Logics workflow manager for request backlog task operations
argument-hint: [new|promote|split|close|finish|sync|assist] ...
---

Use the canonical Logics workflow instead of inventing a new process.

Source of truth:
- `@logics/instructions.md`
- `@logics/skills/logics-flow-manager/SKILL.md`
- `@logics/skills/logics-flow-manager/scripts/logics_flow.py`

Behavior:
1. Read the canonical Logics instructions before acting.
2. Interpret `$ARGUMENTS` as a Logics workflow intent such as:
   - `new request ...`
   - `new backlog ...`
   - `new task ...`
   - `promote request-to-backlog ...`
   - `promote backlog-to-task ...`
   - `split request ...`
   - `split backlog ...`
   - `close ...`
   - `finish task ...`
   - `sync close-eligible-requests`
   - `assist runtime-status`
   - `assist commit-all`
   - `assist next-step ...`
3. Use the existing Python workflow script to perform the action.
4. Keep `.claude/` derivative. Do not copy detailed rules from `SKILL.md` into this command.
5. After any write, validate the result with the Logics linter and workflow audit.
