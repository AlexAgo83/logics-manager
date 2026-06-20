## item_454_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders - Decompose logicsCorpusInsightsHtml.ts into reusable HTML fragment builders
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
`clients/vscode/src/logicsCorpusInsightsHtml.ts` is the largest TS file (~1,465 lines) and mixes several distinct concerns inside one HTML-builder module.
It already separates cleanly: formatting helpers (`escapeHtml`, `formatRelativeDate`, `formatPercent`, `formatCount`), SVG/chart geometry (`buildPieSlices`, `polarToCartesian`, `describePieSlice`, `renderPieChart`), data aggregation (`countBy`, `summarizeProgress`, `summarizeVelocity`, `summarizeTimeline`), and the top-level HTML assembly.
Goal: decompose into reusable fragment/builder modules so chart and formatting logic can be reused (e.g. by `logicsHybridInsightsHtml.ts`, `logicsReadPreviewHtml.ts`) and unit-tested, with identical rendered output.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: Formatting, chart geometry, and aggregation helpers are extracted into dedicated modules; `logicsCorpusInsightsHtml.ts` only assembles the page from them.
- AC2: Rendered HTML is unchanged for the same inputs — verified by the existing vitest tests (`tests/logicsCorpusInsightsController.test.ts`, `tests/logicsHtml.test.ts`) passing without snapshot edits.
- AC3: Extracted modules carry their own focused unit tests for the pure helpers (chart geometry, formatters).
- AC4: No change to the public exported entry point consumed by the controller.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Formatting, chart geometry, and aggregation helpers are extracted into dedicated modules; `logicsCorpusInsightsHtml.ts` only assembles the page from them.
- request-AC2 -> This backlog slice. Proof: AC2: Rendered HTML is unchanged for the same inputs — verified by the existing vitest tests (`tests/logicsCorpusInsightsController.test.ts`, `tests/logicsHtml.test.ts`) passing without snapshot edits.
- request-AC3 -> This backlog slice. Proof: AC3: Extracted modules carry their own focused unit tests for the pure helpers (chart geometry, formatters).
- request-AC4 -> This backlog slice. Proof: AC4: No change to the public exported entry point consumed by the controller.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_259_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders`
- Primary task(s): `task_244_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders`

# AI Context
- Summary: Decompose logicsCorpusInsightsHtml.ts into reusable HTML fragment builders
- Keywords: backlog-groom, request, decompose logicscorpusinsightshtml.ts into reusable html fragment builders, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Decompose logicsCorpusInsightsHtml.ts into reusable HTML fragment builders.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_259_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_259_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders.md`.
- Generated locally by logics-manager.
- Task `task_244_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_244_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders`
