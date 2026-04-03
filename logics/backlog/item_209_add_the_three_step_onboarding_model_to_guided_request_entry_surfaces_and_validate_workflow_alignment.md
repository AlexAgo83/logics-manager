## item_209_add_the_three_step_onboarding_model_to_guided_request_entry_surfaces_and_validate_workflow_alignment - Add the three step onboarding model to guided request entry surfaces and validate workflow alignment
> From version: 1.18.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 92%
> Progress: 0%
> Complexity: Medium
> Theme: Workflow
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
- Make the Logics workflow understandable at entry through three visible steps: Need, Framing, and Execution.
- Reduce the need for users to know the internal request to backlog to task protocol before they can start using the system correctly.
- Keep the first slice focused on onboarding, wording, and workflow visibility rather than on full auto orchestration.
- The current repository already exposes guided request and workflow actions in the plugin, but the chosen onboarding model still needs to be surfaced where users begin the workflow:
  - `src/workflowSupport.ts`
  - `src/logicsViewDocumentController.ts`
  - `src/logicsViewProvider.ts`
  - `media/toolsPanelLayout.js`

# Scope
- In:
  - surface the three-step onboarding model in the guided request or equivalent entry surfaces
  - align the visible onboarding text with the canonical request, backlog, and task workflow
  - validate that the chosen surface stays readable and does not regress existing workflow entry actions
  - capture the workflow-alignment evidence in linked docs and tests
- Out:
  - redefining the three-step model itself beyond what `item_208` establishes
  - deeper orchestration automation, autonomy modes, or Git policy changes
  - redesigning unrelated plugin surfaces outside the onboarding entry path

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|add-the-three-step-onboarding-model-to-g|req-119-three-step-onboarding-for-need-f|make-the-logics-workflow-understandable-|ac1-the-product-exposes-three-clearly
flowchart LR
    Request[req_119_three_step_onboarding_for_need_fra] --> Problem[Make the Logics workflow understandable at]
    Problem --> Scope[Add the three step onboarding model]
    Scope --> Acceptance[AC1: The product exposes three clearly]
    Acceptance --> Tasks[Execution task]
```

# Acceptance criteria
- AC1: The product exposes three clearly labeled onboarding stages: Need, Framing, and Execution.
- AC2: Each stage includes short operator-facing copy that explains its purpose without requiring prior knowledge of request, backlog, task, or companion-doc terminology.
- AC3: The onboarding model maps cleanly to the existing Logics workflow primitives without renaming or replacing the canonical internal document structure.
- AC4: At least one current entry surface used by operators makes the three-step model visible where new workflow actions are initiated.
- AC5: The implementation scope stays limited to onboarding and workflow comprehension; full auto orchestration remains explicitly out of scope for this request.

# AC Traceability
- AC1 -> Surface implementation. Proof: render the three labeled stages in the chosen entry surface using the model defined in `item_208`.
- AC2 -> Surface copy. Proof: show the operator-facing copy in context and verify it reads clearly without protocol knowledge.
- AC3 -> Workflow alignment. Proof: validate that the visible onboarding still maps cleanly to canonical request, backlog, and task behavior in the implementation.
- AC4 -> Scope: surface the model in at least one current entry surface. Proof: this item owns the actual integration point and its validation.
- AC5 -> Scope boundary. Proof: keep the delivery limited to onboarding and workflow comprehension rather than automation expansion.

# Decision framing
- Product framing: Required
- Product signals: conversion journey
- Product follow-up: Create or link a product brief before implementation moves deeper into delivery.
- Architecture framing: Consider
- Architecture signals: contracts and integration
- Architecture follow-up: Re-evaluate if the chosen entry surface requires a non-trivial host or data-contract change.

# Links
- Product brief(s): `prod_004_logics_auto_orchestration_vision`
- Architecture decision(s): (none yet)
- Request: `req_119_three_step_onboarding_for_need_framing_and_execution`
- Primary task(s): `task_109_orchestration_delivery_for_req_119_three_step_onboarding`

# AI Context
- Summary: Add a simple three-step onboarding model so users understand Logics as Need, Framing, and Execution before they have...
- Keywords: onboarding, workflow, need, framing, execution, guided request, product entry, workflow comprehension
- Use when: Use when designing or implementing first-use workflow messaging, onboarding copy, or information architecture around Logics entry surfaces.
- Skip when: Skip when the work is specifically about deeper orchestration automation, Git policy, or internal workflow mutation behavior.

# References
- `logics/instructions.md`
- `logics/skills/logics-flow-manager/SKILL.md`
- `logics/product/prod_004_logics_auto_orchestration_vision.md`
- `src/logicsViewProvider.ts`
- `src/logicsViewDocumentController.ts`
- `media/toolsPanelLayout.js`
- `.claude/agents/logics-flow-manager.md`
- `.claude/agents/logics-hybrid-delivery-assistant.md`
- `logics/skills/logics-ui-steering/SKILL.md`

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Derived from request `req_119_three_step_onboarding_for_need_framing_and_execution`.
- Source file: `logics/request/req_119_three_step_onboarding_for_need_framing_and_execution.md`.
- Request context seeded into this backlog item from `logics/request/req_119_three_step_onboarding_for_need_framing_and_execution.md`.
