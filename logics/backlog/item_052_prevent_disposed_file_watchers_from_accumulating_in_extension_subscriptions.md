## item_052_prevent_disposed_file_watchers_from_accumulating_in_extension_subscriptions - Prevent disposed file watchers from accumulating in extension subscriptions
> From version: 1.10.0
> Status: Ready
> Understanding: 96%
> Confidence: 94%
> Progress: 0%
> Complexity: Low
> Theme: Extension runtime lifecycle hygiene
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The extension recreates its filesystem watcher when the watcher root changes, but disposed watcher instances can still accumulate in `context.subscriptions`.

That does not immediately break functionality, but it weakens lifecycle hygiene and makes the runtime state harder to reason about over a long session.

# Scope
- In:
  - Ensure only the live watcher is retained as an active disposable.
  - Keep create/change/delete refresh behavior unchanged.
  - Add targeted verification of the dispose-and-recreate lifecycle where practical.
- Out:
  - Refactoring the indexing model.
  - Changing watched file types or watcher semantics.
  - Introducing a large abstraction layer unless the existing code truly needs it.

# Acceptance criteria
- AC1: Rebuilding the watcher does not accumulate disposed watchers in `context.subscriptions`.
- AC2: The live watcher is disposed before a replacement becomes authoritative.
- AC3: Extension shutdown still disposes the active watcher correctly.
- AC4: File create/change/delete refresh behavior remains intact.

# Priority
- Impact:
  - Low-Medium: mostly runtime hygiene, but worth addressing before it compounds.
- Urgency:
  - Medium-Low: not user-facing, but cheap enough to keep the lifecycle clean.

# Notes
- Derived from `logics/request/req_047_prevent_disposed_file_watchers_from_accumulating_in_extension_subscriptions.md`.
- Prefer a focused cleanup over introducing a new ownership abstraction unless that clearly improves readability.
- A narrowly scoped regression test is preferable to relying only on inspection if the code path is testable without heavy setup.

# Tasks
- `logics/tasks/task_057_prevent_disposed_file_watchers_from_accumulating_in_extension_subscriptions.md`
