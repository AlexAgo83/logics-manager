## item_048_improve_plugin_onboarding_and_empty_states - Improve plugin onboarding and empty states
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Discoverability and first-use clarity
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin has become richer, but it is still too easy for new or occasional users to hit under-explained states. Empty states often describe absence without helping users understand what to do next.

That creates avoidable confusion around core concepts such as filters, board/list mode, companion docs, promotion, and details actions.

# Scope
- In:
  - Improve empty-state copy and actions.
  - Add lightweight contextual onboarding/help affordances.
  - Keep the guidance useful without cluttering the UI.
  - Add regression coverage for important onboarding/empty states.
- Out:
  - A full tutorial engine.
  - Rewriting all plugin copy.
  - Major structural redesign.

# Acceptance criteria
- AC1: Empty states provide actionable guidance instead of only reporting absence.
- AC2: The plugin exposes clearer first-use guidance for core concepts such as board/list mode, filters, and details.
- AC3: The onboarding/help affordances do not clutter the UI for experienced users.
- AC4: Guidance remains context-aware rather than generic boilerplate.
- AC5: The feature does not regress current workflows for experienced users.
- AC6: Tests cover the most important onboarding or empty-state rendering paths where practical.

# AC Traceability
- AC1/AC2 -> empty states now provide actionable recovery guidance, and the plugin exposes a lightweight contextual help banner for no-selection and empty-workspace moments. Proof: `media/renderBoard.js`, `media/renderDetails.js`, `media/main.js`, `src/extension.ts`.
- AC3/AC4 -> onboarding help remains contextual, lightweight, and dismissible rather than persistent boilerplate. Proof: `media/main.js`, `media/css/toolbar.css`.
- AC5 -> experienced-user workflows remain intact because the help banner can be dismissed and no core actions were replaced. Proof: `media/main.js`.
- AC6 -> harness tests cover the key empty-state and help-dismissal paths. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - Medium: improves first-use success and reduces confusion.
- Urgency:
  - Medium-Low: important for adoption, but less critical than core workflow speed.

# Notes
- Derived from `logics/request/req_043_improve_plugin_onboarding_and_empty_states.md`.
- The first emphasis should be contextual workspace and empty-state guidance, and lightweight help affordances should be dismissible where appropriate.

# Tasks
- `logics/tasks/task_042_improve_plugin_onboarding_and_empty_states.md`
