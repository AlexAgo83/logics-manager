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

This repository uses the canonical `logics-manager` CLI for workflow operations.
Canonical examples use `python3 -m logics_manager ...`; if your environment exposes the installed `logics-manager` binary, you can use that instead.

- Create/promote request/backlog/task docs: `python3 -m logics_manager flow ...`
- Finish completed tasks through the workflow manager, not by editing indicators manually: `python3 -m logics_manager flow finish task <task.md>`
- Audit workflow closure consistency: `python3 -m logics_manager audit`
- Lint Logics docs: `python3 -m logics_manager lint --require-status`
- Bootstrap folders or repair missing workflow scaffolding: `python3 -m logics_manager bootstrap`

Repository-local Claude bridge files and assistant instructions are generated from the integrated runtime.
Do not edit `.claude/` bridge files by hand unless you are deliberately repairing a generated artifact.

When a task is completed, run `finish task` first so backlog/request parents are synchronized automatically, then run broader audit/lint commands when needed.

## Hybrid Vs Interactive

Use a hybrid assist flow when the task has a well-defined input, a bounded structured output, and does not require multi-turn reasoning or repo-wide code understanding.
Use an interactive Claude or Codex session when the task needs exploratory back-and-forth, broad codebase reasoning, or open-ended implementation work.

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
