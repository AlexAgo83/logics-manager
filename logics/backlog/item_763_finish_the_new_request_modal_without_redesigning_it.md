## item_763_finish_the_new_request_modal_without_redesigning_it - Finish the new-request modal without redesigning it
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
- Summary: The best-behaved surface in the viewer needs three small things: a dismiss glyph rather than a lowercase letter, a statement of where the document will be written, and a submit that waits until the form can be submitted.
- Keywords: new request modal, dismiss glyph, destination path, submit validation, preserve what works
- Use when: Making a small correction to the new-request modal.
- Skip when: Its placeholders, field order, button order and backdrop, which are correct and must not change.

# Problem
- The modal is the best-behaved surface in the viewer and needs three small things: a dismiss glyph rather than a lowercase letter, a statement of where the document will be written, and a submit action that waits until the form can be submitted.

# Scope
- In:
  - Replace the dismiss letter with a glyph.
  - State the path the document will be created at, as the title is typed.
  - Disable submit until the required field is filled.
  - Change nothing else.
- Out:
  - The placeholders, field order, button order and backdrop, which are correct.
  - What creating a request does after the modal closes.

# Acceptance criteria
- AC6: The dismiss control is a glyph.
- AC7: The destination path is stated before creation.
- AC8: Submit waits until the form can be submitted.
- AC9: Nothing else about the modal changes.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: The dismiss control is a glyph.
- request-AC7 -> This backlog slice. Proof: AC7: The destination path is stated before creation.
- request-AC8 -> This backlog slice. Proof: AC8: Submit waits until the form can be submitted.
- request-AC9 -> This backlog slice. Proof: AC9: Nothing else about the modal changes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_087_surfaces_that_read_like_they_were_finished`
- Architecture decision(s): (none yet)
- Request: `req_351_make_the_reader_readable_and_the_filter_panel_say_something`
- Primary task(s): `task_348_deliver_the_reader_the_modal_and_the_filter_panel`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
