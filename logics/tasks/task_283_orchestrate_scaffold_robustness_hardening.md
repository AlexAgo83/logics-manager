## task_283_orchestrate_scaffold_robustness_hardening - Orchestrate scaffold robustness hardening
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: digital

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A (pre-flight validation): add validate_scaffold_input + a domain error in _context_profile_limit; run it for both dry-run and apply before any write. Validate with pytest for invalid-profile rejection and dry-run/apply parity. (_validate_scaffold_input existed since req_276 for types/required keys; added enum-domain checks for context_pack.profile/mode + request/backlog complexity, and made sync._context_profile_limit raise a clear ValueError instead of a bare KeyError. tests/python/test_scaffold_robustness.py covers rejection, dry-run/apply parity, and the limit error.)
- [x] 2. Slice B (atomic apply): stage all writes and commit only on full success, rolling back on failure without consuming ids; add a fault-injection pytest. Layers on Slice A (validation catches input errors first; atomicity covers the rest). (scaffold_request_chain_payload tracks created docs + context-pack and snapshots INDEX.md; on any failure it deletes the new files and restores INDEX, leaving the repo unchanged. Because refs are derived from on-disk files, a rolled-back run consumes no ids. Fault-injection pytest forces a mid-apply failure and asserts clean rollback + id reuse on re-run.)
- [x] 3. Slice C (short-ref resolution): resolve short refs in validate/audit with a did-you-mean hint; independent of A and B. (_resolve_doc_path now falls back to _short_ref_matches, resolving req_285 -> req_285_<slug> by integer value regardless of zero-padding; _resolve_any_workflow_source appends a "did you mean: <slugs>" hint for ambiguous/missing short refs. Verified end-to-end: `python -m logics_manager flow validate req_286` resolves; pytest covers exact resolution + the hint.)
- [x] 4. Slice D (schema command): add --print-schema/--template + help pointer; independent. (--print-schema and --example already shipped in req_276; added a pointer to them in the flow command help and a pytest asserting both emit valid JSON.)
- [x] 5. Closeout proof: replay the original failure — a context_pack.profile of 'dev' is rejected pre-write with a message naming the allowed values and the repo is left unchanged; flow validate req_<n> resolves by short ref; --print-schema emits valid JSON; pytest and lint/audit are green. (test_scaffold_robustness.py replays the 'dev' rejection + rollback; `python -m logics_manager flow validate req_286` resolves by short ref; --print-schema/--example emit valid JSON; full pytest 456 passed; npm run lint + logics-manager lint/audit green.)
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_522_pre_flight_validate_scaffold_input_and_share_the_path_with_dry_run`
- `item_523_make_scaffold_apply_atomic`
- `item_524_resolve_short_workflow_refs_in_validate_and_audit`
- `item_525_surface_the_scaffold_input_schema_via_a_command`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: delivered via item_522 (Done) — _validate_scaffold_input rejects an unknown context_pack.profile (and other enums) before any write, naming the field + allowed values; test_scaffold_robustness.py asserts it.
- request-AC2 -> This task. Proof: delivered via item_522 (Done) — validation runs at the top of scaffold_request_chain_payload before the dry_run branch, so --dry-run and apply validate identically; pytest covers the parity.
- request-AC3 -> This task. Proof: delivered via item_523 (Done) — apply tracks created files + snapshots INDEX and rolls back on failure, consuming no ids; fault-injection pytest proves rollback + id reuse.
- request-AC4 -> This task. Proof: delivered via item_524 (Done) — _resolve_doc_path resolves short refs and _resolve_any_workflow_source emits a did-you-mean hint; `python -m logics_manager flow validate req_286` resolves; pytest covers both paths.
- request-AC5 -> This task. Proof: delivered via item_525 (Done) — `flow scaffold request-chain --print-schema`/`--example` emit the schema/template, referenced from the flow help; pytest asserts valid JSON.
- request-AC6 -> This task. Proof: tests/python/test_scaffold_robustness.py covers invalid-profile rejection, dry-run/apply parity, atomic rollback, and short-ref resolution; full pytest 456 passed.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- full pytest 456 passed (incl. test_scaffold_robustness.py: rejection, dry-run/apply parity, atomic rollback + id reuse, short-ref resolution, --print-schema/--example JSON); npm run lint OK; logics-manager lint/audit clean
- Finish workflow executed on 2026-06-27.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-27.
- Linked backlog item(s): `item_522_pre_flight_validate_scaffold_input_and_share_the_path_with_dry_run`, `item_523_make_scaffold_apply_atomic`, `item_524_resolve_short_workflow_refs_in_validate_and_audit`, `item_525_surface_the_scaffold_input_schema_via_a_command`
- Related request(s): `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`

# AI Context
- Summary: Orchestrate scaffold robustness hardening
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`
- Product brief(s): `prod_035_scaffold_tooling_robustness`
- Architecture decision(s): (none yet)
