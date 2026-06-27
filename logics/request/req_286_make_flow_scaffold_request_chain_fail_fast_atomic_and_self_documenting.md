## req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting - Make flow scaffold request-chain fail-fast, atomic, and self-documenting
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Tooling robustness
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Invalid scaffold input is rejected before any file is written, with a message that names the offending field and its allowed values.
- A partial scaffold never leaves orphaned docs or a half-updated INDEX, so a re-run reuses the same ids instead of allocating fresh ones.
- A passing --dry-run guarantees the apply will not fail on the same input, because both run the identical validation and build path.
- flow validate / audit resolve a short ref the way the rest of the CLI does, instead of only accepting the full slug.
- The scaffold input schema is discoverable from the tool itself rather than by copying an existing JSON.

# Context
- Observed first-hand scaffolding req_285: a `context_pack.profile` value of 'dev' (not in tiny/normal/deep) passed --dry-run cleanly, then threw `KeyError: 'dev'` as a raw 8-frame Python traceback during apply.
- scaffold_request_chain_payload writes request/product/backlog/task docs and updates INDEX, and only afterwards builds the context pack; the failure landed between those steps, leaving 7 orphaned md files and a modified INDEX that had to be cleaned by hand to avoid id reallocation on re-run.
- The context-pack build (where the profile is consumed) is guarded by `if not dry_run:`, so --dry-run validates and lists files but never exercises the path that actually failed — giving false confidence.
- _context_profile_limit indexes a dict directly, so an unknown profile surfaces as KeyError rather than a domain error naming the allowed values; the default when omitted is 'normal'.
- flow validate req_285 raised 'Workflow source not found' because it required the full slug req_285_single_source_...; short numeric refs resolve elsewhere in the CLI but not here.
- There is no --print-schema or --template for the request-chain input; the key structure is learned by reading logics/scaffold/*.json.

# Acceptance criteria
- AC1: Invalid scaffold input (e.g. an unknown context_pack.profile) is rejected by a pre-flight validation pass before any doc is written, with a message naming the field and the allowed values.
- AC2: --dry-run runs the same input validation as apply (including the context-pack profile/mode check), so a dry-run that passes guarantees the apply will not fail on input errors.
- AC3: Apply is atomic: if any step fails, no partial docs or INDEX changes remain and no ids are consumed, so a corrected re-run reuses the same ids.
- AC4: flow validate and audit resolve a short ref (e.g. req_285) to its full slug, or fail with a 'did you mean <slug>' hint instead of a bare 'Workflow source not found'.
- AC5: The scaffold input schema is discoverable via a command (a --template or --print-schema) rather than by copying an existing JSON.
- AC6: New pytest coverage exercises invalid-profile rejection, dry-run/apply parity, atomic rollback on a forced mid-apply failure, and short-ref resolution.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_035_scaffold_tooling_robustness`
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow/__init__.py` (scaffold_request_chain_payload around lines 3700-3790: writes every doc + INDEX first, then builds and writes the context pack)
- `logics_manager/sync.py` (lines 200-201: `_context_profile_limit` does `{'tiny':2,'normal':4,'deep':8}[profile]`, raising a bare KeyError on any other value)
- `logics_manager/flow/__init__.py` (the `build_context_pack_payload(...)` call runs only inside the `if not dry_run:` branch, so --dry-run never exercises it)
- `logics_manager/flow/__init__.py` (line 1484: validate raises `SystemExit('Workflow source not found: <ref>')` when given a short ref like `req_285`)
- `logics/scaffold/modularize-oversized-source.json` (the de-facto input schema, discoverable today only by reading an existing example)

# AI Context
- Summary: Make flow scaffold request-chain fail-fast, atomic, and self-documenting
- Keywords: request-chain-scaffold, make flow scaffold request-chain fail-fast, atomic, and self-documenting, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make flow scaffold request-chain fail-fast, atomic, and self-documenting.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_522_pre_flight_validate_scaffold_input_and_share_the_path_with_dry_run`
- `item_523_make_scaffold_apply_atomic`
- `item_524_resolve_short_workflow_refs_in_validate_and_audit`
- `item_525_surface_the_scaffold_input_schema_via_a_command`
