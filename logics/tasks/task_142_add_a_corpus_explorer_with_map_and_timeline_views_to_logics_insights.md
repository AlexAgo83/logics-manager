## task_142_add_a_corpus_explorer_with_map_and_timeline_views_to_logics_insights - Add a corpus explorer with map and timeline views to Logics Insights
> From version: 1.26.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: UI
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Maintenance edit: normalized checklist state after delivery closure.

# Context
- Derived from backlog item `item_331_add_a_corpus_explorer_with_map_and_timeline_views_to_logics_insights`.
- Source file: `logics/backlog/item_331_add_a_corpus_explorer_with_map_and_timeline_views_to_logics_insights.md`.
- Related request(s): `req_184_add_a_corpus_explorer_with_map_and_timeline_views_to_logics_insights`.
- Logics Insights already shows stats and timelines, but it still lacks a visual way to understand the corpus as a connected system.
- A corpus explorer should help operators see how the current project is shaped across requests, backlog items, tasks, and companion docs.
- The best fit is likely a single Insights surface with two complementary views: a relationship map and a delivery timeline.

```mermaid
%% logics-kind: task
%% logics-signature: task|add-a-corpus-explorer-with-map-and-timel|item-331-add-a-corpus-explorer-with-map-|1-confirm-scope-dependencies-and-linked|run-the-relevant-automated-tests-for
stateDiagram-v2
    [*] --> ConfirmScope
    ConfirmScope --> ImplementWave
    ImplementWave --> CheckpointWave
    CheckpointWave --> CheckAI
    CheckAI --> Gate
    Gate --> FinalUpdate
    FinalUpdate --> [*]
    state ConfirmScope {
      note right: 1. Confirm scope, dependencies,
      note right: and linked acceptance criteria.
    }
    state ImplementWave {
      note right: 2. Implement the next coherent
      note right: delivery wave from backlog.
    }
    state CheckpointWave {
      note right: 3. Checkpoint wave commit-ready,
      note right: validate, update docs.
    }
    state CheckAI {
      note right: CHECKPOINT: if shared AI runtime
      note right: active, run commit-all.
    }
    state Gate {
      note right: GATE: do not close wave until
      note right: tests and quality checks pass.
    }
    state FinalUpdate {
      note right: FINAL: Update related Logics docs.
    }
```

# Plan
- [x] 1. Confirm scope, dependencies, and linked acceptance criteria.
- [x] 2. Implement the next coherent delivery wave from the backlog item.
- [x] 3. Checkpoint the wave in a commit-ready state, validate it, and update the linked Logics docs.
- [x] CHECKPOINT: leave the current wave commit-ready and update the linked Logics docs before continuing.
- [x] CHECKPOINT: if the shared AI runtime is active and healthy, run `python logics/skills/logics.py flow assist commit-all` for the current step, item, or wave commit checkpoint.
- [x] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.
- [x] FINAL: Update related Logics docs

# Delivery checkpoints
- Each completed wave should leave the repository in a coherent, commit-ready state.
- Update the linked Logics docs during the wave that changes the behavior, not only at final closure.
- Prefer a reviewed commit checkpoint at the end of each meaningful wave instead of accumulating several undocumented partial states.
- If the shared AI runtime is active and healthy, use `python logics/skills/logics.py flow assist commit-all` to prepare the commit checkpoint for each meaningful step, item, or wave.
- Do not mark a wave or step complete until the relevant automated tests and quality checks have been run successfully.

# AC Traceability
- AC1 -> Scope: Logics Insights includes a corpus explorer entry point that is clearly tied to the current repository corpus.. Proof: capture validation evidence in this doc.
- AC2 -> Scope: The explorer offers a map view that shows relationships between requests, backlog items, tasks, and companion docs.. Proof: capture validation evidence in this doc.
- AC3 -> Scope: The explorer offers a timeline view that shows corpus activity or evolution over time.. Proof: capture validation evidence in this doc.
- AC4 -> Scope: The map and timeline views are complementary and can be switched without losing the selected project context.. Proof: capture validation evidence in this doc.
- AC5 -> Scope: The default view is usable for the current project without requiring extra setup or navigation.. Proof: capture validation evidence in this doc.
- AC6 -> Scope: The UI remains readable in a compact panel, with no fake data or decorative filler.. Proof: capture validation evidence in this doc.
- AC7 -> Scope: Tests or snapshots cover the explorer entry point and at least one representative map/timeline rendering state.. Proof: capture validation evidence in this doc.

# Decision framing
- Product framing: Required
- Product signals: navigation and discoverability, experience scope
- Product follow-up: Create or link a product brief before implementation moves deeper into delivery.
- Architecture framing: Consider
- Architecture signals: data model and persistence
- Architecture follow-up: Review whether an architecture decision is needed before implementation becomes harder to reverse.

# Links
- Product brief(s): `prod_008_add_a_corpus_explorer_with_map_and_timeline_views_to_logics_insights`
- Architecture decision(s): (none yet)
- Derived from `item_331_add_a_corpus_explorer_with_map_and_timeline_views_to_logics_insights`
- Request(s): `req_184_add_a_corpus_explorer_with_map_and_timeline_views_to_logics_insights`

# AI Context
- Summary: Add a corpus explorer inside Logics Insights with map and timeline views for the current project corpus.
- Keywords: corpus explorer, map view, timeline view, insights, relationships, project lens, current project, navigation
- Use when: Use when planning a new Insights surface that visualizes the corpus as a connected map and as a temporal path.
- Skip when: Skip when the change is only about the existing counts, velocity cards, or unrelated navigation surfaces.
# References
- `logics/skills/logics-ui-steering/SKILL.md`

# Validation
- Run the relevant automated tests for the changed surface before closing the current wave or step.
- Run the relevant lint or quality checks before closing the current wave or step.
- Confirm the completed wave leaves the repository in a commit-ready state.

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] No wave or step was closed before the relevant automated tests and quality checks passed.
- [x] Linked request/backlog/task docs updated during completed waves and at closure.
- [x] Each completed wave left a commit-ready checkpoint or an explicit exception is documented.
- [x] Status is `Done` and progress is `100%`.

# Report
- Delivered a compact corpus explorer inside Logics Insights with a default map view and an in-panel delivery timeline view.
- Kept the project lens anchored to the active repository root while switching between map and timeline.
- Added coverage for the explorer entry point and the view switch behavior.
- Validation: `npm test -- tests/logicsHtml.test.ts`, `npm run lint:ts`.
