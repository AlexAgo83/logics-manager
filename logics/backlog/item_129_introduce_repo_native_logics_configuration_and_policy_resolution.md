## item_129_introduce_repo_native_logics_configuration_and_policy_resolution - Introduce repo-native Logics configuration and policy resolution
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
- The kit still encoded runtime defaults in Python modules, which made split policy, mutation behavior, and cache locations hard to inspect or override from a consuming repository.
- Operators needed a repo-native contract that stays deterministic, lightweight, and visible in git instead of hidden behind script-local constants.

# Scope
- In:
  - ship a default `logics.yaml` template during bootstrap
  - parse and merge repo overrides with stable kit defaults
  - expose the effective configuration to automation and operators
- Out:
  - remote configuration services
  - arbitrary unvalidated plugin-side settings

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|introduce-repo-native-logics-configurati|req-085-add-repo-config-runtime-entrypoi|the-kit-still-encoded-runtime-defaults|ac1-bootstrapping-the-kit-creates-a
flowchart LR
    Need[Repo runtime defaults must be visible and overridable] --> Config[Ship logics yaml and config loader]
    Config --> Loader[Merge repo overrides with kit defaults]
    Loader --> Inspect[Expose effective config to operators]
    Inspect --> Done[Done]
```

# Acceptance criteria
- AC1: Bootstrapping the kit creates a repo-local `logics.yaml` file with deterministic defaults for split policy, mutation mode, and runtime-index location.
- AC2: The runtime can load `logics.yaml`, merge it with shipped defaults, and keep behavior deterministic when keys are omitted.
- AC3: Operators and automation can inspect the effective config without parsing the YAML file themselves.

# AC Traceability
- AC1 -> `logics/skills/logics-bootstrapper/assets/logics.yaml` and `logics/skills/logics-bootstrapper/scripts/logics_bootstrap.py`. Proof: bootstrap now writes `logics.yaml` and the bootstrapper JSON payload reports the planned config action.
- AC2 -> `logics/skills/logics-flow-manager/scripts/logics_flow_config.py`. Proof: a minimal YAML parser plus deep-merge logic resolves repo overrides against the shipped defaults.
- AC3 -> `logics/skills/logics-flow-manager/scripts/logics_flow.py`. Proof: `sync show-config` returns the merged config, including the active split policy, mutation mode, and runtime-index path.

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
- Summary: Add a deterministic repo-native `logics.yaml` contract and expose the merged config to the runtime.
- Keywords: logics, config, yaml, defaults, policy, split, mutation, cache
- Use when: Use when the kit needs repository-level runtime policy without editing kit source files.
- Skip when: Skip when the change is purely plugin-side or does not affect runtime policy resolution.

# References
- `logics/request/req_085_add_repo_config_runtime_entrypoints_and_transactional_scaling_primitives_to_the_logics_kit.md`
- `logics/tasks/task_097_orchestration_delivery_for_req_085_repo_config_runtime_entrypoints_and_transactional_scaling_primitives.md`
- `logics/skills/logics-bootstrapper/assets/logics.yaml`
- `logics/skills/logics-bootstrapper/scripts/logics_bootstrap.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow_config.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow.py`
- `logics/skills/tests/test_bootstrapper.py`
- `logics/skills/tests/test_logics_flow.py`

# Priority
- Impact: High
- Urgency: High

# Notes
- Delivered the repo-native config surface requested by `req_085` and wired it into the flow-manager runtime instead of leaving it as documentation-only policy.
- The config now drives split policy, mutation mode, and runtime-index path, which are reused by the later req_085 slices.
