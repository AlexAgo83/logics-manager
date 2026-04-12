# Changelog (`v1.25.4` -> `v1.26.0`)

## Major Highlights

- Refined the webview timeline interaction and accessibility so the delivery chart now switches between week and day views without rebuilding the controls.
- Tightened release and workflow hygiene across Logics docs, including lineage fixes, indicator cleanup, and better task/request traceability.
- Rolled forward the `logics/skills` submodule to `1.13.0`, keeping the shared kit in sync with the plugin release train.

## Webview UX And Accessibility

- Added tab semantics and active-state wiring for the timeline toggle in the corpus insights panel.
- Hid the secondary view-mode toggle in the chrome when the compact presentation path is active.
- Kept the timeline DOM stable while switching between week and day panels, which avoids unnecessary rerenders and makes the state easier to reason about.

## Workflow And Traceability

- Fixed task lineage links so backlog items resolve through the expected `Derived from` relationships.
- Wired lineage links between backlog items `313-322` and requests `170-176` to improve traceability.
- Added requests `170-176` from the April 2026 audit session and the follow-on backlog items and orchestration tasks they implied.
- Cleaned up workflow docs, confidence indicators, and task completion status updates across the Logics project surface.

## Maintenance And Coverage

- Completed the remaining maintenance hardening work for task `134`.
- Updated the webview metadata trimming and theme preview behavior.
- Kept the kit coverage and eslint hardening work in sync with the release process.
- Bumped the `logics/skills` submodule after its `1.13.0` release prep.

## Validation

- `npm run release:changelog:validate`
- `npm test -- tests/logicsHtml.test.ts`
- `npm run lint:ts`
