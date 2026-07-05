## req_290_post_release_viewer_and_vs_code_hardening - Post-release viewer and VS Code hardening
> From version: 2.15.7
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Post-release hardening
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Resolve the review findings identified across the changes added after release v2.15.7.
- Keep the VS Code embedded viewer behavior aligned with user-facing guidance and terminal-launch expectations.
- Make viewer state and usage indicators durable and truthful across the embedded and browser-host surfaces.
- Prevent unmanaged viewer server processes and shell-command handling regressions before the next release.

# Context
- A global review of v2.15.7..HEAD found stale references to the removed Logics: Check Environment command, volatile project last-used ordering in the VS Code embedded viewer, asymmetric missing-data handling in the split CDX usage gauge, a startup-timeout process leak in ViewerServerManager, and shell-sensitive command quoting in the VS Code terminal bridge.
- The affected areas span the VS Code extension command surface, viewer browser host state, embedded viewer server lifecycle, terminal bridge messaging, and focused test coverage.
- The previous implementation work has already been committed in split steps; this corpus captures the follow-up hardening needed to make those additions release-ready.

# Acceptance criteria
- Stale user-facing references to Logics: Check Environment are either backed by a registered command again or replaced with valid recovery guidance.
- Project last-used ordering survives VS Code embedded viewer restarts and dynamic embedded-server ports.
- The split CDX usage gauge renders each missing 5-hour or weekly window as unknown without falling back to unrelated availability data.
- ViewerServerManager startup timeouts terminate or clean up the spawned server process so late readiness cannot leave an unmanaged process behind.
- The VS Code terminal bridge handles commands with spaces and quotes correctly for supported shells, or explicitly constrains the command surface and tests that boundary.
- Focused viewer, VS Code extension, lint, and Logics validation commands pass after the fixes are implemented.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_038_post_release_viewer_hardening`
- Architecture decision(s): (none yet)

# References
- package.json
- clients/vscode/src/extension.ts
- clients/vscode/src/logicsCodexWorkflowBootstrapSupport.ts
- clients/vscode/src/logicsCodexWorkflowOperations.ts
- clients/vscode/src/logicsViewDocumentController.ts
- clients/vscode/src/logicsViewProvider.ts
- clients/vscode/src/viewerServerManager.ts
- clients/viewer/src/browser-host/index.js
- tests/logicsViewProvider.test.ts
- tests/viewer.browser-host.test.ts
- tests/viewerServerManager.test.ts

# AI Context
- Summary: Post-release viewer and VS Code hardening
- Keywords: request-chain-scaffold, post-release viewer and vs code hardening, development-ready
- Use when: You need to implement or review the scaffolded workflow for Post-release viewer and VS Code hardening.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_533_restore_valid_vs_code_recovery_guidance_for_environment_checks`
- `item_534_persist_viewer_project_last_used_order_outside_volatile_origins`
- `item_535_make_split_cdx_usage_gauge_missing_data_semantics_symmetric`
- `item_536_clean_up_embedded_viewer_server_processes_on_startup_timeout`
- `item_537_harden_vs_code_terminal_bridge_command_handling`
