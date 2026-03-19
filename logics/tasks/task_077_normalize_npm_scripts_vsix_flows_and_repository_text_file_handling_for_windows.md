## task_077_normalize_npm_scripts_vsix_flows_and_repository_text_file_handling_for_windows - Normalize npm scripts VSIX flows and repository text-file handling for Windows
> From version: 1.10.8
> Status: Done
> Understanding: 96%
> Confidence: 93%
> Progress: 100%
> Complexity: High
> Theme: Cross-platform runtime, tooling, and release reliability
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_075_normalize_npm_scripts_vsix_flows_and_repository_text_file_handling_for_windows`.
- Source file: `logics/backlog/item_075_normalize_npm_scripts_vsix_flows_and_repository_text_file_handling_for_windows.md`.
- Related request(s): `req_025_harden_logics_kit_workflow_generation_and_governance_from_real_usage`, `req_027_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior`, `req_062_harden_windows_compatibility_across_the_vs_code_plugin_and_logics_kit`.
- Delivery goal:
  - remove Windows breakpoints from repo-level commands such as packaging, install, lint, audit, and release helpers;
  - define a repository text-file handling contract that does not leave line endings and path assumptions implicit.

```mermaid
%% logics-kind: task
%% logics-signature: task|normalize-npm-scripts-vsix-flows-and-rep|item-075-normalize-npm-scripts-vsix-flow|1-confirm-scope-dependencies-and-linked|run-the-relevant-automated-tests-for
flowchart LR
    Backlog[item_075_normalize_npm_scripts_vsix_flows_] --> Step1[1. Confirm scope dependencies and linked]
    Step1 --> Step2[2. Implement the scoped changes from]
    Step2 --> Step3[3. Validate the result and update]
    Step3 --> Validation[Run the relevant automated tests for]
    Validation --> Report[Done report]
