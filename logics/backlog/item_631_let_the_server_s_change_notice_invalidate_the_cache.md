## item_631_let_the_server_s_change_notice_invalidate_the_cache - Let the server's change notice invalidate the cache
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Told, not guessed
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 01:36:26

# Problem
- WITHDRAWN. Three premises were measured during implementation and none of the three holds.
- **The vocabulary does not map one to one.** The server emits nine component names; the client keeps thirty-two `latest*` bindings, of which sixteen relate to a component and sixteen relate to none -- `latestItems`, the largest, among them. The sixteen that do relate collapse onto seven components, three or four bindings each. Two components, `cdxDisk` and `release`, have no cache at all.
- **Three of the "matching" bindings are not caches.** `latestCdxMemoryScope`, `latestCdxMemoryView` and `latestCiScreenMode` are interface state: which scope, which view, which mode the operator is looking at. Invalidating those on a server notice would reset the screen under someone's hands. That is a defect, not a correction.
- **The signature comparisons are not staleness detection.** They were described here as recomputing what the notice already announced. Read in place, they are optimistic-update bookkeeping: a change is applied locally, the signature is recomputed, and the previous one is kept so the action can be rolled back. Deleting them would break the optimistic UI, not remove duplication.
- **And the window the slice aimed at does not exist.** Every screen fetches when it opens -- the cdx screens with `cache: "no-store"` -- and the notice handler already refetches a screen that is visible. So there is no path where a cached payload is shown after the server has said it changed. An attempt to close that window by refetching from the cache-driven rerender reopened a closed screen, which an existing test caught immediately.
- What remains true is what the request already says elsewhere: the notice exists, is component-aware, and is already used. This slice claimed a duplication that is not there.

# Scope
- In:
  - Nothing. The slice is withdrawn, and this document is the measurement that withdraws it.
- Out:
  - Attaching the cache to the notice, which would touch interface state and close a window that is not open.
  - Deleting the signature comparisons, which are optimistic-update bookkeeping.

# Acceptance criteria
- AC1: The withdrawal states what was claimed and what each measurement showed.
- AC2: The parts that remain worth doing, if any, are named so they can be raised on evidence.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: withdrawn after measurement, not delivered -- the component vocabulary maps to sixteen of thirty-two caches, and those sixteen collapse onto seven components rather than mapping one to one. Three of the sixteen are interface state, not caches.
- request-AC3 -> This backlog slice. Proof: withdrawn after reading them in place -- the signature comparisons are optimistic-update bookkeeping, kept so a local change can be rolled back, not staleness detection recomputing the notice.
- request-AC4 -> This backlog slice. Proof: the polling fallback is untouched, because nothing was attached to the stream.
- request-AC6 -> This backlog slice. Proof: no framework, no runtime and no endpoint were added -- nothing was changed at all.
- request-AC7 -> This backlog slice. Proof: the measurement above, and an existing test (`does not reopen a closed CDX status screen on a background cdx change event`) which refuted the one implementation attempted.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_061_the_architecture_written_down`
- Architecture decision(s): (none yet)
- Request: `req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens`
- Primary task(s): `task_310_orchestrate_naming_the_viewer_architecture`

# AI Context
- Summary: Let the server's change notice invalidate the cache
- Keywords: scaffolded-backlog, let the server's change notice invalidate the cache, implementation-ready
- Use when: Implementing the scaffolded slice for Let the server's change notice invalidate the cache.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the client recomputes what the server already announced
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_310_orchestrate_naming_the_viewer_architecture`

# Notes
- Task `task_310_orchestrate_naming_the_viewer_architecture` was finished via `logics-manager flow finish task` on 2026-08-09.
