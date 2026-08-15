## task_386_orchestrate_the_in_browser_document_editor_work - Orchestrate the in-browser document editor work
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude
> Indicators reviewed: 2026-08-15 19:07:23

# AI Context
- Summary: Sequences the in-browser editor work: build the screen and its write route, then wire a real save to the existing commit-offer mechanism.
- Keywords: orchestration, in-browser editor, save, commit offer
- Use when: Implementing this task.
- Skip when: Changing VS Code's own editor, or the status-change confirm-and-commit mechanism itself.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Build the in-viewer editor screen and its write route for the browser viewer, leaving VS Code's own editor untouched.
- [x] 2. Wire a real save to the same confirm-and-commit step item_844 already built, skipping it entirely for a no-op save.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`
- `item_846_offer_to_commit_a_save_the_way_a_status_change_already_does`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC2 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC3 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC4 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC5 -> `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`. Proof deferred to slice closeout.
- request-AC6 -> `item_846_offer_to_commit_a_save_the_way_a_status_change_already_does`. Proof deferred to slice closeout.
- request-AC7 -> `item_846_offer_to_commit_a_save_the_way_a_status_change_already_does`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: item_845 -- editDocument opens renderDocEditorScreen in the standalone browser instead of calling /api/edit (test_opens_the_in_viewer_editor_screen_for_the_edit_action_in_the_standalone_browser).
- request-AC2 -> This task. Proof: item_845 -- editDocument still calls /api/edit unchanged when embeddedHost === "vscode" (test_opens_the_selected_document_through_the_local_edit_endpoint_when_embedded_in_vs_code).
- request-AC3 -> This task. Proof: item_845 -- the editor screen renders exactly two [data-viewer-editor-action] controls, Save and Cancel.
- request-AC4 -> This task. Proof: item_845 -- Cancel calls showDocumentByPath and never calls /api/save-doc (test_cancelling_the_in_viewer_editor_writes_nothing_and_returns_to_the_document_view).
- request-AC5 -> This task. Proof: item_845 -- save_doc_payload/POST /api/save-doc uses the same _resolve_repo_doc_path validation as read_doc_payload/edit_doc_payload, rejecting an escaping path with 404 (test_viewer_save_doc_route_writes_content_and_rejects_escaping_paths).
- request-AC6 -> This task. Proof: item_846 -- a save that changes the file calls showCommitOfferModal with a default message, then commitFiles (test_saving_the_in_viewer_editor_writes_the_content_and_offers_to_commit_it).
- request-AC7 -> This task. Proof: item_846 -- a no-op save (identical content) shows no modal and calls no /api/git-commit (test_a_no_op_save_writes_nothing_extra_and_offers_no_commit).

# Validation
- (no validation recorded yet)

# Report
- Both backlog slices landed: item_845 (editDocument routes on the existing embeddedHost signal; VS Code keeps calling /api/edit unchanged, the browser opens an in-viewer editor screen with Save/Cancel over a new /api/save-doc write route, path-validated the same way edit/read already are) and item_846 (a real save offers the same commit step item_844 built -- commitFiles extracted so both flows share it -- skipped entirely for a no-op save). 6 new tests. Full suite: 1408 python + 971 vitest passed.

# Links
- Request: `req_375_edit_documents_in_the_browser_viewer`
- Product brief(s): `prod_106_an_editor_that_stays_in_the_browser_it_is_already_in`
- Architecture decision(s): (none yet)
