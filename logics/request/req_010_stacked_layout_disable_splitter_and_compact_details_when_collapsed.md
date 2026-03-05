## req_010_stacked_layout_disable_splitter_and_compact_details_when_collapsed - Stacked layout: disable splitter and compact details when collapsed
> From version: 1.1.0
> Status: Done
> Understanding: 99%
> Confidence: 97%
> Complexity: Medium
> Theme: UX Behavior and Interaction Guardrails
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- In stacked (vertical split) layout, collapsing Details should also disable splitter interaction.
- When collapsed, Details should remain compact at the bottom (header + actions footprint), without resizable split behavior.
- Prevent confusing UX where users can still drag/resize while Details content is hidden.

# Context
Current stacked layout allows resizing via `#splitter` with `splitRatio`.

Problem:
- users can collapse Details and still interact with the splitter;
- this creates a contradictory state (hidden details body but active resizing mechanics).

Expected behavior:
- collapse in stacked mode behaves like a compact bottom bar;
- splitter is non-interactive until Details is expanded again.

# Acceptance criteria
- AC1: In stacked layout, when Details is collapsed, pointer drag on splitter is ignored.
- AC2: In stacked layout, when Details is collapsed, keyboard resize interactions on splitter are disabled/ignored.
- AC3: Details renders compact at bottom (no details body, compact footprint, stable board area).
- AC4: Re-expanding Details restores normal splitter behavior and previous split ratio logic.
- AC5: Non-stacked layout behavior is unchanged.

# Scope
- In:
  - Interaction guards for splitter in collapsed stacked mode.
  - CSS/state adjustments for compact bottom details bar.
  - Regression-safe handling for expand/collapse transitions.
- Out:
  - Redesign of desktop (non-stacked) layout.
  - Broader refactor of details panel content.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_010_stacked_layout_disable_splitter_and_compact_details_when_collapsed.md`
