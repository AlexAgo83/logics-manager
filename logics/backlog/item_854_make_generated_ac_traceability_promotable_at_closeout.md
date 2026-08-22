## item_854_make_generated_ac_traceability_promotable_at_closeout - Make generated AC traceability promotable at closeout
> From version: 2.22.2
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Closeout proof convergence
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-22 14:37:48

# AI Context
- Summary: Promote the scaffold's deferred AC line only with recorded or supplied evidence, without changing sibling or authored proof.
- Keywords: generated, traceability, promotable, closeout
- Use when: Closeout finds missing task-level AC proof after a normal request-chain scaffold.
- Skip when: The task has an authored proof or only a generic audit finding unrelated to acceptance criteria.

# Problem
- The generated deferred line is deliberately not a proof, yet it prevents the command that receives an explicit proof from writing the required proof line.
- The automatic audit/MCP route cannot know real evidence and currently writes a placeholder that lint rejects.

# Scope
- In:
  - Promote only the exact generated deferred placeholder when a recorded AC proof or explicit `--proof` is available.
  - Keep authored non-placeholder proof immutable.
  - Make deferred lines a no-op for proofless audit/MCP autofix and return actionable explicit-proof guidance.
  - Promote proof only in the task and AC ownership scope the command can establish; sibling tasks remain unchanged.
  - Regression coverage for explicit proof promotion, idempotency, exact-placeholder matching, authored proof preservation, sibling-task isolation, and proofless autofix.
- Out:
  - A new `flow closeout --proof` interface.
  - Relaxing closeout proof requirements.
  - Generating or guessing verification evidence.

# Acceptance criteria
- AC1: A deferred generated line becomes `request-ACn -> This task. Proof: ...` when `flow repair ac-traceability --proof` is run, without creating a duplicate line.
- AC2: A second identical repair changes no files, and a manually authored proof remains byte-for-byte unchanged.
- AC3: `audit --autofix-ac-traceability` and the MCP autofix leave deferred entries valid and make clear that an explicit proof is required.
- AC4: An explicit proof for one task in a request with sibling tasks does not promote the sibling task's deferred AC line, and a human-authored line containing deferred wording is not replaced.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A deferred generated line becomes `request-ACn -> This task. Proof: ...` when `flow repair ac-traceability --proof` is run, without creating a duplicate line.
- request-AC2 -> This backlog slice. Proof: AC2: A second identical repair changes no files, and a manually authored proof remains byte-for-byte unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: `audit --autofix-ac-traceability` and the MCP autofix leave deferred entries valid and make clear that an explicit proof is required.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_109_trustworthy_closeout_and_release_contracts`
- Architecture decision(s): (none yet)
- Request: `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`
- Primary task(s): `task_389_deliver_convergent_closeout_repair_and_multi_target_release_contracts`

# Priority
- Priority: High - the prescribed closeout repair cannot clear a blocking finding in the normal scaffolded workflow
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_390_make_generated_ac_traceability_promotable_at_closeout`
- `task_389_deliver_convergent_closeout_repair_and_multi_target_release_contracts`

# Notes
- Task `task_390_make_generated_ac_traceability_promotable_at_closeout` was finished via `logics-manager flow finish task` on 2026-08-22.
- Task `task_389_deliver_convergent_closeout_repair_and_multi_target_release_contracts` was finished via `logics-manager flow finish task` on 2026-08-22.
