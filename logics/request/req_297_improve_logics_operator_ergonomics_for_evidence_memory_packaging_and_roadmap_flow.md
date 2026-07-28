## req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow - Improve Logics operator ergonomics for evidence, memory, packaging, and roadmap flow
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 94
> Confidence: 90
> Complexity: High
> Theme: Operator ergonomics
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Logics blocking messages should provide copy-paste-safe remediation commands when the tool already knows the deterministic fix.
- Workflow status inputs should tolerate common casing and separator variants while preserving canonical status text in files.
- Release evidence recording should be hard to misuse at the end of a release, when exact version and SHA evidence matters most.
- Packaging checks should prove installed artifacts, not only source-tree behavior, before a release is considered healthy.
- RTK wrapper guidance should name known semantic traps so assistants do not wrap one-off commands incorrectly.
- Logics Manager should consume the new `cdx memory` surface for bounded, cleaned handoff context instead of scraping raw context files directly.
- The Logics viewer should expose cleaned CDX memory as a CDX sub-screen so operators can inspect handoff quality before injecting it into assistant context.
- Roadmap support should become useful in the daily flow: visible status, easy placement of refs into milestones, and closeout prompts that keep the plan current.

# Context
- Recent CDX contexts showed repeated Logics friction: indicator-gate lint failures, a status casing error (`In Progress` versus `In progress`), release evidence commands missing required fields, and wrapper semantics changing `npx` behavior.
- `logics-manager release evidence add --help` currently exits like an invalid command because argparse reports missing `gate_id`, `--kind`, `--status`, and `--summary` instead of showing help.
- `logics-manager sync update-indicators --help` lists flags but not the values or remediation examples an assistant can safely copy.
- `cdx memory list --json` returns structured current/global memory metadata, and `cdx memory show --json` returns raw content that may contain ANSI/TUI noise and huge spinner lines.
- The repo has first-class roadmap code and docs, but `logics-manager sync list-docs --kind roadmap --format json` returns zero items, so roadmap is a capability rather than an actively used planning object.
- Product decision: roadmap should have a top-level command surface (`logics-manager roadmap status/place`) with `flow roadmap` kept as a compatibility alias when cheap.
- Product decision: packaging verification should be two-tiered: a cheap metadata-vs-subpackages check in `ci:check`, and a slower clean-wheel install check in `doctor packaging` / release validation.
- Product decision: the viewer should add a CDX Memory sub-screen under the existing CDX area, showing scopes, cleanup quality, latest useful handoff, and warnings without editing Codex memory.
- The smallest useful delivery is a set of CLI and assistant-surface refinements with focused tests; avoid building a new planning database, AI planner, or memory store.
- Implementation guidance: deliver this broad request as separate implementation slices and commits when practical because it spans CLI help, release evidence, packaging, memory, and roadmap behavior.
- Implementation guidance: treat `cdx memory ... --json` as the official memory source; legacy `.cdx` file reads may exist only as degraded/unavailable fallbacks.
- Implementation guidance: roadmap prompts should support daily status and placement, stay non-blocking at closeout, and avoid becoming a full planner.
- Open question for the operator: whether to ship all slices in one release wave or separate commits. Recommendation: separate commits by slice.

# Acceptance criteria
- AC1: Indicator-gate lint failures print a copy-paste-safe `sync update-indicators` example and explicitly mention the `Non-semantic edit` escape hatch.
- AC2: Workflow status inputs accept common aliases such as `In Progress`, `in_progress`, and `in progress`, then persist the canonical status label.
- AC3: `release evidence add --help` shows help successfully, and evidence-add argument errors include a complete example command for the target gate.
- AC4: `ci:check` runs a cheap metadata-vs-subpackages packaging check, and `doctor packaging` / release validation can run a clean-wheel install check for critical CLI commands.
- AC5: RTK wrapper documentation and generated assistant instructions name safe forms for targeted npm commands, including `rtk npm exec -- vitest ...` instead of `rtk npx vitest ...`.
- AC6: An assistant-facing command can read `cdx memory` current/global scopes as JSON, clean ANSI/TUI noise, summarize quality signals, and emit a bounded context payload without directly depending on raw `.cdx/contexts` paths.
- AC7: The viewer exposes a CDX Memory sub-screen that reuses the cleaned memory payload, highlights quality warnings, and gives read-only access to current/global scopes.
- AC8: Top-level roadmap commands expose practical status and placement flows, with `flow roadmap` aliases kept when cheap.
- AC9: Task closeout or flow validation surfaces stale/missing roadmap placement as a non-blocking recommendation when roadmap docs exist, without making roadmap mandatory for repos that do not use it.
- AC10: Focused Python and TypeScript tests cover the changed CLI behavior, memory cleaning, viewer memory screen, packaging verification, and roadmap status/place behavior.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)

# References
- `logics_manager/lint.py` currently emits the indicator-gate hint with a placeholder command.
- `logics_manager/sync.py` owns sync update-indicators and the accepted workflow indicator fields.
- `logics_manager/release.py` owns release evidence plan/status/validate and evidence add behavior.
- `logics_manager/flow/__init__.py` normalizes active flow statuses and owns flow list, validate, scaffold, and roadmap commands.
- `logics_manager/assist_context.py` and `logics_manager/assist_support.py` own assistant-facing context assembly.
- `logics_manager/sync.py` powers sync list-docs/read-doc/search-docs/context-pack for roadmap discoverability.
- `pyproject.toml` uses explicit Python package metadata; shipped-wheel truth can diverge from checkout truth.
- `RTK.md` documents the noisy-command wrapper contract.
- `cdx memory --help` exposes current/global memory scopes and JSON output for direct Codex memory inspection.
- `logics/request/req_296_add_first_class_roadmap_planning_to_logics_manager.md` records first-class roadmap support, but this repo currently has no live roadmap docs.

# AI Context
- Summary: Improve Logics operator ergonomics for evidence, memory, packaging, and roadmap flow
- Keywords: request-chain-scaffold, improve logics operator ergonomics for evidence, memory, packaging, and roadmap flow, development-ready
- Use when: You need to implement or review the scaffolded workflow for Improve Logics operator ergonomics for evidence, memory, packaging, and roadmap flow.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_557_make_logics_remediation_messages_copy_paste_safe`
- `item_558_normalize_workflow_status_aliases_before_persistence`
- `item_559_harden_release_evidence_help_and_examples`
- `item_560_add_package_truth_checks_for_shipped_cli_behavior`
- `item_561_document_rtk_wrapper_safe_command_forms`
- `item_562_use_cdx_memory_as_the_structured_source_for_assistant_context`
- `item_563_make_roadmap_status_and_placement_part_of_the_daily_flow`
