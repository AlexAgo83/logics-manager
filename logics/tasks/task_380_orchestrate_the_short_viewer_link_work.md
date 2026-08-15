## task_380_orchestrate_the_short_viewer_link_work - Orchestrate the short viewer link work
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: orchestrate, short, viewer, link, work
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Resolve the short document id first: it is the whole reason the links go unwritten.
- [x] 2. Then the project name, which only matters once a link is short enough to write at all.
- [x] 3. Verify both on a running viewer by opening the links, not by reading the resolver.
- [x] 4. Write the forms down where someone about to write a link will find them.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_825_resolve_a_document_from_its_short_id`
- `item_826_select_a_project_by_the_name_the_switcher_shows`
- `item_827_write_down_the_link_forms_where_a_writer_will_look`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_825_resolve_a_document_from_its_short_id`. Proof: opened on the running viewer, `?focus=req_368` reports "Focused logics/request/req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on.md." The full id, filename, relative path and absolute path forms are matched before the short form is tried, so none of them changed.
- request-AC2 -> This task, via `item_825_resolve_a_document_from_its_short_id`. Proof: `?focus=req_36` reports "Focus target not found: req_36" rather than opening one of req_360 to req_368. Covered in `tests/viewer.browser-host.test.ts`.
- request-AC3 -> This task, via `item_826_select_a_project_by_the_name_the_switcher_shows`. Proof: over HTTP against a viewer started for the measurement, `?project=logics-manager` and `?project=pom` both answer, an unknown name is refused with "Unknown project id.", and the opaque id keeps working. Covered in `tests/python/test_viewer_cli.py`.
- request-AC4 -> This task, via both slices. Proof: `?focus=item_821&project=logics-manager` combines them; the project is resolved per request before the payload the focus target is matched against is built.
- request-AC5 -> This task, via `item_827_write_down_the_link_forms_where_a_writer_will_look`. Proof: `docs/cli.md` states the short document form, the project name form, the combined form, and where the address comes from -- with `req_368`, which resolves against this corpus.

# Validation
- Both short forms opened on the running viewer over CDP, not read off the resolver.
- `tests/python/test_viewer_cli.py` (174) and `tests/viewer.browser-host.test.ts` (226) pass.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- The affordance was never missing; its address was. `?focus=` has worked for a long time and went unused because the shortest link carried 76 characters of slug.
- The habit half is recorded outside this corpus, in the assistant's own memory: naming a document and linking to it should be the same act, and the port is read from `~/.cache/logics-manager/viewers.json` rather than assumed.
- Found while checking this against the Settings restart button, and not fixed here: restarting a viewer bound to a fixed port fails to rebind and the viewer dies, leaving a stale registry claim. Reproduced twice on ports 8793 and 8794. With `--port 0` it comes back on a different port instead, which breaks any link written before the restart. Reported to the operator rather than folded into this request.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_825_resolve_a_document_from_its_short_id`, `item_826_select_a_project_by_the_name_the_switcher_shows`, `item_827_write_down_the_link_forms_where_a_writer_will_look`
- Related request(s): `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`

# Links
- Request: `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`
- Product brief(s): `prod_100_a_viewer_link_worth_writing`
- Architecture decision(s): (none yet)
