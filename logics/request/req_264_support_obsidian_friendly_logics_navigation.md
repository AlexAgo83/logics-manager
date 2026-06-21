## req_264_support_obsidian_friendly_logics_navigation - Support Obsidian-friendly Logics navigation
> From version: 2.12.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Make the existing Logics Markdown corpus comfortable to open as an Obsidian vault for reading, search, backlinks, graph navigation, and light editing.
- Preserve Logics Manager as the source of truth for lifecycle operations, lint, audit, flow transitions, generated indicators, Mermaid signatures, and closeout validation.
- Avoid building or depending on an Obsidian plugin for this phase.

# Context
- Operators can already open `logics/` or the full repository in Obsidian because Logics docs are Markdown files.
- Obsidian creates local `.obsidian/` workspace settings; those should remain user-local and ignored by Git.
- The useful near-term compromise is a non-destructive compatibility layer over canonical Logics docs: optional frontmatter, tags, aliases, and wikilink-friendly references that improve Obsidian navigation without replacing canonical Logics refs or repo-relative paths.
- Obsidian should be treated as an editor and navigation surface. Workflow mutation remains in `logics-manager flow ...`; validation remains in `logics-manager lint`, `audit`, and `flow validate`.

# Acceptance criteria
- AC1: `.obsidian/` is ignored so local vault settings are not proposed for commit when a user opens the repository or `logics/` in Obsidian.
- AC2: A documented Obsidian-friendly mode or guide explains the recommended setup, including whether to open the full repo or `logics/`, what is safe to edit, and which generated sections should be left to Logics Manager.
- AC3: Any added Obsidian metadata is non-destructive: it must not replace canonical Logics refs, lifecycle indicators, lineage links, Mermaid signatures, or repo-relative paths.
- AC4: Optional frontmatter/tags/aliases, if introduced, are deterministic and validated so they remain consistent with existing Logics doc type, ref, status, and title.
- AC5: Optional wikilink-friendly references, if introduced, supplement canonical links and do not make Obsidian syntax required for Logics Manager parsing.
- AC6: The implementation includes a validation path that detects or prevents common Obsidian-driven breakage, especially edits to managed indicators, Mermaid signatures, and done status.
- AC7: No Obsidian plugin is required or planned in this slice.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries are explicit: Obsidian-friendly Markdown/vault compatibility is in scope; an Obsidian plugin is out of scope.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `.gitignore`
- `logics/instructions.md`
- `logics_manager/flow.py`
- `logics_manager/lint.py`
- `logics_manager/viewer.py`

# AI Context
- Summary: Add an Obsidian-friendly compatibility layer for the Markdown Logics corpus without building an Obsidian plugin.
- Keywords: obsidian, markdown-vault, wikilinks, frontmatter, aliases, tags, non-destructive-metadata, managed-indicators, logics-validation
- Use when: Planning or implementing support for opening Logics docs in Obsidian while keeping Logics Manager as the lifecycle source of truth.
- Skip when: The work is about a native Obsidian plugin, a replacement for Logics Manager workflow commands, or changing canonical Logics parsing to require Obsidian syntax.

# Backlog
- none
- `item_468_support_obsidian_friendly_logics_navigation`
