# Codex Context

This file defines the working context for Codex in this repository.

## Language

Use English for all communication, code comments, and documentation.

## Workflow

The `logics` folder defines a lightweight product flow:

* `logics/architecture`: Architecture notes, decisions, and diagrams.
* `logics/request`: Incoming requests or ideas (problem statement + context).
* `logics/backlog`: Scoped items with acceptance criteria + priority.
* `logics/tasks`: Execution plans derived from backlog items (plan + progress + validation).
* `logics/specs`: Lightweight functional specs derived from backlog/tasks.
* `logics/external`: Generated artifacts (images, exports) that don't fit other logics folders.

## Indicators

Use the following indicators in request/backlog/task items:

* `From version: X.X.X` : The version when the need was first identified.
* `Understanding: ??%` : Your estimated understanding of the need.
* `Confidence: ??%` : Your confidence in solving the need.
* `Progress: ??%` : Your progress toward completing the backlog item or task.

## Automation

This repository uses a reusable Logics skills kit (usually imported as a submodule under `logics/skills/`).

- Create/promote request/backlog/task docs: `python3 logics/skills/logics-flow-manager/scripts/logics_flow.py`
- Lint Logics docs: `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
- Bootstrap folders (this script): `python3 logics/skills/logics-bootstrapper/scripts/logics_bootstrap.py`

## Validation

Project validation commands are project-specific.
Add the relevant ones to task docs under `# Validation` (tests/lint/build/typecheck).

- Compile: `npm run compile`
- Unit tests: `npm run test`

## Reference Contract (Plugin Compatibility)

Use the following markdown patterns for deterministic indexing in the VS Code extension:

- Lineage links:
  - `Derived from \`logics/request/req_XXX_name.md\``
  - `Derived from \`logics/backlog/item_XXX_name.md\``
  - `Promoted from \`...\``
- Request-to-backlog mapping:
  - Keep links under `# Backlog` as backticked relative paths.
- Manual references:
  - Keep links under `# References` as backticked relative paths.
- Reverse links:
  - Keep links under `# Used by` as backticked relative paths.

Avoid storing critical links only in free-form prose when they need to appear in plugin references/promotion guards.
Legacy nested list labels (`- References:` / `- Used by:`) are parsed for backward compatibility, but canonical headings remain preferred.
