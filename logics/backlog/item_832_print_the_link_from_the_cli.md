## item_832_print_the_link_from_the_cli - Print the link from the CLI
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: The link arrives as data
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 18:31:49

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
- Priority: Medium
- Rationale: Most coding agents shell out rather than speak MCP

# Validation
- flow show prints a `- link:` line using viewer_url_for_ref; sync list-docs and search-docs each print a single `- open with:` line using viewer_url_template, in the same place the listing already states its bounds. Both are silent (no line at all) when no viewer is running -- verified against the unchanged-output case, not just a null field. Covered by test_flow_show_prints_a_link_when_a_viewer_is_running and test_sync_list_and_search_docs_print_the_viewer_link_once, plus absence assertions added to the existing flow-show/list-docs tests. Full suite: 1405 passed.

# Tasks
- `task_382_orchestrate_the_link_travels_with_the_document_work`

# Notes
- Task `task_382_orchestrate_the_link_travels_with_the_document_work` was finished via `logics-manager flow finish task` on 2026-08-15.
