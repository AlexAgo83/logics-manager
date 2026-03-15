## req_029_default_collapsed_secondary_sections_in_detail_panel - Default secondary detail sections to collapsed in the plugin detail panel
> From version: 1.9.2
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Complexity: Low
> Theme: Detail panel scanability and progressive disclosure
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Reduce visual density in the plugin detail panel by collapsing secondary sections by default.
- Keep the most immediately useful information visible on first open:
  - the top identity/header block;
  - the `Indicators` section.
- Default the lower-value or less frequently needed sections to closed:
  - `Companion docs`
  - `Specs`
  - `References`
  - `Used by`

# Context
The detail panel has become much richer and more operational over time.
That is useful, but the current default-open state makes the panel visually heavy, especially in a constrained sidebar.

On first selection, users typically need:
- the item identity;
- current workflow indicators/status;
- and the main actions at the bottom.

They do not always need the full expanded content of every supporting section.
When `Companion docs`, `Specs`, `References`, and `Used by` all read as equally expanded by default, the panel becomes harder to scan and the most important information loses emphasis.

This is not a request to remove those sections.
It is a request to improve the default information hierarchy through progressive disclosure:
- important first;
- secondary on demand.

# Acceptance criteria
- AC1: When a detail panel is opened for a selected item, the top header/identity block remains visible as it is today.
- AC2: `Indicators` is expanded by default.
- AC3: `Companion docs` is collapsed by default.
- AC4: `Specs` is collapsed by default.
- AC5: `References` is collapsed by default.
- AC6: `Used by` is collapsed by default.
- AC7: Users can still manually expand/collapse each section exactly as before.
- AC8: The default collapsed/expanded state applies when a new item is selected, without breaking existing section toggle interactions.
- AC9: The change does not affect the availability or behavior of inline actions inside those sections once expanded.
- AC10: Webview tests cover the default section-open state so the new hierarchy does not regress later.

# Scope
- In:
  - Default-open state for detail panel sections.
  - Preserve manual expand/collapse interactions.
  - Add or update tests for the initial section state.
- Out:
  - Redesigning the detail panel structure.
  - Removing any section.
  - Changing the semantics of companion-doc or reference actions.
  - Reordering the sections themselves unless needed separately later.

# Dependencies and risks
- Dependency: current detail-section collapse logic remains the underlying mechanism.
- Dependency: the panel still needs to feel responsive when switching selected items.
- Risk: if section state persistence is global rather than selection-aware, the new defaults may be masked unexpectedly by previously stored toggle state.
- Risk: collapsing too aggressively could hide important context for some users if the affordance to expand is not clear enough.
- Risk: implementation may need to define whether defaults apply only on first open, on every selection change, or when no persisted section state exists.

# Clarifications
- The request concerns the default-open state only, not section availability.
- `Indicators` should remain open because it is part of the primary operational read.
- `Companion docs`, `Specs`, `References`, and `Used by` should still be one click away, just not expanded by default.
- The header/identity block at the top is not considered a collapsible secondary section in this request.
- If there is existing persisted section state, the preferred behavior should be explicitly decided during implementation:
  - either honor persisted user intent;
  - or reapply the new defaults on each new selection.
- The core UX goal is clear even if that persistence nuance needs implementation clarification:
  - reduce default clutter;
  - preserve discoverability;
  - keep actions available when users choose to expand.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_033_default_collapsed_secondary_sections_in_detail_panel.md`
