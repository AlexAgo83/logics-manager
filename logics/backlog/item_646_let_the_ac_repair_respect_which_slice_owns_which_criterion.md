## item_646_let_the_ac_repair_respect_which_slice_owns_which_criterion - Let the AC repair respect which slice owns which criterion
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90
> Confidence: 80
> Progress: 100
> Complexity: Low
> Theme: A repair that adds nothing twice
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `flow repair ac-traceability` adds a line for every acceptance criterion of the request to every linked backlog slice, regardless of which criteria that slice declares. A slice that owns three of nine criteria receives six placeholders it will never fill.
- The behaviour predates `req_316` and was invisible while the placeholder read `Evidence needed:`. Once `item_642` made the placeholder recognisable as unfilled, the lint placeholder rule started reporting it, which is how it surfaced -- during the closeout of `req_316` itself, on its own slices.
- Ownership is already declared: the scaffold input carries `request_acs` per slice, and the slice's own traceability section records what it claims. The repair is the only part of the chain that ignores it.

# Scope
- In:
  - Add a placeholder to a slice only for the criteria that slice declares.
  - Keep the task-level behaviour as it is: an orchestration task legitimately answers for every criterion of its request.
  - Report the criteria skipped for lack of ownership distinctly from those skipped because a line already exists.
  - Derive ownership from the lines a slice carries, since that is where it is already recorded.
  - Cover a slice that owns a subset, and one that declares nothing.
- Out:
  - Changing how ownership is declared.
  - Removing lines a previous run already added.
  - Changing the placeholder text, which `item_642` settled.

# Acceptance criteria
- AC1: A slice receives placeholders only for the criteria it declares.
- AC2: A slice that declares none has no ownership to respect, so it is offered the full set to prune -- which is the only way a chain just created by `flow deliver` can get its lines at all.
- AC3: The orchestration task still receives every criterion of its request.
- AC4: The skip reasons are distinguishable: not owned, versus already present.
- AC5: A test covers a slice owning a subset and fails against the current implementation.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: `test_a_hand_written_proof_is_left_alone` in `tests/python/test_gate_you_can_satisfy.py` asserts an undeclared criterion is not added and the run says why; `test_the_orchestration_task_still_answers_for_every_criterion` pins that the task keeps the full set.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- AC2 was corrected during implementation, the way item_642's was. As written it said a slice declaring no criterion receives none, which would have left a chain created by flow deliver unable to get its traceability lines at all -- three existing tests caught it. Ownership is respected where it is declared, and where nothing declares it the full set is offered for the operator to prune. Ownership is read from the lines a slice already carries, which is where it is recorded rather than a new field.

# Links
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)
- Request: `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`
- Primary task(s): `task_313_orchestrate_making_the_closeout_gate_satisfiable`

# AI Context
- Summary: Let the AC repair respect which slice owns which criterion
- Keywords: backlog, promote, slice, let the ac repair respect which slice owns which criterion
- Use when: You need a bounded backlog item for Let the AC repair respect which slice owns which criterion.
- Skip when: The change should go straight to implementation detail.

# Priority
- Priority: Medium - noise on every slice of every scaffolded corpus
- Rationale: Surfaced by `item_642` during the closeout of this very request, on its own slices.

# Notes
- Generated locally by logics-manager.

# Tasks
- `task_313_orchestrate_making_the_closeout_gate_satisfiable`
