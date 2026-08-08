## item_642_say_what_a_proof_looks_like_and_produce_one_that_passes - Say what a proof looks like, and produce one that passes
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: A finding that teaches
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 23:40:07

# Problem
- The finding says a proof is missing and never says what a proof is. Three things are load-bearing and none is stated: the target must be `This task.`, the keyword must be `Proof:`, and there must be one line per criterion because a grouped line naming several counts for none.
- The repair the finding recommends writes `Evidence needed:` while the check looks for `Proof:`. Running the recommended remediation therefore produces lines the same finding still rejects.
- The scaffold generates grouped lines, so a corpus produced by the tool does not satisfy the gate the tool will apply to it at closeout. The reporter found the format by diffing what the repair wrote, which is discovery by archaeology.

# Scope
- In:
  - State the expected form in the finding itself, close enough to copy.
  - Make the repair write a line in the shape the check reads, and have the finding distinguish a criterion with no line from one whose line is not filled in.
  - Make the scaffold generate one line per criterion, so its own output passes.
  - Keep the placeholder recognisable as unfilled, and shorter than restating the criterion verbatim.
  - Cover the round trip: a finding, the repair it recommends, and the finding gone.
- Out:
  - Changing what the check accepts as a proof.
  - Accepting grouped lines, which would make one line's evidence stand for several criteria.
  - Rewording findings the reports do not mention.

# Acceptance criteria
- AC1: The finding states the expected form, including the target, the keyword, and one line per criterion.
- AC2: Running the recommended repair leaves a line the operator only has to fill, and the finding then says the proof is a placeholder rather than that it is missing. A repair cannot know how work was verified, so a repair that cleared the finding would make the gate pass on a placeholder -- the one outcome worse than a gate that is hard to satisfy.
- AC3: A freshly scaffolded corpus satisfies the closeout gate with no hand editing.
- AC4: The placeholder is recognisable as unfilled without restating the criterion.
- AC5: A test walks finding, repair, and clearance, and fails against the current implementation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `test_the_expected_form_names_the_target_and_the_keyword` in `tests/python/test_gate_you_can_satisfy.py`; the finding now prints the expected form for both the task and the backlog level.
- request-AC2 -> This backlog slice. Proof: `test_a_placeholder_is_not_a_proof` and `test_no_line_at_all_is_distinguished_from_an_unfilled_one` in the same file; the repair writes the `Proof:` keyword the check reads, and the finding reports a placeholder as a placeholder.
- request-AC3 -> This backlog slice. Proof: `test_the_scaffold_emits_one_traceability_line_per_criterion`, which scaffolds a real corpus and asserts one line per criterion; it fails against the previous implementation.
- request-AC8 -> This backlog slice. Proof: the six tests in `tests/python/test_gate_you_can_satisfy.py`.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- AC2 as originally written asked the repair to clear the finding it was recommended by. Implementing that would have made the gate pass on a placeholder: a repair can prepare a traceability line, it cannot know how the work was verified. AC2 was corrected during implementation to what is actually wanted -- the repair writes a line in the shape the check reads, and the finding then distinguishes a criterion with no line from one whose line is not filled in. The gate keeps its meaning and stops being a riddle.

# Links
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)
- Request: `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`
- Primary task(s): `task_313_orchestrate_making_the_closeout_gate_satisfiable`

# AI Context
- Summary: Say what a proof looks like, and produce one that passes
- Keywords: scaffolded-backlog, say what a proof looks like, and produce one that passes, implementation-ready
- Use when: Implementing the scaffolded slice for Say what a proof looks like, and produce one that passes.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the reported cost is reverse-engineering the format from a repair
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_313_orchestrate_making_the_closeout_gate_satisfiable`

# Notes
- Task `task_313_orchestrate_making_the_closeout_gate_satisfiable` was finished via `logics-manager flow finish task` on 2026-08-08.
