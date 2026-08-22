## task_390_make_generated_ac_traceability_promotable_at_closeout - Make generated AC traceability promotable at closeout
> From version: 2.22.2
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-22 13:26:56
> Owner: Codex

# AI Context
- Summary: Hotfix the shared AC repair so explicit evidence replaces only the exact generated placeholder in its owning task.
- Keywords: generated, traceability, promotable, closeout
- Use when: A scaffolded task cannot close because its generated deferred AC traceability was not promoted.
- Skip when: The work is the separate release-target contract migration.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_854_make_generated_ac_traceability_promotable_at_closeout`

# Acceptance criteria
- AC1: A deferred generated line becomes `request-ACn -> This task. Proof: ...` when `flow repair ac-traceability --proof` is run, without creating a duplicate line.
- AC2: A second identical repair changes no files, and a manually authored proof remains byte-for-byte unchanged.
- AC3: `audit --autofix-ac-traceability` and the MCP autofix leave deferred entries valid and make clear that an explicit proof is required.
- AC4: A repair preserves sibling tasks and any human-authored traceability line, even when it includes wording similar to the generated placeholder.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_390_make_generated_ac_traceability_promotable_at_closeout.md --progress <n>%` during multi-wave work.
- [x] Reproduce the explicit `--proof` path with a generated line, then cover sibling-task isolation and exact placeholder recognition.
- [x] Make proofless audit/MCP autofix report the evidence boundary without writing a rejected placeholder.
- [x] Run `python3 -m logics_manager flow finish task task_390_make_generated_ac_traceability_promotable_at_closeout.md` after implementation.

# Validation
- (no validation recorded yet)
- python3.11 -m pytest -q: 1456 passed
- Finish workflow executed on 2026-08-22.
- Linked backlog/request close verification passed.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 181ebb2 and 42592c2; 1456 tests passed with python3.11 -m pytest -q. Source: `42592c2`
- request-AC2 -> This task. Proof: Implemented in 181ebb2 and 42592c2; 1456 tests passed with python3.11 -m pytest -q. Source: `42592c2`
- request-AC3 -> This task. Proof: Implemented in 181ebb2 and 42592c2; 1456 tests passed with python3.11 -m pytest -q. Source: `42592c2`

# Report
- Not started.
- Finished on 2026-08-22.
- Linked backlog item(s): `item_854_make_generated_ac_traceability_promotable_at_closeout`
- Related request(s): `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`

# Links
- Request: `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
