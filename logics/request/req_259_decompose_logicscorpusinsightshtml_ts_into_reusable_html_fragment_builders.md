## req_259_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders - Decompose logicsCorpusInsightsHtml.ts into reusable HTML fragment builders
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- `clients/vscode/src/logicsCorpusInsightsHtml.ts` is the largest TS file (~1,465 lines) and mixes several distinct concerns inside one HTML-builder module.
- It already separates cleanly: formatting helpers (`escapeHtml`, `formatRelativeDate`, `formatPercent`, `formatCount`), SVG/chart geometry (`buildPieSlices`, `polarToCartesian`, `describePieSlice`, `renderPieChart`), data aggregation (`countBy`, `summarizeProgress`, `summarizeVelocity`, `summarizeTimeline`), and the top-level HTML assembly.
- Goal: decompose into reusable fragment/builder modules so chart and formatting logic can be reused (e.g. by `logicsHybridInsightsHtml.ts`, `logicsReadPreviewHtml.ts`) and unit-tested, with identical rendered output.

# Context
- Proposed split:
  - `insightsFormat.ts`: pure string/format helpers (`escapeHtml`, `asString`, `parseTimestamp`, `formatRelativeDate`, `formatPercent`, `formatCount`, `formatTimelineLabel`).
  - `insightsCharts.ts`: SVG geometry + chart rendering (`buildPieSlices`, `polarToCartesian`, `describePieSlice`, `renderPieChart`, `renderStatCard`, `renderList`).
  - `insightsAggregate.ts`: data summarizers (`countBy`, `summarizeProgress`, `summarizeVelocity`, `summarizeTimeline`, status predicates).
  - `logicsCorpusInsightsHtml.ts` (remainder): top-level page assembly importing the above.
- These helpers are shared in spirit with the other `*Html.ts` builders, so extraction enables future deduplication (out of scope here but enabled).
- Output-preserving refactor: the generated HTML string must be byte-identical for the same inputs.

# Acceptance criteria
- AC1: Formatting, chart geometry, and aggregation helpers are extracted into dedicated modules; `logicsCorpusInsightsHtml.ts` only assembles the page from them.
- AC2: Rendered HTML is unchanged for the same inputs — verified by the existing vitest tests (`tests/logicsCorpusInsightsController.test.ts`, `tests/logicsHtml.test.ts`) passing without snapshot edits.
- AC3: Extracted modules carry their own focused unit tests for the pure helpers (chart geometry, formatters).
- AC4: No change to the public exported entry point consumed by the controller.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/vscode/src/logicsCorpusInsightsHtml.ts` (primary target, ~1,465 lines)
- `clients/vscode/src/logicsHybridInsightsHtml.ts`, `clients/vscode/src/logicsReadPreviewHtml.ts` (future reuse consumers)
- `tests/logicsCorpusInsightsController.test.ts`, `tests/logicsHtml.test.ts` (output verification)

# AI Context
- Summary: Decompose the 1.4k-line logicsCorpusInsightsHtml.ts into reusable format/chart/aggregate modules with byte-identical rendered output.
- Keywords: refactor, vscode webview, HTML builder, SVG charts, modularization, TypeScript
- Use when: Reducing the largest TS file and enabling reuse of chart/format helpers across *Html builders.
- Skip when: A webview insights rewrite is already in progress or would conflict.

# Backlog
- `item_454_decompose_logicscorpusinsightshtml_ts_into_reusable_html_fragment_builders`
