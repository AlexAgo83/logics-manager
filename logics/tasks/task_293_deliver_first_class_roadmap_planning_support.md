## task_293_deliver_first_class_roadmap_planning_support - Deliver first-class roadmap planning support
> From version: 2.18.0
> Schema version: 1.0
> Status: In progress
> Understanding: 92%
> Confidence: 88%
> Progress: 45%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Start with the data model: add the roadmap doc kind, ref prefix, directory discovery, template, and sync/context-pack inclusion with focused Python tests.
- [ ] 2. Implement the CLI surface next: propose/show/validate with dry-run behavior, deterministic markdown output, and tests that use a CR-League-shaped fixture.
- [ ] 3. Add viewer support after the indexed payload is stable: Roadmap screen, milestone rendering, linked-ref navigation, and roadmap placement badges/details.
- [ ] 4. Integrate governance last: lint/audit findings, docs/help text, and backwards-compatibility tests for repositories without roadmap docs.
- [ ] 5. Run targeted Python and viewer tests after each wave, then run `logics-manager lint --require-status` and `logics-manager audit --group-by-doc` before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_553_add_roadmap_document_kind_and_parsing_contract`
- `item_554_implement_roadmap_cli_propose_show_and_validate_commands`
- `item_555_render_roadmap_milestones_in_the_local_viewer`
- `item_556_connect_roadmap_validation_to_lint_audit_and_documentation`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.

# AI Context
- Summary: Deliver first-class roadmap planning support
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_296_add_first_class_roadmap_planning_to_logics_manager`
- Product brief(s): `prod_044_first_class_roadmap_planning`
- Architecture decision(s): (none yet)
