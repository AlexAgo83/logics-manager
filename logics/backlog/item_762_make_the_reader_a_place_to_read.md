## item_762_make_the_reader_a_place_to_read - Make the reader a place to read
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 21:23:31

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

# Delivery notes
- Measured before and after on a live viewer at 1440px: the prose ran the full window and now sets at **72 characters a line** against the roughly 150 it set before. The measure is `72ch` on the prose column, not a percentage, so it holds at any window width.
- The column the measure frees carries the contents list -- what the sections are, how many there are, and which one is on screen. That is the navigation this screen did not have, and it is built from the rendered headings rather than woven into the markdown renderer, so it lists whatever produced them.
- Tables, `pre` blocks, diagrams and the chain graph opt out of the measure. They are not prose and are unreadable squeezed to a prose width.
- A document of two headings gets no list: a contents list you can see the end of anyway is a second copy of the screen. The measure still applies there, because the line length is wrong at any number of headings.
- Position is the topmost heading that has passed the top of the panel, not the first one intersecting it. A reader halfway through a long section sees no heading at all, and a list that then marks nothing says the reader is nowhere.
- **Found while checking the result:** the initial mark ran while the document panel was still hidden, so every rect was zero, every heading read as "already passed the top", and the list opened with its *last* section marked. It is deferred to the next frame now. Measured: `currentSection` was `Backlog` -- the last of eight -- and is `AI Context` after.
- Below 1100px the list goes and the measure stays. A contents column squeezed to nothing is worse than no column.
- The scroll listener returns its own detach, called before the next document installs one. Without it every reader opened leaves another listener marking headings that are no longer on the screen.

## Checked against the mockup, with two divergences recorded

`logics/external/mockup/reader_modal_filters_redesign.html` proposes both navigations in one left rail -- "On this page" above "Linked workflow". What shipped puts the contents list in a right rail and the linked workflow inline above the prose. Two reasons, and they are recorded rather than left as silent drift:

- **The chain is a Mermaid flowchart**, six nodes wide on this request. In a 200px rail it is unreadable at any zoom; inline it uses the prose column's full width, which is what a diagram needs.
- **The contents list sits on the side the reading eye leaves**, not the side it returns to. A left rail puts navigation in the path of every line's start.

Everything else the mockup proposes shipped as drawn: the reference and status above the title, the copy-path control beside it, the indicator chips, the section list with its count, and the position marker.

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

# Notes
- Task `task_348_deliver_the_reader_the_modal_and_the_filter_panel` was finished via `logics-manager flow finish task` on 2026-08-14.
