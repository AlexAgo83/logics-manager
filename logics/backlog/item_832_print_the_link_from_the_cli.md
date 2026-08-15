## item_832_print_the_link_from_the_cli - Print the link from the CLI
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: The link arrives as data
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:59:35

# AI Context
- Summary: `flow show` and the listing commands print where to open what they printed, for assistants that shell out instead of calling a tool.
- Keywords: cli output, viewer link, flow show, list-docs
- Use when: Changing what these commands print.
- Skip when: JSON output -- that is the MCP slice.

# Problem
- `flow show`, `sync list-docs` and `sync search-docs` are how an assistant working in a terminal reads the corpus, and none of them says where to open what it printed.
- The MCP work does not reach them: they never call a tool.

# Scope
- In:
  - Print the link for the document `flow show` showed.
  - Print the base form once for a listing, in the same place a listing already states its bounds.
  - Say nothing when no viewer is running -- a line saying there is no viewer is noise in a command about documents.
- Out:
  - Adding the link to JSON output, which is the MCP slice's job.
  - Changing what these commands select or how they bound themselves.

# Acceptance criteria
- AC1: `flow show <ref>` prints a link that opens that document.
- AC2: A listing prints the form once, not per row.
- AC3: With no viewer running the output is exactly what it is today.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: `flow show <ref>` prints a link that opens that document.
- request-AC4 -> This backlog slice. Proof: AC2: A listing prints the form once, not per row.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_102_the_link_travels_with_the_document`
- Architecture decision(s): (none yet)
- Request: `req_371_put_the_viewer_link_where_every_assistant_already_looks`
- Primary task(s): `task_382_orchestrate_the_link_travels_with_the_document_work`

# Priority
- Priority: Medium - most coding agents shell out rather than speak MCP
- Rationale: Set by scaffold input or defaulted for grooming.
