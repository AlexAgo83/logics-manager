## item_153_define_shared_hybrid_assist_context_pack_profiles_enrichment_rules_and_trimming_strategy - Define shared hybrid assist context-pack profiles, enrichment rules, and trimming strategy
> From version: 1.12.1
> Schema version: 1.0
> Status: Ready
> Understanding: 99%
> Confidence: 95%
> Progress: 0%
> Complexity: High
> Theme: Shared hybrid context discipline
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
- `req_094` identifies context discipline as a first-class problem: hybrid assist quality collapses if each flow gathers too little, too much, or the wrong shape of context.
- A shared context-pack strategy is needed so assist flows can reuse one compact baseline with optional enrichments and explicit trimming rules.
- Without this slice, token cost, latency, and quality will vary unpredictably between flows and backends.

# Scope
- In:
  - define shared context-pack profiles for hybrid assist flows
  - define a compact core context plus optional enrichments such as diff stats, graph slices, registry summaries, and validation outputs
  - define trimming and truncation rules so context stays bounded and explainable
  - define how flows declare which profile and enrichments they need
- Out:
  - hardcoding one giant context bundle for every assist flow
  - backend-specific prompt engineering details that do not belong in the shared runtime strategy
  - plugin-only rendering of context-pack summaries

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|define-shared-hybrid-assist-context-pack|req-082-strengthen-logics-kit-primitives|req-094-identifies-context-discipline-as|ac1-shared-context-pack-profiles-exist-f
flowchart LR
    Request[req_094] --> Problem[Hybrid assist needs one shared context discipline]
    Problem --> Core[Define core context profiles]
    Core --> Enrich[Define optional enrichments]
    Enrich --> Trim[Define trimming and truncation rules]
    Trim --> Done[Execution task]
```

# Acceptance criteria
- AC1: Shared context-pack profiles exist for hybrid assist flows with a minimal core context that multiple flows can reuse.
- AC2: Optional enrichments such as diff stats, graph slices, registry summaries, and validation outputs are defined explicitly instead of being ad hoc additions.
- AC3: Trimming and truncation rules keep context bounded and explainable so token usage and latency remain manageable across flows.

# AC Traceability
- req094-AC2 -> Scope: define shared context-pack profiles and enrichments. Proof: the item requires a reusable core context plus optional enrichments.
- req094-AC3 -> Scope: define trimming rules. Proof: the item explicitly requires bounded and explainable truncation behavior.
- req094-AC6 -> Scope: complement req_093 rather than replace it. Proof: the item focuses on context strategy rather than the shared payload envelope itself.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Consider
- Architecture signals: context contract and token/latency discipline
- Architecture follow-up: Consider an architecture decision if context profiles become a stable operator-facing contract across multiple agent adapters.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): `adr_011_keep_hybrid_assist_runtime_contracts_shared_backend_agnostic_and_safely_bounded`
- Request: `req_094_add_hybrid_assist_measurement_shared_context_strategy_and_degraded_mode_governance_for_logics_delivery_automation`
- Primary task(s): `task_100_orchestration_delivery_for_req_089_to_req_095_hybrid_assist_runtime_portfolio_governance_portability_and_plugin_exposure`

# AI Context
- Summary: Define shared context-pack profiles, enrichments, and trimming rules so hybrid assist flows stay compact, explainable, and consistent.
- Keywords: context pack, enrichment, trimming, truncation, latency, token budget, hybrid assist
- Use when: Use when standardizing the inputs that hybrid assist flows send to Ollama or Codex.
- Skip when: Skip when the work is only about one feature-specific prompt shape.

# References
- `logics/request/req_094_add_hybrid_assist_measurement_shared_context_strategy_and_degraded_mode_governance_for_logics_delivery_automation.md`
- `logics/request/req_082_strengthen_logics_kit_primitives_for_compact_ai_context_and_reusable_handoff_generation.md`
- `logics/skills/logics-flow-manager/scripts/logics_flow.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow_index.py`
- `logics/skills/README.md`

# Priority
- Impact: High. Shared context discipline strongly affects quality, cost, and latency across the whole hybrid platform.
- Urgency: High. This should shape first implementations rather than be retrofitted after several flows exist.

# Notes
- Prefer a small number of reusable context profiles over one-off per-command context builders.
