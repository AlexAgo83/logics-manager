## req_044_add_stronger_item_health_signals_to_the_plugin - Add stronger item health signals to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Complexity: Medium
> Theme: Workflow health visibility and issue detection
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Make problematic or fragile items visually obvious faster.
- Reduce the amount of manual inspection needed to detect stale, blocked, orphaned, or inconsistent items.
- Give the plugin stronger “health” signaling beyond the current baseline metadata.

# Context
Today, users can often infer that an item is unhealthy or needs review, but not always at a glance.
Signals such as:
- orphaned links,
- blocked work,
- stale progression,
- missing companion docs,
- inconsistent progress/status,
are valuable, but they are not always surfaced strongly enough in the main browsing surfaces.

This request is about making health issues easier to spot visually.
It is not about introducing heavy analytics.
It is about promoting already-meaningful workflow health signals into stronger, faster-to-scan UI cues.

# Acceptance criteria
- AC1: The plugin surfaces a clear first set of stronger health signals for items that likely need attention.
- AC2: Those signals are understandable enough that users can infer the issue being highlighted.
- AC3: Health signals are visible enough in the main browsing surfaces to speed up scanning.
- AC4: The signals do not regress existing navigation or overcrowd the UI excessively.
- AC5: The feature works coherently in board mode and list mode.
- AC6: Tests cover the main health-signal rendering rules where practical.

# Scope
- In:
  - Define a first useful set of item health signals.
  - Render stronger UI cues for those signals.
  - Keep the cues understandable and visually controlled.
  - Add regression coverage for signal rendering.
- Out:
  - Full analytics dashboards.
  - Opaque health scoring models.
  - Replacing current indicators entirely.

# Dependencies and risks
- Dependency: current metadata and relationship logic must support clear health heuristics.
- Dependency: the UI must have enough visual space to surface stronger signals without collapsing readability.
- Risk: too many strong signals can create alarm fatigue.
- Risk: if the signals are ambiguous, users may lose trust in them quickly.
- Risk: health cues can overlap awkwardly with new suggested-action badges if both systems are not clearly differentiated.

# Clarifications
- The goal is stronger visibility of meaningful workflow health issues, not decorative status chips.
- The first version should prefer a small set of high-confidence, high-value signals.
- Health signals should help users scan faster without requiring the detail panel for every diagnosis.
- This request is about stronger surfacing, not exhaustive workflow analysis.
- Health signals should stay visually and semantically distinct from suggested-action badges: health explains what looks wrong or fragile, while suggested action explains what the user should likely do next.
- Health signals should take visual precedence over suggested-action guidance when both are present, because diagnosis is more important than recommendation.
- The first version should prefer explicit or strongly grounded signals such as blocked status, orphaned links, or clear inconsistency over weaker age-only heuristics.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_049_add_stronger_item_health_signals_to_the_plugin.md`
