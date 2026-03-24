## item_133_strengthen_bulk_mutation_safety_with_transactional_apply_or_rollback_semantics - Strengthen bulk mutation safety with transactional apply or rollback semantics
> From version: 1.12.0
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 98%
> Progress: 100%
> Complexity: High
> Theme: Kit runtime ergonomics and scale
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
- Preview-only bulk mutations reduced risk but did not guarantee coherent apply-or-rollback semantics when several files were being rewritten in one command.
- The kit needed a transactional path so `refresh-ai-context` and `migrate-schema` either apply coherently or restore the previous state with an audit trail.

# Scope
- In:
  - add a transaction helper for bulk file writes
  - wire transactional mode into `sync refresh-ai-context` and `sync migrate-schema`
  - record JSONL mutation audit entries and cover rollback in tests
- Out:
  - distributed transactions
  - rollback support for every single write in the kit

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|strengthen-bulk-mutation-safety-with-tra|req-085-add-repo-config-runtime-entrypoi|preview-only-bulk-mutations-reduced-risk|ac1-bulk-mutation-flows-support-a-config
flowchart LR
    Need[Bulk kit mutations need coherent apply or rollback] --> Helper[Add transaction helper and audit log]
    Helper --> Flow[Wire refresh-ai-context and migrate-schema]
    Flow --> Test[Verify rollback on simulated failure]
    Test --> Done[Done]
```

# Acceptance criteria
- AC1: Bulk-mutation flows support a configurable `transactional` mode instead of relying only on previews.
- AC2: Transactional failures restore the pre-mutation file state and emit an audit record describing the rollback.
- AC3: Operators can still opt into preview or explicit direct mode when needed.

# AC Traceability
- AC5 -> `logics/skills/logics-flow-manager/scripts/logics_flow_transactions.py` and `logics/skills/logics-flow-manager/scripts/logics_flow.py`. Proof: `refresh-ai-context` and `migrate-schema` now call the transaction helper and honor repo-configured mutation mode.
- AC5 -> `logics/skills/tests/test_logics_flow.py`. Proof: the simulated failure path verifies that `migrate-schema` rolls back both files and writes a `rolled_back` audit record.
- AC5 -> `logics/skills/logics-bootstrapper/assets/logics.yaml`, `logics/skills/README.md`, and `logics/skills/logics-flow-manager/SKILL.md`. Proof: operators can inspect the default mode, override it per repo, or pass `--mutation-mode direct`.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_085_add_repo_config_runtime_entrypoints_and_transactional_scaling_primitives_to_the_logics_kit`
- Primary task(s): `task_097_orchestration_delivery_for_req_085_repo_config_runtime_entrypoints_and_transactional_scaling_primitives`

# AI Context
- Summary: Add transactional apply-or-rollback semantics and audit logging to multi-file kit mutations.
- Keywords: logics, transaction, rollback, mutation, audit, schema, ai-context
- Use when: Use when a kit mutation rewrites several files and must either apply coherently or restore the previous state.
- Skip when: Skip when the command only inspects or previews state without writing files.

# References
- `logics/request/req_085_add_repo_config_runtime_entrypoints_and_transactional_scaling_primitives_to_the_logics_kit.md`
- `logics/tasks/task_097_orchestration_delivery_for_req_085_repo_config_runtime_entrypoints_and_transactional_scaling_primitives.md`
- `logics/skills/logics-flow-manager/scripts/logics_flow_transactions.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow.py`
- `logics/skills/logics-bootstrapper/assets/logics.yaml`
- `logics/skills/README.md`
- `logics/skills/tests/test_logics_flow.py`

# Priority
- Impact: High
- Urgency: High

# Notes
- The audit log defaults to `logics/mutation_audit.jsonl`, which keeps transaction outcomes inspectable in the same repository as the workflow corpus.
- This item closes the req_085 safety gap that remained after preview-only flows were added in earlier requests.
