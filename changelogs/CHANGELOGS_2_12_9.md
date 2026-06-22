# Logics Manager 2.12.9

## Features

- Replaced exec/concat part-glue in the Python runtime and browser viewer sources with importable modules and direct build inputs, improving tooling visibility and packaging reliability.
- Added Recent activity support for CI runs, Git/corpus activity filters, and persisted filter toggles in the browser viewer.
- Added assistant authoring ergonomics for scaffold workflows, including schema discovery, validation-oriented blocking messages, and MCP-facing scaffold request-chain delivery.
- Added a dev-only viewer demo project that renders board cards across their supported states for faster visual checks.
- Added document header context in the viewer with the object name and corpus-type pill.

## Fixes

- Preserved Recent activity scroll position across re-renders and grouped same-minute activity entries under one time bucket.
- Recolored in-progress board cards from the previous orange fill to a calmer teal treatment.
- Synced packaged webview and browser-host assets with canonical source after the viewer and activity changes.
- Tuned the source line-budget guardrail around the importable-module remediation so the release tree passes while still blocking new unlisted monoliths.

## Validation

- `rtk npm run release:changelog:validate`
- `rtk npm run ci:check`
- `rtk git diff --check`
