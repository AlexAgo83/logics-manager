## req_047_prevent_disposed_file_watchers_from_accumulating_in_extension_subscriptions - Prevent disposed file watchers from accumulating in extension subscriptions
> From version: 1.10.0
> Status: Done
> Understanding: 96%
> Confidence: 94%
> Complexity: Low
> Theme: Extension runtime lifecycle hygiene
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Keep the extension runtime clean when watcher roots are reinitialized.
- Avoid accumulating disposed file watcher objects in extension subscriptions over a long session.
- Make the watcher lifecycle easier to reason about and less error-prone.

# Context
The extension rebuilds its filesystem watcher when the watcher root changes or when the provider is reconfigured.
That is correct functionally, but the current lifecycle still pushes each new watcher into `context.subscriptions` even after previous watchers have already been disposed.

This does not immediately break behavior, but it creates unnecessary retained disposables and weakens lifecycle hygiene.
In a long-lived VS Code session, especially one with workspace or root changes, this can make the extension state harder to reason about.

# Acceptance criteria
- AC1: Rebuilding the watcher does not accumulate disposed watcher instances in `context.subscriptions`.
- AC2: The active watcher is always disposed before a replacement watcher becomes authoritative.
- AC3: Extension shutdown still disposes the currently active watcher correctly.
- AC4: The fix does not regress refresh behavior on file create, change, or delete events.

# Scope
- In:
  - Refine watcher ownership and disposal so only the live watcher is retained.
  - Keep the current refresh triggers and watcher pattern semantics intact.
  - Add or adjust regression coverage where practical.
- Out:
  - Rewriting the indexing model.
  - Changing which file types are watched.
  - Refactoring unrelated provider initialization logic.

# Dependencies and risks
- Dependency: watcher setup must stay compatible with provider refresh timing and workspace changes.
- Risk: a naive cleanup could accidentally stop events from firing if the live watcher is disposed too early.
- Risk: lifecycle cleanup could be made more complex than needed if it tries to overgeneralize beyond the current watcher use case.

# Clarifications
- This is a robustness and maintainability task, not a visible UX feature.
- The goal is not to change what the watcher does, only to ensure that ownership and disposal remain clean over time.
- The current watcher should still be fully torn down on extension deactivation.
- Prefer a minimal lifecycle cleanup over introducing a new abstraction layer unless the current code becomes measurably clearer that way.
- If practical, add at least one targeted regression test or narrowly scoped verification around the dispose-and-recreate cycle instead of relying only on code inspection.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Implementation notes
- Watcher disposal is now owned by a single activation-lifetime disposable instead of repushing each recreated watcher into `context.subscriptions`.
- Rebuilding the watcher still disposes the previous live instance before installing the replacement.
- Refresh behavior on file create/change/delete is unchanged.

# Backlog
- `logics/backlog/item_052_prevent_disposed_file_watchers_from_accumulating_in_extension_subscriptions.md`
