## item_007_logics_references_compatibility_with_cdx_logics_vscode - Logics References Compatibility with cdx-logics-vscode
> From version: 1.0.6-b1
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium-High
> Theme: Logics Workflow Indexing
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin currently depends on specific markdown reference patterns (`Derived from`/`Promoted from`, `# References`, `# Used by`, `# Backlog`). Mixed conventions across docs reduce link quality and can produce incorrect promotion state in the board.

# Scope
- In:
  - Define canonical reference conventions for request/backlog/task docs.
  - Align parser expectations and document examples of valid patterns.
  - Validate that plugin details and promotability behavior reflect actual lineage.
- Out:
  - Full migration of all historical documents in one pass.
  - Unrelated visual changes in board layout.

# Acceptance criteria
- A stable reference contract is documented (sections + markers + path format).
- Sample docs for request/backlog/task demonstrate all reference kinds parsed by the indexer.
- Plugin marks already-linked request/backlog entries as non-promotable when lineage exists.
- `References` and `Used by` sections in details panel show expected links for migrated samples.
- A safe migration strategy for legacy docs is documented (manual or scripted phases).

# AC Traceability
- AC1 -> `logics/instructions.md` and/or README sections updated with canonical patterns and examples.
- AC2 -> `src/logicsIndexer.ts` behavior verified with sample docs and extension refresh.
- AC3 -> Manual smoke checks captured for promote guards and details rendering.

# Priority
- Impact:
  - High: reference integrity directly affects workflow trust and promotion guardrails.
- Urgency:
  - Medium-High: needed before scaling new request/backlog/task generation.

# Notes
- Derived from `logics/request/req_007_logics_references_compatibility_with_cdx_logics_vscode.md`.
- Suggested validation:
  - `npm run compile`
  - Manual: refresh board and inspect references/used-by on representative docs.

# Tasks
- `logics/tasks/task_011_orchestration_delivery_for_req_007_and_req_008.md`
