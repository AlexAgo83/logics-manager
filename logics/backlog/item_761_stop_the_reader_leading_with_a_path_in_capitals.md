## item_761_stop_the_reader_leading_with_a_path_in_capitals - Stop the reader leading with a path in capitals
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The reader's eyebrow renders the document's full path uppercased across the width, above the title it duplicates -- a snake_case slug in capitals, the least readable form the same information could take.
- Keywords: reader eyebrow, uppercased path, document identity, ref and title, copy path, details panel agreement
- Use when: Changing how the reader or the details panel identifies a document.
- Skip when: The details panel's own redesign, which owns the other half of the agreement.

# Problem
- The reader's eyebrow renders the document's full path uppercased across the width, above the title it duplicates. A snake_case slug in capitals is the least readable form the same information could take, and it is the loudest element on a screen whose purpose is reading.

# Scope
- In:
  - Identify the document by its reference and title, with the full path available on demand.
  - Stop uppercasing text that was not written in capitals.
  - Agree with the details panel on one way of identifying a document.
- Out:
  - The details panel's own redesign, which owns the other half of that agreement.

# Acceptance criteria
- AC1: Reference and title identify the document; the path is on demand and nothing is uppercased.
- AC5: Reader and details panel identify a document the same way.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Reference and title identify the document; the path is on demand and nothing is uppercased.
- request-AC5 -> This backlog slice. Proof: AC5: Reader and details panel identify a document the same way.

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
