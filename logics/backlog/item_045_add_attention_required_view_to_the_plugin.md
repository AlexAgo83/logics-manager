## item_045_add_attention_required_view_to_the_plugin - Add an attention-required view to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Operational focus and workflow triage
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin shows the current state of work well, but it is weaker at surfacing what likely needs intervention right now. Users still have to infer too much by manually scanning the current views.

An explicit attention-required lens would make the plugin more proactive by surfacing likely bottlenecks, stale work, missing links, or incomplete workflow progression.

# Scope
- In:
  - Define a first useful set of “attention required” signals.
  - Expose a dedicated view, mode, or focused filter path for those items.
  - Keep the feature understandable and actionable.
  - Add regression coverage for the core behavior.
- Out:
  - A full analytics dashboard.
  - Opaque scoring systems.
  - Replacing the current board/list workflows.

# Acceptance criteria
- AC1: The plugin exposes an explicit view, filter, or mode dedicated to items requiring attention.
- AC2: The criteria used to mark items as needing attention are explicit enough to be understandable.
- AC3: The attention-required surface helps users identify actionable items faster than the default browsing modes.
- AC4: The feature composes coherently with current filters and navigation behavior.
- AC5: The feature does not regress existing board/list workflows.
- AC6: Tests cover the core attention-classification behavior where practical.

# AC Traceability
- AC1/AC2 -> the plugin now exposes a dedicated `Attention` filter path backed by explicit heuristics for blocked, orphaned, unprocessed, or inconsistent items. Proof: `src/extension.ts`, `media/main.js`.
- AC3 -> the attention-only filter reduces the visible set to likely actionable items without introducing a separate workflow surface. Proof: `media/main.js`, `tests/webview.harness-a11y.test.ts`.
- AC4/AC5 -> the filter composes with current board/list rendering and existing navigation flows without changing card interaction patterns. Proof: `media/main.js`, `media/renderBoard.js`.
- AC6 -> harness coverage verifies the core attention filter behavior. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - Medium-High: strong value as a triage aid once workspaces become busier.
- Urgency:
  - Medium: strategically useful, but requires careful signal design.

# Notes
- Derived from `logics/request/req_040_add_attention_required_view_to_the_plugin.md`.
- The first version should rely on roughly four to five strict, low-noise, explainable heuristics rather than a broad scoring model.

# Tasks
- `logics/tasks/task_039_add_attention_required_view_to_the_plugin.md`
