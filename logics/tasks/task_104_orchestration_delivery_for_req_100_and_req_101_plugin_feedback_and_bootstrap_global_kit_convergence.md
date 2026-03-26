## task_104_orchestration_delivery_for_req_100_and_req_101_plugin_feedback_and_bootstrap_global_kit_convergence - Orchestration delivery for req_100 and req_101 plugin feedback and bootstrap global kit convergence
> From version: 1.14.0
> Schema version: 1.0
> Status: Ready
> Understanding: 97%
> Confidence: 95%
> Progress: 0%
> Complexity: High
> Theme: Coordinated plugin feedback UX and bootstrap global kit readiness
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from:
- `logics/backlog/item_170_add_plugin_in_progress_feedback_for_ollama_backed_hybrid_assist_actions.md`
- `logics/backlog/item_171_add_backend_aware_success_and_failure_notifications_for_plugin_hybrid_assist_runs.md`
- `logics/backlog/item_172_add_regression_coverage_for_plugin_hybrid_assist_execution_feedback.md`
- `logics/backlog/item_173_attempt_global_kit_publication_automatically_when_bootstrap_finishes_with_a_healthy_repo_local_source.md`
- `logics/backlog/item_174_tighten_bootstrap_completion_and_partial_failure_messaging_around_global_kit_readiness.md`
- `logics/backlog/item_175_add_regression_coverage_for_bootstrap_global_publication_outcomes.md`

This orchestration task coordinates two adjacent plugin-facing delivery tracks that share runtime trust surfaces and validation seams:
- `req_101` must first tighten bootstrap semantics so the normal path converges to a usable global kit instead of stopping at repo-local setup with ambiguous completion messaging;
- `req_100` then improves operator feedback during hybrid assist runs so plugin-triggered Ollama-backed actions no longer look stalled or opaque;
- the final wave must cover both bootstrap/global-publication outcomes and plugin execution-feedback outcomes in tests, because these changes land in overlapping extension surfaces.

The sequence matters because:
- bootstrap completion messaging should reflect the real global runtime state before we build more operator trust on top of plugin notifications;
- plugin execution feedback must report actual backend outcomes from the shared runtime, not invent local-only assumptions that conflict with fallback or degraded states;
- the final validation wave must confirm that bootstrap, global publication, hybrid assist actions, and plugin messaging all remain coherent together.

Constraints:
- keep global publication on the existing manifest and inspection path in `src/logicsCodexWorkspace.ts`;
- keep the plugin a thin client over shared `logics.py flow assist ...` behavior and backend selection semantics;
- avoid claiming `Ollama` too early when an `auto` run may later fall back to Codex;
- prefer one clear user-facing signal per run or per bootstrap outcome over stacked or redundant toasts.

```mermaid
%% logics-kind: task
%% logics-signature: task|orchestration-delivery-for-req-100-and-r|item-170-add-plugin-in-progress-feedback|1-confirm-the-shared-plugin-surfaces-and|python3-logics-skills-logics-flow-manage
flowchart LR
    Start[req_100 and req_101] --> Wave1[Wave 1 bootstrap global convergence and completion semantics]
    Wave1 --> Wave2[Wave 2 hybrid assist in progress and result notifications]
    Wave2 --> Wave3[Wave 3 regression coverage across bootstrap and plugin UX]
    Wave3 --> Validate[Validate plugin behavior docs and targeted tests]
    Validate --> Report[Done report]
```

# Plan
- [ ] 1. Confirm the shared plugin surfaces, runtime dependencies, and AC traceability across items `170` through `175`.
- [ ] 2. Wave 1: deliver bootstrap-triggered global publication convergence and tighten completion or repair messaging through items `173` and `174`.
- [ ] 3. Wave 2: deliver in-progress feedback plus backend-aware success and failure notifications for hybrid assist actions through items `170` and `171`.
- [ ] 4. Wave 3: add regression coverage for both plugin execution-feedback behavior and bootstrap global-publication outcomes through items `172` and `175`.
- [ ] 5. Validate the combined result across bootstrap, global kit health, hybrid assist actions, plugin messaging, and targeted tests.
- [ ] CHECKPOINT: leave the current wave commit-ready and update the linked Logics docs before continuing.
- [ ] FINAL: Update related Logics docs

# Delivery checkpoints
- Keep Wave 1 reviewable as a bootstrap and global-kit readiness checkpoint before hybrid assist execution messaging changes.
- Keep Wave 2 reviewable as a plugin UX checkpoint over already-correct bootstrap and global publication semantics.
- Keep Wave 3 reviewable as a test-and-hardening checkpoint that proves both tracks remain coherent together.
- Update the linked request, backlog items, and this task during the wave that materially changes the behavior, not only at final closure.

