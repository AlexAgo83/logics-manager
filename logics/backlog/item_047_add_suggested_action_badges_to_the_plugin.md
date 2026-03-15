## item_047_add_suggested_action_badges_to_the_plugin - Add suggested-action badges to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Medium
> Theme: Workflow guidance and proactive orchestration
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin still expects users to infer too much about what to do next. That slows down triage and reduces the product’s value as an orchestration cockpit.

Suggested-action badges would help surface high-confidence next-step cues directly on items, making the UI more proactive without requiring users to inspect every detail panel first.

# Scope
- In:
  - Define a first useful set of suggested-action badges.
  - Render them in the main browsing surfaces.
  - Keep them explainable and operational.
  - Add regression coverage for badge rendering.
- Out:
  - Opaque recommendation engines.
  - Replacing the current indicator system.
  - Decorative badges with no actionable meaning.

# Acceptance criteria
- AC1: The plugin displays suggested-action badges for at least a first useful set of actionable item states.
- AC2: The badges are understandable enough that users can infer why they appear.
- AC3: Badges complement existing indicators rather than replacing them.
- AC4: Badge rendering works coherently in board mode and list mode.
- AC5: The feature does not regress existing item selection, navigation, or action flows.
- AC6: Tests cover the main suggested-badge rendering rules where practical.

# AC Traceability
- AC1/AC2 -> first badge heuristics and rendering rules are introduced clearly. Proof: TODO.
- AC3 -> badge semantics remain distinct from current indicators. Proof: TODO.
- AC4 -> board/list item renderers support the same badge system coherently. Proof: TODO.
- AC5 -> current interactions remain intact after badge introduction. Proof: TODO.
- AC6 -> tests cover primary badge-rendering rules. Proof: TODO.

# Priority
- Impact:
  - Medium-High: strong value for scanability and next-step clarity.
- Urgency:
  - Medium: useful once core browsing and filtering flows are solid.

# Notes
- Derived from `logics/request/req_042_add_suggested_action_badges_to_the_plugin.md`.
- Suggested-action badges should remain opportunistic guidance signals, distinct from health diagnostics, with tightly controlled card-level density.

# Tasks
- `logics/tasks/task_041_add_suggested_action_badges_to_the_plugin.md`
