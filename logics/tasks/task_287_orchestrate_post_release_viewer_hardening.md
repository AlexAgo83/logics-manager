## task_287_orchestrate_post_release_viewer_hardening - Orchestrate post-release viewer hardening
> From version: 2.15.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Confirm the intended recovery strategy for the removed Logics: Check Environment command and close stale guidance first.
- [ ] 2. Implement durable project last-used persistence and update viewer sorting to consume it.
- [ ] 3. Fix split CDX usage gauge missing-data handling and add the missing 5-hour coverage.
- [ ] 4. Update ViewerServerManager timeout cleanup and cover late-readiness races.
- [ ] 5. Harden or constrain VS Code terminal bridge command handling with focused tests.
- [ ] 6. Run the focused viewer and VS Code tests, repository lint, and Logics validation before closing the work.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_533_restore_valid_vs_code_recovery_guidance_for_environment_checks`
- `item_534_persist_viewer_project_last_used_order_outside_volatile_origins`
- `item_535_make_split_cdx_usage_gauge_missing_data_semantics_symmetric`
- `item_536_clean_up_embedded_viewer_server_processes_on_startup_timeout`
- `item_537_harden_vs_code_terminal_bridge_command_handling`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.

# AC Traceability
- request-Stale user-facing references to Logics: Check Environment are either backed by a registered command again or replaced with valid recovery guidance. -> `item_533_restore_valid_vs_code_recovery_guidance_for_environment_checks`. Proof: command guidance is the first implementation slice and must be closed before release validation.
- request-Project last-used ordering survives VS Code embedded viewer restarts and dynamic embedded-server ports. -> `item_534_persist_viewer_project_last_used_order_outside_volatile_origins`. Proof: durable recency is isolated as the second implementation slice.
- request-The split CDX usage gauge renders each missing 5-hour or weekly window as unknown without falling back to unrelated availability data. -> `item_535_make_split_cdx_usage_gauge_missing_data_semantics_symmetric`. Proof: missing-data semantics are isolated as the third implementation slice.
- request-ViewerServerManager startup timeouts terminate or clean up the spawned server process so late readiness cannot leave an unmanaged process behind. -> `item_536_clean_up_embedded_viewer_server_processes_on_startup_timeout`. Proof: startup timeout cleanup is isolated as the fourth implementation slice.
- request-The VS Code terminal bridge handles commands with spaces and quotes correctly for supported shells, or explicitly constrains the command surface and tests that boundary. -> `item_537_harden_vs_code_terminal_bridge_command_handling`. Proof: terminal command handling is isolated as the fifth implementation slice.
- request-Focused viewer, VS Code extension, lint, and Logics validation commands pass after the fixes are implemented. -> This task. Proof: final orchestration gate requires focused tests, lint, audit, and scaffold validation before closure.

# Validation
- Run `npm test -- tests/viewer.browser-host.test.ts -t "project|usage gauge|system terminal|VS Code terminals"`.
- Run `npm test -- tests/logicsViewMessages.test.ts tests/logicsViewProvider.test.ts tests/logicsHtml.test.ts tests/viewerServerManager.test.ts`.
- Run `npm run check:viewer-host`.
- Run `npm run lint`.
- Run `logics-manager lint --require-status`.
- Run `logics-manager audit --group-by-doc`.

# Report
- Corpus scaffolded from the post-release review; implementation has not started.

# AI Context
- Summary: Orchestrate post-release viewer hardening
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_290_post_release_viewer_and_vs_code_hardening`
- Product brief(s): `prod_038_post_release_viewer_hardening`
- Architecture decision(s): (none yet)
