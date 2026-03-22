## task_025_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior - Harden extension packaging, agent loading, and workspace runtime behavior
> From version: 1.9.1
> Status: Done
> Understanding: 100% (closed)
> Confidence: 99% (validated)
> Progress: 100% (audit-aligned)
> Complexity: High
> Theme: Extension hardening orchestration
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_031_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior`.
- Source file: `logics/backlog/item_031_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior.md`.
- Related request(s): `req_027_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior`.

This is an orchestration task for the main extension project.
It should sequence the hardening work so packaging, runtime behavior, and integration safety improve without mixing this delivery with shared-kit changes or the broader webview-structure refactor.

```mermaid
%% logics-signature: task|harden-extension-packaging-agent-loading|item-031-harden-extension-packaging-agen|1-lock-packaging-boundaries-so-the|npm-run-compile
flowchart LR
    Backlog[Umbrella backlog item] --> Package[Packaging boundaries]
    Package --> Agents[Agent loading hardening]
    Agents --> Prompt[Prompt injection fallback]
    Prompt --> Workspace[Multi root behavior]
    Workspace --> Smoke[Integration smoke validation]
    Smoke --> Report[Close out and report]
```

# Plan
- [x] 1. Lock packaging boundaries so the shipped VSIX contains only runtime assets and the packaging contract is explicit.
- [x] 2. Harden agent definition loading with clearer parsing, validation, and test coverage for richer YAML prompt bodies.
- [x] 3. Make prompt injection more defensive by preferring reliable fallback behavior earlier and minimizing clipboard interference.
- [x] 4. Improve multi-root workspace handling with an explicit active-root model instead of silent first-folder assumptions.
- [x] 5. Add integration-level smoke coverage for package-and-activate or equivalent activation-readiness validation.
- [x] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Step 1. Proof: packaging rules exclude dev-only files while preserving runtime assets.
- AC2 -> Step 1. Proof: explicit packaging whitelist or equivalent documented rule set.
- AC3 -> Step 2. Proof: parser and validation tests cover multiline YAML prompts and accepted schema.
- AC4 -> Step 3. Proof: fallback path is explicit and earlier under uncertainty.
- AC5 -> Step 3. Proof: clipboard-dependent path is no longer the default when a safer route exists.
- AC6 -> Step 4. Proof: root-selection behavior becomes explicit in multi-root contexts.
- AC7 -> Step 5. Proof: extension-host smoke check validates activation-readiness.
- AC8 -> FINAL. Proof: work stays scoped to the extension project and docs/tests are updated.
- AC9 -> TODO: map this acceptance criterion to scope. Proof: TODO.

# Decision framing
- Product framing: Consider
- Product signals: conversion journey
- Architecture framing: Required
- Architecture signals: data model and persistence, contracts and integration

# Links
- Product brief(s): (none yet)
- Architecture decision(s): `adr_003_harden_extension_runtime_with_explicit_packaging_and_workspace_selection`
- Backlog item: `item_031_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior`
- Request(s): `req_027_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior`

# Validation
- `npm run compile`
- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- `npm run package:ci`
- Manual: validate multi-root root selection behavior in a workspace with more than one folder.
- Manual: validate Codex/chat fallback still keeps the prompt usable when automatic injection is unavailable.

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status is `Done` and progress is `100%`.

# Report
- Main focus:
  - ship a cleaner VSIX;
  - make agent loading resilient enough for richer definitions;
  - reduce brittle prompt-injection behavior;
  - remove ambiguity from multi-root runtime selection;
  - add at least one meaningful extension-host smoke path.
- Delivery guardrails:
  - stay out of shared-kit work tracked in `req_025`;
  - stay out of the webview-structure refactor tracked in `req_026`;
  - prefer defensive runtime behavior over clever but fragile automation.
- Delivered:
  - `.vscodeignore` now keeps the VSIX focused on runtime assets only.
  - `src/agentRegistry.ts` now uses a real YAML parser and supports richer multiline agent prompts.
  - `src/extension.ts` now degrades prompt injection earlier to safer paths and avoids clipboard-capture tricks.
  - multi-root handling no longer silently falls back to the first workspace folder.
  - `tests/run_extension_smoke_checks.mjs` plus `npm run test:smoke` and CI now validate package-and-activate readiness.
- Validation results:
  - `npm run compile` OK
  - `npm run lint` OK
  - `npm run test` OK
  - `npm run test:smoke` OK
  - `npm run package:ci` OK
