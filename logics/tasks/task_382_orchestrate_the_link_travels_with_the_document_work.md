## task_382_orchestrate_the_link_travels_with_the_document_work - Orchestrate the link-travels-with-the-document work
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:59:35

# AI Context
- Summary: Sequences the four surfaces: one address reader, then MCP, then CLI, then the written convention for what neither covers.
- Keywords: orchestration, viewer link, four surfaces
- Use when: Implementing this task.
- Skip when: Anything about what focusing a document does once it opens.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Build the reader first: four surfaces are about to need the same answer, and building it per surface is how they come to disagree.
- [ ] 2. Then the MCP responses, which reach the assistants that read no instructions at all.
- [ ] 3. Then the CLI, which reaches the ones that never call a tool.
- [ ] 4. State the convention last, for what the first three cannot cover -- a document named rather than fetched.
- [ ] 5. Measure the payload growth on this corpus rather than asserting it is small, and verify each surface with a viewer running and with none.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_830_one_reader_for_where_the_viewer_is`
- `item_831_carry_the_link_in_the_mcp_responses`
- `item_832_print_the_link_from_the_cli`
- `item_833_state_the_convention_where_an_assistant_reads_its_instructions`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_830_one_reader_for_where_the_viewer_is`. Proof deferred to slice closeout.
- request-AC4 -> `item_830_one_reader_for_where_the_viewer_is`. Proof deferred to slice closeout.
- request-AC2 -> `item_831_carry_the_link_in_the_mcp_responses`. Proof deferred to slice closeout.
- request-AC4 -> `item_831_carry_the_link_in_the_mcp_responses`. Proof deferred to slice closeout.
- request-AC6 -> `item_831_carry_the_link_in_the_mcp_responses`. Proof deferred to slice closeout.
- request-AC3 -> `item_832_print_the_link_from_the_cli`. Proof deferred to slice closeout.
- request-AC4 -> `item_832_print_the_link_from_the_cli`. Proof deferred to slice closeout.
- request-AC5 -> `item_833_state_the_convention_where_an_assistant_reads_its_instructions`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_371_put_the_viewer_link_where_every_assistant_already_looks`
- Product brief(s): `prod_102_the_link_travels_with_the_document`
- Architecture decision(s): (none yet)
