## task_108_orchestration_delivery_for_req_118_branch_aware_bootstrap_recovery_and_setup_repair - Orchestration delivery for req_118 branch-aware bootstrap recovery and setup repair
> From version: 1.18.0 (refreshed)
> Schema version: 1.0
> Status: Done
> Understanding: 97%
> Confidence: 97%
> Progress: 100%
> Complexity: High
> Theme: Branch-aware bootstrap recovery
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from:
  - `logics/backlog/item_205_detect_and_refresh_logics_bootstrap_state_after_git_branch_switches.md`
  - `logics/backlog/item_206_make_branch_local_bootstrap_recovery_and_setup_repair_explicit_in_the_plugin_ux.md`
  - `logics/backlog/item_207_add_regression_coverage_for_branch_switch_bootstrap_degradation_and_repair.md`

This orchestration task coordinates one coherent delivery track across detection, UX, and regression coverage for the branch-switch bootstrap problem:
- Wave 1 must make the extension re-evaluate bootstrap state when git branch content changes so stale `ready` assumptions do not persist.
- Wave 2 must then make degraded states readable and actionable from the operator point of view, including explicit bootstrap or repair flows for the active branch when supported.
- Wave 3 must lock the new behavior down with targeted regression coverage so prompt suppression, degraded-state routing, and branch-local repair affordances do not regress.

The sequence matters because:
- UX changes on top of stale branch state will still feel broken even if the copy is improved;
- regression coverage should assert the intended branch-aware behavior after the detection and remediation semantics are explicit;
- the setup repair path must remain clearly separated from malformed or non-canonical kit states throughout the rollout.

Constraints:
- keep the existing repository-state model in `src/logicsEnvironment.ts` as the source of truth rather than creating a second branch-only state model;
- keep repair and bootstrap flows operator-confirmed, not silently auto-writing on branch changes;
- preserve the canonical-kit inspection path and do not broaden automatic repair to unsupported `logics/skills` layouts;
- prefer reviewable delivery waves that leave the provider, environment model, and tests in a coherent state after each checkpoint.

```mermaid
%% logics-kind: task
%% logics-signature: task|orchestration-delivery-for-req-118-branc|item-205-detect-and-refresh-logics-boots|1-confirm-scope-dependencies-and-linked|python3-logics-skills-logics-py-flow-syn
flowchart LR
    Backlog[item_205_detect_and_refresh_logics_bootstr] --> Step1[1. Confirm scope dependencies and linked]
    Step1 --> Step2[2. Wave 1: implement branch-aware refresh]
    Step2 --> Step3[3. Wave 2: implement degraded-state UX]
    Step3 --> Validation[python3 logics skills logics.py flow sync]
    Validation --> Report[Done report]
```

# Plan
- [x] 1. Confirm scope, dependencies, and linked acceptance criteria across items `205`, `206`, and `207`.
- [x] 2. Wave 1: implement branch-aware refresh or equivalent git-state invalidation so repository bootstrap state is recomputed after checkout-like changes.
- [x] 3. Wave 2: implement degraded-state UX and supported current-branch bootstrap or repair guidance for `missing-logics`, `missing-kit`, and `partial-bootstrap`.
- [x] 4. Wave 3: add targeted regression coverage for state transitions, prompt reset semantics, and supported remediation routing.
- [x] CHECKPOINT: leave the current wave commit-ready and update the linked Logics docs before continuing.
- [x] FINAL: Update related Logics docs

# Delivery checkpoints
- Keep Wave 1 reviewable as a repository-state and invalidation checkpoint before changing operator-facing recovery copy.
- Keep Wave 2 reviewable as a plugin UX and setup-repair checkpoint over already-correct branch-state detection.
- Keep Wave 3 reviewable as a regression and documentation checkpoint that proves the combined behavior.
- Update the linked request, backlog items, and this task during the wave that materially changes the behavior, not only at final closure.

# AC Traceability
- req118-AC1 -> Wave 1. Proof: item `205` adds branch-aware refresh or equivalent git-state-triggered state recomputation.
- req118-AC2/AC3 -> Wave 2. Proof: item `206` adds explicit degraded-state guidance and supported current-branch repair or bootstrap actions.
- req118-AC4 -> Wave 1 and Wave 2. Proof: items `205` and `206` together ensure prompt suppression and remediation remain branch-aware instead of root-sticky.
- req118-AC5/AC6 -> Wave 2. Proof: item `206` keeps malformed or non-canonical setup distinct from supported current-branch repair.
- req118-AC7 -> Wave 3. Proof: item `207` adds focused regression coverage for branch-switch degradation and repair flows.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: the existing repository-state model and canonical bootstrap path should be reused rather than expanded into a parallel state system
- Architecture follow-up: No separate ADR is required unless implementation reveals the need for a new git-state watcher contract or a broader bootstrap-state model rewrite.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): `adr_015_make_bootstrap_recovery_branch_aware`
- Backlog item(s):
  - `item_205_detect_and_refresh_logics_bootstrap_state_after_git_branch_switches`
  - `item_206_make_branch_local_bootstrap_recovery_and_setup_repair_explicit_in_the_plugin_ux`
  - `item_207_add_regression_coverage_for_branch_switch_bootstrap_degradation_and_repair`
