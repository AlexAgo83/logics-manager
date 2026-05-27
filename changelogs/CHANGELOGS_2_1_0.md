# Changelog (`2.0.5 -> 2.1.0`)

Release `2.1.0` expands the local-first MCP workflow surface and makes the project easier to understand from the README.

## Why `2.1.0`

- The MCP connector needed to move beyond creation and promotion into safe read, mutation, closure, split, and repair workflows.
- Local ChatGPT-style connector setup needed clearer bearer-token and tunnel guidance without introducing a hosted service.
- The README had grown around the VS Code extension and did not clearly present the CLI as the core product.

## Highlights

- Added bounded MCP tools for reading, listing, searching, and context-pack generation over approved Logics workflow docs.
- Added canonical MCP wrappers for finishing and closing workflow docs, refreshing Mermaid signatures, split operations, and deterministic audit autofixes.
- Added controlled mutation tools for workflow indicators and scoped report, validation, and decision notes.
- Added `logics-manager mcp connect` to generate a local connector setup plan with bearer-token, tunnel, ChatGPT developer-mode, smoke-check, and cleanup guidance.
- Reworked the README around the product model: core CLI runtime first, then VS Code, MCP, and packaging integrations.

## What Changed

### MCP Workflow Surface

- Added document read, bounded list/search, and context-pack payloads with repo-relative path validation.
- Added write-capable MCP tools that call canonical CLI behavior instead of editing workflow Markdown freely.
- Added closure and maintenance tools that return validation state and Logics-scoped diff summaries after writes.
- Added split and audit repair tools for request/backlog decomposition and deterministic structure or AC traceability repair.

### Controlled Mutation

- Added CLI-backed update operations for approved workflow indicators.
- Added bounded append operations for report, validation, and decision notes.
- Rejected unsupported fields, unsupported paths, oversized text, and dirty tracked-source conflicts.

### Local Connector Setup

- Added `logics-manager mcp connect`.
- Generated or accepted bearer tokens for local MCP HTTP access.
- Printed server startup, tunnel target, assistant connector URL, auth header, smoke checks, and cleanup instructions.
- Kept the connector local-first: every operator still runs MCP against their own repository.

### Documentation

- Reorganized the README so new users first understand the CLI/runtime core.
- Clarified that the VS Code extension and MCP server are clients around the CLI.
- Removed overly detailed extension-internal sections from the README.
- Clarified that VS Code installation instructions are for the extension, not the core CLI.

### Release Metadata

- Bumped the extension, Python package, npm package, lockfile, root version file, and README badge to `2.1.0`.

## Upgrade Notes

- Existing CLI and VS Code workflows remain compatible.
- MCP users should inspect the expanded tool list with `python3 -m logics_manager mcp tools`.
- For ChatGPT developer-mode testing, prefer `python3 -m logics_manager mcp connect --repo-root .` to generate the local setup instructions.

## Validation and Regression Evidence

- `npm run ci:check`
