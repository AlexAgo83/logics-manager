---
name: implement-task
description: Implement one scaffolded Logics task end to end — read it, build it, validate it, record the outcome, close it out. Use when asked to "implement", "develop", "dev", "build", or "finish" a Logics task or backlog item that already exists.
---

# Implement a Logics task

Turn one already-scaffolded task into committed, validated code. Use `/corpus`
first if the task does not exist yet — this skill implements, it does not scope.

## Hard rules

- **One task per run.** Never batch several tasks: the report you write at the
  end has to say which task each change belongs to.
- **Never run two tasks against the same repository at once.** They share one
  working directory and one git index; concurrent runs interleave commits and
  can leave the repository in a state you then have to untangle.
- **Do not stop until the project's own tests and lint pass.** Fix and retry. A
  half-finished task is worse than a slow one.
- **Commit as you go**, one commit per logical step, not one large commit at the
  end. An interruption then costs one step, not the whole run.
- **Do not push.** Local commits only, unless the request was explicitly about
  releasing or about verifying a remote CI signal.

## Recipe

1. **Check it is not already done.** `logics-manager sync read-doc <task_ref>`.
   If its status is already Done, report that and stop rather than redoing it.

2. **Read the chain, bounded.** Read the task and its linked backlog item and
   request:
   ```bash
   logics-manager sync context-pack <task_ref> --format json
   ```
   Prefer this over opening the Markdown directly; it resolves the linked
   neighbourhood for you.

3. **Mark it started.**
   ```bash
   logics-manager flow start <task_ref> --owner "<who>"
   ```

4. **Implement it**, staying inside the backlog item's declared scope. Anything
   the task explicitly listed as out of scope stays out — capture it as a new
   request instead of widening this one.

5. **Validate with the project's own commands.** If a lint or test tool is
   missing, resync the project's dependency manager (`uv sync --all-extras`,
   `pip install -e .[dev]`, `npm ci`) rather than installing the tool
   standalone: a missing tool is usually a desynced environment, not an absent
   dependency.

6. **Record progress** as you go:
   ```bash
   logics-manager flow progress task <task_ref> --progress <n>%
   ```

7. **Close it out**, referencing the real validation you ran:
   ```bash
   logics-manager flow closeout <task_ref> \
     --validation-command "<the command you actually ran>" \
     --validation-result passed --lint --audit
   ```

## Gotchas

- Closeout preflight blocks on missing AC traceability proof. Supply it through
  the sanctioned path, after the commit exists so the proof can name it:
  ```bash
  logics-manager flow repair ac-traceability <request_ref> \
    --proof "Implemented in <hash>; validated with <command>." --proof-source "<hash>"
  ```
  Running that command without `--proof` writes "Evidence needed" placeholders
  that still block.
- Editing a doc by hand trips a "modified without updating indicators" gate.
  Fix it with `logics-manager sync update-indicators <ref> --progress <n>
  --understanding <n> --confidence <n>`, not by editing the indicator lines.
- Only move a task toward Done if validation actually passed. Confident prose in
  a summary is not evidence.
- `flow validate` and `audit` want the full ref (`task_301_full_slug`), not the
  short `task_301`.
