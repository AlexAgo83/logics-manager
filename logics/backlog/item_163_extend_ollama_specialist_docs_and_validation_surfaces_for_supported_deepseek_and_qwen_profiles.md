## item_163_extend_ollama_specialist_docs_and_validation_surfaces_for_supported_deepseek_and_qwen_profiles - Extend Ollama specialist docs and validation surfaces for supported DeepSeek and Qwen profiles
> From version: 1.12.1
> Schema version: 1.0
> Status: Done
> Understanding: 97%
> Confidence: 96%
> Progress: 100%
> Complexity: Medium
> Theme: Ollama specialist profile guidance
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
- Even if the runtime supports multiple local-model profiles, operators will still experience a DeepSeek-biased system unless the repository guidance and Ollama validation surfaces evolve with it.
- The current specialist and health conventions were built around DeepSeek-first guidance and need a bounded extension for the supported Qwen path.
- Without one focused slice, documentation and runtime validation will drift apart and model-family flexibility will stay theoretical.

# Scope
- In:
  - extend `logics-ollama-specialist` guidance for the curated DeepSeek and Qwen profiles supported by the runtime
  - align operator validation and runtime-check guidance with the selected profile model family
  - document supported example tags or profile names plus how to override them safely
  - keep the support policy explicit and bounded
- Out:
  - unbounded documentation for every Ollama model family
  - plugin UX changes
  - broad benchmark-driven model comparisons outside operator setup needs

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|extend-ollama-specialist-docs-and-valida|req-086-upgrade-the-logics-ollama-specia|even-if-the-runtime-supports-multiple|ac1-the-ollama-specialist-and-related
flowchart LR
    Request[req_097] --> Problem[Docs and validation are still DeepSeek biased]
    Problem --> Specialist[Extend specialist guidance for supported profiles]
    Specialist --> Validate[Align validation and runtime checks]
    Validate --> Bound[Keep support curated and explicit]
```

# Acceptance criteria
- AC1: The Ollama specialist and related runtime guidance document the supported DeepSeek and Qwen profiles clearly enough for operators to choose and validate them.
- AC2: Validation guidance and health-check expectations stay aligned with the currently configured supported profile rather than remaining implicitly DeepSeek-only.
- AC3: The support policy remains curated and bounded, with explicit supported examples and override guidance instead of an open-ended promise about arbitrary tags.

# AC Traceability
- req097-AC4 -> Scope: update the Ollama specialist and runtime guidance. Proof: the item is dedicated to documenting switching and validating supported DeepSeek and Qwen profiles.
- req097-AC5 -> Scope: keep support bounded. Proof: the item explicitly requires curated examples and override guidance instead of a generic model registry promise.
- req097-AC6 -> Scope: keep ownership kit-side. Proof: the item is restricted to specialist docs and runtime validation surfaces rather than plugin-owned logic.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): `adr_011_keep_hybrid_assist_runtime_contracts_shared_backend_agnostic_and_safely_bounded`
- Request: `req_097_expand_hybrid_local_model_support_beyond_deepseek_with_configurable_qwen_and_deepseek_profiles`
- Primary task(s): `task_101_orchestration_delivery_for_req_096_and_req_097_plugin_polish_and_hybrid_local_model_profile_flexibility`

# AI Context
- Summary: Extend the Ollama specialist and runtime validation guidance so the supported DeepSeek and Qwen local-model profiles are documented, verifiable, and bounded.
- Keywords: ollama specialist, deepseek, qwen, docs, validation, model profiles, runtime checks
- Use when: Use when aligning operator guidance and validation with the curated local-model profiles supported by the hybrid runtime.
- Skip when: Skip when the work is only about plugin UX or runtime config internals.

# References
- `logics/request/req_097_expand_hybrid_local_model_support_beyond_deepseek_with_configurable_qwen_and_deepseek_profiles.md`
- `logics/request/req_086_upgrade_the_logics_ollama_specialist_for_deepseek_coder_v2_installation_setup_and_access.md`
- `logics/request/req_087_extend_the_logics_ollama_specialist_for_roo_code_and_dedicated_local_autocomplete_workflows.md`
- `logics/skills/logics-ollama-specialist/SKILL.md`
- `logics/skills/logics-ollama-specialist/scripts/ollama_check.sh`
- `logics/skills/README.md`

# Priority
- Impact: High. Operators need the runtime docs and checks to match the supported model-family choices in practice.
- Urgency: Medium. This should land together with the runtime profile support rather than later.

# Notes
- Favor one crisp supported-profile story over broad but weakly maintained model-family guidance.
