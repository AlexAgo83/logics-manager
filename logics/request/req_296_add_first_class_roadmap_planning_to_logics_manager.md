## req_296_add_first_class_roadmap_planning_to_logics_manager - Add first-class roadmap planning to Logics Manager
> From version: 2.18.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Roadmap planning
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Logics Manager should treat long-range roadmap planning as a first-class workflow surface instead of leaving MVP, V1, and version-slice intent buried in product briefs or specs.
- Operators and AI agents need a stable way to propose milestone plans such as 0.1 -> 0.2 -> 0.3 -> 1.0 from an existing corpus.
- Roadmap milestones must link back to existing requests, backlog items, tasks, specs, product briefs, and architecture decisions without replacing those docs.
- The CLI should let an agent create, inspect, validate, and refresh roadmap plans using bounded corpus context.
- The local viewer should make the roadmap understandable visually, including milestone order, linked refs, completion state, risks, cuts, and exit criteria.
- Validation should catch broken refs, empty milestones, unplanned open work, and stale roadmap links without forcing release workflow semantics onto product planning.
- The feature should be useful for a large new corpus such as CR League, where the missing object is an ordered product/action plan rather than another task list.

# Context
- Roadmap docs are product intent, not releases: a roadmap milestone may later map to a release, but it should exist before code is shipped.
- The existing Logics chain remains request -> backlog -> task; roadmap docs should group and sequence those refs by milestone.
- Companion docs already exist for product, architecture, and specs, so roadmap should likely be a companion/workflow-adjacent kind with its own directory and ref prefix.
- The viewer already has project tools and document screens; roadmap visualization can start as a dedicated screen and linked document kind before adding drag-and-drop planning.
- The CLI already has scaffolding and bounded context-pack commands, so the smallest useful implementation should reuse that machinery instead of adding a separate planning engine.
- Status vocabulary should be deliberately small for milestones: Draft, Planned, In progress, Validated, Deferred, Archived.
- A roadmap proposal command should be deterministic enough to hand off to another AI: produce a markdown doc with exact refs and explicit assumptions, not just chat prose.

# Acceptance criteria
- AC1: Logics Manager recognizes roadmap docs under `logics/roadmap/` with stable refs like `road_001_*` and includes them in sync/list/search/read/context-pack flows.
- AC2: A standard roadmap document contract supports milestones with label, goal, scope, cuts, linked refs, dependencies, risks, validation gates, exit criteria, and status.
- AC3: Roadmap refs and `Related roadmap` links are parsed consistently across request, backlog, task, product, architecture, and spec docs.
- AC4: CLI support can create or propose a roadmap from bounded corpus context and can show/validate an existing roadmap.
- AC5: Validation reports broken roadmap links, empty milestones, duplicate milestone labels, unknown milestone statuses, and open high-priority work not placed in any roadmap milestone when a roadmap exists.
- AC6: The viewer exposes a Roadmap screen that renders milestone order and linked refs, with a compact progress/status summary per milestone.
- AC7: Existing request/backlog/task/spec/product viewer cards and document previews show roadmap placement when available.
- AC8: Roadmap support does not treat milestones as releases and does not require release evidence unless a release workflow explicitly links to a milestone.
- AC9: Tests cover sync/indexing, CLI proposal/show/validate behavior, validation failures, viewer rendering, and context-pack inclusion.
- AC10: Documentation and help text make clear when to use roadmap versus request/backlog/task versus release.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_044_first_class_roadmap_planning`
- Architecture decision(s): (none yet)

# References
- `logics_manager/audit.py` currently declares workflow document kinds and recognized ref prefixes for request, backlog, task, product, architecture, and spec docs.
- `logics_manager/sync.py` powers `sync list-docs`, `read-doc`, `search-docs`, and `context-pack`, so roadmap docs must become discoverable there before other surfaces can rely on them.
- `logics_manager/flow/__init__.py` owns guarded workflow lifecycle commands and the existing `flow scaffold request-chain` path that creates request/product/backlog/task docs.
- `logics_manager/viewer.py` builds the local viewer payload from collected Logics items and serves the viewer endpoints.
- `clients/viewer/index.html` and `clients/viewer/src/browser-host/**` provide the browser viewer navigation, project screens, filtering, and document rendering surfaces.
- `clients/viewer/src/browser-host/constants.js` defines viewer stage labels, status options, and onboarding copy for supported Logics kinds.
- `tests/python/test_sync_cli.py`, `tests/python/test_flow_cli.py`, and `tests/viewer.browser-host.test.ts` cover the CLI and viewer behavior that roadmap support should extend.
- The CR League corpus in `../cr-league` has product, request, backlog, task, architecture, and spec docs, but no first-class object for ordered delivery milestones such as 0.1, 0.2, 0.3, and 1.0.

# AI Context
- Summary: Add first-class roadmap planning to Logics Manager
- Keywords: request-chain-scaffold, add first-class roadmap planning to logics manager, development-ready
- Use when: You need to implement or review the scaffolded workflow for Add first-class roadmap planning to Logics Manager.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_553_add_roadmap_document_kind_and_parsing_contract`
- `item_554_implement_roadmap_cli_propose_show_and_validate_commands`
- `item_555_render_roadmap_milestones_in_the_local_viewer`
- `item_556_connect_roadmap_validation_to_lint_audit_and_documentation`
