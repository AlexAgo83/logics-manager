## item_033_default_collapsed_secondary_sections_in_detail_panel - Default secondary detail sections to collapsed in the plugin detail panel
> From version: 1.9.2
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Low
> Theme: Detail panel scanability and progressive disclosure
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin detail panel currently exposes too much expanded content by default. When `Companion docs`, `Specs`, `References`, and `Used by` all render open at once, the sidebar becomes visually dense and the most important information loses emphasis.

Users usually need the top identity block and workflow indicators immediately, but the secondary sections are more often exploratory or contextual. Keeping those secondary sections expanded by default makes the panel harder to scan and weakens progressive disclosure in an already narrow surface.

# Scope
- In:
  - Keep the top header/identity block visible.
  - Keep `Indicators` expanded by default.
  - Default `Companion docs`, `Specs`, `References`, and `Used by` to collapsed.
  - Preserve manual expand/collapse behavior for all sections.
  - Add regression coverage for the default-open/default-collapsed section state.
- Out:
  - Redesigning the detail panel information architecture.
  - Removing any section.
  - Changing section order.
  - Changing companion-doc, spec, reference, or used-by actions once a section is expanded.

# Acceptance criteria
- AC1: The top header/identity block remains visible on selection.
- AC2: `Indicators` is expanded by default.
- AC3: `Companion docs` is collapsed by default.
- AC4: `Specs` is collapsed by default.
- AC5: `References` is collapsed by default.
- AC6: `Used by` is collapsed by default.
- AC7: Users can still manually expand/collapse each section.
- AC8: The intended default section state is applied on selection without breaking existing toggle behavior.
- AC9: Inline actions inside those sections remain available and unchanged when expanded.
- AC10: Webview tests lock the new default open/collapsed hierarchy.

# AC Traceability
- AC1/AC2 -> detail header rendering and default section-state initialization in the details renderer. Proof: TODO.
- AC3/AC4/AC5/AC6 -> default collapsed-state rules for `Companion docs`, `Specs`, `References`, and `Used by`. Proof: TODO.
- AC7/AC8 -> existing section toggle interactions continue to work after the new defaults are applied. Proof: TODO.
- AC9 -> inline actions remain rendered and actionable once a section is expanded. Proof: TODO.
- AC10 -> webview harness coverage for section-open defaults and toggling. Proof: TODO.

# Priority
- Impact:
  - Medium: improves first-read clarity and reduces sidebar density in daily use.
- Urgency:
  - Medium: focused UX refinement with low implementation risk.

# Notes
- Derived from `logics/request/req_029_default_collapsed_secondary_sections_in_detail_panel.md`.

# Tasks
- `logics/tasks/task_028_default_collapsed_secondary_sections_in_detail_panel.md`
