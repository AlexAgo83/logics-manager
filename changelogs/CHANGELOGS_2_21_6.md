# Logics Manager 2.21.6

A correctness fix for the runbook feature shipped in 2.21.5: `health` and
`status` now see runbooks. The first real runbook, the README icon.

## `health`/`status` were silently blind to runbooks

`logics_manager/insights.py` (the module behind `logics-manager health` and
`logics-manager status`) keeps its own document-kind registry, separate from
the ones `lint.py`, `audit.py`, `sync.py`, `mcp.py`, and `viewer_docs.py`
already carry `runbook` in. It was missed when the runbook kind landed in
2.21.5 -- a sixth duplicated registry the request that added runbooks didn't
know to touch. `lint`, `audit`, `sync`, and the viewer all correctly saw a
runbook document; `health` and `status` silently did not.

`tests/python/test_document_model_agreement.py` -- a cross-model consistency
check comparing what audit, sync, viewer, and insights each discover -- caught
the disagreement the moment a real runbook document existed to disagree
about. Fixed by adding `runbook` to `insights.py`'s registry.

## The board's status filter no longer counts runbooks it can't show

Once a real Active runbook existed (see below), the viewer's visual smoke
campaign caught a second gap in 2.21.5's runbook work: the generic status
filter counted it ("status=active" announced 1) but the board has no column
to render it in -- runbooks live in the Workshop tab, not the main Kanban
board (req_330/item_689). Fixed in `matchesFilterState()`, the one predicate
every filter option's count runs through, so no filter group can announce a
total the board can't display.

## The first runbook

`docs/runbooks/viewer-ui-campaign.md` -- the existing procedure for running
the viewer UI campaign before a delivery -- is migrated into the new Logics
runbook library as `run_001_run_the_viewer_ui_campaign_before_a_delivery`
(category `validation`, Active, verified against the CI gate that already
runs it). The original path is kept as a redirect: several closed Logics docs
link to it by that exact path.

## README icon

The app icon now appears next to the README title, sized small (64px,
left-aligned) rather than a full-width banner.

## Validation

- `python3 -m pytest tests/python -q`
- `npx vitest run`
- `logics-manager lint --require-status`
- `logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
- `logics-manager health`
