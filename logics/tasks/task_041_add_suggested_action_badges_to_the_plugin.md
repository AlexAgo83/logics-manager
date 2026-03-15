## task_041_add_suggested_action_badges_to_the_plugin - Add suggested-action badges to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Medium
> Theme: Workflow guidance and proactive orchestration
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_047_add_suggested_action_badges_to_the_plugin`.
- Source file: `logics/backlog/item_047_add_suggested_action_badges_to_the_plugin.md`.
- Related request(s): `req_042_add_suggested_action_badges_to_the_plugin`.

# Plan
- [ ] 1. Define the first high-confidence suggested-action badge heuristics as opportunistic guidance rather than hard workflow gates.
- [ ] 2. Add badge rendering to the main browsing surfaces.
- [ ] 3. Keep badge semantics distinct from current indicators and from health diagnostics.
- [ ] 4. Verify coherence in board mode and list mode.
- [ ] 5. Ensure existing interactions remain intact after badge introduction and card-level badge density stays controlled.
- [ ] 6. Add/adjust regression tests for suggested-badge rendering.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2 -> Steps 1 and 2.
- AC3 -> Step 3.
- AC4 -> Step 4.
- AC5 -> Step 5.
- AC6 -> Step 6.

# Links
- Backlog item: `item_047_add_suggested_action_badges_to_the_plugin`
- Request(s): `req_042_add_suggested_action_badges_to_the_plugin`

# Validation
- `npm run compile`
- `npm test`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.
