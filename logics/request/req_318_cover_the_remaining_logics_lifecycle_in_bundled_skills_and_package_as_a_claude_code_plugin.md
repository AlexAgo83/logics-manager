## req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Cover the remaining Logics lifecycle in bundled skills and package as a Claude Code plugin
> From version: 2.21.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Agent-facing skill coverage and plugin packaging
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Give agents a skill recipe for the lifecycle operations that fall outside scoping and dev: splitting, promoting, withdrawing, closing, finishing, and progressing a doc.
- Give agents a skill recipe for the roadmap-to-delivery chain, which currently has no skill at all.
- Give agents a skill recipe for closeout troubleshooting, so repairing a stuck task does not require guessing which of six sub-commands applies.
- Give agents a read-only skill for project health diagnostics, scoped so it does not duplicate review-project's capture step.
- Let the repository install as a first-class Claude Code plugin, since it already bundles skills and an MCP server but has no plugin manifest.
- Cover every bundled skill with an automated test — the four new ones and the four that already ship today — so no skill's frontmatter or discoverability depends on manual checking.

# Context
- Four skills already ship in logics_manager/skill_assets/: corpus (scope), groom-issues (scope from a tracker), implement-task (build), review-project (capture findings). Together they cover only the create -> build -> review happy path.
- The CLI's flow surface also exposes split, promote, withdraw, close, finish task, and progress task, none of which any skill documents. An agent doing one of these today has to read --help or docs/cli.md cold.
- roadmap propose/show/validate and deliver form a product-level chain above requests with no skill coverage at all.
- validate-closeout, repair, gates, ac-traceability, links, and mermaid are closeout-repair sub-commands; only --apply-fixes is mentioned in passing inside the corpus skill's gotchas, with no recipe for when each applies.
- doctor, health, audit, and insights are read-only diagnostics; review-project already runs health/audit/search-docs as its first step, so a dedicated diagnostics skill needs a clear boundary against that overlap.
- Skills already install into both ~/.claude/skills and ~/.codex/skills via `logics-manager skills install --all-profiles`, since Claude Code and Codex share the SKILL.md format.
- The repository has no .claude-plugin/ directory: no plugin.json declaring the bundled skills and the MCP server (`logics-manager mcp serve`), and no marketplace.json for distribution. Without it the repo cannot be installed as a Claude Code plugin through the normal marketplace flow, even though every piece a plugin needs already exists.
- tests/python/test_bundled_delegation_skills.py already parametrizes frontmatter/listing/provider-neutrality checks over a DELEGATION_SKILLS set of three skills (implement-task, review-project, groom-issues). corpus is not in that set, so one of the four skills shipping today has no automated coverage at all.

# Acceptance criteria
- AC1: A `lifecycle-ops` skill documents split, promote, withdraw, close, finish task, and progress task with a recipe and gotchas, following the existing SKILL.md conventions.
- AC2: A `roadmap-deliver` skill documents roadmap propose/show/validate and deliver with a recipe and gotchas.
- AC3: A `closeout-repair` skill documents validate-closeout, repair, gates, ac-traceability, links, and mermaid as a troubleshooting decision path.
- AC4: A `project-health` skill documents doctor, health, audit, and insights as a read-only diagnostic recipe, with an explicit hard rule against duplicating review-project's capture step.
- AC5: Each new skill is discovered and installable by the existing `logics-manager skills install` mechanism without code changes to the installer.
- AC6: A `.claude-plugin/plugin.json` manifest declares the bundled skills and the MCP server entry point.
- AC7: Installing the repository as a Claude Code plugin makes all bundled skills and the MCP server available, verified by a manual or scripted install check.
- AC8: No existing skill's behavior, filename, or installed location changes.
- AC9: An automated test suite covers frontmatter validity and discoverability for all eight bundled skills — the four new ones and all four that ship today, including corpus, which has no automated coverage before this request.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)

# References

# AI Context
- Summary: Cover the remaining Logics lifecycle in bundled skills and package as a Claude Code plugin
- Keywords: request-chain-scaffold, cover the remaining logics lifecycle in bundled skills and package as a claude code plugin, development-ready
- Use when: You need to implement or review the scaffolded workflow for Cover the remaining Logics lifecycle in bundled skills and package as a Claude Code plugin.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_649_add_the_lifecycle_ops_skill`
- `item_650_add_the_roadmap_deliver_skill`
- `item_651_add_the_closeout_repair_skill`
- `item_652_add_the_project_health_skill`
- `item_653_close_the_test_gap_on_existing_skills_and_generalize_the_skill_test_suite`
- `item_654_add_a_claude_plugin_manifest`
