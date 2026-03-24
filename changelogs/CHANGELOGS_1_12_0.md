# Changelog (`1.11.1 -> 1.12.0`)

## Major Highlights

- Added token-aware Codex handoff flows directly in the plugin, with compact context-pack previews, budget visibility, `summary-only` and `diff-first` modes, and direct injection into the active or a fresh Codex thread.
- Bundled the Logics kit `v1.2.0`, bringing kit-native compact AI context, schema and governance primitives, skill validation, doctor diagnostics, safe-write previews, and refreshed connector assembly helpers into the plugin baseline.
- Migrated GitHub Actions workflows onto the newer official action baselines compatible with the Node 24 runner transition, while keeping the project toolchain pinned to Node 20.
- Closed the open Logics planning portfolios around token efficiency, governance, and runtime hardening so the repository state, workflow docs, and bundled kit now align with the implemented behavior.

## Plugin handoff and workflow UX

- Added a `Context pack for Codex` section in the details panel with doc counts, line and character counts, approximate token estimate, budget label, and response-contract hints.
- Added preview modes for handoff shaping, including `standard`, `summary-only`, and `diff-first` when relevant Git changes exist.
- Added direct `Inject into Codex` and `Inject in fresh thread` actions from the details panel.
- Added session-hygiene guidance so the plugin can suggest a fresh Codex thread when item, task type, handoff mode, or workspace root changes materially.

## Bundled Logics kit upgrade

- Updated the bundled `logics/skills` submodule to `cdx-logics-kit` `v1.2.0`.
- Pulled in compact AI context backfill, context-pack generation, workflow schema metadata, structural audit autofix, skill-package validation, registry export, doctor diagnostics, and benchmark or fixture support from the kit.
- Pulled in the SKILL frontmatter YAML fixes so shipped skills no longer fail discovery because of invalid metadata.

## Repository and release hardening

- Migrated repository workflows to the newer GitHub Actions baselines ahead of Node 20 runner deprecation.
- Refreshed plugin and kit README positioning so the release explains the product more clearly as a durable AI-context and workflow-memory system.
- Kept curated Logics request, backlog, and task documents synchronized with the implemented portfolio closures for the bundled kit work.

## Validation

- `npm run ci:check`
- `npm run release:changelog:validate`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --group-by-doc`