# AC Traceability
- req100-AC1/AC2 -> Wave 2. Proof: item `170` adds bounded in-progress execution feedback for plugin-launched hybrid assist actions.
- req100-AC3/AC4 -> Wave 2. Proof: item `171` adds backend-aware completion and failure notifications that reflect actual runtime outcomes.
- req100-AC5 -> Wave 2. Proof: items `170` and `171` keep the plugin as a wrapper around shared runtime invocation rather than a second backend owner.
- req100-AC6 -> Wave 3. Proof: item `172` adds targeted regression coverage for successful and failing execution-feedback paths.
- req101-AC1/AC2 -> Wave 1. Proof: item `173` makes bootstrap attempt global publication in the normal path, while item `174` ties completion semantics to actual global readiness.
- req101-AC3/AC4 -> Wave 1. Proof: item `174` makes partial or repair-required outcomes explicit when the repo cannot publish globally or publication remains unhealthy.
- req101-AC5 -> Wave 1. Proof: item `173` reuses the existing global publication contract and manifest inspection path rather than inventing a bootstrap-only runtime path.
- req101-AC6 -> Wave 3. Proof: item `175` adds regression coverage for ready and partial bootstrap outcomes.

# Decision framing
- Product framing: No
- Product signals: operator trust is already covered by the existing plugin UX work; this task stays implementation-oriented
- Product follow-up: No separate product brief is required unless notification behavior expands into broader plugin workflow policy.
- Architecture framing: Yes
- Architecture signals: bootstrap-global-runtime convergence, thin-client notification boundaries, backend provenance reporting
- Architecture follow-up: Reuse and preserve `adr_012` and `adr_013`; only open a new ADR if bootstrap gains a second publication path or the plugin starts owning runtime semantics.

# Links
- Product brief(s): (none yet)
- Architecture decision(s):
  - `adr_012_keep_the_vs_code_plugin_as_a_thin_client_over_shared_hybrid_runtime_commands`
  - `adr_013_replace_repo_local_codex_workspace_overlays_with_a_global_published_logics_kit`
- Backlog item(s):
  - `item_170_add_plugin_in_progress_feedback_for_ollama_backed_hybrid_assist_actions`
  - `item_171_add_backend_aware_success_and_failure_notifications_for_plugin_hybrid_assist_runs`
  - `item_172_add_regression_coverage_for_plugin_hybrid_assist_execution_feedback`
  - `item_173_attempt_global_kit_publication_automatically_when_bootstrap_finishes_with_a_healthy_repo_local_source`
  - `item_174_tighten_bootstrap_completion_and_partial_failure_messaging_around_global_kit_readiness`
  - `item_175_add_regression_coverage_for_bootstrap_global_publication_outcomes`
- Request(s):
  - `req_100_add_user_feedback_and_vs_code_notifications_for_ollama_backend_calls`
  - `req_101_make_logics_bootstrap_converge_to_a_ready_global_kit_before_reporting_completion`

# AI Context
- Summary: Coordinate bootstrap global-kit convergence, bootstrap messaging, hybrid assist execution feedback, and the related regression coverage across req_100 and req_101.
- Keywords: task, bootstrap, global kit, plugin, notification, ollama, hybrid assist, fallback, regression
- Use when: Use when executing or auditing the combined delivery of req_100 and req_101 across bootstrap readiness and plugin execution feedback.
- Skip when: Skip when the work belongs to one isolated backlog item without cross-cutting coordination between bootstrap and plugin assist behavior.

# References
- `logics/request/req_100_add_user_feedback_and_vs_code_notifications_for_ollama_backend_calls.md`
- `logics/request/req_101_make_logics_bootstrap_converge_to_a_ready_global_kit_before_reporting_completion.md`
- `logics/backlog/item_170_add_plugin_in_progress_feedback_for_ollama_backed_hybrid_assist_actions.md`
- `logics/backlog/item_171_add_backend_aware_success_and_failure_notifications_for_plugin_hybrid_assist_runs.md`
- `logics/backlog/item_172_add_regression_coverage_for_plugin_hybrid_assist_execution_feedback.md`
- `logics/backlog/item_173_attempt_global_kit_publication_automatically_when_bootstrap_finishes_with_a_healthy_repo_local_source.md`
- `logics/backlog/item_174_tighten_bootstrap_completion_and_partial_failure_messaging_around_global_kit_readiness.md`
- `logics/backlog/item_175_add_regression_coverage_for_bootstrap_global_publication_outcomes.md`
- `src/logicsViewProvider.ts`
- `src/logicsCodexWorkspace.ts`
- `src/logicsEnvironment.ts`
- `tests/logicsViewProvider.test.ts`
- `tests/logicsCodexWorkspace.test.ts`
- `tests/webview.harness-details-and-filters.test.ts`

# Validation
- `python3 logics/skills/logics-flow-manager/scripts/logics_flow.py sync refresh-mermaid-signatures --format json`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --group-by-doc`
- `npx vitest run tests/logicsViewProvider.test.ts tests/logicsCodexWorkspace.test.ts tests/webview.harness-details-and-filters.test.ts`
- `npm run lint:ts`
- Manual: verify bootstrap completion messaging only reports full readiness when the global kit is actually healthy or warning-healthy.
- Manual: verify plugin hybrid assist actions show in-progress feedback, then accurate backend-aware success or failure messaging without duplicate toasts.

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated during completed waves and at closure.
- [ ] Each completed wave left a commit-ready checkpoint or an explicit exception is documented.
- [ ] Status is `Done` and progress is `100%`.

# Report
