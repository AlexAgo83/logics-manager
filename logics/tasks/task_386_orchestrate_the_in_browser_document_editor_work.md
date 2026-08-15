## task_386_orchestrate_the_in_browser_document_editor_work - Orchestrate the in-browser document editor work
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Sequences the in-browser editor work: build the screen and its write route, then wire a real save to the existing commit-offer mechanism.
- Keywords: orchestration, in-browser editor, save, commit offer
- Use when: Implementing this task.
- Skip when: Changing VS Code's own editor, or the status-change confirm-and-commit mechanism itself.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Build the in-viewer editor screen and its write route for the browser viewer, leaving VS Code's own editor untouched.
- [ ] 2. Wire a real save to the same confirm-and-commit step item_844 already built, skipping it entirely for a no-op save.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`
- `item_846_offer_to_commit_a_save_the_way_a_status_change_already_does`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC2 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC3 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC4 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC5 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC6 -> `item_846_offer_to_commit_a_save_the_way_a_status_change_already_does`. Proof deferred to slice closeout.
- request-AC7 -> `item_846_offer_to_commit_a_save_the_way_a_status_change_already_does`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_375_edit_documents_in_the_browser_viewer`
- Product brief(s): `prod_106_an_editor_that_stays_in_the_browser_it_is_already_in`
- Architecture decision(s): (none yet)
