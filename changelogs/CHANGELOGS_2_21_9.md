# Logics Manager 2.21.9

This release finishes the standalone Fleet viewer delivery and fixes the UI issues
found while dogfooding it: Fleet favorites no longer open the project menu, linked
workflow graphs can be collapsed everywhere they appear, and release validation no
longer depends on a clean machine with no viewer already running.

## Fleet viewer through one shared server

`logics-manager view --fleet` opens an operator home that lists the bounded set of
known Logics projects, including their open/issue/stale counts and project switch
actions. The same viewer process serves the Fleet home and individual projects:
browser-host requests carry the selected project id, and backend reads resolve that
project request-by-request instead of spawning one server per repo.

The launch path is intentionally boring. A second `view` invocation reuses the live
Fleet server and prints the already-running URL; project roots can be added from the
Fleet home; and the demo corpus remains available as a dev-only project for visual
checks.

## Fleet and graph dogfood fixes

Two UI issues surfaced immediately in the Fleet screen:

- clicking a Fleet card's favorite star updated the favorite but also opened the
  topbar project menu, because the shared favorite handler always refreshed the
  switcher after persisting;
- linked workflow graphs were technically scrollable but still forced into a small
  panel, so large graphs remained hard to read.

Fleet favorite clicks now stay inside the Fleet home. Chain graphs render as native
`<details>` panels: inline document graphs are closed by default, dedicated graph
views remain open, and runbook graphs open expanded but can still be collapsed. The
expanded panel gets useful viewport height and scrolls without squeezing the Mermaid
SVG.

## Release-prep tests are isolated from a live viewer

The singleton viewer changed the test environment too. A local viewer already
running on the developer machine could be reused by the visual smoke campaign or by
Python subprocess tests, causing false failures against the wrong corpus/project.

The smoke campaign now accepts the reused-server banner and records its usual
summary/report artifacts. Python tests isolate `LOGICS_VIEWER_REGISTRY_PATH` per
test, so they never attach to the operator's real viewer registry.

## Guardrail cleanup

Release validation exposed two size guardrails that had drifted since the Fleet
work:

- `viewer.py` was split further by extracting static GET serving, update-status
  POST handling, LAN mutation authorization, and shutdown-handler installation;
- the source line-budget ledger was updated with explicit reasons for the current
  Fleet/graph wiring, and one stale ceiling was lowered where the code had shrunk.

## Validation

- `npm run test:coverage:src`
- `npm run test:coverage:media`
- `python3 -m coverage run --source=logics_manager -m pytest tests/python/ -q`
- `python3 -m coverage report --format=total`
- `npm run test:viewer-smoke`
- `npm run test:smoke`
- `npm run package:ci`
- `npm run test:npm-cli`
- `npm run lint:logics`
