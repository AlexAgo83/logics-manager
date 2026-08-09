## req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Cover the remaining Logics lifecycle in bundled skills and package as a Claude Code plugin
> From version: 2.21.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Agent-facing skill coverage and plugin packaging
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 13:08:21

# Needs
- Give agents a skill recipe for the lifecycle operations that fall outside scoping and dev: splitting, promoting, withdrawing, closing, finishing, and progressing a doc.
- Give agents a skill recipe for the roadmap-to-delivery chain, which currently has no skill at all.
- Give agents a skill recipe for closeout troubleshooting, so repairing a stuck task does not require guessing which of six sub-commands applies.
- Give agents a read-only skill for project health diagnostics, scoped so it does not duplicate review-project's capture step.
- Let the repository install as a first-class Claude Code plugin, since it already bundles skills and an MCP server but has no plugin manifest.
- Cover every bundled skill with an automated test — the four new ones and the four that already ship today — so no skill's frontmatter or discoverability depends on manual checking.
- Give an MCP-only agent the same lifecycle, roadmap, closeout-repair, and health capability the CLI already has, instead of a narrower subset with no tool for several of those commands.
- Keep installed skills in sync with the bundled package automatically when logics-manager updates itself, instead of relying on a separate manual `skills install` invocation that silently no-ops on drift.
- Detect and document Hermes (NousResearch) as a third supported harness, since it already reads the same `SKILL.md` format and speaks MCP natively — no new packaging format needed, only discovery and a documentation update.
- Detect and document Antigravity (Google's Gemini-based agentic IDE/CLI) as a fourth supported harness, on the same basis: same `SKILL.md` filename, standard MCP client, only its skills directory differs from Claude Code/Codex/Hermes.
- Leave every detected harness ready to use logics-manager's skills and MCP server after `bootstrap`, instead of requiring the operator to separately run `skills install` and hand-edit each harness's MCP config.

# Context
- Four skills already ship in logics_manager/skill_assets/: corpus (scope), groom-issues (scope from a tracker), implement-task (build), review-project (capture findings). Together they cover only the create -> build -> review happy path.
- The CLI's flow surface also exposes split, promote, withdraw, close, finish task, and progress task, none of which any skill documents. An agent doing one of these today has to read --help or docs/cli.md cold.
- roadmap propose/show/validate and deliver form a product-level chain above requests with no skill coverage at all.
- validate-closeout, repair, gates, ac-traceability, links, and mermaid are closeout-repair sub-commands; only --apply-fixes is mentioned in passing inside the corpus skill's gotchas, with no recipe for when each applies.
- doctor, health, audit, and insights are read-only diagnostics; review-project already runs health/audit/search-docs as its first step, so a dedicated diagnostics skill needs a clear boundary against that overlap.
- Skills already install into both ~/.claude/skills and ~/.codex/skills via `logics-manager skills install --all-profiles`, since Claude Code and Codex share the SKILL.md format.
- The repository has no .claude-plugin/ directory: no plugin.json declaring the bundled skills and the MCP server (`logics-manager mcp serve`), and no marketplace.json for distribution. Without it the repo cannot be installed as a Claude Code plugin through the normal marketplace flow, even though every piece a plugin needs already exists.
- tests/python/test_bundled_delegation_skills.py already parametrizes frontmatter/listing/provider-neutrality checks over a DELEGATION_SKILLS set of three skills (implement-task, review-project, groom-issues). corpus is not in that set, so one of the four skills shipping today has no automated coverage at all.
- The MCP surface (logics_manager/mcp.py) does not mirror the CLI 1:1. It covers promote, split, close, finish, ac-traceability, and mermaid, but has no tool for withdraw, progress, roadmap show/validate, deliver, validate-closeout, gates, links, doctor, or insights. This is a different, and in places wider, gap than the skill-documentation gap this request otherwise addresses — an agent working over MCP cannot do several of these regardless of any skill written for them.
- `install_skills()` (logics_manager/skills.py) only checks whether a skill's destination directory already exists; it never compares installed content against the bundled package. A machine that ran `skills install` once, before this request's four new skills existed, now has only the original set installed and silently stays that way forever — the exact drift observed on this machine (only `corpus` present under `~/.claude/skills`). Nothing currently re-triggers install after a version bump, either.
- Hermes (NousResearch's `hermes-agent`) reads `SKILL.md` skills from `~/.hermes/skills/` under the same open `agentskills.io` convention Claude Code and Codex use, and its MCP client (`~/.hermes/config.yaml`, `mcp_servers:`) can point at `logics-manager mcp serve` like any other MCP client. `discover_skill_dirs()` (logics_manager/skills.py) checks `~/.claude/skills` and `~/.codex/skills` but not `~/.hermes/skills`, and nothing in the docs states Hermes is a supported harness at all.
- Ollama was considered and rejected as a fifth harness: it is a model-serving runtime, not an agent framework. It has no SKILL.md convention and no MCP client or server role of its own (only unofficial third-party wrapper packages bridge it to MCP); the only native surface is raw tool-calling in its `/api/chat` endpoint, which requires a separate agent loop to be useful at all. There is no skills directory or MCP config to add Ollama to — supporting it is out of scope for this request, not a gap in it.
- Antigravity (Google's Gemini-based agentic IDE/CLI, launched November 2025) reads the same `SKILL.md` filename and speaks standard MCP (`~/.gemini/config/mcp_config.json`, `mcpServers:`), so MCP support is already covered for free. Its skills directory is unsettled between sources: Google's own codelab names `~/.gemini/config/skills/` (global) or `<project-root>/.agents/skills/` (project-scoped), while a third-party report says the documented `~/.gemini/antigravity/skills/` path does not work in practice and `~/.gemini/skills/` is what actually loads. The correct path needs verifying against a real Antigravity install before `discover_skill_dirs()` is changed, rather than picked from conflicting docs.
- Neither a fresh install nor `bootstrap` wires anything up today: `package.json` and `pyproject.toml` have no postinstall hook, and there is no `mcp install`/`mcp register` command anywhere in the codebase (verified by grep). Even once every skill and MCP tool in this request exists, a new user still has to run `skills install --all-profiles` by hand and hand-edit each harness's MCP config file. `bootstrap` (logics_manager/bootstrap.py) is the closest existing analog — it already scaffolds project-level agent-runtime files (`AGENTS.md`, `LOGICS.md`, `.gitignore` entries) and already removes legacy `.claude`/`logics/skills` paths — but does not touch skills installation or any MCP config. Each harness's MCP config uses a different file format: Claude Code project scope (`.mcp.json`) and Antigravity (`~/.gemini/config/mcp_config.json`) are both JSON, safe to merge programmatically; Codex (`~/.codex/config.toml`) is TOML and Hermes (`~/.hermes/config.yaml`) is YAML, both of which lose comments/formatting on a naive round-trip without a dedicated formatting-preserving library this project does not carry.

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
- AC10: The MCP surface gains tools for withdraw, progress, roadmap show/validate, deliver, validate-closeout, gates repair, links repair, doctor, and insights — the CLI commands with no MCP equivalent today — each with test coverage matching the style of the existing MCP tool tests.
- AC11: `install_skills()` detects drift between an installed skill's content and the bundled package, instead of only checking whether the destination directory exists, and `self-update`/`update` re-syncs every detected harness's skills directory after a successful CLI update, without overwriting a directory whose content was hand-modified away from any bundled version.
- AC12: `discover_skill_dirs()` also detects `~/.hermes/skills`, and the README and `docs/cli.md` state that the bundled skills and MCP server are compatible with Hermes, alongside Claude Code and Codex, with the `mcp_servers` config snippet needed to wire it up.
- AC13: `discover_skill_dirs()` detects Antigravity's actual skills directory, verified against a real install rather than assumed from conflicting docs, and the README and `docs/cli.md` state Antigravity as a supported harness with its MCP config snippet. Ollama is explicitly documented as out of scope, with the reason (no skills or MCP surface of its own), so the question does not resurface as an apparent gap.
- AC14: `logics-manager bootstrap` installs bundled skills into every detected harness directory (reusing the drift-aware install from AC11-AC13) and, per detected harness, either merges a `logics-manager` MCP entry into an existing JSON MCP config file (Claude Code project scope, Antigravity) without ever overwriting a differing existing entry, or prints the exact ready-to-paste config snippet and file path for a harness whose config is TOML/YAML or does not exist yet (Codex, Hermes). Running `bootstrap` twice produces no duplicate entries and no changed output on the second run.

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
- `item_655_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- `item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- `item_657_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
