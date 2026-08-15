## req_371_put_the_viewer_link_where_every_assistant_already_looks - Put the viewer link where every assistant already looks
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:28:38

# AI Context
- Summary: req_369 made the link writable and taught one assistant the habit. This makes it arrive with the document, for all of them.
- Keywords: viewer link, mcp payload, cli output, instructions, an instruction tells a payload gives
- Use when: A convention is being followed unevenly and could be data instead.
- Skip when: The URL forms themselves -- req_369 settled those.

# Needs
- As an operator reading any assistant's answer, I need the documents it names to be links I can open, whichever assistant wrote it and whichever surface it read the document through.
- As an assistant naming a document, I need its link to arrive with the document, so that linking costs nothing and needs no convention I have to remember.
- As an operator, I need a link that is absent rather than wrong when no viewer is running.

# Context
- req_369 made the link short enough to write -- `?focus=req_368` instead of 76 characters of slug -- and recorded the habit in one assistant's own memory. That fixes one assistant, in one project, for as long as the memory holds.
- The lesson of req_369 is the one that generalises: `?focus=` had worked for a long time and went unused because it was not where the writer was looking. An instruction tells; a payload gives. A convention in a file is followed by whoever read it and remembers it, which is not a mechanism.
- Every assistant that reads a Logics document goes through one of four surfaces: the MCP tools (`read_logics_doc`, `list_logics_docs`, `search_logics_docs`, `list_active_work`, `list_companion_docs`), the CLI (`flow show`, `sync list-docs`, `sync search-docs`), the bundled skills in `logics_manager/skill_assets/`, or `logics/instructions.md`. None of the four mentions the viewer link.
- The address is knowable: the viewer registry in the user's cache directory (viewers.json) records the running viewer's port and scheme, and `claim_or_reuse` already probes it. But `viewer_registry.py` exposes no reader for 'is a viewer running, and at what address' -- only `claim_or_reuse`, which binds. Four surfaces each deriving that separately is how they come to disagree.
- Payload size is a real constraint, not a hypothetical: req_364 measured the audit payload at 0.479 MB and spent a slice getting it to 0.190. `read_logics_doc` returns one document and can carry a URL; `list_logics_docs` returns hundreds of rows and must not carry hundreds of near-identical ones.
- The address can go stale in a way none of the four surfaces would notice: req_370 left a viewer started with `--port 0` restarting onto a different port, and req_373 is about to stop rebuilding a payload whose corpus has not changed. A link built once and cached would name a port nothing answers, which is worse than no link at all -- so it is read when the response is written, not stored with it.
- None of this makes the link mandatory -- an assistant can ignore a field as easily as a convention. What changes is the cost: no form to know, no port to guess, no lookup to make.

# Acceptance criteria
- AC1: One reader answers 'is a viewer running, and at what address', and every surface here uses it rather than deriving it again.
- AC2: A single-document MCP response carries that document's viewer link; a multi-document response carries what is needed to build one without repeating it per row.
- AC3: The CLI commands that show or list documents print the link for what they showed.
- AC4: When no viewer is running, no surface emits a link, and nothing fails because of it.
- AC7: No surface serves an address it did not read for that response, so a cached payload cannot carry a link to a viewer that has moved or stopped.
- AC5: The convention is stated in `logics/instructions.md` and in the bundled skills, for the case where an assistant names a document it did not fetch.
- AC6: The added payload is measured, not assumed: the multi-document responses do not grow per row.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_102_the_link_travels_with_the_document`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_100_a_viewer_link_worth_writing.md
- logics_manager/viewer_registry.py
- logics_manager/mcp.py
- logics_manager/sync.py
- logics/instructions.md

# Backlog
- `item_830_one_reader_for_where_the_viewer_is`
- `item_831_carry_the_link_in_the_mcp_responses`
- `item_832_print_the_link_from_the_cli`
- `item_833_state_the_convention_where_an_assistant_reads_its_instructions`
