## task_082_guard_bootstrap_and_workflow_actions_with_prerequisite_aware_recovery_messaging - Guard bootstrap and workflow actions with prerequisite-aware recovery messaging
> From version: 1.10.8 (refreshed)
> Status: Done
> Understanding: 98%
> Confidence: 96%
> Progress: 100%
> Complexity: Medium
> Theme: Environment detection, onboarding, and guarded recovery UX
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from `logics/backlog/item_088_guard_bootstrap_and_workflow_actions_with_prerequisite_aware_recovery_messaging.md`.
- Derived from backlog item `item_088_guard_bootstrap_and_workflow_actions_with_prerequisite_aware_recovery_messaging`.
- Source file: `logics/backlog/item_088_guard_bootstrap_and_workflow_actions_with_prerequisite_aware_recovery_messaging.md`.
- Related request(s): `req_062_harden_windows_compatibility_across_the_vs_code_plugin_and_logics_kit`, `req_065_harden_partial_logics_bootstrap_recovery_when_workflow_directories_are_missing`, `req_066_add_guarded_environment_preflight_and_onboarding_for_logics_bootstrap_and_workflow_actions`.
- Delivery goal:
  - turn missing prerequisites and broken bootstrap states into early, actionable guidance instead of late execution failures;
  - preserve useful read-only behavior while making blocked actions explicit.

```mermaid
%% logics-kind: task
%% logics-signature: task|guard-bootstrap-and-workflow-actions-wit|item-088-guard-bootstrap-and-workflow-ac|1-confirm-scope-dependencies-and-linked|run-the-relevant-automated-tests-for
flowchart LR
    Backlog[item_088_guard_bootstrap_and_workflow_acti] --> Step1[1. Confirm scope dependencies and linked]
    Step1 --> Step2[2. Gate bootstrap create promote and]
    Step2 --> Step3[3. Add focused tests that preserve]
    Step3 --> Validation[Run the relevant automated tests for]
    Validation --> Report[Done report]
```

# Plan
- [x] 1. Confirm scope, dependencies, and linked acceptance criteria.
- [x] 2. Gate bootstrap, create, promote, and fix actions early with prerequisite-aware recovery messaging for missing tools, missing scripts, missing kit state, and partial bootstrap cases.
- [x] 3. Add focused tests that preserve read-only behavior while making action failures explicit and actionable.
- [x] 4. Validate the result and update the linked Logics docs.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Scope: The request defines an explicit environment capability model that distinguishes at least:. Proof: covered by linked task completion.
- AC2 -> Scope: read-only browsing capabilities;. Proof: covered by linked task completion.
- AC3 -> Scope: workflow mutation capabilities such as create, promote, and fix;. Proof: covered by linked task completion.
- AC4 -> Scope: bootstrap or repair capabilities.. Proof: covered by linked task completion.
- AC2 -> Scope: Missing prerequisites for supported flows are detected before or at action entry with actionable feedback rather than only after deep execution failure.. Proof: covered by linked task completion.
- AC3 -> Scope: The request explicitly covers machine prerequisites relevant to the current plugin behavior, including:. Proof: covered by linked task completion.
- AC5 -> Scope: `git` for bootstrap and submodule-related flows;. Proof: covered by linked task completion.
- AC6 -> Scope: `python` for script-backed workflow actions;. Proof: covered by linked task completion.
- AC7 -> Scope: optional tooling such as the `code` CLI only where relevant to install or developer workflows.. Proof: covered by linked task completion.
- AC4 -> Scope: The plugin remains usable in read-only mode when repository mutation prerequisites are missing, instead of treating the entire environment as unusable.. Proof: covered by linked task completion.
- AC5 -> Scope: The onboarding and recovery UX makes clear that the extension can recover repository state but does not promise to install system-level tools automatically.. Proof: covered by linked task completion.
- AC6 -> Scope: The request allows a dedicated environment check or diagnostic entrypoint, such as a command or panel action, that summarizes prerequisite status and explains impact.. Proof: covered by linked task completion.
- AC7 -> Scope: The resulting UX distinguishes clearly between:. Proof: covered by linked task completion.
- AC8 -> Scope: missing kit state;. Proof: covered by linked task completion.
- AC9 -> Scope: missing scripts;. Proof: covered by linked task completion.
- AC10 -> Scope: missing machine prerequisites;. Proof: covered by linked task completion.
- AC11 -> Scope: and partial repository bootstrap states.. Proof: covered by linked task completion.
- AC8 -> Scope: The request is specific enough that a backlog item can split the work into:. Proof: covered by linked task completion.
- AC12 -> Scope: capability model and prerequisite detection;. Proof: covered by linked task completion.
- AC13 -> Scope: guarded action gating;. Proof: covered by linked task completion.
- AC14 -> Scope: onboarding and recovery messaging;. Proof: covered by linked task completion.
- AC15 -> Scope: optional diagnostic command or status surface.. Proof: covered by linked task completion.

# Decision framing
- Product framing: Consider
- Product signals: conversion journey, navigation and discoverability
- Product follow-up: Review whether a product brief is needed before implementation becomes harder to reverse.
- Architecture framing: Consider
- Architecture signals: contracts and integration
- Architecture follow-up: Review whether an architecture decision is needed before implementation becomes harder to reverse.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Backlog item: `item_088_guard_bootstrap_and_workflow_actions_with_prerequisite_aware_recovery_messaging`
- Request(s): `req_062_harden_windows_compatibility_across_the_vs_code_plugin_and_logics_kit`, `req_065_harden_partial_logics_bootstrap_recovery_when_workflow_directories_are_missing`, `req_066_add_guarded_environment_preflight_and_onboarding_for_logics_bootstrap_and_workflow_actions`

# References
- `src/logicsViewProvider.ts`
- `src/logicsViewDocumentController.ts`
- `src/pythonRuntime.ts`
- `src/logicsProviderUtils.ts`
- `README.md`

# Validation
- Run the relevant automated tests for the changed surface.
- Run the relevant lint or quality checks.
- `npm run compile`
- `npm run lint:ts`
- `npm run test`

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status is `Done` and progress is `100%`.

# Report
- Moved prerequisite-aware gating earlier in [`src/logicsViewDocumentController.ts`](src/logicsViewDocumentController.ts) so create and promote flows now block before prompting for input when Python or the Logics workflow surface is already known to be unavailable.
- Distinguished missing repository state, missing kit state, and missing scripts with more specific recovery messages, all pointing operators to `Logics: Check Environment` instead of leaving them with late generic failures.
- Tightened bootstrap failure messages in [`src/logicsViewProvider.ts`](src/logicsViewProvider.ts) so missing Git or Python explicitly state that the extension can repair repository state but cannot install system tools automatically.
- Extended coverage in [`tests/logicsViewDocumentController.test.ts`](tests/logicsViewDocumentController.test.ts) and [`tests/logicsViewProvider.test.ts`](tests/logicsViewProvider.test.ts) to lock the new guarded entry behavior and recovery wording.
- Validation run:
- `npm run compile`
- `npm run lint:ts`
- `npm run test`

# Notes
