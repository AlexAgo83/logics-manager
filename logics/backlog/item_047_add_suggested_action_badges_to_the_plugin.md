## item_047_add_suggested_action_badges_to_the_plugin - Add suggested-action badges to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
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
- AC1/AC2 -> the plugin now renders a first small set of suggested-action badges for promotable items, workflow items needing companion docs, and supporting docs that should link back to primary flow. Proof: `media/main.js`, `media/renderBoard.js`.
- AC3 -> suggested badges are rendered in their own badge row and remain distinct from the existing indicator and companion badge systems. Proof: `media/renderBoard.js`, `media/css/board.css`.
- AC4 -> the shared card renderer shows the same suggested-action badges in board and list modes. Proof: `media/renderBoard.js`.
- AC5 -> card selection and existing actions remain unchanged after badge introduction. Proof: `media/renderBoard.js`.
- AC6 -> harness tests cover the core suggested-badge heuristics. Proof: `tests/webview.harness-a11y.test.ts`.

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
