## run_001_run_the_viewer_ui_campaign_before_a_delivery - Run the viewer UI campaign before a delivery
> Status: Active
> Category: validation
> Verified: 2026-08-11, automated half runs green on every CI delivery via `scripts/ci-check.mjs`; migrated from `docs/runbooks/viewer-ui-campaign.md`
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- A change touches the viewer's layout, visual language, or the extension host boundary, and needs checking the way an operator meets it -- catching a defect class a green unit suite does not see: a screen that stops fitting, controls drawn over each other, a surface that is empty with no explanation, an action offered but unavailable without saying why.
- Every delivery, the automated half already runs as one of the checks in `scripts/ci-check.mjs`; run the attended half in addition when the change is layout/visual/host-boundary shaped.

# Prerequisites
- Headless Chrome available locally for the automated campaign (no browser-automation dependency; it drives Chrome over the debugging protocol directly).
- `npm ci` already run so `npm run test:viewer-smoke` and the attended-campaign scripts resolve.

# Procedure
- Automated campaign: `npm run test:viewer-smoke`. Starts the real viewer on an ephemeral port, sweeps three viewports, writes one PNG per viewport plus `report.txt` and `summary.json` to `artifacts/local-viewer-smoke/` (outside version control), and exits non-zero when a check fails.
  - On macOS it launches Chrome with `--use-mock-keychain` in a throwaway profile it removes afterwards -- your own Chrome profile and Keychain are never involved. A Keychain dialog appearing during a run is itself the defect, never a reason to touch Keychain entries.
  - Useful knobs: `VIEWER_CAMPAIGN_VIEWPORTS=desktop` (sweep one viewport; skipped ones are reported as skipped, never silently), `VIEWER_CAMPAIGN_OUT=<dir>`, `VIEWER_CAMPAIGN_INJECT_FAILURE=1` (drives the campaign's own reporting regression test), `LOCAL_VIEWER_SMOKE_FORCE_JSDOM=1` (forces the headless-DOM fallback).
  - Checks per viewport: payload/board rendering, topbar/board/details regions not blank, core flows (open a card, insights, health, refresh, activity entry), layout (no overlap/clipping/sideways scroll/silent empty surface/silently disabled action/skipped heading level), filters (count agrees with board and search, regrouping changes what's shown, a type filter returns only what it names), every navigation target reaching a terminal status, and no browser console error/warning.
  - The layout and filter checks read their lists from the interface itself (`tests/helpers/viewer-layout-checks.mjs`, `tests/helpers/viewer-filter-checks.mjs`), never a hand-written enumeration, so a surface or control added later is covered without editing a check.
- Attended campaign (judgment the automated pass cannot make -- whether a screen *reads* well, and the extension host boundary: `acquireVsCodeApi`, the message channel, the CSP nonce):
  - `node scripts/dev/viewer-tour.mjs` -- scripted walk of every screen with captures, records load time and console/network problems per screen, to `artifacts/viewer-tour/`.
  - `python3 -m logics_manager view` -- the standalone viewer, by hand.
  - `code --extensionDevelopmentPath=.` -- the same interface inside the extension host.
  - Both surfaces render one source (`clients/viewer/`, copied by `scripts/build/build-assets.mjs`), so what the automated campaign checks in the standalone viewer holds for both.

# Verification
- Read `report.txt`: `OK`/`KO`/`--` per check with the measured value. A `KO` is a defect **or** a stale expectation -- read the measured value before deciding which. A `--` means the check could not run (no Chrome, a headless DOM that performs no layout, a skipped viewport); it is not a pass and not a defect. A failed check does not stop the run.
- Zero findings is not a pass on its own -- open the captures. When a defect turns up that the checks missed, add the check in the same change, not a follow-up.
- Regression coverage for the checks and the campaign's own reporting: `npx vitest run tests/viewer.layout-checks.test.ts tests/viewer.filter-checks.test.ts tests/viewer.campaign-report.test.ts`.

# Rollback
- Not applicable: this is a read-only validation campaign, not a mutating operation.

# References
- Related request: (none yet)
- Related backlog: (none yet)
- Related task: (none yet)
- Migrated from: `docs/runbooks/viewer-ui-campaign.md`
