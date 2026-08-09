## req_319_standardize_the_obsidian_projection_into_a_graph_navigable_visualization_surface - Standardize the Obsidian projection into a graph-navigable visualization surface
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Optional visualization tooling
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 15:01:25

# Needs
- Make the Obsidian graph view actually reflect the corpus's request/product/backlog/task structure, instead of showing every synced doc as an isolated node.
- Keep `obsidian clean` an exact, byte-for-byte round trip once wikilinks are added, so the opt-in projection stays provably non-destructive.
- Extend `obsidian sync --check` drift detection to cover the new wikilink transform, not just frontmatter.
- Add direct test coverage for the Obsidian projection logic, which today has none.
- Document Obsidian sync as a supported, working visualization surface, replacing the README's current "wikilinks may be added later" placeholder language.

# Context
- `logics-manager obsidian sync` already writes deterministic YAML frontmatter (type, ref, status, tags, etc.) above each projected doc, but copies the body verbatim; a repo-wide search confirms zero wikilink generation anywhere in logics_manager/obsidian.py.
- Logics docs reference each other in plain backtick-quoted refs (e.g. a backlog item's own ref, such as this request's own linked items below) inside `# Backlog`, `# Links`, `# Request`, and `# Companion docs` sections. Obsidian's graph view only draws edges from `[[wikilink]]` syntax, so these refs currently produce zero graph edges after sync - every projected doc lands as an isolated node.
- README.md already anticipates this feature: "Obsidian wikilinks may be added later only as supplemental navigation hints; Logics Manager parsing must not require them." This request is that "later."
- `obsidian clean` currently restores the canonical body byte-for-byte only because sync never touches the body; introducing wikilinks means clean must reverse that specific transform, or the existing non-destructive round-trip guarantee silently breaks.
- No test file exercises obsidian.py's projection logic directly today. The handful of hits for "obsidian" under tests/ are incidental (CLI help/exit-code contract checks), not behavior tests of the projection itself.

# Acceptance criteria
- AC1: Obsidian sync rewrites recognized cross-doc refs (backtick-quoted req_/item_/task_/prod_/road_/adr_/spec_ refs) in the projected body into [[ref]] wikilinks, only for refs that resolve to a doc actually present in the corpus.
- AC2: `obsidian clean` reverses the wikilink transform exactly; running sync then clean restores the canonical body byte-for-byte identical to its pre-sync state.
- AC3: `obsidian sync --check` reports wikilink drift the same way it already reports frontmatter drift.
- AC4: A dedicated test module exercises ref detection, the wikilink round-trip, and drift detection for the Obsidian projection.
- AC5: README.md and docs/cli.md describe Obsidian sync as a supported, working graph-navigation surface, replacing the current speculative "may be added later" wording.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_067_obsidian_as_a_supported_graph_navigable_visualization_surface_for_logics_corpora`
- Architecture decision(s): (none yet)

# References

# AI Context
- Summary: Standardize the Obsidian projection into a graph-navigable visualization surface
- Keywords: request-chain-scaffold, standardize the obsidian projection into a graph-navigable visualization surface, development-ready
- Use when: You need to implement or review the scaffolded workflow for Standardize the Obsidian projection into a graph-navigable visualization surface.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_658_generate_reversible_wikilinks_in_the_obsidian_projection`
- `item_659_test_and_document_obsidian_as_a_supported_visualization_surface`
