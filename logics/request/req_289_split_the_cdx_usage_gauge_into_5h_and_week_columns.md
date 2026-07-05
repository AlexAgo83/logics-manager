## req_289_split_the_cdx_usage_gauge_into_5h_and_week_columns - Split the CDX usage gauge into 5h and week columns
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Viewer CDX usage UI
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The compact CDX usage gauge should show both relevant quota horizons at once instead of collapsing the signal to one percent.
- The gauge must keep its current total footprint so terminal rows and CDX status rows do not become taller or wider overall.
- The left half should represent 5h usage and the right half should represent week usage.
- Each half should show its own fill, tone, title/aria label, and reset detail when the data is available.
- Existing click-to-refresh behavior should stay attached to the whole gauge.

# Context
- The viewer already receives both `remaining_5h_pct` and `remaining_week_pct` in CDX status rows.
- The terminal usage gauge currently calls `cdxSessionUsage(sessionName)`, which returns one percent/reset pair; this likely hides the weekly quota signal in the place where operators scan live sessions.
- The CDX status table already has separate remaining/reset columns, but its compact OK cell uses the shared gauge, so it should benefit from the same split.
- The requested UI is a layout change, not a data-model expansion if both values are already present.
- Mobile/narrow rows may not have room for full labels inside the gauge; use short visual labels or accessible titles rather than expanding the component.

# Acceptance criteria
- AC1: The shared CDX usage gauge renders two equal-width columns within the current overall gauge footprint: 5h on the left and week on the right.
- AC2: Each column uses its own remaining percent and tone, so a low 5h value and a healthy week value can be visually distinguished.
- AC3: Each column exposes an accessible label/title that includes the horizon, remaining percent or unknown state, and reset time when available.
- AC4: The whole gauge remains clickable/focusable with the existing `data-viewer-cdx-usage-refresh` behavior.
- AC5: Terminal rows and CDX status OK cells both use the split gauge where both horizon values are available.
- AC6: Missing week or 5h data degrades gracefully: the missing side is neutral/unknown without hiding the known side.
- AC7: Focused tests cover dual-value rendering, missing-value fallback, click target preservation, and existing CDX status row usage.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_037_split_cdx_usage_gauge`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/src/browser-host/render.js` `renderCdxUsageGauge(usage, sessionName)` renders the current single vertical usage gauge.
- `clients/viewer/src/browser-host/index.js` `cdxSessionUsage(sessionName)` currently returns a single `{ percent, reset }` object from CDX status rows, using 5h-oriented reset fields.
- `clients/viewer/src/browser-host/index.js` CDX status table `ok` cell reuses `renderCdxUsageGauge` and already reads `remaining_5h_pct`, `remaining_week_pct`, `reset_5h_at`, and `reset_week_at` from status rows.
- `clients/viewer/viewer.css` `.viewer-workshop__usage` and `.viewer-workshop__usage-fill` define the current compact gauge dimensions and tone styling.
- `tests/viewer.browser-host.test.ts` has CDX status row fixtures with both 5h and week usage fields and existing assertions around `.viewer-workshop__usage` in terminal and CDX ok cells.
- `clients/viewer/browser-host.js` is generated from `clients/viewer/src/browser-host/**`; after editing source, run the existing viewer host bundle check/build flow.

# AI Context
- Summary: Split the CDX usage gauge into 5h and week columns
- Keywords: request-chain-scaffold, split the cdx usage gauge into 5h and week columns, development-ready
- Use when: You need to implement or review the scaffolded workflow for Split the CDX usage gauge into 5h and week columns.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_532_render_split_5h_week_cdx_usage_gauge`
