## task_294_orchestrate_logics_operator_ergonomics_improvements - Orchestrate Logics operator ergonomics improvements
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Slice 1: Fix copy-paste-safe remediation messages for indicator lint and update-indicators help. Run focused CLI/help tests.
- [ ] 2. Slice 2: Add shared status alias normalization and wire it into status-writing paths. Run status normalization tests.
- [ ] 3. Slice 3: Harden release evidence help and missing-field examples. Run release CLI tests.
- [ ] 4. Slice 4: Add packaging truth checks, starting with metadata coverage and a clean-wheel doctor command if it stays small. Run packaging tests and the release-adjacent check.
- [ ] 5. Slice 5: Update RTK wrapper-safe documentation and generated assistant instructions. Run instruction snapshot tests.
- [ ] 6. Slice 6: Add cdx-memory assistant context reading and cleaning. Run noisy-memory fixture tests.
- [ ] 7. Slice 7: Add roadmap status/place daily-flow commands and non-blocking closeout recommendations. Run roadmap CLI/audit tests.
- [ ] 8. Closeout: run `npm run ci:check` or the smallest equivalent full local gate available, plus `logics-manager lint --require-status`, `logics-manager audit --group-by-doc`, and `git diff --check`; record which slices shipped and which were deliberately deferred.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_557_make_logics_remediation_messages_copy_paste_safe`
- `item_558_normalize_workflow_status_aliases_before_persistence`
- `item_559_harden_release_evidence_help_and_examples`
- `item_560_add_package_truth_checks_for_shipped_cli_behavior`
- `item_561_document_rtk_wrapper_safe_command_forms`
- `item_562_use_cdx_memory_as_the_structured_source_for_assistant_context`
- `item_563_make_roadmap_status_and_placement_part_of_the_daily_flow`

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
- Summary: Orchestrate Logics operator ergonomics improvements
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
