## task_286_implement_split_5h_week_cdx_usage_gauge - Implement split 5h/week CDX usage gauge
> From version: 2.15.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Update the small usage object returned by `cdxSessionUsage` to include both 5h and week percent/reset values while tolerating legacy single-percent callers if needed.
- [ ] 2. Change `renderCdxUsageGauge` in `clients/viewer/src/browser-host/render.js` to render two equal columns inside the current gauge element and keep the outer refresh target unchanged.
- [ ] 3. Update CSS under `.viewer-workshop__usage` to split the existing footprint into two columns, with independent fill heights and a center divider.
- [ ] 4. Update CDX status OK-cell construction to pass both horizons instead of only the 5h value.
- [ ] 5. Add focused tests in `tests/viewer.browser-host.test.ts` for dual values, missing-value fallback, and refresh target preservation.
- [ ] 6. Run viewer host bundle/check flow, focused tests, `npm run lint`, and Logics lint/audit before closeout.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_532_render_split_5h_week_cdx_usage_gauge`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.

# AI Context
- Summary: Implement split 5h/week CDX usage gauge
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_289_split_the_cdx_usage_gauge_into_5h_and_week_columns`
- Product brief(s): `prod_037_split_cdx_usage_gauge`
- Architecture decision(s): (none yet)
