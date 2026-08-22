## req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets - Make release and closeout workflow contracts convergent across targets
> From version: 2.22.2
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: High
> Theme: Workflow contract convergence and multi-target releases
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-22 13:26:56

# AI Context
- Summary: Repair the generated-proof path without fabricating evidence, then add independently selectable release targets without breaking v1 projects.
- Keywords: release, closeout, workflow, contracts, convergent, across, targets
- Use when: closeout repair guidance cannot reach a valid proof, or a repository has independently gated release artefacts.
- Skip when: changing one existing single-target gate without changing proof repair or release-target boundaries.

# Needs
- A generated AC traceability line must be promotable to the task-level proof required by closeout through the repair command the tool recommends.
- An automatic repair must never turn a valid deferred state into a lint-blocking TODO proof.
- One project must be able to model, validate, and record evidence for several independently released artefacts without their state leaking into one another.

# Context
- Issue #24 reproduces on 2.22.2: scaffolding writes `Proof deferred to slice closeout.`, closeout requires `This task. Proof: ...`, and `flow repair ac-traceability --proof` skips the generated line instead of promoting it.
- The repair already replaces that generated line when a per-criterion evidence record exists. Its replacement map currently excludes the explicit shared `--proof` fallback, so the documented remediation remains non-convergent for the normal closeout path.
- The audit/MCP autofix appends `Proof: TODO.` to a deferred line even though lint rejects that placeholder. It cannot invent verification evidence and must preserve the deferred state or explain that explicit proof is required.
- Issue #22 documents a real two-artefact release where the single global release state left one artefact outside all gates. Current release code reads one version source set, gate set, tag policy, evidence ledger, and status state machine per repository.
- A backwards-compatible v2 release contract should normalize a v1 contract to one implicit target. Multi-target commands must require an explicit target when selecting or mutating one target, while status without a target may present a non-mutating overview of all targets.

# Acceptance criteria
- AC1: `flow repair ac-traceability --proof` replaces a scaffold-generated deferred task line with exactly one valid task-level proof line and allows closeout traceability validation to pass.
- AC2: The same repair is idempotent and never overwrites a non-placeholder proof authored in a task document.
- AC3: Audit and MCP AC-traceability autofix do not convert a generated deferred line into a `TODO` proof; an explicit-proof requirement is reported instead.
- AC4: A v2 release contract can define named release targets with independently evaluated version policy, tag policy, gates, validation, and publication requirements.
- AC5: Each target records explicit reasons for excluded gates, and release evidence is attributed to a target so one target cannot affect another target's state.
- AC6: Status reports per-target release state; plan, validate, evidence add, and reset select a target explicitly for multi-target contracts and reject missing or unknown targets.
- AC7: Existing single-target v1 contracts and their commands continue to work without migration or a required target argument.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_109_trustworthy_closeout_and_release_contracts`
- Architecture decision(s): (none yet)

# References
- https://github.com/AlexAgo83/logics-manager/issues/24
- https://github.com/AlexAgo83/logics-manager/issues/22
- logics_manager/flow/__init__.py
- logics_manager/audit.py
- logics_manager/release.py
- logics/release/release-contract.v1.schema.json

# Backlog
- `item_854_make_generated_ac_traceability_promotable_at_closeout`
- `item_855_add_target_scoped_release_contracts_and_evidence`
