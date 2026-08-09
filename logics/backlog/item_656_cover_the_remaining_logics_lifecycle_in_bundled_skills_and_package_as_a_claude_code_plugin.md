## item_656_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Re-sync installed skills automatically on self-update
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Skill install drift
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `install_skills()` (logics_manager/skills.py) only checks whether a skill's destination directory already exists; it never compares installed content against the bundled package. A machine that ran `skills install` once, before this request's four new skills existed, now has only the original set and stays that way forever.
- This is the exact drift observed on the machine this request was scoped on: only `corpus` present under `~/.claude/skills`, three shipped skills missing, and nothing to prompt a reinstall.
- Nothing today re-triggers a skill install after `self-update`/`update`, so even an operator who diligently updates the CLI never gets their skills refreshed unless they separately remember `skills install --all-profiles`.

# Scope
- In:
  - Give `install_skills()` a way to detect drift: compare an installed skill's content against the bundled package (e.g. a content hash), not just directory existence.
  - Skip (leave alone) a directory whose content does not match any known bundled version, i.e. one a user hand-modified, rather than silently overwriting it.
  - After a successful `self-update`/`update`, automatically run the equivalent of `skills install --all-profiles` across every detected harness directory (`discover_skill_dirs()`), refreshing drifted skills and adding new ones.
  - Cover both outcomes with a test: a stale skill gets refreshed, a hand-modified one is left alone and reported, not silently skipped without explanation.
- Out:
  - A background watcher, cron job, or any automation that runs outside of an explicit `self-update`/`update` invocation.
  - Changing the Claude Code plugin's own update mechanism (`item_654`); this covers the CLI-driven `skills install` path only (Codex, and any Claude install done outside the plugin flow).
  - Auto-updating the CLI binary itself; that already exists.

# Acceptance criteria
- AC11: `install_skills()` detects drift between an installed skill's content and the bundled package, instead of only checking whether the destination directory exists, and `self-update`/`update` re-syncs every detected harness's skills directory after a successful CLI update, without overwriting a directory whose content was hand-modified away from any bundled version.

# AC Traceability
- request-AC11 -> This backlog slice. Proof: AC11: `install_skills()` detects drift between an installed skill's content and the bundled package, instead of only checking whether the destination directory exists, and `self-update`/`update` re-syncs every detected harness's skills directory after a successful CLI update, without overwriting a directory whose content was hand-modified away from any bundled version.

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
- Summary: Re-sync installed skills automatically on self-update
- Keywords: backlog-groom, request, skills install, drift, self-update, auto-sync
- Use when: Use when implementing or reviewing skill-install drift detection and the self-update hook.
- Skip when: Skip when the change is unrelated to skill installation or the update flow.

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin.md`.
- Generated locally by logics-manager.
