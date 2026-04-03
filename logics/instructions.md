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
Canonical examples use `python ...`; if your environment only exposes `python3` or `py -3`, use that equivalent launcher instead.

- Create/promote request/backlog/task docs: `python logics/skills/logics-flow-manager/scripts/logics_flow.py`
- Finish completed tasks through the workflow manager, not by editing indicators manually: `python logics/skills/logics-flow-manager/scripts/logics_flow.py finish task <task.md>`
- Audit workflow closure consistency: `python logics/skills/logics-flow-manager/scripts/workflow_audit.py`
- Lint Logics docs: `python logics/skills/logics-doc-linter/scripts/logics_lint.py`
- Bootstrap folders (this script): `python logics/skills/logics-bootstrapper/scripts/logics_bootstrap.py`

When a task is completed, run `finish task` first so backlog/request parents are synchronized automatically, then run broader audit/lint commands when needed.

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
- Product briefs and ADRs:
  - Do not rely only on `Related request/backlog/task/architecture` indicators.
  - Mirror those managed-doc links under `# References` as canonical backticked relative paths.

Never write absolute filesystem paths such as `/Users/...` in Logics docs, changelogs, or summaries when a repo-relative path like `logics/...` or `src/...` is enough.

Avoid storing critical links only in free-form prose when they need to appear in plugin references/promotion guards.
Legacy nested list labels (`- References:` / `- Used by:`) are parsed for backward compatibility, but canonical headings remain preferred.
