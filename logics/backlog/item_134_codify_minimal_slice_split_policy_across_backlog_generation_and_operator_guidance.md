## item_134_codify_minimal_slice_split_policy_across_backlog_generation_and_operator_guidance - Codify minimal-slice split policy across backlog generation and operator guidance
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
- The kit had no explicit default saying that split operations should create the smallest coherent number of executable slices.
- That allowed oversplitting by habit, which weakens operator guidance and fragments request/backlog delivery chains.

# Scope
- In:
  - codify the default split policy in `logics.yaml`
  - enforce the policy in split commands with an explicit override path
  - document the policy in README and flow-manager guidance
- Out:
  - preventing legitimate decomposition when an operator explicitly justifies it
  - applying the split policy outside the Logics workflow surfaces

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|codify-minimal-slice-split-policy-across|req-085-add-repo-config-runtime-entrypoi|the-kit-had-no-explicit-default|ac1-the-default-repo-config-declares
flowchart LR
    Need[Workflow splitting needs a clear default] --> Policy[Define minimal coherent split policy]
    Policy --> Enforce[Enforce defaults in split commands]
    Enforce --> Guide[Document override path for justified extra slices]
    Guide --> Done[Done]
```

# Acceptance criteria
- AC1: The default repo config declares a minimal coherent split policy and a child-slice threshold.
- AC2: `split request` and `split backlog` enforce the policy unless the operator explicitly overrides it.
- AC3: Operator guidance explains the policy, the default behavior, and the override path.

# AC Traceability
- AC6 -> `logics/skills/logics-bootstrapper/assets/logics.yaml`. Proof: the shipped default config now declares `workflow.split.policy: minimal-coherent` and `max_children_without_override: 2`.
- AC6 -> `logics/skills/logics-flow-manager/scripts/logics_flow.py`. Proof: split commands enforce the policy and require `--allow-extra-slices` beyond the configured default threshold.
- AC6 -> `logics/skills/README.md`, `logics/skills/logics-flow-manager/SKILL.md`, and `logics/skills/tests/test_logics_flow.py`. Proof: docs explain the policy and tests verify both the blocked and explicit override paths.

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
- Summary: Make minimal coherent slicing the default split policy and require an explicit override for broader decomposition.
- Keywords: logics, split policy, minimal slice, backlog, task, guidance, override
- Use when: Use when operators split requests or backlog items into child execution slices.
- Skip when: Skip when the work does not involve workflow decomposition.

# References
- `logics/request/req_085_add_repo_config_runtime_entrypoints_and_transactional_scaling_primitives_to_the_logics_kit.md`
- `logics/tasks/task_097_orchestration_delivery_for_req_085_repo_config_runtime_entrypoints_and_transactional_scaling_primitives.md`
- `logics/skills/logics-bootstrapper/assets/logics.yaml`
- `logics/skills/logics-flow-manager/scripts/logics_flow.py`
- `logics/skills/logics-flow-manager/SKILL.md`
- `logics/skills/README.md`
- `logics/skills/tests/test_logics_flow.py`

# Priority
- Impact: Medium
- Urgency: High

# Notes
- The policy defaults to restraint, not prohibition: operators can still exceed the default threshold, but only through an explicit `--allow-extra-slices` decision.
- This closes the req_085 guidance gap that kept decomposition behavior too implicit and too easy to fragment.
