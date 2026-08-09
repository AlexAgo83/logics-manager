## item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Re-sync installed skills on update, and detect Hermes and Antigravity as additional harnesses
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Skill install drift
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 13:14:32

# Problem
- `install_skills()` (logics_manager/skills.py) only checks whether a skill's destination directory already exists; it never compares installed content against the bundled package. A machine that ran `skills install` once, before this request's four new skills existed, now has only the original set and stays that way forever.
- This is the exact drift observed on the machine this request was scoped on: only `corpus` present under `~/.claude/skills`, three shipped skills missing, and nothing to prompt a reinstall.
- Nothing today re-triggers a skill install after `update` (`self-update` is a deprecated alias), so even an operator who diligently updates the CLI never gets their skills refreshed unless they separately remember `skills install --all-profiles`.
- Hermes (NousResearch's `hermes-agent`) reads `SKILL.md` skills from `~/.hermes/skills/` under the same open `agentskills.io` convention as Claude Code and Codex, and its MCP client can point at `logics-manager mcp serve` from `~/.hermes/config.yaml`. No new packaging format is needed for it — but `discover_skill_dirs()` does not look for `~/.hermes/skills`, so `skills install --all-profiles` (and the auto-resync this item adds) silently skips it, and nothing in the docs says Hermes is supported at all.
- Antigravity (Google's Gemini-based agentic IDE/CLI) also reads `SKILL.md` and speaks standard MCP, but its skills directory is unsettled between sources: Google's codelab says `~/.gemini/config/skills/` or `<project-root>/.agents/skills/`; a third-party report says the documented `~/.gemini/antigravity/skills/` path does not actually work and `~/.gemini/skills/` is what loads in practice. The correct path needs confirming against a real install before it is added to `discover_skill_dirs()`.
- Ollama has no skills directory and no MCP client/server role of its own (it is a model-serving runtime; only unofficial third-party wrappers bridge it to MCP). It is explicitly out of scope for this item, not an oversight.
- `self-update` and `update` are today plain aliases with identical behavior; `update` is the name to use going forward, and `self-update` should read as deprecated rather than as an equally valid choice.

# Scope
- In:
  - Give `install_skills()` a way to detect drift: compare an installed skill's content against the bundled package (e.g. a content hash), not just directory existence.
  - Skip (leave alone) a directory whose content does not match any known bundled version, i.e. one a user hand-modified, rather than silently overwriting it.
  - After a successful `update` (`self-update` is a deprecated alias), automatically run the equivalent of `skills install --all-profiles` across every detected harness directory (`discover_skill_dirs()`), refreshing drifted skills and adding new ones.
  - Cover both outcomes with a test: a stale skill gets refreshed, a hand-modified one is left alone and reported, not silently skipped without explanation.
  - Add `~/.hermes/skills` to `discover_skill_dirs()`, the same way `~/.codex/skills` is already detected.
  - Verify Antigravity's actual skills directory against a real install (docs disagree between `~/.gemini/config/skills/`, `<project-root>/.agents/skills/`, and plain `~/.gemini/skills/`), then add whichever one actually loads skills to `discover_skill_dirs()`.
  - Update the README and `docs/cli.md` to state that the bundled skills and MCP server are compatible with Hermes and Antigravity, alongside Claude Code and Codex, including the `mcp_servers`/`mcp_config.json` snippets each needs.
  - Add one line noting Ollama was evaluated and is out of scope (model-serving runtime, no skills or MCP surface of its own), so this doesn't get re-litigated as an apparent gap later.
  - Make `self-update` print a one-line deprecation notice pointing to `update`, and keep it fully functional as an alias — no removal, no breaking change, just steering.
- Out:
  - A background watcher, cron job, or any automation that runs outside of an explicit `update` (`self-update` is a deprecated alias) invocation.
  - Changing the Claude Code plugin's own update mechanism (`item_654`); this covers the CLI-driven `skills install` path only (Codex, Hermes, Antigravity, and any Claude install done outside the plugin flow).
  - Auto-updating the CLI binary itself; that already exists.
  - Any Hermes- or Antigravity-specific packaging format; both already speak SKILL.md and MCP natively.
  - Building any Ollama integration; it is out of scope, not deferred.

# Acceptance criteria
- AC11: `install_skills()` detects drift between an installed skill's content and the bundled package, instead of only checking whether the destination directory exists, and `update` (`self-update` is a deprecated alias) re-syncs every detected harness's skills directory after a successful CLI update, without overwriting a directory whose content was hand-modified away from any bundled version.
- AC12: `discover_skill_dirs()` also detects `~/.hermes/skills`, and the README and `docs/cli.md` state that the bundled skills and MCP server are compatible with Hermes, alongside Claude Code and Codex, with the `mcp_servers` config snippet needed to wire it up.
- AC13: `discover_skill_dirs()` detects Antigravity's actual skills directory, verified against a real install rather than assumed from conflicting docs, and the README and `docs/cli.md` state Antigravity as a supported harness with its MCP config snippet. Ollama is explicitly documented as out of scope, with the reason, so the question does not resurface as an apparent gap.
- AC15: Invoking `self-update` prints a deprecation notice pointing to `update`, remains fully functional, and every doc this request produces refers to `update` as the canonical name.

# AC Traceability
- request-AC11 -> This backlog slice. Proof: AC11: `install_skills()` detects drift between an installed skill's content and the bundled package, instead of only checking whether the destination directory exists, and `update` (`self-update` is a deprecated alias) re-syncs every detected harness's skills directory after a successful CLI update, without overwriting a directory whose content was hand-modified away from any bundled version.
- request-AC12 -> This backlog slice. Proof: AC12: `discover_skill_dirs()` also detects `~/.hermes/skills`, and the README and `docs/cli.md` state that the bundled skills and MCP server are compatible with Hermes, alongside Claude Code and Codex, with the `mcp_servers` config snippet needed to wire it up.
- request-AC13 -> This backlog slice. Proof: AC13: `discover_skill_dirs()` detects Antigravity's actual skills directory, verified against a real install rather than assumed from conflicting docs, and the README and `docs/cli.md` state Antigravity as a supported harness with its MCP config snippet. Ollama is explicitly documented as out of scope, with the reason, so the question does not resurface as an apparent gap.
- request-AC15 -> This backlog slice. Proof: AC15: Invoking `self-update` prints a deprecation notice pointing to `update`, remains fully functional, and every doc this request produces refers to `update` as the canonical name.

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
- Summary: Re-sync installed skills on update, and detect Hermes and Antigravity as additional harnesses
- Keywords: backlog-groom, request, skills install, drift, update, self-update deprecation, auto-sync, hermes, antigravity, ollama, agentskills
- Use when: Use when implementing or reviewing skill-install drift detection, the update hook, the self-update deprecation notice, or Hermes/Antigravity harness support.
- Skip when: Skip when the change is unrelated to skill installation, the update flow, or harness compatibility.

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin.md`.
- Generated locally by logics-manager.
