## item_553_add_roadmap_document_kind_and_parsing_contract - Add roadmap document kind and parsing contract
> From version: 2.18.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Roadmap planning model
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Logics Manager cannot currently distinguish long-range delivery intent from product/spec prose, so AI agents have no stable object to update when planning milestone slices.

# Scope
- In:
  - Introduce `logics/roadmap/` and `road_###_*` refs in the same indexing and ref-resolution surfaces used by other Logics docs.
  - Define a markdown roadmap template with indicator lines, `# Milestones`, milestone sections, linked refs, dependencies, cuts, risks, validation gates, and exit criteria.
  - Parse `Related roadmap` indicators and roadmap-linked refs without breaking existing request/backlog/task/product/architecture/spec parsing.
  - Add allowed roadmap and milestone statuses with a deliberately small vocabulary.
  - Update `sync list-docs`, `read-doc`, `search-docs`, and context-pack construction to include roadmap docs.
  - Add focused Python tests for ref resolution, kind detection, sync output, and context-pack inclusion.
- Out:
  - AI generation of roadmap content.
  - Viewer timeline UI.
  - Release workflow linkage beyond preserving future-compatible fields.

# Acceptance criteria
- AC1: A `logics/roadmap/road_001_demo.md` fixture is discovered with kind `roadmap`, ref `road_001_demo`, title, status, and linked refs.
- AC2: `sync list-docs --kind roadmap`, `sync read-doc road_001_demo`, and context packs include roadmap docs.
- AC3: `Related roadmap: road_001_demo` is recognized from other doc kinds and appears in linked refs.
- AC4: Roadmap templates do not require hand-editing generated indicator lines.
- AC5: Tests cover both full path and short ref resolution for roadmap docs.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A `logics/roadmap/road_001_demo.md` fixture is discovered with kind `roadmap`, ref `road_001_demo`, title, status, and linked refs.
- request-AC2 -> This backlog slice. Proof: AC2: `sync list-docs --kind roadmap`, `sync read-doc road_001_demo`, and context packs include roadmap docs.
- request-AC3 -> This backlog slice. Proof: AC3: `Related roadmap: road_001_demo` is recognized from other doc kinds and appears in linked refs.
- request-AC5 -> This backlog slice. Proof: AC4: Roadmap templates do not require hand-editing generated indicator lines.
- request-AC9 -> This backlog slice. Proof: AC5: Tests cover both full path and short ref resolution for roadmap docs.
- request-AC10 -> This backlog slice. Proof: AC5: Tests cover both full path and short ref resolution for roadmap docs.
- request-AC6 -> This backlog slice. Proof: Implemented roadmap document kind, CLI propose/show/validate, sync/search/index/audit/lint/MCP/Obsidian integration, viewer milestone rendering, docs, generated status constants, and targeted tests passing. Source: `task_293_deliver_first_class_roadmap_planning_support`
- request-AC7 -> This backlog slice. Proof: Implemented roadmap document kind, CLI propose/show/validate, sync/search/index/audit/lint/MCP/Obsidian integration, viewer milestone rendering, docs, generated status constants, and targeted tests passing. Source: `task_293_deliver_first_class_roadmap_planning_support`
- request-AC8 -> This backlog slice. Proof: Implemented roadmap document kind, CLI propose/show/validate, sync/search/index/audit/lint/MCP/Obsidian integration, viewer milestone rendering, docs, generated status constants, and targeted tests passing. Source: `task_293_deliver_first_class_roadmap_planning_support`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_044_first_class_roadmap_planning`
- Architecture decision(s): (none yet)
- Request: `req_296_add_first_class_roadmap_planning_to_logics_manager`
- Primary task(s): `task_293_deliver_first_class_roadmap_planning_support`

# AI Context
- Summary: Add roadmap document kind and parsing contract
- Keywords: scaffolded-backlog, add roadmap document kind and parsing contract, implementation-ready
- Use when: Implementing the scaffolded slice for Add roadmap document kind and parsing contract.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_293_deliver_first_class_roadmap_planning_support`

# Notes
- Task `task_293_deliver_first_class_roadmap_planning_support` was finished via `logics-manager flow finish task` on 2026-07-13.
