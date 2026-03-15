## req_042_add_suggested_action_badges_to_the_plugin - Add suggested-action badges to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Complexity: Medium
> Theme: Workflow guidance and proactive orchestration
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Surface stronger visual cues about what users are likely expected to do next.
- Reduce the amount of manual inference required when scanning items.
- Turn the plugin into a more proactive orchestration assistant.

# Context
The plugin already exposes structure, relationships, and indicators, but it still relies heavily on the user to infer what the next useful action is.
That is workable, but inefficient in busy workspaces.

Suggested-action badges could make the surface more operational by highlighting actionable states such as:
- promotable items;
- missing references;
- companion docs needed;
- review-needed situations;
- other workflow-relevant prompts.

This request is not about adding opaque “AI labels”.
It is about visible, explainable badges that help users decide where to act next.

# Acceptance criteria
- AC1: The plugin displays suggested-action badges for at least a first useful set of actionable item states.
- AC2: The suggested badges are understandable enough that users can infer why the badge appears.
- AC3: Badges do not replace existing workflow indicators, but complement them.
- AC4: Badge rendering works coherently in board mode and list mode.
- AC5: The feature does not regress existing item selection, navigation, or action flows.
- AC6: Tests cover the main suggested-badge rendering rules where practical.

# Scope
- In:
  - Define a first useful set of suggested-action badge states.
  - Render those badges in the plugin UI.
  - Keep the badges explainable and operational.
  - Add regression coverage for badge rendering.
- Out:
  - Opaque scoring models.
  - Replacing the current indicator system.
  - Full recommendation engines beyond practical workflow hints.

# Dependencies and risks
- Dependency: current item metadata and workflow rules must support clear badge heuristics.
- Dependency: badge rendering must stay visually compatible with existing card density.
- Risk: too many badges can create visual noise instead of guidance.
- Risk: weak heuristics can reduce trust in the signal.
- Risk: overlapping badge and indicator semantics can blur the UI if not kept distinct.

# Clarifications
- The purpose is “what likely needs action”, not generic decoration.
- The first version should favor a small set of high-confidence badges.
- Suggested badges should be explainable from existing workflow rules.
- The feature should support faster triage, not compete with the detail panel.
- Suggested-action badges should stay visually and semantically distinct from health signals: they recommend a likely next move, they do not diagnose item quality.
- Card-level badge density should stay tightly limited, with no more than a small handful of simultaneous signals competing for attention.
- “Promotable” and similarly useful hints should start as opportunistic guidance signals, not as hard workflow gates.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_047_add_suggested_action_badges_to_the_plugin.md`
