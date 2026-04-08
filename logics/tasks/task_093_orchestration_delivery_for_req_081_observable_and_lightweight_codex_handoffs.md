## task_093_orchestration_delivery_for_req_081_observable_and_lightweight_codex_handoffs - Orchestration delivery for req_081 observable and lightweight Codex handoffs
> From version: 1.11.1 (refreshed)
> Status: Done
> Understanding: 97%
> Confidence: 96%
> Progress: 100%
> Complexity: High
> Theme: Cross-item delivery orchestration
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from:
- `logics/backlog/item_108_add_pre_injection_context_size_estimation_and_budget_visibility_for_codex_handoffs.md`
- `logics/backlog/item_109_add_a_summary_only_first_pass_mode_for_codex_context_injection.md`
- `logics/backlog/item_110_add_diff_first_codex_context_flows_for_implementation_and_review_work.md`
- `logics/backlog/item_111_exclude_or_deprioritize_stale_completed_and_weakly_linked_context_by_default.md`
- `logics/backlog/item_112_add_session_hygiene_guidance_when_topic_or_root_changes_materially.md`
- `logics/backlog/item_113_define_task_type_default_budgets_and_concise_response_contracts_for_codex_handoffs.md`

This orchestration task bundles the second token-efficiency portfolio for Codex-facing Logics workflows:
- make context cost visible before launch or injection;
- add summary-only and diff-first lightweight-default handoff modes;
- prevent older or weakly relevant context from inflating fresh sessions by default;
- steer operators toward fresh sessions when the active working context changes;
- make task-type-specific budgets and concise response defaults explicit.

Constraint:
- keep this portfolio complementary to `req_080`, not a replacement for the underlying context-pack contract work;
- land the work in coherent waves so measurement, lightweight defaults, and operator guidance reinforce each other instead of conflicting;
- treat operator-facing clarity as part of the feature, not just as follow-up documentation.

Delivery shape:
- Wave 1 should establish observable size measurement and the summary-only lightweight path through items `108` and `109`.
- Wave 2 should add diff-first code-centric handoffs and stale-context default exclusion through items `110` and `111`.
- Wave 3 should close the portfolio with session-hygiene guidance plus task-type default budgets and concise response contracts through items `112` and `113`.

```mermaid
%% logics-kind: task
%% logics-signature: task|orchestration-delivery-for-req-081-obser|item-108-add-pre-injection-context-size-|1-confirm-portfolio-scope-dependencies-a|npm-run-lint
flowchart LR
    Backlog[item_108_add_pre_injection_context_size_es] --> Step1[1. Confirm portfolio scope dependencies an]
    Step1 --> Step2[2. Wave 1: implement pre-injection measure]
    Step2 --> Step3[3. Wave 2: implement diff-first code]
    Step3 --> Validation[npm run lint]
    Validation --> Report[Done report]
```

# Plan
- [x] 1. Confirm portfolio scope, dependencies, and linked request acceptance criteria across items `108` to `113`.
- [x] 2. Wave 1: implement pre-injection measurement through `item_108` and the summary-only first-pass flow through `item_109`.
- [x] 3. Wave 2: implement diff-first code handoffs through `item_110` and stale-context exclusion or deprioritization through `item_111`.
- [x] 4. Wave 3: implement session-hygiene guidance through `item_112` plus task-type default budgets and concise response contracts through `item_113`.
- [x] 5. Add or update documentation, operator-facing surfaces, and validation so each wave leaves a coherent lightweight-handoff checkpoint.
- [x] CHECKPOINT: leave the current wave commit-ready and update the linked Logics docs before continuing.
- [x] FINAL: Update related Logics docs

# Delivery checkpoints
- Each completed wave should leave the repository in a coherent, commit-ready state.
- Update the linked Logics docs during the wave that changes the behavior, not only at final closure.
- Prefer a reviewed commit checkpoint at the end of each meaningful wave instead of accumulating several undocumented partial states.

