# Logics Manager 2.15.7

## Viewer crash post-mortems

- Persists a synchronous breadcrumb trail (last 40 operations: screen renders, refreshes, terminal buffer replays, panel clears) to localStorage so it survives a renderer death or a main-thread hang, unlike heartbeats.
- Reports stale unclean trails on the next viewer load as `prior-session-breadcrumbs` diagnostics, including the user agent and `document.wasDiscarded`, so a blank-screen crash names the operation it died in.
- Keeps one breadcrumb key per session and sweeps them on boot: live sibling tabs (blob re-touched by the 10s heartbeat) are left alone, dead or legacy blobs are reported then purged.
- Records `longtask` breadcrumbs for main-thread tasks over 200ms as pre-crash evidence for hang diagnosis.

## Validation

- `node scratchpad check-breadcrumbs.mjs` (breadcrumb trail, post-mortem report, live-sibling skip, ring cap, legacy key sweep)
- `npm run check:viewer-host`
- `npm run ci:check`
