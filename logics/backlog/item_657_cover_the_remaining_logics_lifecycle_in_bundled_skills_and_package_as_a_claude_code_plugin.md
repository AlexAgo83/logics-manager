## item_657_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Wire bootstrap to leave every detected harness ready to use
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Zero-to-ready onboarding
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Nothing wires up automatically today, at any point in the lifecycle: `package.json`/`pyproject.toml` have no postinstall hook, there is no `mcp install`/`mcp register` command anywhere in the codebase, and `bootstrap` — the closest existing analog, which already scaffolds project-level agent-runtime files and removes legacy runtime paths — does not touch skills installation or any MCP config.
- Even once every skill (item_649-652), every MCP tool (item_655), and every harness's discovery (item_656) exist, a new user still has to run `skills install --all-profiles` by hand and hand-edit each harness's MCP config file before any agent can actually use logics-manager as a plugin/MCP tool instead of a raw CLI.
- Each harness's MCP config uses a different file format: Claude Code project scope (`.mcp.json`) and Antigravity (`~/.gemini/config/mcp_config.json`) are JSON; Codex (`~/.codex/config.toml`) is TOML; Hermes (`~/.hermes/config.yaml`) is YAML. Writing TOML or YAML back without a formatting-preserving library risks destroying the user's comments and layout in a config file that is not ours.

# Scope
- In:
  - Extend `bootstrap` to install bundled skills into every directory `discover_skill_dirs()` detects, reusing the drift-aware install from `item_656` (skip a hand-modified directory, refresh a stale one, add a missing one).
  - For each detected harness whose MCP config is JSON and already exists (Claude Code project scope `.mcp.json`, Antigravity `~/.gemini/config/mcp_config.json`): merge in a `logics-manager` entry pointing at `logics-manager mcp serve`, only if that key is absent. Never overwrite a differing existing value under that key.
  - For a harness whose MCP config is TOML or YAML (Codex, Hermes), or whose JSON config file does not exist yet: print the exact ready-to-paste snippet and the file path it belongs in. Never create a new global config file or directory on the user's behalf.
  - Report, per detected harness, what happened: skills installed / already current, MCP wired / snippet printed / harness not detected.
  - Support `--dry-run`, consistent with other flow commands.
  - Running `bootstrap` a second time changes nothing and prints the same "already wired" state — idempotent, not additive.
  - Test coverage: a fresh `.mcp.json` gets the entry merged in; a `.mcp.json` with a differing existing `logics-manager` entry is left untouched and flagged; a TOML/YAML harness only ever gets a printed snippet, never a file write; running twice produces no duplicate entries.
- Out:
  - Writing to Claude Code's global `~/.claude.json`; project-scoped `.mcp.json` is the intended mechanism and lower risk.
  - Adding a TOML or YAML writer dependency to auto-write Codex or Hermes configs.
  - Any automation outside an explicit `bootstrap` invocation (no postinstall hook, no background watcher).
  - Registering the MCP server on `self-update`; that command's job (per `item_656`) stays skills-only.

# Acceptance criteria
- AC14: `logics-manager bootstrap` installs bundled skills into every detected harness directory (reusing the drift-aware install from AC11-AC13) and, per detected harness, either merges a `logics-manager` MCP entry into an existing JSON MCP config file (Claude Code project scope, Antigravity) without ever overwriting a differing existing entry, or prints the exact ready-to-paste config snippet and file path for a harness whose config is TOML/YAML or does not exist yet (Codex, Hermes). Running `bootstrap` twice produces no duplicate entries and no changed output on the second run.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC14: `logics-manager bootstrap` installs bundled skills into every detected harness directory (reusing the drift-aware install from AC11-AC13) and, per detected harness, either merges a `logics-manager` MCP entry into an existing JSON MCP config file (Claude Code project scope, Antigravity) without ever overwriting a differing existing entry, or prints the exact ready-to-paste config snippet and file path for a harness whose config is TOML/YAML or does not exist yet (Codex, Hermes). Running `bootstrap` twice produces no duplicate entries and no changed output on the second run.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Wire bootstrap to leave every detected harness ready to use
- Keywords: backlog-groom, request, bootstrap, onboarding, mcp config, skills install, zero-to-ready
- Use when: Use when implementing or reviewing the bootstrap-time skill install and MCP config wiring.
- Skip when: Skip when the change is unrelated to bootstrap, onboarding, or MCP config wiring.

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin.md`.
- Generated locally by logics-manager.
