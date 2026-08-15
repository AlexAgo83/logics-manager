## item_825_resolve_a_document_from_its_short_id - Resolve a document from its short id
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: A link short enough to write
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: resolve, document, short
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `findFocusItem` matches the full id, the filename or a path, so the shortest link to `req_368` carries its entire 76-character slug.
- An answer naming several documents would be mostly URLs, so the links are not written and the operator navigates by hand -- an affordance that exists and is never used.

# Scope
- In:
  - Accept `kind_number` as a focus target and resolve it to the one document whose id begins with it.
  - Resolve to nothing when it does not identify exactly one document, and say so through the existing not-found message.
  - Keep every form that resolves today resolving to the same document.
- Out:
  - Fuzzy or partial-slug matching.
  - Changing what happens after the document is found.

# Acceptance criteria
- AC1: `req_368` resolves to the document whose id starts with `req_368_`.
- AC2: `req_36` resolves to nothing, and so does a short id no document carries.
- AC3: The full id, the filename, the relative path and the absolute path all still resolve as they do today.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `req_368` resolves to the document whose id starts with `req_368_`.
- request-AC2 -> This backlog slice. Proof: AC2: `req_36` resolves to nothing, and so does a short id no document carries.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_100_a_viewer_link_worth_writing`
- Architecture decision(s): (none yet)
- Request: `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`
- Primary task(s): `task_380_orchestrate_the_short_viewer_link_work`

# Priority
- Priority: High - the whole reason the affordance goes unused
- Rationale: Set by scaffold input or defaulted for grooming.