- Request(s): `req_118_handle_branch_switches_to_branches_without_logics_bootstrap_and_offer_setup_repair`

# AI Context
- Summary: Coordinate branch-aware bootstrap-state refresh, current-branch recovery UX, and regression coverage for req_118 without widening the bootstrap model beyond the existing supported contract.
- Keywords: branch switch, bootstrap, repair, provider refresh, git state, degraded UX, prompt reset, regression coverage
- Use when: Use when executing the combined delivery of req_118 across provider invalidation, current-branch repair guidance, and targeted tests.
- Skip when: Skip when the work belongs to an unrelated bootstrap feature or a standalone item with no cross-cutting coordination.



# Validation
- `python3 logics/skills/logics.py flow sync refresh-mermaid-signatures --format json`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --group-by-doc`
- `npx vitest run tests/logicsViewProvider.test.ts tests/logicsEnvironment.test.ts tests/logicsViewDocumentController.test.ts`
- `npm run lint:ts`
- Manual: switch from a branch with `logics/` present to a branch without `logics/` and confirm the plugin refreshes into a branch-local bootstrap or repair state instead of leaving stale ready UI.
- Manual: switch from a healthy branch to a branch with partial bootstrap and confirm the plugin offers repair-oriented guidance rather than malformed-setup messaging.
- Finish workflow executed on 2026-04-03.
- Linked backlog/request close verification passed.

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated during completed waves and at closure.
- [x] Each completed wave left a commit-ready checkpoint or an explicit exception is documented.
- [x] Status is `Done` and progress is `100%`.

# Report

## Wave 1 — Branch-aware refresh and state invalidation (commit `0b566b0`)
- Added `.git/HEAD` to the `FileSystemWatcher` patterns in `extension.ts` so branch switches trigger a provider refresh without requiring a manual reload; `logics/**/*` watchers alone do not fire when git checkout removes or restores the entire directory tree.
- Re-keyed `bootstrapPromptedRoots` from `root` alone to `root::bootstrapStatus` in `maybeOfferBootstrap` so switching to a branch in a different bootstrap state re-enables the prompt. The per-state key also prevents re-prompting when returning to a branch the user already dismissed.

## Wave 2 — Degraded-state UX and branch-local copy (commit `b255c4e`)
- Updated `inspectLogicsBootstrapState` prompt messages to say "This branch does not have Logics set up yet" (`missing`) and "This branch has an incomplete Logics setup" (`incomplete`), making branch-local intent explicit.
- Updated action titles to "Bootstrap Logics on this branch" and "Repair Logics setup on this branch".
- Updated `buildReadOnlyCapability` summary for `missing-logics` to say "This branch does not have a logics/ folder yet" — consistent with branch-local framing and not suggesting an extension failure.
- Updated `refresh()` inline error to match the same framing.
- Non-canonical/malformed states remain on the warning-only path (no supported repair CTA offered).

## Wave 3 — Regression coverage (commit `f60e282`)
- `logicsEnvironment.test`: three tests cover ready→missing-logics transition, ready→partial-bootstrap transition, and branch-local copy in the `missing-logics` readOnly summary.
- `logicsViewProvider.test`: three tests cover per-state prompt suppression (branch switch to a new state re-prompts), re-visit suppression (dismissed state is not re-prompted), and noncanonical routing to warning only (no info dialog).
- 151/151 tests pass; `npm run compile` and `npm run lint:ts` both clean.

## Governance follow-up
- Added `adr_015_make_bootstrap_recovery_branch_aware` to record the branch-aware watcher, state, and prompt-suppression contract used by Waves 1 to 3.
- Updated `req_118` AC traceability so AC6 and AC7 resolve to concrete backlog items instead of request-only prose.
- Finished on 2026-04-03.
- Linked backlog item(s): `item_205_detect_and_refresh_logics_bootstrap_state_after_git_branch_switches`, `item_206_make_branch_local_bootstrap_recovery_and_setup_repair_explicit_in_the_plugin_ux`, `item_207_add_regression_coverage_for_branch_switch_bootstrap_degradation_and_repair`
- Related request(s): `req_065_harden_partial_logics_bootstrap_recovery_when_workflow_directories_are_missing`, `req_077_adapt_logics_bootstrap_and_environment_checks_to_codex_workspace_overlays`, `req_109_replace_coarse_bootstrap_detection_with_canonical_kit_inspection`, `req_118_handle_branch_switches_to_branches_without_logics_bootstrap_and_offer_setup_repair`

# Notes
