## task_286_implement_split_5h_week_cdx_usage_gauge - Implement split 5h/week CDX usage gauge
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Update the small usage object returned by `cdxSessionUsage` to include both 5h and week percent/reset values while tolerating legacy single-percent callers if needed.
- [x] 2. Change `renderCdxUsageGauge` in `clients/viewer/src/browser-host/render.js` to render two equal columns inside the current gauge element and keep the outer refresh target unchanged.
- [x] 3. Update CSS under `.viewer-workshop__usage` to split the existing footprint into two columns, with independent fill heights and a center divider.
- [x] 4. Update CDX status OK-cell construction to pass both horizons instead of only the 5h value.
- [x] 5. Add focused tests in `tests/viewer.browser-host.test.ts` for dual values, missing-value fallback, and refresh target preservation.
- [x] 6. Run viewer host bundle/check flow, focused tests, `npm run lint`, and Logics lint/audit before closeout.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_532_render_split_5h_week_cdx_usage_gauge`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: `renderCdxUsageGauge` now renders two `.viewer-workshop__usage-segment` children in the unchanged `.viewer-workshop__usage` wrapper; CSS keeps the gauge at 12x14px.
- request-AC2 -> This task. Proof: `renderCdxUsageGauge` computes `fiveHour` and `week` parts independently and applies per-segment `viewer-workshop__usage--{tone}` classes.
- request-AC3 -> This task. Proof: each segment and the wrapper include title/aria text with horizon, remaining percent or unknown state, and reset detail when present.
- request-AC4 -> This task. Proof: the existing outer `data-viewer-cdx-usage-refresh`, `role="button"`, and `tabindex="0"` remain on the shared wrapper.
- request-AC5 -> This task. Proof: `cdxSessionUsage` and CDX status OK-cell construction both call `cdxUsageFromStatus`, so terminal rows and OK cells use the split gauge data.
- request-AC6 -> This task. Proof: missing percent values render as neutral/unknown per segment while known values still render independently.
- request-AC7 -> This task. Proof: `tests/viewer.browser-host.test.ts` covers dual-value rendering, missing weekly fallback, refresh target preservation, and CDX status OK-cell usage.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- Finish workflow executed on 2026-07-05.
- Linked backlog/request close verification passed.
- `npm test -- tests/viewer.browser-host.test.ts -t "usage gauge"` passed.
- `npm run check:viewer-host` passed.
- `npm run lint` passed.
- `logics-manager lint --require-status` passed.

# Report
- Implementation complete.
- Finished on 2026-07-05.
- Linked backlog item(s): `item_532_render_split_5h_week_cdx_usage_gauge`
- Related request(s): `req_289_split_the_cdx_usage_gauge_into_5h_and_week_columns`

# AI Context
- Summary: Implement split 5h/week CDX usage gauge
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_289_split_the_cdx_usage_gauge_into_5h_and_week_columns`
- Product brief(s): `prod_037_split_cdx_usage_gauge`
- Architecture decision(s): (none yet)
