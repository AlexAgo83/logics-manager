## req_276_improve_logics_manager_authoring_ergonomics_for_ai_assistants - Improve logics-manager authoring ergonomics for AI assistants
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Assistant ergonomics
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- An assistant that drives logics-manager through the MCP server can scaffold a full request chain in one call, the same as the CLI, instead of hand-chaining six granular tools and wiring AC-traceability and links itself.
- The scaffold input JSON schema is discoverable from the tool itself (help text, a printable schema, and a skeleton example) so an assistant never has to reverse-engineer an existing file.
- Malformed scaffold input fails with a precise, actionable error (missing key, wrong type) instead of an opaque failure.
- Blocking validation/lint messages name the remedy command, so an assistant can recover in one step instead of guessing.
- Findings that are merely deferred to task closeout are classified distinctly from actionable findings, so a freshly scaffolded request reads as clean.
- The scaffold command can validate inline and report a ready-to-dev summary, folding the common scaffold-then-validate ritual into one step.

# Context
- The MCP registry in mcp_parts/_01.py exposes 35 tools (create_request, promote_*, create_product_brief, build_context_pack, ...) but no scaffold_request_chain or deliver tool, so the most powerful authoring path is shell-only and invisible to MCP-only assistants like Codex or Claude without a shell.
- flow scaffold request-chain --help describes the command but documents none of the input JSON keys; the only discovery path today is opening an existing logics/scaffold/*.json, which a fresh assistant cannot know exists.
- Editing a scaffolded request trips a blocking 'modified without updating indicators' gate whose message does not mention the sync update-indicators remedy.
- flow validate already classifies findings as blocking vs fixable, but task-closeout-deferred proofs are reported as 'fixable', which reads as an actionable problem on a brand-new request even though it is expected.
- The scaffold and validate code paths already exist; the MCP tool should call the same code path rather than reimplement authoring, and inline validation should reuse flow validate.
- This is dogfooding: the same friction was hit this session while authoring req_273/274/275, and a repo-local wrapper (scripts/logics-scaffold.mjs) only helps shell users of this repo, not other assistants or other repos.

# Acceptance criteria
- AC1: The MCP server exposes a scaffold_request_chain tool (and a deliver tool) that calls the same code path as the CLI, with an input schema mirroring the JSON the CLI accepts; an MCP assistant can author a full chain in one call.
- AC2: flow scaffold request-chain --help documents the input JSON keys, and a --print-schema (or --example) option emits the schema/skeleton; the same schema is surfaced in the MCP tool definition.
- AC3: Malformed scaffold input produces a precise validation error naming the offending key/type and is covered by a test.
- AC4: Blocking lint/validate messages that have a deterministic remedy name the remedy command (e.g. sync update-indicators) in their text.
- AC5: Closeout-deferred proofs are reported under a distinct severity (e.g. deferred/info) separate from actionable fixable findings, so a fresh scaffold validates clean; --fixable no longer lists them.
- AC6: flow scaffold request-chain --validate runs validation inline and prints a ready-to-dev summary, reusing the existing validate path.
- AC7: No new runtime dependency is added; new behavior reuses existing scaffold/validate/lint code paths.
- AC8: The full pytest and vitest suites pass, with coverage for the MCP scaffold tool, schema/example output, input validation, and the severity reclassification.
- AC9: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_029_assistant_authoring_ergonomics`
- Architecture decision(s): (none yet)

# References
- `logics_manager/mcp_parts/_01.py` (35-tool MCP registry; no scaffold/deliver tool)
- `logics_manager/flow.py` scaffold request-chain (CLI-only one-pass authoring)
- `flow scaffold request-chain --help` (documents no input-JSON schema)
- `logics/scaffold/modularize-oversized-source.json` (the only way to learn the schema today)
- `logics_manager/lint.py` (the 'modified without updating indicators' gate message)
- `logics_manager/audit.py` / flow validate (blocking vs fixable severity classification)
- `logics_manager/sync.py` update-indicators (the undocumented remedy for the gate)

# AI Context
- Summary: Improve logics-manager authoring ergonomics for AI assistants
- Keywords: request-chain-scaffold, improve logics-manager authoring ergonomics for ai assistants, development-ready
- Use when: You need to implement or review the scaffolded workflow for Improve logics-manager authoring ergonomics for AI assistants.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_490_expose_scaffold_request_chain_and_deliver_as_mcp_tools`
- `item_491_make_the_scaffold_input_schema_discoverable_and_validated`
- `item_492_name_remedy_commands_in_blocking_lint_validate_messages`
- `item_493_classify_closeout_deferred_proofs_as_a_distinct_severity`
- `item_494_add_inline_validation_to_flow_scaffold`
