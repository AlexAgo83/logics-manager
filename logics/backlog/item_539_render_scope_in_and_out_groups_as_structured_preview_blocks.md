## item_539_render_scope_in_and_out_groups_as_structured_preview_blocks - Render Scope In and Out groups as structured preview blocks
> From version: 2.17.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer document readability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Scope sections in backlog previews are technically rendered, but the `In:` and `Out:` group labels are visually indistinguishable from child bullets.
- Indented child bullets are flattened by the lightweight markdown parser, making generated backlog docs harder to scan in the viewer.

# Scope
- In:
  - Track the current section heading kind in `renderMarkdownToHtml` so Scope-specific list handling only runs after Scope headings.
  - Recognize the common generated pattern `- In:` / child bullets / `- Out:` / child bullets and render it as structured `markdown-preview__scope` groups.
  - Use the existing `renderInlineMarkdown` for every scope child item.
  - Add CSS classes for the Scope container, group labels, and child lists with compact spacing and clear In/Out separation.
  - Keep unsupported or mixed lists on the generic list path instead of trying to infer every possible markdown shape.
  - Add focused tests in the shared renderer and one viewer-host/document-preview check.
- Out:
  - Changing generated Logics markdown files.
  - Adding a markdown parser dependency.
  - Changing all nested-list rendering outside Scope.
  - Special-casing every Logics section type.

# Acceptance criteria
- AC1: Rendering the generated Scope sample produces `.markdown-preview__scope`, `.markdown-preview__scope-group`, and labels for `In` and `Out`.
- AC2: Scope child bullets preserve inline code rendering and do not appear as peer bullets to the group labels.
- AC3: A non-Scope list with `- In:` still renders as a normal list.
- AC4: A Scope list that does not match the simple In/Out pattern falls back to the existing generic list rendering.
- AC5: Viewer document preview tests confirm the Scope section is easier to target structurally without changing the document content.
- AC6: Generated viewer assets are refreshed when needed and bundle freshness passes.
- AC7: TypeScript and Logics validation checks pass.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Rendering the generated Scope sample produces `.markdown-preview__scope`, `.markdown-preview__scope-group`, and labels for `In` and `Out`.
- request-AC2 -> This backlog slice. Proof: AC2: Scope child bullets preserve inline code rendering and do not appear as peer bullets to the group labels.
- request-AC3 -> This backlog slice. Proof: AC3: A non-Scope list with `- In:` still renders as a normal list.
- request-AC4 -> This backlog slice. Proof: AC4: A Scope list that does not match the simple In/Out pattern falls back to the existing generic list rendering.
- request-AC5 -> This backlog slice. Proof: AC5: Viewer document preview tests confirm the Scope section is easier to target structurally without changing the document content.
- request-AC6 -> This backlog slice. Proof: AC6: Generated viewer assets are refreshed when needed and bundle freshness passes.
- request-AC7 -> This backlog slice. Proof: AC7: TypeScript and Logics validation checks pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_040_readable_scope_sections_in_document_previews`
- Architecture decision(s): (none yet)
- Request: `req_292_improve_scope_section_rendering_in_document_previews`
- Primary task(s): `task_289_orchestrate_scope_section_preview_rendering`

# AI Context
- Summary: Render Scope In and Out groups as structured preview blocks
- Keywords: scaffolded-backlog, render scope in and out groups as structured preview blocks, implementation-ready
- Use when: Implementing the scaffolded slice for Render Scope In and Out groups as structured preview blocks.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_289_orchestrate_scope_section_preview_rendering`

# Notes
- Task `task_289_orchestrate_scope_section_preview_rendering` was finished via `logics-manager flow finish task` on 2026-07-12.
