## req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence - Make a viewer link short enough to write in a sentence
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:38:32

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: viewer, link, short, enough, write, sentence
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Needs
- As an operator reading an assistant's answer, I need the documents it names to be links I can open, so that reading about a document and opening it are the same gesture.
- As whoever writes that answer -- an assistant or a person -- I need the link short enough to put inline in a sentence, or it will not be written at all.
- As an operator working across projects, I need a link to another project's document to be writable from memory.

# Context
- The viewer already focuses a document from the URL: `?focus=` is read by `focusRequest`, resolved by `findFocusItem`, and the card is revealed and selected. Nothing about the mechanism is missing.
- What is missing is a short form. `findFocusItem` matches the full id, the filename, or a path, so the shortest working link on this corpus is `http://127.0.0.1:8765/?focus=req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on` -- 96 characters of query for a document an operator calls `req_368`.
- That length is why the links are never written. An assistant naming five documents in one answer would spend more of the answer on URLs than on the answer, so it writes `req_368` as plain text and the operator navigates by hand. The affordance exists and is unused, which is the defect.
- The short form is unambiguous: workflow ids are `kind_number_slug` and the number is unique within its kind, so `req_368` identifies exactly one document. `req_36` does not, and must not resolve to anything.
- `?project=` has the same shape of problem for a different reason: it takes `_viewer_project_id`, the first twelve characters of a SHA-1 of the resolved path. `c0b5091ab49d` is not writable from memory, so a cross-project link is effectively unwritable without looking it up.
- The address does not have to be assumed. `~/.cache/logics-manager/viewers.json` records the running viewer's port and scheme -- it is what `logics-manager view` reads to say "reusing the viewer already running at ..." -- so whoever writes a link can read the real address once instead of hard-coding the default port, and can tell that no viewer is running rather than emitting a dead link.
- The operator asked for this directly, and asked to be given links rather than document names. The code half is what makes that possible; whether it is done consistently is a habit, recorded outside this corpus.

# Acceptance criteria
- AC1: `?focus=req_368` opens the viewer on that document, and the full id, filename and path forms keep working exactly as they do today.
- AC2: A short form that does not identify exactly one document resolves to nothing and says so, rather than opening whichever document happened to sort first.
- AC3: `?project=<name>` selects a known project by the name the switcher displays, and the existing opaque id keeps working.
- AC4: A link combining both -- a document in another project -- opens that document in that project.
- AC5: The short forms are documented where someone writing a link will look, not only in a test.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_100_a_viewer_link_worth_writing`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_020_local_web_viewer_for_cli_driven_logics_work.md
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/util.js
- logics_manager/viewer.py
- logics_manager/viewer_docs.py

# Backlog
- `item_825_resolve_a_document_from_its_short_id`
- `item_826_select_a_project_by_the_name_the_switcher_shows`
- `item_827_write_down_the_link_forms_where_a_writer_will_look`
