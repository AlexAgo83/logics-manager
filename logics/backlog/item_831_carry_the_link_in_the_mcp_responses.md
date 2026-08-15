## item_831_carry_the_link_in_the_mcp_responses - Carry the link in the MCP responses
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: The link arrives as data
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:59:34

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

# Acceptance criteria
- AC1: `read_logics_doc` returns a link that opens that document.
- AC2: `list_logics_docs`, `search_logics_docs`, `list_active_work` and `list_companion_docs` carry one template each, not one URL per row.
- AC3: With no viewer running the field is absent and every tool still answers.
- AC4: The payload growth is measured on this corpus and does not scale with the number of rows.

# AC Traceability
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
- Priority: High - the surface that reaches assistants who read no instructions
- Rationale: Set by scaffold input or defaulted for grooming.
