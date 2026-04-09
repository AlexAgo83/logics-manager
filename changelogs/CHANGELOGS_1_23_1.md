# Changelog (`1.23.0 -> 1.23.1`)

## Major Highlights

- Delivered the Logics preview cleanup work: better Markdown task rendering, removed duplicated preview headers, and more contextual Mermaid generation.
- Synced request closures back into the workflow chain so finished tasks now propagate status cleanly through related requests and backlog items.
- Tightened the Logics flow runtime with cached context-pack reuse and cache-key normalization for noisy diff signals.
- Bumped the embedded `logics/skills` submodule for reminder wording cleanup and doc template consistency.

## Workflow And Skills

- Added in-process context-pack caching and normalized cache fingerprints so repeated flow operations avoid unnecessary recomputation.
- Ensured task completion syncs the linked request chain and keeps delivered docs aligned with task state.
- Clarified template reminders across `request`, `backlog`, and `task` docs so each doc type points to the right linked references.

## Preview, Board, And Badge Refinements

- Trimmed redundant title and instruction content from board previews.
- Improved task preview Markdown parsing for checkboxes and other lightweight styling.
- Kept preview rendering aligned with the source doc instead of repeating the same heading block twice.

## Mermaid And Diagram Quality

- Made generated Mermaid diagrams more contextual and vertical by default.
- Switched task-oriented workflow diagrams to a state-machine shape instead of a flat numbered list.

## Validation And Regression Evidence

- `python3 -m unittest logics.skills.tests.test_logics_flow_02.LogicsFlowTest.test_flow_templates_use_doc_specific_reminders`
- `python3 -m unittest logics.skills.tests.test_logics_flow_02.LogicsFlowTest.test_promotions_generate_context_aware_mermaid_signatures`
- `python3 logics/skills/logics.py flow assist release-changelog-status --format json`