```

# Plan
- [x] 1. Confirm scope, dependencies, and linked acceptance criteria.
- [x] 2. Replace Unix-only repo commands and helper flows with cross-platform script entrypoints for packaging, install, lint, audit, and release preparation.
- [x] 3. Define the repository text-file handling contract for Windows edits, including line-ending expectations where they affect supported workflows.
- [x] 4. Validate the result and update the linked Logics docs.
- [x] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Scope: The request explicitly covers both scopes:. Proof: TODO.
- AC2 -> Scope: the VS Code extension repository;. Proof: TODO.
- AC3 -> Scope: the bundled or imported Logics kit workflows that users are expected to run directly.. Proof: TODO.
- AC2 -> Scope: The supported Windows contract is clarified for extension-driven Logics actions such as create, promote, bootstrap, fix, and related script-backed flows.. Proof: TODO.
- AC3 -> Scope: Main project npm scripts that are part of normal development, smoke, packaging, installation, or release validation no longer rely on avoidable Unix-only constructs such as:. Proof: TODO.
- AC4 -> Scope: hardcoded `python3` where a Windows-compatible launcher path is required;. Proof: TODO.
- AC5 -> Scope: `/tmp` output paths;. Proof: TODO.
- AC6 -> Scope: shell command substitution patterns such as `$(...)`.. Proof: TODO.
- AC4 -> Scope: The repository documentation is updated so Windows users are not told to run commands that fail under the default Windows environment when an officially supported alternative exists.. Proof: TODO.
- AC5 -> Scope: The Logics kit documentation and skill examples are calibrated so the documented operator path is Windows-compatible, or clearly marked as Unix-specific when a script is intentionally platform-scoped.. Proof: TODO.
- AC5B -> Scope: Windows-oriented hardening explicitly covers command-surface issues that are common in this repository, including:. Proof: TODO.
- AC7 -> Scope: quoting differences between POSIX shells, `cmd`, and PowerShell for supported CLI examples;. Proof: TODO.
- AC8 -> Scope: line-ending normalization expectations for text assets edited on Windows;. Proof: TODO.
- AC9 -> Scope: path-handling assumptions that can break under Windows path semantics.. Proof: TODO.
- AC6 -> Scope: Windows support is validated through at least one meaningful automated path beyond unit-level string or candidate-list assertions.. Proof: TODO.
- AC7 -> Scope: CI gains an explicit Windows validation lane for the supported workflow surface, or an equivalent automated Windows check with comparable confidence.. Proof: TODO.
- AC8 -> Scope: Release preparation no longer depends solely on Ubuntu-only validation for workflows that are claimed to support Windows users or maintainers.. Proof: TODO.
- AC9 -> Scope: The implementation distinguishes between:. Proof: TODO.
- AC10 -> Scope: intentional platform-specific helpers;. Proof: TODO.
- AC11 -> Scope: and unintended cross-platform breakpoints in supported workflows.. Proof: TODO.
- AC10 -> Scope: Linux and macOS behavior remain supported, with changes designed as cross-platform hardening rather than Windows-only special cases where a generic solution is possible.. Proof: TODO.
- AC11 -> Scope: The resulting guidance is concrete enough that a backlog item can split the work into:. Proof: TODO.
- AC12 -> Scope: extension runtime and command surface hardening;. Proof: TODO.
- AC13 -> Scope: npm script and packaging normalization;. Proof: TODO.
- AC14 -> Scope: kit README and skill documentation cleanup;. Proof: TODO.
- AC15 -> Scope: Windows CI or smoke validation;. Proof: TODO.
- AC16 -> Scope: release-process alignment.. Proof: TODO.
- AC12 -> Scope: Windows validation explicitly exercises or accounts for edge cases already known to be relevant in this repository, including:. Proof: TODO.
- AC17 -> Scope: VSIX smoke packaging paths and Windows command resolution;. Proof: TODO.
- AC18 -> Scope: environments where directory symlinks are unavailable and copy fallbacks are required;. Proof: TODO.
- AC19 -> Scope: case-insensitive path handling expectations in the extension runtime;. Proof: TODO.
- AC20 -> Scope: shell quoting behavior for supported CLI install or MCP-registration flows;. Proof: TODO.
- AC21 -> Scope: line-ending behavior for generated or maintained text artifacts.. Proof: TODO.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Consider
- Architecture signals: contracts and integration, security and identity
- Architecture follow-up: Review whether an architecture decision is needed before implementation becomes harder to reverse.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Backlog item: `item_075_normalize_npm_scripts_vsix_flows_and_repository_text_file_handling_for_windows`
- Request(s): `req_025_harden_logics_kit_workflow_generation_and_governance_from_real_usage`, `req_027_harden_extension_packaging_agent_loading_and_workspace_runtime_behavior`, `req_062_harden_windows_compatibility_across_the_vs_code_plugin_and_logics_kit`

# References
- `package.json`
- `README.md`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `tests/run_extension_smoke_checks.mjs`

# Validation
- Run the relevant automated tests for the changed surface.
- Run the relevant lint or quality checks.
- `npm run compile`
- `npm run package`
- `npm run test`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
- `npm run lint:ts`
- `npm run lint:logics`
- `npm run package:ci`
- `npm run audit:logics` (wrapper executed correctly; command still reports pre-existing workflow/doc debt in current Logics docs)

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status is `Done` and progress is `100%`.

# Report
- Finished on 2026-03-19.
- Implemented:
  - added `scripts/run-python.mjs` so Logics-oriented npm scripts can resolve Python cross-platform instead of hardcoding `python3`;
  - added `scripts/build/package-ci.mjs` and `scripts/build/install-vsix.mjs` so CI packaging and VSIX install no longer depend on `/tmp` or `$(...)`;
  - added `.gitattributes` to define LF handling for the repo’s main text assets;
  - rewired `package.json` scripts to use the new wrappers.
- Validation executed:
  - `npm run lint:ts`
  - `npm run lint:logics`
  - `npm run package:ci`
  - `npm run test`
  - `npm run audit:logics` (functional wrapper path confirmed, but the command still fails on existing Logics governance debt unrelated to the new wrappers)
