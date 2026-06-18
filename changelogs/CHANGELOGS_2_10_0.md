# Logics Manager 2.10.0

## Improvements

- Added the project-owned release workflow contract at `logics/release/contract.json`, enabling release status, plan, validation, and assistant readiness checks to use explicit repo evidence instead of conversation state.
- Exposed release workflow state in the viewer CI screen, including configured gates, blocking reasons, evidence references, and next actions.
- Added release status surfaces for CLI, context-pack, and MCP consumers so assistants and external clients can inspect release readiness consistently.
- Improved Logics workflow scaffolding with request-chain generation, AC-aware backlog/task splits, scoped validation diagnostics, and optional Mermaid blocks.
- Improved CDX workflow controls with a mission config menu, session action menu, and cleaner Workshop command layout.
- Improved context-pack handoff generation and agent workflow ergonomics for bounded workflow continuation.

## Validation

- `PYTHONPATH=. python3 -m logics_manager release plan 2.10.0 --format json`
- `PYTHONPATH=. pytest tests/python/test_release_contract_schema.py -q`
- `logics-manager lint`
- `PYTHONPATH=. python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
- `npm run release:changelog:validate`
- `npm test`
- `git diff --check`
