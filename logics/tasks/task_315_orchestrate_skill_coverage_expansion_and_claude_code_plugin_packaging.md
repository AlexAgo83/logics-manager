## task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging - Orchestrate skill coverage expansion and Claude Code plugin packaging
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 13:03:49

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Close the test gap first: fold corpus into the skill test suite and generalize it so every skill directory is covered, before adding any new, also-untested skill on top of the existing gap.
- [ ] 2. Write lifecycle-ops, roadmap-deliver, closeout-repair, and project-health as independent skills; they do not depend on each other and can be built in any order, each extending the now-generalized test suite as it lands.
- [ ] 3. Cross-link the corpus skill's --apply-fixes gotcha to closeout-repair once it exists.
- [ ] 4. Add the MCP tools for withdraw, progress, roadmap show/validate, deliver, validate-closeout, gates, links, doctor, and insights, independently of the skill docs; each new skill's recipe should call these once they exist rather than shell out to the CLI where an MCP tool is available.
- [ ] 5. Add the .claude-plugin/plugin.json manifest last, once every skill and MCP tool it needs to declare exists, and verify the install check.
- [ ] 6. Run `logics-manager skills install --all-profiles` and confirm all eight skills (four existing, four new) are discovered.
- [ ] 7. Add drift detection to `install_skills()`, hook a re-sync into `self-update`/`update`, add `~/.hermes/skills` and Antigravity's verified skills directory to `discover_skill_dirs()`, and document both as supported harnesses alongside Claude Code and Codex (with Ollama documented as explicitly out of scope).
- [ ] 8. Validate and index the corpus.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_649_add_the_lifecycle_ops_skill`
- `item_650_add_the_roadmap_deliver_skill`
- `item_651_add_the_closeout_repair_skill`
- `item_652_add_the_project_health_skill`
- `item_653_close_the_test_gap_on_existing_skills_and_generalize_the_skill_test_suite`
- `item_654_add_a_claude_plugin_manifest`
- `item_655_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- `item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_649_add_the_lifecycle_ops_skill`. Proof deferred to slice closeout.
- request-AC5 -> `item_649_add_the_lifecycle_ops_skill`. Proof deferred to slice closeout.
- request-AC8 -> `item_649_add_the_lifecycle_ops_skill`. Proof deferred to slice closeout.
- request-AC2 -> `item_650_add_the_roadmap_deliver_skill`. Proof deferred to slice closeout.
- request-AC5 -> `item_650_add_the_roadmap_deliver_skill`. Proof deferred to slice closeout.
- request-AC8 -> `item_650_add_the_roadmap_deliver_skill`. Proof deferred to slice closeout.
- request-AC3 -> `item_651_add_the_closeout_repair_skill`. Proof deferred to slice closeout.
- request-AC5 -> `item_651_add_the_closeout_repair_skill`. Proof deferred to slice closeout.
- request-AC8 -> `item_651_add_the_closeout_repair_skill`. Proof deferred to slice closeout.
- request-AC4 -> `item_652_add_the_project_health_skill`. Proof deferred to slice closeout.
- request-AC5 -> `item_652_add_the_project_health_skill`. Proof deferred to slice closeout.
- request-AC8 -> `item_652_add_the_project_health_skill`. Proof deferred to slice closeout.
- request-AC9 -> `item_653_close_the_test_gap_on_existing_skills_and_generalize_the_skill_test_suite`. Proof deferred to slice closeout.
- request-AC6 -> `item_654_add_a_claude_plugin_manifest`. Proof deferred to slice closeout.
- request-AC7 -> `item_654_add_a_claude_plugin_manifest`. Proof deferred to slice closeout.
- request-AC8 -> `item_654_add_a_claude_plugin_manifest`. Proof deferred to slice closeout.
- request-AC10 -> `item_655_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`. Proof deferred to slice closeout.
- request-AC11 -> `item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`. Proof deferred to slice closeout.
- request-AC12 -> `item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`. Proof deferred to slice closeout.
- request-AC13 -> `item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate skill coverage expansion and Claude Code plugin packaging
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)
