## item_827_write_down_the_link_forms_where_a_writer_will_look - Write down the link forms where a writer will look
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Written where it is read
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:38:32

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: write, down, link, forms, writer, look
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Both short forms are only discoverable by reading `findFocusItem` and `set_request_project`, which is not where someone about to write a link looks.
- The long form went unused for exactly this reason: nothing that was going to be read said it existed.

# Scope
- In:
  - State the link forms -- document, project, both together -- where the viewer's other operator-facing behaviour is documented.
  - Show a real one, on this corpus, that resolves.
  - Say where the address comes from: `~/.cache/logics-manager/viewers.json` holds the running viewer's port and scheme, so a link is written against the viewer that is actually running rather than against the default port.
- Out:
  - A new document for three lines.
  - Documenting the URL contract in full.

# Acceptance criteria
- AC1: The short forms are written where the viewer's operator-facing behaviour is already described.
- AC2: The example given resolves against this corpus.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: The short forms are written where the viewer's operator-facing behaviour is already described.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_100_a_viewer_link_worth_writing`
- Architecture decision(s): (none yet)
- Request: `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`
- Primary task(s): `task_380_orchestrate_the_short_viewer_link_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_380_orchestrate_the_short_viewer_link_work` was finished via `logics-manager flow finish task` on 2026-08-15.
