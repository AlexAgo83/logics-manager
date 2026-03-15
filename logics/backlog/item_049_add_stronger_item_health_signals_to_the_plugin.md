## item_049_add_stronger_item_health_signals_to_the_plugin - Add stronger item health signals to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Workflow health visibility and issue detection
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
Users can often infer that an item is unhealthy or fragile, but not quickly enough from the main surfaces. Important signals such as orphaned state, blocked progress, stale work, or missing companion docs are not always surfaced strongly enough to support rapid scanning.

The plugin needs stronger health signaling so problematic items stand out earlier and require less manual inspection.

# Scope
- In:
  - Define a first useful set of stronger health signals.
  - Render clearer UI cues for those signals.
  - Preserve readability and avoid excessive visual overload.
  - Add regression coverage for health-signal rendering.
- Out:
  - Full analytics dashboards.
  - Opaque health scores.
  - Replacing current indicators wholesale.

# Acceptance criteria
- AC1: The plugin surfaces a clear first set of stronger health signals for items that likely need attention.
- AC2: The signals are understandable enough that users can infer the issue being highlighted.
- AC3: Health signals are visible enough in the main browsing surfaces to speed up scanning.
- AC4: The signals do not regress existing navigation or overcrowd the UI excessively.
- AC5: The feature works coherently in board mode and list mode.
- AC6: Tests cover the main health-signal rendering rules where practical.

# AC Traceability
- AC1/AC2 -> the plugin now surfaces a first explicit set of health signals for blocked, orphaned, and done-mismatch items using clear badge labels and card treatment. Proof: `media/main.js`, `media/renderBoard.js`.
- AC3 -> health issues are now visible directly in the main browsing surfaces through stronger badge styling and alert-state cards. Proof: `media/renderBoard.js`, `media/css/board.css`.
- AC4 -> the treatment stays bounded to a small set of high-confidence signals and remains visually controlled. Proof: `media/renderBoard.js`, `media/css/board.css`.
- AC5 -> the shared card renderer applies the same health-signal system in board and list modes. Proof: `media/renderBoard.js`.
- AC6 -> harness tests cover the core blocked and orphaned signal rules. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - Medium-High: useful for triage and faster issue spotting.
- Urgency:
  - Medium: valuable once guidance/triage features start to grow.

# Notes
- Derived from `logics/request/req_044_add_stronger_item_health_signals_to_the_plugin.md`.
- The first version should prefer explicit or strongly grounded signals such as blocked status, orphaned links, or clear inconsistency, and health cues should take precedence over suggested-action guidance.

# Tasks
- `logics/tasks/task_043_add_stronger_item_health_signals_to_the_plugin.md`
