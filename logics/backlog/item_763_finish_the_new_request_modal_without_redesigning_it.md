## item_763_finish_the_new_request_modal_without_redesigning_it - Finish the new-request modal without redesigning it
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 14:25:46

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

# Delivery notes
- Three things, nothing else. The placeholders, field order, button order and backdrop were correct and are untouched.
- The dismiss control was a lowercase `x` -- a letter, in a row of glyphs. It is `×` now.
- **The destination is stated as the fields are typed**, using the backend's own naming rule rather than an approximation of it. That meant reproducing `_slugify_viewer_doc` in the browser host, and the title falling back to the first line of the need -- which is the backend's rule, not a convenience added here: a modal silent when the title is blank would be silent in exactly the case the operator cannot predict the filename themselves.
- The request number comes from the loaded items by the same rule the backend uses (one above the highest `req_NNN`). When the items are not loaded the path is still stated, with `req_<next>` naming the part that is not yet decided. Inventing a number would be worse than admitting it is allocated later.
- **The naming rule now exists twice, so it has a drift gate.** `tests/viewer.request-modal.test.ts` runs the Python function and the JavaScript one against the same inputs -- punctuation, accents, case, over-length, leading and trailing separators -- and fails when they disagree. A stated path that is wrong is worse than no statement, because the operator has no reason to doubt it.
- Submit waits for Need. It used to be live, and pressing it moved focus into the empty field without saying why -- a control that looks ready and then refuses. Disabled and dimmed rather than hidden: a control that disappears leaves the operator wondering what they did.

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
