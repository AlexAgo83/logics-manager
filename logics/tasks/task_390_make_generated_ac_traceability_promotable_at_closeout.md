## task_390_make_generated_ac_traceability_promotable_at_closeout - Make generated AC traceability promotable at closeout
> From version: 2.22.2
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-22 12:51:48

# AI Context
- Summary: Hotfix the shared AC repair so explicit evidence replaces only the exact generated placeholder in its owning task.
- Keywords: generated, traceability, promotable, closeout
- Use when: A scaffolded task cannot close because its generated deferred AC traceability was not promoted.
- Skip when: The work is the separate release-target contract migration.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_854_make_generated_ac_traceability_promotable_at_closeout`

# Acceptance criteria
- AC1: A deferred generated line becomes `request-ACn -> This task. Proof: ...` when `flow repair ac-traceability --proof` is run, without creating a duplicate line.
- AC2: A second identical repair changes no files, and a manually authored proof remains byte-for-byte unchanged.
- AC3: `audit --autofix-ac-traceability` and the MCP autofix leave deferred entries valid and make clear that an explicit proof is required.
- AC4: A repair preserves sibling tasks and any human-authored traceability line, even when it includes wording similar to the generated placeholder.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_390_make_generated_ac_traceability_promotable_at_closeout.md --progress <n>%` during multi-wave work.
- [ ] Reproduce the explicit `--proof` path with a generated line, then cover sibling-task isolation and exact placeholder recognition.
- [ ] Make proofless audit/MCP autofix report the evidence boundary without writing a rejected placeholder.
- [ ] Run `python3 -m logics_manager flow finish task task_390_make_generated_ac_traceability_promotable_at_closeout.md` after implementation.

# Validation
- (no validation recorded yet)

# AC Traceability
- request-AC1 -> This task. Proof deferred to slice closeout.
- request-AC2 -> This task. Proof deferred to slice closeout.
- request-AC3 -> This task. Proof deferred to slice closeout.

# Report
- Not started.

# Links
- Request: `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
