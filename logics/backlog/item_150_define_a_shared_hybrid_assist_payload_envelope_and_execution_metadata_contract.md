## item_150_define_a_shared_hybrid_assist_payload_envelope_and_execution_metadata_contract - Define a shared hybrid assist payload envelope and execution metadata contract
> From version: 1.12.1
> Schema version: 1.0
> Status: Done
> Understanding: 99%
> Confidence: 97%
> Progress: 100%
> Complexity: High
> Theme: Shared hybrid payload governance
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
- `req_093` exists because each hybrid assist flow could otherwise invent a slightly different payload shape, confidence field, and execution metadata contract.
- Without one shared envelope, CLI surfaces, plugin rendering, and audit tooling will need flow-specific parsing logic.
- This shared contract is the minimum platform layer required before the assist portfolio can scale coherently.

# Scope
- In:
  - define a shared payload envelope for hybrid assist outputs
  - define common execution metadata such as backend, confidence, rationale, inputs used, validation state, and artifact references
  - define field-level expectations that apply across first-wave and second-wave flows
  - keep the contract machine-readable and stable enough for CLI, plugin, and audit reuse
- Out:
  - designing every feature-specific payload body in this one slice
  - plugin-only rendering choices
  - backend-selection rules, which belong to adjacent governance slices

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|define-a-shared-hybrid-assist-payload-en|req-089-add-a-hybrid-ollama-or-codex-loc|req-093-exists-because-each-hybrid-assis|ac1-a-shared-machine-readable-payload-en
flowchart LR
    Request[req_093] --> Problem[Hybrid flows need one payload envelope]
    Problem --> Envelope[Define shared output and metadata fields]
    Envelope --> Reuse[Enable CLI plugin and audit reuse]
    Reuse --> Done[Execution task]
```

# Acceptance criteria
- AC1: A shared machine-readable payload envelope exists for hybrid assist outputs with common execution metadata fields reused across flows.
- AC2: The contract is stable enough that CLI, plugin, and audit surfaces can consume the same envelope without flow-specific parsing for core metadata.
- AC3: Feature-specific payload bodies remain possible without undermining the shared contract for backend, confidence, rationale, and validation state.

# AC Traceability
- req093-AC1 -> Scope: define the shared payload envelope. Proof: the item requires common metadata fields for backend, confidence, rationale, and validation state.
- req093-AC4 -> Scope: enable runtime and activation reuse. Proof: the item requires the contract to be stable enough for CLI, plugin, and audit consumers.
- req093-AC7 -> Scope: keep the slice horizontal. Proof: the item explicitly excludes solving every feature-specific payload body here.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Consider
- Architecture signals: machine-readable contract and cross-surface integration
- Architecture follow-up: Consider an architecture decision if the shared hybrid envelope becomes a stable public contract for plugin and agent adapters.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): `adr_011_keep_hybrid_assist_runtime_contracts_shared_backend_agnostic_and_safely_bounded`
- Request: `req_093_add_shared_hybrid_assist_contracts_fallback_policy_activation_rules_and_audit_governance_for_logics_delivery_automation`
- Primary task(s): `task_100_orchestration_delivery_for_req_089_to_req_095_hybrid_assist_runtime_portfolio_governance_portability_and_plugin_exposure`

# AI Context
- Summary: Define the shared hybrid assist payload envelope and execution metadata contract that all assist flows can reuse.
- Keywords: payload envelope, metadata, confidence, backend, rationale, validation state, hybrid assist
- Use when: Use when standardizing structured results across multiple hybrid assist flows.
- Skip when: Skip when the work is limited to one feature-specific payload body.

# References
- `logics/request/req_093_add_shared_hybrid_assist_contracts_fallback_policy_activation_rules_and_audit_governance_for_logics_delivery_automation.md`
- `logics/request/req_089_add_a_hybrid_ollama_or_codex_local_orchestration_backend_for_repetitive_logics_delivery_tasks.md`
- `logics/skills/logics-flow-manager/scripts/logics_flow.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow_dispatcher.py`
- `logics/skills/logics.py`

# Priority
- Impact: High. A shared envelope prevents parsing and audit fragmentation across the whole hybrid portfolio.
- Urgency: High. This should land before many concrete flows rely on incompatible output shapes.

# Notes
- Keep the contract compact enough that new flows adopt it by default instead of working around it.
