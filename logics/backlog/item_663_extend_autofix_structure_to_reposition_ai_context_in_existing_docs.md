## item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs - Extend autofix-structure to reposition AI Context in existing docs
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Structural repair
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Existing docs - potentially the whole corpus - already have `# AI Context` in the wrong place, and there is no deterministic way to fix that in bulk or per-ref today.
- `_autofix_structure()` already normalizes other structural details (Status/Schema version indicators, missing DoR/DoD checklists) through an established, already-wired command surface; AI Context repositioning belongs there rather than in a new command.

# Scope
- In:
  - Extend `_autofix_structure()` (logics_manager/audit.py) to detect an `# AI Context` section not immediately following the indicator block, and reposition it there using the existing `_extract_section_bounds`/`_insert_section` primitives.
  - Make the repair idempotent: running it on an already-correctly-positioned doc makes no change and reports nothing modified.
  - Verify the repair is reachable via both existing surfaces: `flow validate <ref> --apply-fixes` (per-ref) and `audit --autofix-structure` (corpus-wide) - no new command.
  - A test proving the motivating case: construct or use a doc exceeding the default 4000-char --max-chars budget, run `flow show`/`read_logics_doc` before and after the repair, and assert AI Context is absent before and present after.
- Out:
  - Running the repair automatically or in bulk as part of this delivery; it stays on-demand, triggered explicitly by the operator per-ref or corpus-wide, same as every other autofix-structure repair today.
  - Any change to the DoR/DoD or Status/Schema version repairs already in `_autofix_structure()`; those are untouched.

# Acceptance criteria
- AC2: `_autofix_structure()` repositions an existing doc's `# AI Context` section to immediately after its indicator block when found elsewhere, leaving every other section's content and order unchanged.
- AC3: The repair is reachable both per-ref (`flow validate <ref> --apply-fixes`) and corpus-wide (`audit --autofix-structure`), matching the existing autofix UX, with no new command surface.
- AC4: The repair is idempotent - running it twice on an already-repaired doc makes no further change.
- AC5: A test proves the concrete case that motivated this: a doc whose full content exceeds the default 4000-char `--max-chars` budget has its AI Context section included in a default-budget `flow show`/`read_logics_doc` read after the fix, where it was excluded before.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: `_autofix_structure()` repositions an existing doc's `# AI Context` section to immediately after its indicator block when found elsewhere, leaving every other section's content and order unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: The repair is reachable both per-ref (`flow validate <ref> --apply-fixes`) and corpus-wide (`audit --autofix-structure`), matching the existing autofix UX, with no new command surface.
- request-AC4 -> This backlog slice. Proof: AC4: The repair is idempotent - running it twice on an already-repaired doc makes no further change.
- request-AC5 -> This backlog slice. Proof: AC5: A test proves the concrete case that motivated this: a doc whose full content exceeds the default 4000-char `--max-chars` budget has its AI Context section included in a default-budget `flow show`/`read_logics_doc` read after the fix, where it was excluded before.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_069_ai_context_that_a_bounded_read_actually_reaches`
- Architecture decision(s): (none yet)
- Request: `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
- Primary task(s): `task_318_orchestrate_moving_ai_context_ahead_of_the_truncation_boundary`

# AI Context
- Summary: Extend autofix-structure to reposition AI Context in existing docs
- Keywords: scaffolded-backlog, extend autofix-structure to reposition ai context in existing docs, implementation-ready
- Use when: Implementing the scaffolded slice for Extend autofix-structure to reposition AI Context in existing docs.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - this is the actual on-demand repair path for the corpus that already exists
- Rationale: Set by scaffold input or defaulted for grooming.
