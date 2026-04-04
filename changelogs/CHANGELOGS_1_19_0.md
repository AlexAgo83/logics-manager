# Changelog (`1.18.0 -> 1.19.0`)

## Major Highlights

- Added the multi-provider hybrid runtime delivery across the extension, including provider transports, readiness gating, insights surfacing, and regression coverage for bounded fallback behavior.
- Reworked the orchestrator surface so workflow actions and system/runtime actions are split cleanly, with dedicated `AI Runtime Status` and `AI Provider Insights` entrypoints.
- Refactored the extension around dedicated controllers and typed hybrid-assist contracts, reducing `LogicsViewProvider` sprawl while expanding HTML and harness coverage.

## Version 1.19.0

### Multi-provider hybrid runtime delivery

- Integrated the latest Logics kit hybrid runtime work into the extension delivery flow, covering provider abstraction, remote provider transports, readiness cooldown handling, and richer observability payloads.
- Completed the operator-facing delivery items for provider transports, readiness gating, provider insights, and fallback regression coverage.
- Tightened the surrounding workflow metadata so the provider rollout, audit cleanup, and closure docs reflect the shipped state consistently.

### Orchestrator UX and runtime visibility

- Split the tools menu into `Workflow` and `System` views so operational actions and runtime maintenance actions no longer compete in a single flat panel.
- Added dedicated runtime surface area for `AI Runtime Status` and `AI Provider Insights`, making hybrid backend readiness and degradation easier to inspect directly from the extension.
- Refined the webview HTML, harness utilities, and related tests so the new orchestration surface remains portable and stable across environments.

### Structural cleanup and test hardening

- Extracted dedicated controllers and shared message/types modules out of `LogicsViewProvider`, making the extension internals easier to maintain and safer to extend.
- Landed the structural cleanup and kit harmonization follow-through that removed stale code paths, aligned launcher/runtime conventions, and tightened supporting docs.
- Expanded regression coverage for hybrid-provider delivery, including HTML snapshot assertions and bounded fallback scenarios that now protect the Windows CI path as well.

## Validation

- `python3 -m unittest discover -s logics/skills/tests -p "test_*.py" -v`
- `python3 logics/skills/tests/run_cli_smoke_checks.py`
- `npm run ci:fast`
- `npm run release:changelog:validate`
