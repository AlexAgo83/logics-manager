---
name: lifecycle-ops
description: Split, promote, withdraw, close, finish, or progress an existing Logics request/backlog/task — the lifecycle moves that fall outside scoping (/corpus) and building (/implement-task). Use when asked to "split this request", "promote this backlog item", "withdraw this doc", "close this out manually", or "update the progress" on a doc that already exists.
---

# Lifecycle operations on an existing doc

Move an already-scoped Logics doc through the rest of its lifecycle: split it,
promote it to the next stage, retire it, close it, or update its progress.
This skill does not scope new work (`/corpus`) and does not build it
(`/implement-task`) — it moves docs that already exist.

## Hard rules

- **Never hand-edit `Status`, `Progress`, or lineage links.** Every command
  below writes those for you and keeps propagation consistent; a manual edit
  desyncs the doc from what actually happened.
- **Read the doc before acting on it.** `promote`/`split`/`close` all assume
  you understand its current scope; guessing from the title alone produces a
  slice or closure that doesn't match the work.
- **One operation, then check what it cascaded.** Several of these commands
  propagate to parent docs automatically (see Gotchas) — read the command's
  own output before assuming nothing else changed.

## Recipe

**Promote** a request to a backlog slice, or a backlog item to a task:
```bash
logics-manager flow promote request-to-backlog req_001_my_request
logics-manager flow promote backlog-to-task item_002_my_slice
```

**Split** a request or backlog item that turned out too big:
```bash
logics-manager flow split request req_001_my_request --slice "Fix the cache bug:AC1" --slice "Add the new endpoint:AC2,AC3"
logics-manager flow split backlog item_002_my_slice --title "Part one" --title "Part two"
```
Prefer `--slice 'Title:AC1,AC2'` for requests so each child backlog item
declares which request ACs it covers; plain `--title` still works but leaves
that traceability for you to add by hand afterward.

**Withdraw** a doc that's obsolete, recording what replaced it:
```bash
logics-manager flow withdraw item_002_my_slice --superseded-by item_009_the_real_fix
```
This only works from a status the withdraw transition allows (see Gotchas) —
it is not a way to abandon work silently.

**Close** a request, backlog item, or task directly, without the full
`closeout` ceremony:
```bash
logics-manager flow close request req_001_my_request
logics-manager flow close backlog item_002_my_slice
logics-manager flow close task task_003_my_task
```

**Finish** a task and verify its closure chain in one step:
```bash
logics-manager flow finish task task_003_my_task
```

**Update progress** on a task, which recalculates its linked backlog item's
progress too:
```bash
logics-manager flow progress task task_003_my_task --progress 60
```

## Gotchas

- **Closing propagates upward, conditionally.** `finish task`/`close task`
  auto-closes the linked backlog item only if *every* task linked to that
  item is already done — closing one task out of three leaves the item open.
  Closing the last one auto-closes the item, and if that was the request's
  last open item, the request auto-closes too. You will see
  `Auto-closed backlog item ... (all linked tasks are done).` in the output
  when this fires — that line is the propagation, not decoration.
- **`withdraw` enforces a status transition, like every other status change.**
  You cannot withdraw a doc from a status the workflow doesn't allow moving
  from — if it errors, check the doc's current `Status` first rather than
  retrying the same command.
- **`split`/`promote` create new docs; they don't remove the source's scope.**
  After splitting a request into backlog items, the request's own `Needs`
  still lists everything — trim it by hand only if the split was meant to
  narrow it, not just decompose it.
- **`progress task --progress` only takes a task ref.** To move a backlog
  item's own status independently of any task, use `close backlog`/`start`
  instead — there is no direct `progress backlog` command.
