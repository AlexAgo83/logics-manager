## item_630_name_the_viewer_s_shared_state - Name the viewer's shared state
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: One named store
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The host holds 41 mutable bindings and 30 constants in one closure. Three screens reach into it through accessors built by hand, one per lift, each solving the same problem in the same way without saying so.
- That is why every lift cost a wiring block, and why the wiring failed four different ways while it was being written: a value read before it existed, a helper created below the call site, a function passed instead of a thunk, an object key rewritten as a call. None of those are hard problems; they are the cost of composing a seam by hand each time.

# Scope
- In:
  - Move the shared bindings into one module that owns them and exposes them uniformly.
  - Give each screen the store rather than a hand-picked set of accessors.
  - Keep each screen's private state private: the store carries what is shared, not everything.
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
- request-AC1 -> This backlog slice. Proof: AC1: The shared bindings live in one module, and the three per-screen accessors are gone.
- request-AC6 -> This backlog slice. Proof: AC2: Each screen receives the store and reaches only what it does not own through it.
- request-AC7 -> This backlog slice. Proof: AC3: Wiring is order-independent: a screen constructed before another still reads correctly.
- request-AC8 -> This backlog slice. Proof: AC4: The suite, the campaign and the repository check pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

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
