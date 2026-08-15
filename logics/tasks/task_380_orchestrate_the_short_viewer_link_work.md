## task_380_orchestrate_the_short_viewer_link_work - Orchestrate the short viewer link work
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
- [ ] 1. Resolve the short document id first: it is the whole reason the links go unwritten.
- [ ] 2. Then the project name, which only matters once a link is short enough to write at all.
- [ ] 3. Verify both on a running viewer by opening the links, not by reading the resolver.
- [ ] 4. Write the forms down where someone about to write a link will find them.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_825_resolve_a_document_from_its_short_id`
- `item_826_select_a_project_by_the_name_the_switcher_shows`
- `item_827_write_down_the_link_forms_where_a_writer_will_look`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_825_resolve_a_document_from_its_short_id`. Proof deferred to slice closeout.
- request-AC2 -> `item_825_resolve_a_document_from_its_short_id`. Proof deferred to slice closeout.
- request-AC3 -> `item_826_select_a_project_by_the_name_the_switcher_shows`. Proof deferred to slice closeout.
- request-AC4 -> `item_826_select_a_project_by_the_name_the_switcher_shows`. Proof deferred to slice closeout.
- request-AC5 -> `item_827_write_down_the_link_forms_where_a_writer_will_look`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`
- Product brief(s): `prod_100_a_viewer_link_worth_writing`
- Architecture decision(s): (none yet)
