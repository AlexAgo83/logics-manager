## item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Re-sync installed skills on self-update, and detect Hermes as a third harness
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Skill install drift
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 12:59:07

# Problem
- `install_skills()` (logics_manager/skills.py) only checks whether a skill's destination directory already exists; it never compares installed content against the bundled package. A machine that ran `skills install` once, before this request's four new skills existed, now has only the original set and stays that way forever.
- This is the exact drift observed on the machine this request was scoped on: only `corpus` present under `~/.claude/skills`, three shipped skills missing, and nothing to prompt a reinstall.
- Nothing today re-triggers a skill install after `self-update`/`update`, so even an operator who diligently updates the CLI never gets their skills refreshed unless they separately remember `skills install --all-profiles`.
- Hermes (NousResearch's `hermes-agent`) reads `SKILL.md` skills from `~/.hermes/skills/` under the same open `agentskills.io` convention as Claude Code and Codex, and its MCP client can point at `logics-manager mcp serve` from `~/.hermes/config.yaml`. No new packaging format is needed for it — but `discover_skill_dirs()` does not look for `~/.hermes/skills`, so `skills install --all-profiles` (and the auto-resync this item adds) silently skips it, and nothing in the docs says Hermes is supported at all.

# Scope
- In:
  - Give `install_skills()` a way to detect drift: compare an installed skill's content against the bundled package (e.g. a content hash), not just directory existence.
  - Skip (leave alone) a directory whose content does not match any known bundled version, i.e. one a user hand-modified, rather than silently overwriting it.
  - After a successful `self-update`/`update`, automatically run the equivalent of `skills install --all-profiles` across every detected harness directory (`discover_skill_dirs()`), refreshing drifted skills and adding new ones.
  - Cover both outcomes with a test: a stale skill gets refreshed, a hand-modified one is left alone and reported, not silently skipped without explanation.
  - Add `~/.hermes/skills` to `discover_skill_dirs()`, the same way `~/.codex/skills` is already detected.
  - Update the README and `docs/cli.md` to state that the bundled skills and MCP server are compatible with Hermes, alongside Claude Code and Codex, including the `mcp_servers` config snippet for `~/.hermes/config.yaml`.
- Out:
  - A background watcher, cron job, or any automation that runs outside of an explicit `self-update`/`update` invocation.
  - Changing the Claude Code plugin's own update mechanism (`item_654`); this covers the CLI-driven `skills install` path only (Codex, Hermes, and any Claude install done outside the plugin flow).
  - Auto-updating the CLI binary itself; that already exists.
  - Any Hermes-specific packaging format; Hermes already speaks SKILL.md and MCP natively.

# Acceptance criteria
- AC11: `install_skills()` detects drift between an installed skill's content and the bundled package, instead of only checking whether the destination directory exists, and `self-update`/`update` re-syncs every detected harness's skills directory after a successful CLI update, without overwriting a directory whose content was hand-modified away from any bundled version.
- AC12: `discover_skill_dirs()` also detects `~/.hermes/skills`, and the README and `docs/cli.md` state that the bundled skills and MCP server are compatible with Hermes, alongside Claude Code and Codex, with the `mcp_servers` config snippet needed to wire it up.

# AC Traceability
- request-AC11 -> This backlog slice. Proof: AC11: `install_skills()` detects drift between an installed skill's content and the bundled package, instead of only checking whether the destination directory exists, and `self-update`/`update` re-syncs every detected harness's skills directory after a successful CLI update, without overwriting a directory whose content was hand-modified away from any bundled version.
- request-AC12 -> This backlog slice. Proof: AC12: `discover_skill_dirs()` also detects `~/.hermes/skills`, and the README and `docs/cli.md` state that the bundled skills and MCP server are compatible with Hermes, alongside Claude Code and Codex, with the `mcp_servers` config snippet needed to wire it up.

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
- Summary: Re-sync installed skills on self-update, and detect Hermes as a third harness
- Keywords: backlog-groom, request, skills install, drift, self-update, auto-sync, hermes, agentskills
- Use when: Use when implementing or reviewing skill-install drift detection, the self-update hook, or Hermes harness support.
- Skip when: Skip when the change is unrelated to skill installation, the update flow, or Hermes compatibility.

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin.md`.
- Generated locally by logics-manager.
