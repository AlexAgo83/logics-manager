## item_658_generate_reversible_wikilinks_in_the_obsidian_projection - Generate reversible wikilinks in the Obsidian projection
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Projection engine
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The Obsidian projection copies each doc's body verbatim below its generated frontmatter, so plain backtick-quoted refs to other docs never become graph edges - the graph view shows every synced doc as an isolated node.
- `obsidian clean` today restores the canonical body byte-for-byte only because the body was never modified by sync; any wikilink transform has to be exactly reversible or that non-destructive guarantee quietly breaks.

# Scope
- In:
  - Detect backtick-quoted refs matching the corpus's known ref prefixes (req_, item_, task_, prod_, road_, adr_, spec_) in the projected body.
  - Replace a detected ref with a `[[ref]]` wikilink only when that ref resolves to a doc actually collected by `_collect_projection_docs()` - never link to a typo or a removed doc.
  - Make `obsidian clean` reverse the transform exactly (wikilink back to the original backtick form), so sync followed by clean reproduces the pre-sync body byte-for-byte.
  - Extend `obsidian sync --check` to detect wikilink drift (a doc whose committed projection has stale or missing wikilinks) using the same drift-reporting shape already used for frontmatter.
- Out:
  - Rewriting canonical files under logics/; the transform only ever applies to the derived projected copy.
  - Linking refs that appear in prose without their canonical backtick formatting.
  - Any Canvas or graph-layout generation beyond what Obsidian's own graph view already does with wikilinks.
  - Changing the frontmatter format or fields; those are unaffected by this item.

# Acceptance criteria
- AC1: Obsidian sync rewrites recognized cross-doc refs (backtick-quoted req_/item_/task_/prod_/road_/adr_/spec_ refs) in the projected body into [[ref]] wikilinks, only for refs that resolve to a doc actually present in the corpus.
- AC2: `obsidian clean` reverses the wikilink transform exactly; running sync then clean restores the canonical body byte-for-byte identical to its pre-sync state.
- AC3: `obsidian sync --check` reports wikilink drift the same way it already reports frontmatter drift.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Obsidian sync rewrites recognized cross-doc refs (backtick-quoted req_/item_/task_/prod_/road_/adr_/spec_ refs) in the projected body into [[ref]] wikilinks, only for refs that resolve to a doc actually present in the corpus.
- request-AC2 -> This backlog slice. Proof: AC2: `obsidian clean` reverses the wikilink transform exactly; running sync then clean restores the canonical body byte-for-byte identical to its pre-sync state.
- request-AC3 -> This backlog slice. Proof: AC3: `obsidian sync --check` reports wikilink drift the same way it already reports frontmatter drift.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_067_obsidian_as_a_supported_graph_navigable_visualization_surface_for_logics_corpora`
- Architecture decision(s): (none yet)
- Request: `req_319_standardize_the_obsidian_projection_into_a_graph_navigable_visualization_surface`
- Primary task(s): `task_316_orchestrate_the_obsidian_graph_navigable_projection`

# AI Context
- Summary: Generate reversible wikilinks in the Obsidian projection
- Keywords: scaffolded-backlog, generate reversible wikilinks in the obsidian projection, implementation-ready
- Use when: Implementing the scaffolded slice for Generate reversible wikilinks in the Obsidian projection.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - this is the actual graph-view fix; nothing else in this request matters without it
- Rationale: Set by scaffold input or defaulted for grooming.
