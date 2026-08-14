## item_761_stop_the_reader_leading_with_a_path_in_capitals - Stop the reader leading with a path in capitals
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 14:17:44

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

# Delivery notes
- The eyebrow carried the document's full path, uppercased across the width by the stylesheet, above the title that already named the document. It identifies the document the way the details panel does now -- reference, then status -- and the badge beside the title carries the stage, so the two surfaces state the same four facts in the same order.
- `text-transform` is gone from the rule rather than overridden for corpus documents. Every screen that uses this eyebrow -- Settings, the MCP connector -- carries text nobody wrote in capitals, and uppercasing a snake_case slug strips the shape a reader recognises the word by. The letter-spacing went with it: it exists to keep uppercase legible and only widens lowercase.
- The path is still here, behind a copy control beside the title, and the path itself is in the `title` as well as the `aria-label`. A control whose only statement of what it copies is invisible offers the path on demand to a screen reader and to nobody else.
- The copy does not go through `withPrimaryAction`. Copying is instantaneous and touches nothing, and the single-action gate would make the control refuse while a refresh was in flight -- something the operator has to wait for, to copy a string the screen is already holding.
- The regression needed two halves, for the reason `item_737` recorded: the harness fixture had no such control, so an assertion that the path is still reachable would have passed against a DOM that could not show it. The fixture carries the control and the stylesheet is asserted as a file.

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
