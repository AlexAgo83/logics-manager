## item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged - An in-viewer editor screen for the browser, VS Code unchanged
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Edit here, not in another program
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 19:07:28

# AI Context
- Summary: The edit action routes on the existing embeddedHost signal: VS Code keeps opening its own editor, the browser opens an in-viewer screen with Save/Cancel and a new write route.
- Keywords: viewer, editor, screen, browser, code, unchanged
- Use when: Touching the edit action's routing, the editor screen, or the write route.
- Skip when: The commit offer after a save -- that is item_846.

# Problem
- The edit action always shells out to a system editor via the edit route; in the standalone browser viewer that can mean no editor opens at all, or the operator's attention leaves the browser for a separate program.
- There is no route today that writes a document's edited content back to disk -- only structured mutations exist, none of them a free-form save.

# Scope
- In:
  - Route the edit action on the existing `embeddedHost === 'vscode'` signal: VS Code keeps calling the edit route exactly as today.
  - In the browser, open an in-viewer screen showing the document's current raw content, editable, with Save and Cancel actions.
  - Add the write route the Save action needs, validated the same way the existing edit/read routes validate a path.
  - Cancel discards the edit and returns to the document view; nothing is written.
- Out:
  - Any change to the VS Code embedded panel's own editing behaviour.
  - A rich text or WYSIWYG editing surface.
  - The commit offer itself -- that is the next slice.

# Acceptance criteria
- AC1: In the browser viewer, the edit action opens the in-viewer editor screen, not a system editor.
- AC2: In the VS Code embedded panel, the edit action is unchanged.
- AC3: Save and Cancel are both present and work as their names say.
- AC4: Cancel discards the edit and returns to the document view; nothing is written.
- AC5: Save writes the edited content through the new route, which rejects a path the same way the existing edit/read routes already do.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: In the browser viewer, the edit action opens the in-viewer editor screen, not a system editor.
- request-AC2 -> This backlog slice. Proof: AC2: In the VS Code embedded panel, the edit action is unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: Save and Cancel are both present and work as their names say.
- request-AC4 -> This backlog slice. Proof: AC4: Cancel discards the edit and returns to the document view; nothing is written.
- request-AC5 -> This backlog slice. Proof: AC5: Save writes the edited content through the new route, which rejects a path the same way the existing edit/read routes already do.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_106_an_editor_that_stays_in_the_browser_it_is_already_in`
- Architecture decision(s): (none yet)
- Request: `req_375_edit_documents_in_the_browser_viewer`
- Primary task(s): `task_386_orchestrate_the_in_browser_document_editor_work`

# Priority
- Priority: High - the screen and the write path are the feature
- Rationale: Set by scaffold input or defaulted for grooming.

# Validation
- editDocument branches on the existing embeddedHost signal: VS Code keeps calling /api/edit unchanged (test_opens_the_selected_document_through_the_local_edit_endpoint_when_embedded_in_vs_code, updated to simulate the embedding it now actually requires). The standalone browser opens renderDocEditorScreen (Save/Cancel over a plain textarea) instead (test_opens_the_in_viewer_editor_screen_for_the_edit_action_in_the_standalone_browser). Cancel discards the edit and returns to the read view without writing (test_cancelling_the_in_viewer_editor_writes_nothing_and_returns_to_the_document_view). The write route (save_doc_payload/POST /api/save-doc) validates a path the same way edit/read already do and rejects an escaping path with 404 (test_viewer_save_doc_writes_changed_content_and_rejects_paths_outside_repo, test_viewer_save_doc_route_writes_content_and_rejects_escaping_paths); it is registered in VIEWER_MUTATING_ROUTES.

# Tasks
- `task_386_orchestrate_the_in_browser_document_editor_work`

# Notes
- Task `task_386_orchestrate_the_in_browser_document_editor_work` was finished via `logics-manager flow finish task` on 2026-08-15.
