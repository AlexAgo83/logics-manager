## req_315_persist_viewer_preferences_where_they_belong_favourites_for_the_user_the_rest_for_the_repository - Persist viewer preferences where they belong: favourites for the user, the rest for the repository
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: A preference that outlives the session that made it
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 00:05:20

# Needs
- Keep favourites across every window on the machine, and across restarts.
- Keep the settings that describe a corpus with that corpus, not with whoever opened it last.
- Stop losing a paired device's token every time the editor restarts.

# Context
- Reported from use: in the extension, favourites and preferences do not survive from one session to the next. The standalone viewer keeps them.
- The cause is where they are stored, not that storing them is broken. Every viewer preference lives in one browser storage entry, `logics.localViewer.preferences.v1`. Browser storage is scoped to an origin, and an origin includes the port.
- The standalone viewer binds port 8765 by default, so its origin is the same at every launch and the entry survives. The extension launches the server with port 0, an ephemeral port, so the iframe's origin changes at every start and each session opens an empty store. Nothing is corrupted; it is filed somewhere new each time.
- The diagnostic breadcrumbs kept for crash analysis share that storage and are lost the same way; they are deliberately session-local, so that is acceptable. A third claim -- that a paired device's bearer token is lost the same way -- was made here and later refuted; see `item_640`.
- A bridge does exist for favourites. The frame posts them to the extension, which keeps them in its global state and posts them back when the frame loads. It carries two of the twelve preference fields -- the favourites and the last-used timestamps -- and the other ten have never left the iframe. That bridge also writes a webview state entry that nothing reads.
- Twelve fields are stored today: favouriteProjects, projectLastUsedAt, workshopUseSystemTerminal, autoRefreshIntervalSeconds, workshopActiveTab, workshopTerminalOrderByRoot, cdxStatusColumns, cdxRunColumns, cdxHistoryColumns, cdxStatusProviders, cdxRunSessions and cdxHistorySessions. They divide cleanly: four describe the operator, eight describe a corpus.
- This request meets `req_313` on one binding, and `req_314` on one behaviour. `req_313` names the in-memory owner of the shared state, which is a different question from where a preference is written; and `req_314` makes a start-up warning dismissible, which is an operator preference and belongs in the store this request defines. Whichever lands first, the others build on it.
- The server is the one party that already knows both the repository and the machine, and it serves both hosts. It is the natural place for this to live; the browser store becomes a cache rather than the record.

# Acceptance criteria
- AC1: Favourites survive a restart, and are the same in every window open on the machine.
- AC2: A preference that describes a corpus is kept with that corpus, and does not follow the operator to another repository.
- AC3: A preference that describes the operator is kept for the operator, and applies in every repository.
- AC4: Two windows writing at once do not lose a favourite: a set is merged, never overwritten wholesale.
- AC5: WITHDRAWN. The claim that a paired device loses its token on restart was inferred from the token sharing a browser store with the preferences, and does not hold: a LAN device's origin is stable because `--lan` keeps the default port, and the server's device registry is already JSON-backed. Recorded on `item_640`.
- AC6: The standalone viewer and the extension read and write the same preferences, and neither depends on the port it was served from.
- AC7: An operator's existing preferences are carried over rather than reset on first run.
- AC8: Each behavior leaves behind a test that fails against the current implementation.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_063_preferences_that_outlive_the_port`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/constants.js
- clients/vscode/src/viewerServerManager.ts
- clients/vscode/src/logicsWebviewHtml.ts
- clients/vscode/src/logicsViewProvider.ts
- logics_manager/viewer.py

# AI Context
- Summary: Persist viewer preferences where they belong: favourites for the user, the rest for the repository
- Keywords: request-chain-scaffold, persist viewer preferences where they belong: favourites for the user, the rest for the repository, development-ready
- Use when: You need to implement or review the scaffolded workflow for Persist viewer preferences where they belong: favourites for the user, the rest for the repository.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_638_give_the_viewer_a_preference_store_that_does_not_depend_on_the_port`
- `item_639_let_two_windows_agree_on_the_favourites`
- `item_640_keep_a_paired_device_paired_across_a_restart`
- `item_641_retire_the_half_bridge_and_say_what_it_did`
