## req_265_add_an_opt_in_obsidian_projection_mode_for_logics_docs - Add an opt-in Obsidian projection mode for Logics docs
> From version: 2.12.3
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Give operators an opt-in "Obsidian projection" mode that makes the Logics Markdown corpus comfortable to read, search, and navigate in Obsidian (Properties panel, tag pane, quick-switcher, backlinks, graph view) without changing the default experience.
- Project the canonical workflow indicators (type, ref, status, understanding, confidence, theme, title) into deterministic YAML frontmatter, aliases, and tags that Obsidian and Dataview can consume.
- Keep the mode fully reversible: a single command applies the projection and a single command removes it, leaving canonical content byte-for-byte unchanged.
- Preserve Logics Manager as the only source of truth for lifecycle, lint, audit, flow transitions, generated indicators, Mermaid signatures, and closeout. The projection is a derived view, never an input.
- Require no Obsidian plugin and impose no new constraints on operators who never enable the mode.

# Context
- Builds on `req_264_support_obsidian_friendly_logics_navigation` (Done), which posed the non-destructive guidance, ignored `.obsidian/`, and explicitly deferred frontmatter/tags/aliases/wikilinks to a later opt-in slice. This request is that slice.
- Workflow metadata currently lives only in maison blockquote indicators (`> Status: Done`, `> Understanding: 90%`). Obsidian cannot read them: no Properties panel, no `status:` search, no Dataview. File names are slugs, so the quick-switcher and `[[` autocomplete are unfriendly.
- The mode must be explicitly activated (config flag in `logics.yaml` and/or running `logics-manager obsidian sync`). With the mode off, no doc gains frontmatter and nothing in the corpus changes — the current behavior is the default.
- The frontmatter is a projection of the blockquote indicators, never a replacement: the parser must tolerate and skip leading frontmatter but must never depend on it.
- A round-trippable `clean` operation is the strongest guarantee of "non-destructive": projection can be fully undone.

## In scope
- Opt-in activation via `logics.yaml` (e.g. `obsidian.enabled`) and/or an explicit command invocation.
- `logics-manager obsidian sync` to generate/refresh deterministic frontmatter, aliases, and tags; `--check` to fail CI on drift; `--dry-run`.
- `logics-manager obsidian clean` to remove the projection and restore canonical-only content.
- Parser tolerance for leading YAML frontmatter across read/lint/audit/index paths, with the canonical blockquote indicators remaining authoritative.
- A lint guard that only engages when frontmatter exists, verifying it matches the canonical type/ref/status/title (and flags edits to managed indicators).
- Documentation of the mode, activation, and safe-editing rules.

## Out of scope
- A native Obsidian plugin (explicitly excluded, per AC7 of req_264).
- Making Obsidian syntax (wikilinks/frontmatter) required for Logics Manager parsing.
- Shipping or requiring Dataview; optional dashboard examples may be referenced but no community plugin is a dependency.
- Changing canonical ref formats, repo-relative links, or lifecycle semantics.

# Acceptance criteria
- AC1: With the mode disabled (default), no command adds frontmatter and the corpus is unchanged; operators who never enable the mode see no new constraints.
- AC2: The mode is activated by `obsidian.enabled` in versioned `logics.yaml` (default off); `logics-manager obsidian sync`/`clean` are the explicit actions that apply or remove the projection, and the activation path is documented.
- AC3: `logics-manager obsidian sync` writes deterministic, idempotent frontmatter (type, ref, status, understanding, confidence, theme), an `aliases` entry for the human title, and `tags` derived from type/status/theme; re-running produces no diff.
- AC4: Frontmatter is a non-destructive projection: it is additive above canonical content and never replaces canonical refs, lifecycle indicators, lineage links, Mermaid signatures, or repo-relative paths.
- AC5: `logics-manager obsidian clean` removes the projection and restores canonical content byte-for-byte (verified by round-trip).
- AC6: The Logics parser/lint/audit/index paths tolerate leading frontmatter but treat the blockquote indicators as authoritative; nothing requires frontmatter to parse a doc.
- AC7: A lint guard engages only when frontmatter is present and reports drift between frontmatter and canonical type/ref/status/title, plus edits to managed indicators; `obsidian sync --check` surfaces the same drift for CI.
- AC8: No Obsidian plugin is required, and no community plugin (incl. Dataview) is a runtime dependency.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `req_264_support_obsidian_friendly_logics_navigation`
- `logics.yaml`
- `logics_manager/config.py`
- `logics_manager/flow.py`
- `logics_manager/lint.py`
- `logics_manager/index.py`
- `logics/instructions.md`
- `.gitignore`

# AI Context
- Summary: Add an opt-in, reversible Obsidian projection mode that derives frontmatter/aliases/tags from canonical Logics indicators, with sync/clean/check commands and a frontmatter drift guard, without any Obsidian plugin.
- Keywords: obsidian, opt-in-mode, projection, frontmatter, aliases, tags, dataview-optional, reversible, obsidian-sync, obsidian-clean, drift-check, non-destructive, source-of-truth
- Use when: Planning or implementing the opt-in Obsidian projection mode over the canonical Logics corpus.
- Skip when: The work is a native Obsidian plugin, makes Obsidian syntax required for parsing, or changes canonical lifecycle/ref semantics.

# Risks and dependencies
- Risk: frontmatter committed to the repo could drift from canonical indicators — mitigated by the lint guard and `sync --check`.
- Risk: parser changes could regress non-Obsidian repos — mitigated by keeping blockquote indicators authoritative and frontmatter strictly optional.
- Decision (settled): activation state lives in versioned `logics.yaml` (`obsidian.enabled`), so the mode is shared across the team and the generated frontmatter is committed alongside canonical content. The lint guard and `sync --check` keep committed frontmatter from drifting.
- Depends on: completed `req_264` guidance and `.obsidian/` ignore.

# Backlog
- none
- `item_469_add_an_opt_in_obsidian_projection_mode_for_logics_docs`
