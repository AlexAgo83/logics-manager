## task_309_orchestrate_finishing_the_browser_host_split - Orchestrate finishing the browser host split
> From version: 2.20.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 33%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Move the cdx rendering out of the shared render module and into the cdx screen.
- [ ] 2. Lift the workshop onto the factory-and-accessor seam, verifying with the campaign.
- [ ] 3. Lift git and CI, deciding explicitly where the screen router belongs.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_627_move_the_cdx_rendering_to_the_cdx_screen`
- `item_628_lift_the_workshop_out_of_the_browser_host`
- `item_629_lift_git_and_ci_out_of_the_browser_host`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC4, request-AC5, request-AC7 -> `item_627_move_the_cdx_rendering_to_the_cdx_screen`. Proof deferred to slice closeout.
- request-AC2, request-AC4, request-AC5, request-AC6, request-AC7 -> `item_628_lift_the_workshop_out_of_the_browser_host`. Proof deferred to slice closeout.
- request-AC3, request-AC4, request-AC5, request-AC6, request-AC7 -> `item_629_lift_git_and_ci_out_of_the_browser_host`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate finishing the browser host split
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_312_finish_lifting_the_browser_host_s_sub_systems_on_the_seam_cdx_proved`
- Product brief(s): `prod_060_the_browser_host_down_to_the_viewer`
- Architecture decision(s): (none yet)
