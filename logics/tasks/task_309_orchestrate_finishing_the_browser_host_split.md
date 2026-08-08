## task_309_orchestrate_finishing_the_browser_host_split - Orchestrate finishing the browser host split
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08 22:18:51

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Move the cdx rendering out of the shared render module and into the cdx screen.
- [x] 2. Lift the workshop onto the factory-and-accessor seam, verifying with the campaign.
- [x] 3. Lift git and CI, deciding explicitly where the screen router belongs.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_627_move_the_cdx_rendering_to_the_cdx_screen`
- `item_628_lift_the_workshop_out_of_the_browser_host`
- `item_629_lift_git_and_ci_out_of_the_browser_host`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_627`. Proof: 45 rendering functions moved into `cdx.js`; the shared render module went from 2546 to 1732, swept to a fixed point.
- request-AC2 -> `item_628`. Proof: `clients/viewer/src/browser-host/workshop.js` (1305 lines), on the factory-and-accessor seam.
- request-AC3 -> `item_629`. Proof: `clients/viewer/src/browser-host/git.js` (885 lines), the lift a previous request had recorded as blocked.
- request-AC4 -> every slice. Proof: 802 vitest tests and the viewer campaign pass after each lift; `ci-check` exits 0.
- request-AC5 -> every slice. Proof: the browser host went 5829 -> 4784 -> 4065 in the ledger, and each new module carries its own entry.
- request-AC6 -> every slice. Proof: the host's shared bindings were not rewritten; each screen reads what it does not own through its seam, pinned per screen in `tests/viewer.cdx-module.test.ts`.
- request-AC7 -> every slice. Proof: thirteen seam tests in `tests/viewer.cdx-module.test.ts`, each deriving its list from the module under test rather than restating it.

# Validation
- (no validation recorded yet)
- command: `node scripts/ci-check.mjs` | result: passed | date: 2026-08-08 | note: ci-check green: 802 vitest, campaign, ledger lowered on every entry
- Finish workflow executed on 2026-08-08.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-08.
- Linked backlog item(s): `item_627_move_the_cdx_rendering_to_the_cdx_screen`, `item_628_lift_the_workshop_out_of_the_browser_host`, `item_629_lift_git_and_ci_out_of_the_browser_host`
- Related request(s): `req_312_finish_lifting_the_browser_host_s_sub_systems_on_the_seam_cdx_proved`

# AI Context
- Summary: Orchestrate finishing the browser host split
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_312_finish_lifting_the_browser_host_s_sub_systems_on_the_seam_cdx_proved`
- Product brief(s): `prod_060_the_browser_host_down_to_the_viewer`
- Architecture decision(s): (none yet)
