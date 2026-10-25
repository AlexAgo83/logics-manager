---
name: wrap
description: End-of-session wrap-up — record progress, decisions and open threads in the Logics docs so the next session starts fresh instead of re-reading this one. Use when the user says "wrap", "wrap up", "save and close", "before I clear", or is about to end or /clear a session that touched Logics work.
---

# Wrap up a session

A session's context dies with it. What the next session needs — where the work
stands, what was decided and why, what is still open — has to be written into
the workflow docs before the session ends, or it is re-derived at full cost.

## Hard rules

- **Write only what happened.** Progress you measured, decisions the user made
  or approved, threads that are really open. No plans presented as done.
- **Use the CLI, never hand-edit indicators.** Status, progress and lineage go
  through `logics-manager flow` / `sync`; prose goes through `append-note`.
- **Short.** One line per decision, one line per open thread. The doc is read
  by the next session, not by an auditor.
- **Do not commit or push** unless the user asked for it in this session.

## Recipe

1. **Find what this session touched.**
   ```bash
   logics-manager status
   git status --short && git log --oneline @{upstream}..HEAD 2>/dev/null
   ```
   The active tasks plus the files and commits of this session are the scope.

2. **Record progress** on each task worked on, with the figure you can defend:
   ```bash
   logics-manager flow progress task <task_ref> --progress <n>%
   ```
   A task whose work is complete and validated goes through
   `logics-manager flow closeout <task_ref> --validation "<what you ran>"`
   instead (see the implement-task skill).

3. **Record decisions** — the choices the user made or approved, with the reason
   in a few words:
   ```bash
   logics-manager sync append-note <task_ref> --section decision \
     --text "Kept the override instead of a major bump: the bump breaks the build."
   ```

4. **Record where the work stops**, in the report section of the task:
   ```bash
   logics-manager sync append-note <task_ref> --section report \
     --text "Stopped after step 2 of 4; step 3 needs the API key the user will add."
   ```

5. **Turn each open thread into something findable.** Within the task's scope:
   a report note (step 4). Outside it — a bug noticed, an idea, a follow-up the
   user asked for — a new request, so it is not lost with the session:
   ```bash
   logics-manager flow new request --title "<the open thread in one line>"
   ```

6. **Prepare the restart** when work continues on the same refs:
   ```bash
   logics-manager sync context-pack <task_ref> <item_ref> --handoff --out logics/context-pack.json
   ```

7. **Check and report.**
   ```bash
   logics-manager lint --require-status
   ```
   Then tell the user, in three lines at most: what was recorded, what is open,
   and the one command or ref the next session should start from.

## When there is no Logics task

If the session's work has no task, do not invent one to have somewhere to
write. Record the open threads as requests (step 5), and give the user the
summary in the chat.
