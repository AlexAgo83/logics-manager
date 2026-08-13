## item_762_make_the_reader_a_place_to_read - Make the reader a place to read
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Prose runs at roughly 150 characters a line, the eight sections have no contents list or position indicator, and the linked workflow -- the only navigation the reader has -- is the only thing collapsed.
- Keywords: reading measure, line length, section contents, position indicator, linked workflow, collapsed navigation
- Use when: Changing the reader's layout, navigation, or how it presents a document's sections.
- Skip when: What a document contains, and how Markdown is rendered.

# Problem
- Prose runs at roughly 150 characters per line, the document's eight sections have no contents list and no position indicator, and the one navigational element -- the linked workflow -- is the only thing collapsed.

# Scope
- In:
  - Set the prose at a readable measure and put navigation in the width that frees.
  - List the document's sections, so its length is visible and a reader can jump within it.
  - Show the linked workflow without requiring it to be unfolded.
- Out:
  - What a document contains, and how it is rendered from Markdown.

# Acceptance criteria
- AC2: Prose is at a readable measure and the freed width carries navigation.
- AC3: Sections are listed with the reader's position visible.
- AC4: The linked workflow is visible and leads to what it names.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: Prose is at a readable measure and the freed width carries navigation.
- request-AC3 -> This backlog slice. Proof: AC3: Sections are listed with the reader's position visible.
- request-AC4 -> This backlog slice. Proof: AC4: The linked workflow is visible and leads to what it names.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_087_surfaces_that_read_like_they_were_finished`
- Architecture decision(s): (none yet)
- Request: `req_351_make_the_reader_readable_and_the_filter_panel_say_something`
- Primary task(s): `task_348_deliver_the_reader_the_modal_and_the_filter_panel`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
