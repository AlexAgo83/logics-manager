## item_013_accessibility_hardening_improve_discoverability_and_descriptions_for_controls - Accessibility hardening: improve discoverability and descriptions for controls
> From version: 1.2.0
> Status: Done
> Schema version: 1.0
> Understanding: 100%
> Confidence: 98%
> Progress: 100%
> Complexity: Medium
> Theme: Accessibility and UX
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.
> Indicators reviewed: 2026-08-10 09:06:11

# Problem
A significant set of controls still lacks consistent discoverable descriptions and accessible naming patterns, reducing usability for keyboard and assistive-technology users.

# Scope
- In:
  - Audit icon-first and dynamic controls for accessible names/state attributes.
  - Add consistent tooltip/title policy for hover/focus discoverability.
  - Ensure keyboard users can discover purpose and operate controls without ambiguity.
  - Add/adjust test coverage for critical a11y regressions where feasible.
- Out:
  - Full conformance/certification program.
  - Visual redesign not tied to accessibility hardening.

# Acceptance criteria
- Icon-first controls expose clear descriptions on hover/focus and accessible names.
- Actionable controls have non-empty accessible names across toolbar/board/details/menu surfaces.
- Dynamic controls expose accurate ARIA state (`aria-expanded`, `aria-disabled`, etc.) where applicable.
- Keyboard-only flows remain operable and discoverable.
- A concise project a11y baseline/checklist is documented for future additions.

# AC Traceability
- AC1 -> UI control attributes/tooltip updates in `media/main.js` and related markup. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC2 -> A11y smoke checks and/or tests added for key interactions. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC3 -> Documentation updates in README or logics guidance. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC4 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC5 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.

# Priority
- Impact:
  - High: improves daily usability and inclusivity.
- Urgency:
  - Medium-High: should precede larger UX feature growth.

# Notes
- Derived from `logics/request/req_013_accessibility_hardening_improve_discoverability_and_descriptions_for_controls.md`.

# Tasks
- `logics/tasks/task_014_orchestration_delivery_for_req_012_and_req_013_harness_controls_and_accessibility.md`
