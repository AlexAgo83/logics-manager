## item_831_carry_the_link_in_the_mcp_responses - Carry the link in the MCP responses
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: The link arrives as data
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 18:31:49

# AI Context
- Summary: MCP responses carry the viewer link: one URL for a single document, one template for a listing, so the payload does not grow per row.
- Keywords: mcp payload, viewer link, url template, payload size
- Use when: Adding or reading a link field on an MCP response.
- Skip when: Changing what a tool selects or returns beyond the link.

# Problem
- Every assistant reading a Logics document through MCP receives its ref, title and content, and nothing that says where to open it.
- So linking requires knowing a convention, and an assistant that never read one names the document in plain text.

# Scope
- In:
  - A single-document response carries that document's link.
  - A multi-document response carries one template rather than a URL per row, because `list_logics_docs` returns hundreds and req_364 spent a slice shrinking these payloads.
  - Measure the added bytes on this corpus and state them.
- Out:
  - Adding a link to responses that name no document.
  - Changing what any tool returns beyond this addition.
  - Embedding the address anywhere it can outlive the viewer it names. A payload served from a cache -- which item_841 of req_373 is about to make more likely -- would carry the port it was built with, and req_370 left a `--port 0` viewer restarting onto a different one. The link is read at response time or it is not carried.

# Acceptance criteria
- AC1: `read_logics_doc` returns a link that opens that document.
- AC2: `list_logics_docs`, `search_logics_docs`, `list_active_work` and `list_companion_docs` carry one template each, not one URL per row.
- AC3: With no viewer running the field is absent and every tool still answers.
- AC4: The payload growth is measured on this corpus and does not scale with the number of rows.
- AC5: A response served from a cache carries no address it did not read for that response.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC5: the address is read when the response is written, so a payload served from a cache cannot carry a link to a viewer that has moved or stopped.
- request-AC2 -> This backlog slice. Proof: AC1: `read_logics_doc` returns a link that opens that document.
- request-AC4 -> This backlog slice. Proof: AC2: `list_logics_docs`, `search_logics_docs`, `list_active_work` and `list_companion_docs` carry one template each, not one URL per row.
- request-AC6 -> This backlog slice. Proof: AC3: With no viewer running the field is absent and every tool still answers.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_102_the_link_travels_with_the_document`
- Architecture decision(s): (none yet)
- Request: `req_371_put_the_viewer_link_where_every_assistant_already_looks`
- Primary task(s): `task_382_orchestrate_the_link_travels_with_the_document_work`

# Priority
- Priority: High
- Rationale: The surface that reaches assistants who read no instructions

# Validation
- read_logics_doc returns viewer_url (a full URL with ?focus=<ref>&read=1); list_logics_docs, search_logics_docs, list_active_work and list_companion_docs each return one viewer_url_template (?focus={ref}&read=1) instead of a URL per row. Both read running_viewer() at response-build time -- never stored -- and the field is absent (not null) when nothing is running. Measured on this repo's corpus: list_logics_docs at limit=200 grew by 67 bytes total (one template field), not per-row. Covered by test_mcp_read_and_list_tools_carry_the_viewer_link_when_one_is_running and the existing read/list/search test's absence assertions in tests/python/test_logics_manager_mcp.py.

# Tasks
- `task_382_orchestrate_the_link_travels_with_the_document_work`

# Notes
- Task `task_382_orchestrate_the_link_travels_with_the_document_work` was finished via `logics-manager flow finish task` on 2026-08-15.