# AC Traceability
- AC1 -> Steps 1, 2, and 5. Proof: Wave 1 establishes the observable pre-injection measurement contract through `item_108`.
- AC2 -> Steps 2 and 5. Proof: Wave 1 adds the summary-only first-pass handoff path through `item_109`.
- AC3 -> Steps 3 and 5. Proof: Wave 2 adds diff-first code-centric handoff behavior through `item_110`.
- AC4 -> Steps 3 and 5. Proof: Wave 2 defines default exclusion or deprioritization of stale context through `item_111`.
- AC5 -> Steps 4 and 5. Proof: Wave 3 adds session-hygiene guidance and surfacing through `item_112`.
- AC6 -> Steps 4 and 5. Proof: Wave 3 defines task-type default budgets through `item_113`.
- AC7 -> Steps 4 and 5. Proof: Wave 3 defines concise response defaults and override behavior through `item_113`.
- item108-AC1/item108-AC2/item108-AC3/item108-AC4 -> Steps 2 and 5. Proof: pre-injection budget visibility landed in `media/logicsModel.js` and `media/renderDetails.js`, with host transport from `src/logicsViewProvider.ts`.
- item109-AC1/item109-AC2/item109-AC3/item109-AC4 -> Steps 2 and 5. Proof: summary-only handoff mode landed in `media/logicsModel.js`, is previewable in `media/renderDetails.js`, and is covered by `tests/webview.harness-details-and-filters.test.ts`.
- item110-AC1/item110-AC2/item110-AC3/item110-AC4 -> Steps 3 and 5. Proof: diff-first handoff mode landed in `media/logicsModel.js`, fed by changed paths from `src/logicsViewProvider.ts`, and is exposed in the details panel.
- item111-AC1/item111-AC2/item111-AC3/item111-AC4 -> Steps 3 and 5. Proof: stale completed and weakly linked context is filtered by default in `media/logicsModel.js`, with budget counters surfaced in the UI.
- item112-AC1/item112-AC2/item112-AC3/item112-AC4 -> Steps 4 and 5. Proof: session-hygiene hints and fresh-thread injection landed in `media/logicsModel.js`, `media/renderDetails.js`, and `src/logicsViewProvider.ts`.
- item113-AC1/item113-AC2/item113-AC3/item113-AC4 -> Steps 4 and 5. Proof: task-type default profiles and concise response contracts landed in `media/logicsModel.js`, while compact AI handoff metadata generation landed in the flow-manager templates and `logics_flow_support.py`.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Consider
- Architecture signals: contracts and integration, delivery and operations
- Architecture follow-up: Review whether the final lightweight-handoff portfolio warrants an ADR after the contracts stabilize.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Backlog item(s):
  - `item_108_add_pre_injection_context_size_estimation_and_budget_visibility_for_codex_handoffs`
  - `item_109_add_a_summary_only_first_pass_mode_for_codex_context_injection`
  - `item_110_add_diff_first_codex_context_flows_for_implementation_and_review_work`
  - `item_111_exclude_or_deprioritize_stale_completed_and_weakly_linked_context_by_default`
  - `item_112_add_session_hygiene_guidance_when_topic_or_root_changes_materially`
  - `item_113_define_task_type_default_budgets_and_concise_response_contracts_for_codex_handoffs`
- Request(s): `req_081_add_measurement_summary_first_and_diff_first_controls_to_reduce_codex_token_consumption`



# Validation
- `npm run lint`
- `npm run test`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --group-by-doc`
- Manual: verify operators can understand the cost and lightweight mode chosen before a Codex launch or injection.
- Manual: verify the lightweight-default story remains coherent across summary-only, diff-first, stale-context, session-hygiene, and task-type defaults.
- Finish workflow executed on 2026-03-23.
- Linked backlog/request close verification passed.

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated during completed waves and at closure.
- [x] Each completed wave left a commit-ready checkpoint or an explicit exception is documented.
- [x] Status is `Done` and progress is `100%`.

# Report
- Implementation wave landed on 2026-03-23.
- Added visible pre-injection budget signals in the `Context pack for Codex` panel so operators can inspect mode, profile, doc count, lines, characters, estimated tokens, changed-path count, and excluded stale context before injecting.
- Added explicit `Preview summary-only` and `Preview diff-first` flows in [`media/renderDetails.js`](media/renderDetails.js), backed by mode-aware pack generation in [`media/logicsModel.js`](media/logicsModel.js).
- Added fresh-session guidance and a direct `Inject in fresh thread` action so topic changes and handoff-mode changes can steer operators toward a new Codex thread without rebuilding the pack manually.
- Added task-type-aware response contracts and default lightweight routing so implementation, review, request, and spec-shaped handoffs no longer all look the same.
- Extended harness coverage so the details panel regression tests assert the new budget copy, summary-only preview, and fresh-thread handoff payload.
- Added kit-side compact AI handoff metadata so newly created or promoted request/backlog/task docs now carry a lean `# AI Context` section instead of forcing the plugin to infer everything from longer narrative sections.
- Added optional `--token-hygiene` auditing in [`logics/skills/logics-flow-manager/scripts/workflow_audit.py`](logics/skills/logics-flow-manager/scripts/workflow_audit.py) to make compact-handoff regressions inspectable without changing the default workflow audit posture.
- Validation executed:
  - `npm run lint`
  - `npm run test`
  - `python3 -m pytest logics/skills/tests`
  - `python3 -m py_compile logics/skills/logics-flow-manager/scripts/logics_flow.py logics/skills/logics-flow-manager/scripts/logics_flow_support.py logics/skills/logics-flow-manager/scripts/workflow_audit.py logics/skills/logics-connector-confluence/scripts/confluence_to_request.py logics/skills/logics-connector-jira/scripts/jira_to_backlog.py logics/skills/logics-connector-figma/scripts/figma_to_backlog.py logics/skills/logics-connector-linear/scripts/linear_to_backlog.py logics/skills/logics-connector-render/scripts/render_to_backlog.py`
  - `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
  - `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --group-by-doc`
- Finished on 2026-03-23.
- Linked backlog item(s): `item_108_add_pre_injection_context_size_estimation_and_budget_visibility_for_codex_handoffs`, `item_109_add_a_summary_only_first_pass_mode_for_codex_context_injection`, `item_110_add_diff_first_codex_context_flows_for_implementation_and_review_work`, `item_111_exclude_or_deprioritize_stale_completed_and_weakly_linked_context_by_default`, `item_112_add_session_hygiene_guidance_when_topic_or_root_changes_materially`, `item_113_define_task_type_default_budgets_and_concise_response_contracts_for_codex_handoffs`
- Related request(s): `req_080_reduce_codex_token_consumption_with_budgeted_context_packs_and_agent_aware_prompt_shaping`, `req_081_add_measurement_summary_first_and_diff_first_controls_to_reduce_codex_token_consumption`

# Notes
