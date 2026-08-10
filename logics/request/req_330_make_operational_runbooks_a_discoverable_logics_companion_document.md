## req_330_make_operational_runbooks_a_discoverable_logics_companion_document - Make operational runbooks a discoverable Logics companion document
> From version: 2.21.4
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Complexity: High
> Theme: Discoverable operational knowledge
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 23:54:13

# AI Context
- Summary: Make operational runbooks a discoverable Logics companion document
- Keywords: request-chain-scaffold, make operational runbooks a discoverable logics companion document, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make operational runbooks a discoverable Logics companion document.
- Skip when: The change is unrelated to this scaffolded request chain.

# Needs
- Keep operational procedures as first-class Logics documents without forcing them into the request-to-task delivery lifecycle.
- Let an agent identify a project's runbooks immediately, before it invents or repeats an operational procedure.
- Browse and search runbooks by a small controlled category vocabulary, then see how each one relates to delivery work.
- Keep the delivery a thin extension of the existing companion-document machinery (creation, search, graph rendering) so one more kind stays a predictable, mechanical addition rather than a growing set of bespoke concepts.

# Context
- Existing runbooks in sibling projects cover releases, security, restore, support, infrastructure runners, application validation, UI capture, and asset preparation. Their shared shape is durable operational knowledge: trigger, prerequisites, procedure, verification, and sometimes rollback. They are neither requests, backlog items, nor execution tasks.
- Logics already distinguishes lifecycle workflow documents from companion documents such as product briefs, roadmaps, architecture decisions, and specifications. Runbooks belong on the companion side: they may link to delivery work, but must not gain progress, promotion, or closeout semantics.
- The current kind registries are intentionally bounded but duplicated across linting, audit, sync, MCP, and the viewer. The delivery must add one runbook kind consistently to every supported surface rather than creating a one-off folder the tools cannot see.
- Agents receive repository instructions before they inspect the tree. Discovery must therefore be explicit in generated Logics instructions and the generated index, with one stable directory and one bounded list/search command. A convention known only by humans is not enough.
- The codebase already has a generic companion-document creator, a generic bounded document search, and a generic chain-graph renderer that other companion kinds (product briefs, roadmaps, architecture decisions) reuse as-is. The runbook contract and its match/graph behavior should extend those, not stand up parallel bespoke subsystems, so the surface an agent has to remember stays the same shape it already knows for every other kind.
- Runbooks are created deliberately, the same way as any other companion document: through the existing companion-document creation path, starting as Draft until verified. There is no automated capture pipeline that mines task history for reusable learning.
- Runbook help cannot become a delivery obstacle. Suggestions are advisory and explainable; no result or ignored suggestion can block work or task closeout.
- Cross-repository migration is deliberately out of scope for this repository and for this delivery. Existing sibling-project runbooks are not imported, copied, or rewritten here; if an operator later wants that, it is a separate future request scoped in the project that owns those legacy docs.

# Acceptance criteria
- AC1: Logics recognizes a runbook as a companion document stored under `logics/runbook/` with a `run_` reference, Draft, Active, or Archived status, category metadata, verification metadata, reusable-problem/solution content, and normal structural links.
- AC2: A generated repository instruction tells an agent where project runbooks live, how to find matching runbooks, and to consult relevant runbooks before operational work; the generated Logics index exposes the same collection.
- AC3: The supported CLI, bounded sync reads/searches/context, lint/audit, and MCP surfaces accept and return runbooks consistently without treating them as active delivery work.
- AC4: Matching runbooks can be found from a concise operational intent, failure symptom, affected path, or task context, and relevant results are available to an agent without a full-corpus read.
- AC5: Workshop places Runbooks between Commands and Explorer; it can filter and search runbooks, show their category and verification metadata, transition their status through the supported mutation path, and render a runbook-book graph from category to runbook to linked Logics documents, reusing the existing chain-graph renderer with a new library resolver.
- AC6: The graph remains useful when a runbook has no delivery link and does not replace the existing request-chain graph.
- AC7: Runbooks are created deliberately through the existing companion-document creation path, the same one used for every other companion kind. Automated cross-repository discovery/import and automatic capture-from-task tooling are out of scope for this delivery.
- AC8: Validation covers the new document contract and every affected public surface, including agent-facing discovery text, matching behavior, and the viewer graph/filter behavior.
- AC9: Matching remains low-friction: suggestions are non-blocking, explain why they appeared, and no-match is a normal outcome.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_074_a_discoverable_library_of_operational_runbooks`
- Architecture decision(s): (none yet)

# References
- docs/runbooks/viewer-ui-campaign.md
- ../remote-ops/docs/runbook-add-repo-runners.md
- ../cr-league/docs/ai-app-test-runbook.md
- ../cts/docs/rh-recruit-release-runbook.md
- logics_manager/audit.py
- logics_manager/sync.py
- logics_manager/mcp.py
- logics_manager/viewer.py
- clients/viewer/src/browser-host/filters.js
- clients/viewer/src/browser-host/graph.js

# Backlog
- `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`
- `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling`
- `item_689_make_the_runbook_library_navigable_in_the_viewer`
