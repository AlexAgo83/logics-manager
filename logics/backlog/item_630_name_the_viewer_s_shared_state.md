## item_630_name_the_viewer_s_shared_state - Name the viewer's shared state
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: One named store
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 01:49:49

# Problem
- The host holds 41 mutable bindings and 30 constants in one closure. Three screens reach into it through accessors built by hand, one per lift, each solving the same problem in the same way without saying so.
- That is why every lift cost a wiring block, and why the wiring failed four different ways while it was being written: a value read before it existed, a helper created below the call site, a function passed instead of a thunk, an object key rewritten as a call. None of those are hard problems; they are the cost of composing a seam by hand each time.

# Scope
- In:
  - Move the shared bindings into one module that owns them and exposes them uniformly.
  - Give each screen the store rather than a hand-picked set of accessors.
  - Keep each screen's private state private: the store carries what is shared, not everything.
  - Own the bindings in memory only: where a value is persisted is `item_638`'s subject, and the two must not both decide it. If `item_638` has landed, read and write through what it established rather than adding a second path.
  - Keep the wiring order-independent, so a screen cannot read a binding before it exists.
  - Cover the store with a check that derives its list of bindings from the module.
- Out:
  - Changing what any binding means or when it is written.
  - Introducing subscriptions or reactivity, which belongs to the phase after this one.
  - Touching the rendering model.

# Acceptance criteria
- AC1: The shared bindings live in one module, and the three per-screen accessors are gone.
- AC2: Each screen receives the store and reaches only what it does not own through it.
- AC3: Wiring is order-independent: a screen constructed before another still reads correctly.
- AC4: The suite, the campaign and the repository check pass.
- AC5: A check derives the store's bindings from the module, so one added later is covered without editing it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `clients/viewer/src/browser-host/state.js`; `hands every screen the same reader rather than a hand-picked set of thunks` in `tests/viewer.shared-state.test.ts` asserts the three per-screen accessor sets are gone.
- request-AC6 -> This backlog slice. Proof: no framework and no new runtime; 816 vitest tests, 1127 Python tests and the viewer campaign pass, and the extension bundle is regenerated from its sources.
- request-AC7 -> This backlog slice. Proof: `ci-check` exits 0 after the move.
- request-AC8 -> This backlog slice. Proof: `carries what is shared, not everything the host holds` derives the store's contents from the module, so a binding added later is listed rather than assumed.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- The store carries four bindings, not forty-three. Measured rather than assumed: those are the ones the three screens actually read. A store holding every closure binding would be a second name for the closure rather than a boundary, and the slice's own scope says the store carries what is shared and not everything. Screens receive a frozen reader rather than the store, so 'a screen reads what it does not own and never writes it' -- a rule all three lifts followed by convention -- becomes structural.

# Links
- Product brief(s): `prod_061_the_architecture_written_down`
- Architecture decision(s): (none yet)
- Request: `req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens`
- Primary task(s): `task_310_orchestrate_naming_the_viewer_architecture`

# AI Context
- Summary: Name the viewer's shared state
- Keywords: scaffolded-backlog, name the viewer's shared state, implementation-ready
- Use when: Implementing the scaffolded slice for Name the viewer's shared state.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - three hand-built seams doing the same undeclared thing
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_310_orchestrate_naming_the_viewer_architecture`

# Notes
- Task `task_310_orchestrate_naming_the_viewer_architecture` was finished via `logics-manager flow finish task` on 2026-08-09.
