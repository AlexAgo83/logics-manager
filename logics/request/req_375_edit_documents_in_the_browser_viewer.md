## req_375_edit_documents_in_the_browser_viewer - Edit documents in the browser viewer
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Edit where you already are, not in a separate program
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 19:07:27

# AI Context
- Summary: The standalone browser viewer edits documents in-place with Save/Cancel instead of shelling out to a system editor; VS Code's embedded panel keeps opening its own editor unchanged. A real save offers the same commit step item_844 built for status changes.
- Keywords: edit, documents, browser, viewer
- Use when: Touching the edit action, the editor screen, or its write route.
- Skip when: VS Code's own editing behavior, or the status-change confirm-and-commit mechanism itself (req_374).

# Needs
- As an operator in the standalone browser viewer, I need to edit a document's markdown inline, instead of the viewer shelling out to a system editor I may not have open or configured.
- As an operator in the VS Code embedded panel, I need editing to keep opening VS Code's own editor exactly as it does today -- that is already the best editor available there.
- As an operator editing in the browser, I need Save and Cancel, and when a save actually changes the file I need the same confirm-and-commit offer the status change already has, so editing and committing are one flow too, not two unrelated ones.

# Context
- `editDocument` in `clients/viewer/src/browser-host/index.js` calls the edit route, which shells out to the OS's system editor command (`edit_doc_payload` in `logics_manager/viewer.py`). That is the right answer in the VS Code embedded panel, where the editor is already open and one message away; it is the wrong one in a standalone browser tab, where there may be no configured editor at all, or opening one takes the operator out of the browser entirely.
- The viewer already knows when it is embedded in VS Code: a `postMessage` handshake (`viewer-embed-host`, `host: 'vscode'`) sets `embeddedHost` once the panel loads. That is the existing signal to route on, not a new detection mechanism.
- There is no server route today that writes a document's full content back to disk from the viewer -- only structured mutations (status, indicators, note appends) exist. This request adds the one write path a free-form markdown edit needs, path-validated the same way the edit route and the read routes already are.
- `req_374_confirm_the_status_change_offer_to_commit_it` builds a confirm-and-commit step for status changes, wired to the existing git-commit route. This request reuses that same mechanism for a saved edit rather than building a second one.
- The viewer already has themed modal primitives (`showThemedConfirmModal`, `showThemedInputModal` in `clients/viewer/src/browser-host/render.js`) and a single-action gate (`withPrimaryAction`) already wrapping the edit button's click handler.

# Acceptance criteria
- AC1: In the standalone browser viewer, the edit action opens an in-viewer editor screen instead of opening a system editor.
- AC2: In the VS Code embedded panel, the edit action is unchanged: it still opens VS Code's own editor.
- AC3: The editor screen offers Save and Cancel.
- AC4: Cancel discards the edit and returns to the document view without writing anything to disk.
- AC5: Save writes the edited content to the document's file, validated the same way the existing edit and read routes validate a path.
- AC6: When a save actually changes the file, the operator is offered the same confirm-and-commit step item_844 built for status changes, with a proposed default message.
- AC7: A save whose content is identical to what was on disk changes nothing and offers no commit.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_106_an_editor_that_stays_in_the_browser_it_is_already_in`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/render.js
- logics_manager/viewer.py
- logics/request/req_374_confirm_the_status_change_offer_to_commit_it.md

# Backlog
- `item_845_an_in_viewer_editor_screen_for_the_browser_vs_code_unchanged`
- `item_846_offer_to_commit_a_save_the_way_a_status_change_already_does`
