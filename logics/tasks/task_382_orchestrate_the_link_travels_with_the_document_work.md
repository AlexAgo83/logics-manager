## task_382_orchestrate_the_link_travels_with_the_document_work - Orchestrate the link-travels-with-the-document work
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 18:31:48

# AI Context
- Summary: Sequences the four surfaces: one address reader, then MCP, then CLI, then the written convention for what neither covers.
- Keywords: orchestration, viewer link, four surfaces
- Use when: Implementing this task.
- Skip when: Anything about what focusing a document does once it opens.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Build the reader first: four surfaces are about to need the same answer, and building it per surface is how they come to disagree.
- [x] 2. Then the MCP responses, which reach the assistants that read no instructions at all.
- [x] 3. Then the CLI, which reaches the ones that never call a tool.
- [x] 4. State the convention last, for what the first three cannot cover -- a document named rather than fetched.
- [x] 5. Measure the payload growth on this corpus rather than asserting it is small, and verify each surface with a viewer running and with none.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_830_one_reader_for_where_the_viewer_is`
- `item_831_carry_the_link_in_the_mcp_responses`
- `item_832_print_the_link_from_the_cli`
- `item_833_state_the_convention_where_an_assistant_reads_its_instructions`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_830_one_reader_for_where_the_viewer_is`. Proof deferred to slice closeout.
- request-AC4 -> `item_830_one_reader_for_where_the_viewer_is`. Proof deferred to slice closeout.
- request-AC2 -> `item_831_carry_the_link_in_the_mcp_responses`. Proof deferred to slice closeout.
- request-AC4 -> `item_831_carry_the_link_in_the_mcp_responses`. Proof deferred to slice closeout.
- request-AC6 -> `item_831_carry_the_link_in_the_mcp_responses`. Proof deferred to slice closeout.
- request-AC3 -> `item_832_print_the_link_from_the_cli`. Proof deferred to slice closeout.
- request-AC4 -> `item_832_print_the_link_from_the_cli`. Proof deferred to slice closeout.
- request-AC5 -> `item_833_state_the_convention_where_an_assistant_reads_its_instructions`. Proof deferred to slice closeout.
- request-AC7 -> `item_831_carry_the_link_in_the_mcp_responses`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: item_830's running_viewer() answers whether a viewer is running and its scheme/host/port, or nothing, bounded at 0.3s (test_running_viewer_reports_scheme_host_and_port, test_running_viewer_is_bounded_against_a_port_that_never_answers).
- request-AC2 -> This task. Proof: item_831 -- read_logics_doc carries viewer_url; list_logics_docs/search_logics_docs/list_active_work/list_companion_docs each carry one viewer_url_template (test_mcp_read_and_list_tools_carry_the_viewer_link_when_one_is_running).
- request-AC3 -> This task. Proof: item_832 -- flow show prints a link line, sync list-docs/search-docs print the template once (test_flow_show_prints_a_link_when_a_viewer_is_running, test_sync_list_and_search_docs_print_the_viewer_link_once).
- request-AC4 -> This task. Proof: every surface's absence case is tested explicitly -- no field/line at all with no viewer running, not just a null value (test_mcp_read_list_search_and_context_tools's absence assertions, test_flow_show_reads_workflow_doc_content, test_running_viewer_is_absent_with_no_registry_or_a_dead_claim).
- request-AC5 -> This task. Proof: item_833 -- logics/instructions.md and the implement-task skill both state the convention and point at docs/cli.md for the URL grammar, regenerated from _build_claude_instructions so the checked-out copy matches the source of truth.
- request-AC6 -> This task. Proof: item_831 measured list_logics_docs at limit=200 growing by 67 bytes total, one template field, not per row.
- request-AC7 -> This task. Proof: viewer_url_for_ref/viewer_url_template call running_viewer() at response-build time on every call, never cached or stored with the payload.

# Validation
- (no validation recorded yet)
- tests/python (1406 passed) + vitest (235 passed) on 2026-08-15
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- All four backlog slices landed: item_830 (running_viewer() reader in viewer_registry.py, bounded at 0.3s, never guesses a default port), item_831 (read_logics_doc carries viewer_url; list_logics_docs/search_logics_docs/list_active_work/list_companion_docs each carry one viewer_url_template, measured at +67 bytes total for 200 rows, not per row), item_832 (flow show/sync list-docs/search-docs print the same link/template, silent when no viewer runs), item_833 (the convention stated in logics/instructions.md and the implement-task skill, both pointing at docs/cli.md for the URL grammar rather than restating it). Every surface tested both with a viewer running and with none. Full suite: 1406 passed.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_830_one_reader_for_where_the_viewer_is`, `item_831_carry_the_link_in_the_mcp_responses`, `item_832_print_the_link_from_the_cli`, `item_833_state_the_convention_where_an_assistant_reads_its_instructions`
- Related request(s): `req_371_put_the_viewer_link_where_every_assistant_already_looks`

# Links
- Request: `req_371_put_the_viewer_link_where_every_assistant_already_looks`
- Product brief(s): `prod_102_the_link_travels_with_the_document`
- Architecture decision(s): (none yet)
