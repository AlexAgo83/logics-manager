## task_294_orchestrate_logics_operator_ergonomics_improvements - Orchestrate Logics operator ergonomics improvements
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 94
> Confidence: 90
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- Deliver this broad request as separate implementation slices and commits when practical.
- Implement `cdx memory` integration before the viewer work that depends on it.
- Keep roadmap support focused on daily `status` and `place`, with non-blocking closeout recommendations.
- Do not build a new planning database, AI roadmap planner, or memory store in this wave.

# Plan
- [ ] 1. Slice 1: Fix copy-paste-safe remediation messages for indicator lint and update-indicators help. Run focused CLI/help tests.
- [ ] 2. Slice 2: Add shared status alias normalization and wire it into status-writing paths. Run status normalization tests.
- [ ] 3. Slice 3: Harden release evidence help and missing-field examples. Run release CLI tests.
- [ ] 4. Slice 4: Add packaging truth checks in two tiers: metadata coverage in `ci:check`, clean-wheel install proof in `doctor packaging` / release validation. Run packaging tests and the release-adjacent check.
- [ ] 5. Slice 5: Update RTK wrapper-safe documentation and generated assistant instructions. Run instruction snapshot tests.
- [ ] 6. Slice 6: Add cdx-memory assistant context reading, cleaning, and the read-only CDX Memory viewer sub-screen. Run noisy-memory fixture and viewer-state tests.
- [ ] 7. Slice 7: Add top-level `logics-manager roadmap status/place` daily-flow commands, optional cheap `flow roadmap` aliases, and non-blocking closeout recommendations. Run roadmap CLI/audit tests.
- [ ] 8. Closeout: run `npm run ci:check` or the smallest equivalent full local gate available, plus `logics-manager lint --require-status`, `logics-manager audit --group-by-doc`, and `git diff --check`; record which slices shipped and which were deliberately deferred.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Delivery guidance
- Prefer separate implementation commits by slice because this request spans unrelated operational surfaces.
- Implement `cdx memory` integration before the viewer work that depends on it.
- Keep roadmap commands focused on `status` and `place`; do not build a full planner.
- Keep roadmap closeout recommendations non-blocking.

# Backlog
- `item_557_make_logics_remediation_messages_copy_paste_safe`
- `item_558_normalize_workflow_status_aliases_before_persistence`
- `item_559_harden_release_evidence_help_and_examples`
- `item_560_add_package_truth_checks_for_shipped_cli_behavior`
- `item_561_document_rtk_wrapper_safe_command_forms`
- `item_562_use_cdx_memory_as_the_structured_source_for_assistant_context`
- `item_563_make_roadmap_status_and_placement_part_of_the_daily_flow`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Evidence needed: Workflow status inputs accept common aliases such as `In Progress`, `in_progress`, and `in progress`, then persist the canonical status label.
- request-AC3 -> This task. Evidence needed: `release evidence add --help` shows help successfully, and evidence-add argument errors include a complete example command for the target gate.
- request-AC5 -> This task. Evidence needed: RTK wrapper documentation and generated assistant instructions name safe forms for targeted npm commands, including `rtk npm exec -- vitest ...` instead of `rtk npx vitest ...`.
- request-AC7 -> This task. Evidence needed: The viewer exposes a CDX Memory sub-screen that reuses the cleaned memory payload, highlights quality warnings, and gives read-only access to current/global scopes.
- request-AC9 -> This task. Evidence needed: Task closeout or flow validation surfaces stale/missing roadmap placement as a non-blocking recommendation when roadmap docs exist, without making roadmap mandatory for repos that do not use it.
- request-AC10 -> This task. Evidence needed: Focused Python and TypeScript tests cover the changed CLI behavior, memory cleaning, viewer memory screen, packaging verification, and roadmap status/place behavior.
- request-AC2 -> This task. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC3 -> This task. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC5 -> This task. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC7 -> This task. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC9 -> This task. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC10 -> This task. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- Implemented operator ergonomics slices: status alias normalization, copy-paste-safe lint/update-indicators guidance, release evidence help examples, packaging doctor checks, RTK guidance, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed; lint passed; audit passed with only deferred traceability warnings for in-progress request chains; git diff --check passed.
- Finish workflow executed on 2026-07-28.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-07-28.
- Linked backlog item(s): `item_557_make_logics_remediation_messages_copy_paste_safe`, `item_558_normalize_workflow_status_aliases_before_persistence`, `item_559_harden_release_evidence_help_and_examples`, `item_560_add_package_truth_checks_for_shipped_cli_behavior`, `item_561_document_rtk_wrapper_safe_command_forms`, `item_562_use_cdx_memory_as_the_structured_source_for_assistant_context`, `item_563_make_roadmap_status_and_placement_part_of_the_daily_flow`
- Related request(s): `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`

# AI Context
- Summary: Orchestrate Logics operator ergonomics improvements
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
