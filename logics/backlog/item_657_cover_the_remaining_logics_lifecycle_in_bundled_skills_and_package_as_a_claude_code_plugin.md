## item_657_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Wire bootstrap to leave every detected harness ready to use
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Zero-to-ready onboarding
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 17:20:07

# Problem
- Nothing wires up automatically today, at any point in the lifecycle: `package.json`/`pyproject.toml` have no postinstall hook, there is no `mcp install`/`mcp register` command anywhere in the codebase, and `bootstrap` — the closest existing analog, which already scaffolds project-level agent-runtime files and removes legacy runtime paths — does not touch skills installation or any MCP config.
- Even once every skill (item_649-652), every MCP tool (item_655), and every harness's discovery (item_656) exist, a new user still has to run `skills install --all-profiles` by hand and hand-edit each harness's MCP config file before any agent can actually use logics-manager as a plugin/MCP tool instead of a raw CLI.
- Each harness's MCP config uses a different file format, and they are not equally safe to auto-write. Claude Code project scope (`.mcp.json`) and Antigravity (`~/.gemini/config/mcp_config.json`) are JSON, safe to parse-and-merge. Codex (`~/.codex/config.toml`) is TOML: a new `[mcp_servers.logics-manager]` table can be appended as plain text without touching anything else in the file, the same append-only idiom `bootstrap`'s `_ensure_line()` already uses for `.gitignore` — TOML tables are additive by dotted path, so this cannot collide with an existing one. Hermes (`~/.hermes/config.yaml`) is YAML, where the same trick is unsafe: appending a second top-level `mcp_servers:` key does not merge with an earlier one, it silently shadows it in most YAML parsers (last key wins), which could disable the user's other configured MCP servers without any error. Hermes is the one harness that has to stay print-only.

# Scope
- In:
  - Extend `bootstrap` to install bundled skills into every directory `discover_skill_dirs()` detects, reusing the drift-aware install from `item_656` (skip a hand-modified directory, refresh a stale one, add a missing one).
  - For each detected harness whose MCP config is JSON and already exists (Claude Code project scope `.mcp.json`, Antigravity `~/.gemini/config/mcp_config.json`): merge in a `logics-manager` entry pointing at `logics-manager mcp serve`, only if that key is absent. Never overwrite a differing existing value under that key.
  - For Codex (`~/.codex/config.toml`): append a `[mcp_servers.logics-manager]` table as plain text if that exact table is not already present, without parsing or rewriting the rest of the file — safe because TOML tables are additive by dotted path, unlike a YAML top-level key.
  - For Hermes (`~/.hermes/config.yaml`), or for any harness whose expected config file does not exist yet: print the exact ready-to-paste snippet and the file path it belongs in. Never create a new global config file or directory on the user's behalf, and never touch YAML programmatically — a blind top-level key append can silently shadow an earlier one.
  - Report, per detected harness, what happened: skills installed / already current, MCP wired / snippet printed / harness not detected.
  - Support `--dry-run`, consistent with other flow commands.
  - Running `bootstrap` a second time changes nothing and prints the same "already wired" state — idempotent, not additive.
  - Use `update` (not `self-update`) in every printed snippet and doc this item touches; `self-update`'s own deprecation is `item_656`'s job, this item just doesn't reintroduce the old name.
  - Match the README's existing "npm recommended, pip legacy" stance in any install-related wording this item's docs add; do not introduce a `pip install` example.
  - Test coverage: a fresh `.mcp.json` gets the entry merged in; a `.mcp.json` with a differing existing `logics-manager` entry is left untouched and flagged; the Codex append is idempotent (running twice produces one table, not two) and never touches existing TOML content; Hermes only ever gets a printed snippet, never a file write.
- Out:
  - Writing to Claude Code's global `~/.claude.json`; project-scoped `.mcp.json` is the intended mechanism and lower risk.
  - Writing YAML programmatically for Hermes, or adding a YAML-formatting-preserving dependency to make that safe.
  - Any automation outside an explicit `bootstrap` invocation (no postinstall hook, no background watcher).
  - Registering the MCP server on `update`; that command's job (per `item_656`) stays skills-only.

# Acceptance criteria
- AC14: `logics-manager bootstrap` installs bundled skills into every detected harness directory (reusing the drift-aware install from AC11-AC13) and, per detected harness: merges a `logics-manager` MCP entry into an existing JSON MCP config file (Claude Code project scope, Antigravity) without ever overwriting a differing existing entry; appends a `[mcp_servers.logics-manager]` table to Codex's `~/.codex/config.toml` as plain text if not already present, without altering any other content; and prints the exact ready-to-paste config snippet and file path for Hermes (YAML) and for any harness whose expected config file does not exist yet. Running `bootstrap` twice produces no duplicate entries and no changed output on the second run.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC14: `logics-manager bootstrap` installs bundled skills into every detected harness directory (reusing the drift-aware install from AC11-AC13) and, per detected harness: merges a `logics-manager` MCP entry into an existing JSON MCP config file (Claude Code project scope, Antigravity) without ever overwriting a differing existing entry; appends a `[mcp_servers.logics-manager]` table to Codex's `~/.codex/config.toml` as plain text if not already present, without altering any other content; and prints the exact ready-to-paste config snippet and file path for Hermes (YAML) and for any harness whose expected config file does not exist yet. Running `bootstrap` twice produces no duplicate entries and no changed output on the second run.

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
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Primary task(s): `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`

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
- Deviation from AC14's literal wording (2026-08-09): harness sync is opt-in via `logics-manager bootstrap --sync-harnesses`, not `bootstrap`'s unconditional default. Discovered mid-build: `bootstrap_payload()` is called as a plain repo-scaffolding fixture by roughly a dozen test files (and the viewer's onboarding flow), none of which should mutate the real machine's `~/.claude`, `~/.codex`, `~/.hermes`, or `~/.gemini` as a side effect of setting up a throwaway test repo. Verified live against this machine's real Codex/`.mcp.json` config with `--sync-harnesses` - both wired correctly, `corpus` everywhere correctly left alone as possibly-hand-modified (no `.bundled-hash` sidecar predates this feature). Flagged to the operator: that run modified this machine's real `~/.codex/config.toml`.
- Task `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging` was finished via `logics-manager flow finish task` on 2026-08-09.

# Tasks
- `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`
