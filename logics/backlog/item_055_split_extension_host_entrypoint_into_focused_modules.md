## item_055_split_extension_host_entrypoint_into_focused_modules - Split extension host entrypoint into focused modules
> From version: 1.10.0
> Status: Done
> Understanding: 99%
> Confidence: 97%
> Progress: 100%
> Complexity: High
> Theme: Extension host modularity and ownership boundaries
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
[extension.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/extension.ts) has grown into a multi-responsibility host entrypoint.
It currently concentrates extension bootstrap, watcher lifecycle, command wiring, preview/render helpers, relation and document mutation helpers, and workspace-side orchestration.

That makes host-side changes harder to review and increases the chance that unrelated behaviors are coupled through the same file.

# Scope
- In:
  - Keep `extension.ts` as a readable bootstrap entrypoint.
  - Extract coherent host-side modules for responsibilities such as activation/bootstrap support, command registration, watcher/workspace lifecycle, preview helpers, and document mutation helpers where useful.
  - Preserve clear host authority boundaries between indexing, filesystem mutations, and webview messaging.
  - Keep imports and call flow readable from the entrypoint.
- Out:
  - Changing product behavior while refactoring.
  - Moving webview-specific logic into host modules.
  - Creating tiny helper files with weak names or unclear ownership.

# Acceptance criteria
- AC1: `extension.ts` becomes materially smaller and reads primarily as an extension entrypoint/composition file.
- AC2: Host-side responsibilities are split into focused modules with clear names and ownership.
- AC3: The resulting module graph avoids circular dependencies.
- AC4: Existing extension behavior, commands, refresh flows, and mutations remain unchanged.
- AC5: The largest resulting host modules stay within a healthier maintenance range unless an explicit exception is justified.

# Priority
- Impact:
  - High: this is the main host-side maintainability bottleneck.
- Urgency:
  - Medium-High: worth addressing before more workflow actions and maintenance operations are added.

# Notes
- Derived from `logics/request/req_050_split_oversized_source_files_into_coherent_modules.md`.
- The preferred end state is a thin bootstrap entry plus a small set of named host modules, not a large hidden service layer.
- This item should stay aligned with `adr_004`, keeping canonical indexing and host authority clearly separated from webview-side interpretation.

# References
- Architecture decision(s): `logics/architecture/adr_004_scale_the_plugin_around_a_derived_model_and_explicit_ui_state.md`

# Tasks
- `logics/tasks/task_060_split_extension_host_entrypoint_into_focused_modules.md`
