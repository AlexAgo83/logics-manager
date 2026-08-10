## req_330_make_operational_runbooks_a_discoverable_logics_companion_document - Make operational runbooks a discoverable Logics companion document
> From version: 2.21.4
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: High
> Theme: Discoverable operational knowledge
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 23:30:31

# AI Context
- Summary: Make operational runbooks a discoverable Logics companion document
- Keywords: request-chain-scaffold, make operational runbooks a discoverable logics companion document, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make operational runbooks a discoverable Logics companion document.
- Skip when: The change is unrelated to this scaffolded request chain.

# Needs
- Keep operational procedures as first-class Logics documents without forcing them into the request-to-task delivery lifecycle.
- Let an agent identify a project's runbooks immediately, before it invents or repeats an operational procedure.
- Turn reusable operational discoveries, failures, and verified solutions into a maintained project memory instead of leaving them in one task report or one agent conversation.
- Browse and search runbooks by a small controlled category vocabulary, then see how each one relates to delivery work.
- Prepare a safe, operator-led migration path for existing project runbooks without changing sibling repositories from this delivery.

# Context
- Existing runbooks in sibling projects cover releases, security, restore, support, infrastructure runners, application validation, UI capture, and asset preparation. Their shared shape is durable operational knowledge: trigger, prerequisites, procedure, verification, and sometimes rollback. They are neither requests, backlog items, nor execution tasks.
- Logics already distinguishes lifecycle workflow documents from companion documents such as product briefs, roadmaps, architecture decisions, and specifications. Runbooks belong on the companion side: they may link to delivery work, but must not gain progress, promotion, or closeout semantics.
- The current kind registries are intentionally bounded but duplicated across linting, audit, sync, MCP, and the viewer. The delivery must add one runbook kind consistently to every supported surface rather than creating a one-off folder the tools cannot see.
- Agents receive repository instructions before they inspect the tree. Discovery must therefore be explicit in generated Logics instructions and the generated index, with one stable directory and one bounded list/search command. A convention known only by humans is not enough.
- The memory loop must be selective: an agent captures a runbook when it finds a non-obvious, repeatable operating fact, a failure mode and recovery, or a verified solution useful outside the current delivery. It must not create durable documentation for every local code edit. Captured knowledge starts as Draft until verified or reviewed; matching runbooks are proposed before comparable operational work begins and included in bounded agent context when relevant.
- Migration is deliberately out of scope for this repository. When an operator works in a project that owns legacy docs, that project may discover candidates and import one with source provenance; no cross-repository copying or rewriting happens here.

# Acceptance criteria
- AC1: Logics recognizes a runbook as a companion document stored under `logics/runbook/` with a `run_` reference, Draft, Active, or Archived status, category metadata, verification metadata, reusable-problem/solution content, and normal structural links.
- AC2: A generated repository instruction tells an agent where project runbooks live, how to find matching runbooks, to consult relevant runbooks before operational work, and to capture a reusable discovery after it is verified; the generated Logics index exposes the same collection.
- AC3: The supported CLI, bounded sync reads/searches/context, lint/audit, and MCP surfaces accept and return runbooks consistently without treating them as active delivery work.
- AC4: Matching runbooks can be found from a concise operational intent, failure symptom, affected path, or task context, and relevant results are available to an agent without a full-corpus read.
- AC5: Workshop places Runbooks between Commands and Explorer; it can filter and search runbooks, show their category and verification metadata, transition their status through the supported mutation path, and render a runbook-book graph from category to runbook to linked Logics documents.
- AC6: The graph remains useful when a runbook has no delivery link and does not replace the existing request-chain graph.
- AC7: A project operator can discover legacy runbook candidates and import one deliberately with provenance, category, and review state; an agent can deliberately capture a new reusable learning from its current task. Neither flow modifies any unrelated repository or promotes unverified knowledge automatically.
- AC8: Validation covers the new document contract and every affected public surface, including agent-facing discovery/capture text, matching behavior, and the viewer graph/filter behavior.

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
