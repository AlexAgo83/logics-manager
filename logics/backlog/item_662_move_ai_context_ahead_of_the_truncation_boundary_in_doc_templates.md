## item_662_move_ai_context_ahead_of_the_truncation_boundary_in_doc_templates - Move AI Context ahead of the truncation boundary in doc templates
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Doc generation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Every doc template writes `# AI Context` near the end of the body, after sections a bounded read frequently never reaches. A newly created doc inherits this today regardless of any repair applied to existing ones.

# Scope
- In:
  - Move the `# AI Context` block to immediately after the indicator block (before `# Needs`/`# Problem`/`# Context`, whichever applies) in each doc kind's template in logics_manager/flow/.
  - Cover request, backlog, and task templates at minimum; extend to product/roadmap/architecture templates if they also write an AI Context section.
  - Leave every other section's order and content unchanged.
- Out:
  - Any change to what AI Context contains; only its position moves.
  - The repair path for already-existing docs; that is the next slice.

# Acceptance criteria
- AC1: Every doc template (request, backlog, task, and any other kind that writes an AI Context section) places `# AI Context` immediately after the indicator block, before any other body section, for newly created docs.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Every doc template (request, backlog, task, and any other kind that writes an AI Context section) places `# AI Context` immediately after the indicator block, before any other body section, for newly created docs.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_069_ai_context_that_a_bounded_read_actually_reaches`
- Architecture decision(s): (none yet)
- Request: `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
- Primary task(s): `task_318_orchestrate_moving_ai_context_ahead_of_the_truncation_boundary`

# AI Context
- Summary: Move AI Context ahead of the truncation boundary in doc templates
- Keywords: scaffolded-backlog, move ai context ahead of the truncation boundary in doc templates, implementation-ready
- Use when: Implementing the scaffolded slice for Move AI Context ahead of the truncation boundary in doc templates.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - without this, every newly generated doc keeps reintroducing the problem the repair fixes on old ones
- Rationale: Set by scaffold input or defaulted for grooming.
