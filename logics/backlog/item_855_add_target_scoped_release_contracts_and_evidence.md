## item_855_add_target_scoped_release_contracts_and_evidence - Add target-scoped release contracts and evidence
> From version: 2.22.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Multi-target release contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: add, target, scoped, release, contracts, evidence
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The current contract and status evaluator model exactly one version, tag policy, gate set, and evidence state for a repository.
- A project with distinct release trains needs separate gate decisions and evidence; a global reset or evidence entry must not alter another artefact's readiness.

# Scope
- In:
  - Define and validate a v2 contract with named self-contained release targets and explicit reasons for excluded gates.
  - Normalize v1 contracts to one implicit target in the release implementation.
  - Store `target_id` on evidence in the existing JSONL ledger and filter all target state calculations by it.
  - Add `--target` selection to target-specific release commands, require it for multi-target contracts, and provide an all-target status overview.
  - Cover a two-target fixture plus v1 compatibility, unknown-target failures, evidence isolation, and scoped reset behavior.
- Out:
  - Configuration inheritance between targets.
  - Changing publication authority or automatically publishing either target.
  - Inventing a file version for an artefact that intentionally uses a tag or operator-supplied release identifier.

# Acceptance criteria
- AC1: A v2 fixture with two named targets evaluates each target's own version policy, tag pattern, gates, validation commands, and publication requirements.
- AC2: Every excluded target gate has a non-empty reason, and contract validation rejects an exclusion without one.
- AC3: Evidence carries `target_id`; status, validation, and reset isolate evidence and state to the selected target.
- AC4: Multi-target plan, validate, evidence add, and reset reject a missing or unknown target, while status offers an explicit all-target overview or a selected target detail.
- AC5: Existing v1 fixtures and calls without `--target` retain their current behavior.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: A v2 fixture with two named targets evaluates each target's own version policy, tag pattern, gates, validation commands, and publication requirements.
- request-AC5 -> This backlog slice. Proof: AC2: Every excluded target gate has a non-empty reason, and contract validation rejects an exclusion without one.
- request-AC6 -> This backlog slice. Proof: AC3: Evidence carries `target_id`; status, validation, and reset isolate evidence and state to the selected target.
- request-AC7 -> This backlog slice. Proof: AC4: Multi-target plan, validate, evidence add, and reset reject a missing or unknown target, while status offers an explicit all-target overview or a selected target detail.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_109_trustworthy_closeout_and_release_contracts`
- Architecture decision(s): (none yet)
- Request: `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`
- Primary task(s): `task_389_deliver_convergent_closeout_repair_and_multi_target_release_contracts`

# Priority
- Priority: High - an artefact can currently be tagged and deployed outside every declared release gate
- Rationale: Set by scaffold input or defaulted for grooming.
