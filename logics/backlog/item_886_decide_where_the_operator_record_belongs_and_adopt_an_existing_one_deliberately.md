## item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately - Decide where the operator record belongs, and adopt an existing one deliberately
> From version: 2.23.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator preference store identity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: HOME-keyed storage was never a decision anyone took; record the evidence, then make adoption of an existing store an explicit operator action rather than a silent merge.
- Keywords: operator identity, storage location, adoption, HOME, migration
- Use when: Deciding stable-versus-HOME-keyed operator storage, or implementing adoption of an existing store.
- Skip when: Reporting work that only names the active store - that is item_885 and comes first.

# Problem
- The operator record is keyed to the process HOME, which is an implementation consequence rather than a decision anyone took: it also decides where TLS material and paired devices live, and it scopes the single-instance viewer claim.
- Any change of location risks silently orphaning or overwriting a real store, so the decision needs its evidence recorded before the code moves.

# Scope
- In:
  - Record the decision and its evidence: what identifies an operator here, what breaks under each option, and what the tool-profile HOMEs on this machine actually contain.
  - If the record moves, offer adoption of an existing store as an explicit operator action that states which file it will read and what it will write.
  - Keep the environment override authoritative, since every test depends on it.
  - Cover a forked store, an adoption, and a plain single-store install with regressions.
- Out:
  - Automatic merging of two stores.
  - Any change to the shape or the scope split of the stored preferences.
  - Moving TLS material or the paired-device registry, which are their own decision.
  - Synchronising preferences between machines.

# Acceptance criteria
- AC1: The decision is written down with its evidence before the storage behaviour changes.
- AC2: Adoption of an existing store happens only on an explicit operator action and states the source file first.
- AC3: No path silently merges, overwrites or deletes a store.
- AC4: An operator whose store forked reaches their previous favorites and fleet roots from the viewer.
- AC5: A single-HOME install behaves exactly as it does today, environment override included.
- AC6: Regressions cover the forked store, the adoption, and the unchanged single-store case.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The decision is written down with its evidence before the storage behaviour changes.
- request-AC4 -> This backlog slice. Proof: AC2: Adoption of an existing store happens only on an explicit operator action and states the source file first.
- request-AC5 -> This backlog slice. Proof: AC3: No path silently merges, overwrites or deletes a store.
- request-AC6 -> This backlog slice. Proof: AC4: An operator whose store forked reaches their previous favorites and fleet roots from the viewer.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_117_one_operator_record_and_the_viewer_says_which_one_it_opened`
- Architecture decision(s): (none yet)
- Request: `req_388_say_which_operator_preference_store_the_viewer_is_using_and_stop_it_forking_silently`
- Primary task(s): `task_400_make_the_operator_preference_store_visible_then_decide_where_it_belongs`

# Priority
- Priority: Medium - a storage move is only safe once the reporting above makes the current state visible
- Rationale: Set by scaffold input or defaulted for grooming.
