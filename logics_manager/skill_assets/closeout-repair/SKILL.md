---
name: closeout-repair
description: Diagnose why a task's closeout is blocked and run the specific repair sub-command that fixes it — validate-closeout, repair gates/ac-traceability/links/mermaid. Use when asked to "why won't this task close", "fix the closeout", "repair this task", or when `flow validate-closeout`/`flow closeout` reports a finding you don't recognize.
---

# Diagnose and repair a blocked closeout

`flow validate-closeout` names exactly what's blocking a task from closing,
and names the exact repair command for each finding — read its output
before guessing which of the four `repair` sub-commands to run.

## Hard rules

- **Run `validate-closeout` first, every time.** It maps each finding to the
  literal command that fixes it — don't reach for a `repair` sub-command
  from memory when the tool already told you which one.
- **Repairs are deterministic and mechanical.** They fix a specific
  structural gap (an unchecked box, a missing back-link, a stale diagram, a
  missing traceability line) — they never invent the underlying validation
  evidence itself. If the real work isn't done, no repair command makes it so.
- **Closing this loop is `/implement-task`'s job when the task is otherwise
  unfinished.** This skill is for a task that's actually done but whose
  closeout paperwork is out of sync — not a substitute for finishing work.

## Recipe

**Diagnose first:**
```bash
logics-manager flow validate-closeout task_003_my_task
```
Each finding names its own fix command. The mapping, so you recognize it
without re-reading every time:

| Finding | Meaning | Fix |
|---|---|---|
| `task_gate_unchecked` | `# Plan` or `# Definition of Done (DoD)` still has an unchecked `- [ ]` | `logics-manager flow repair gates task_003_my_task` |
| `task_missing_done_gate` | DoD has no checked completion evidence at all | `logics-manager flow repair gates task_003_my_task` |
| `validation_evidence_missing` | `# Validation` has no concrete passing-command evidence | `logics-manager flow closeout task_003_my_task --validation "pytest passed on 2026-08-09: 42 passed"` |
| `mermaid_signature_stale` | An embedded Mermaid block's signature no longer matches its content | `logics-manager flow repair mermaid --refs task_003_my_task` |
| `backlog_missing_task_link` | The linked backlog item doesn't reference this task back | `logics-manager flow repair links task_003_my_task` |
| `ac_missing_item_traceability` / `ac_missing_task_traceability` | An AC has no traceability line pointing at the backlog item/task covering it | `logics-manager flow repair ac-traceability req_001_my_request` |

**Apply the repair**, then re-check:
```bash
logics-manager flow repair gates task_003_my_task
logics-manager flow validate-closeout task_003_my_task
```

**Once clean, closeout normally:**
```bash
logics-manager flow closeout task_003_my_task --validation "pytest passed" --index --lint --audit
```

## Gotchas

- **`validation_evidence_missing` has no `repair` sub-command** — it's fixed
  by supplying real evidence through `flow closeout --validation`, not by
  `flow repair`. Don't go looking for a fifth repair kind that doesn't exist.
- **`ac-traceability` repair targets the *request*, not the task.** The other
  three repair kinds take the task ref; this one takes the request ref,
  because AC traceability is a request-level concern that fans out to every
  linked backlog item and task.
- **A "deferred" AC-traceability finding on a fresh, unimplemented request is
  normal, not a bug.** `flow validate`/`audit` report task-level proof as
  deferred until a linked task is actually `Done` — don't run `repair
  ac-traceability` reflexively on a request that hasn't been worked yet; it
  has nothing to attach proof to.
- **`--apply-fixes` on `flow validate` covers the same four repair kinds in
  one pass**, scoped to the refs you pass it — reach for this skill's
  per-kind table when you need to understand *why* something's blocked, and
  `--apply-fixes` when you already know you want everything fixable applied.
