## item_855_add_target_scoped_release_contracts_and_evidence - Add target-scoped release contracts and evidence
> From version: 2.22.2
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 28%
> Complexity: High
> Theme: Multi-target release contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-22 14:13:59

# AI Context
- Summary: Normalize legacy release contracts to one target while isolating contract validation, evidence, reset, and status for every v2 target.
- Keywords: add, target, scoped, release, contracts, evidence
- Use when: A repository releases more than one independently gated artefact.
- Skip when: A change concerns only a single existing release gate without altering contract or evidence scope.

# Problem
- The current contract and status evaluator model exactly one version, tag policy, gate set, and evidence state for a repository.
- A project with distinct release trains needs separate gate decisions and evidence; a global reset or evidence entry must not alter another artefact's readiness.

# Scope
- In:
  - Define and validate a v2 contract with unique, safe named self-contained release targets and explicit non-empty reasons for excluded gates.
  - Normalize v1 contracts to one implicit target in the release implementation.
  - Store `target_id` on evidence in the existing JSONL ledger and filter all target state calculations by it; legacy targetless evidence belongs only to the implicit v1 target.
  - Add `--target` selection to target-specific release commands, require it for multi-target contracts, and provide an all-target status overview.
  - Preserve non-selected and malformed ledger lines during an atomic target-scoped reset.
  - Project the selected or overview status consistently through the CLI, context pack, MCP, and viewer API.
  - Cover a two-target fixture plus v1 compatibility, unknown-target failures, evidence isolation, legacy evidence, scoped reset preservation, and every public status consumer.
- Out:
  - Configuration inheritance between targets.
  - Changing publication authority or automatically publishing either target.
  - Inventing a file version for an artefact that intentionally uses a tag or operator-supplied release identifier.

# Acceptance criteria
- AC1: A v2 fixture with two named targets evaluates each target's own version policy, tag pattern, gates, validation commands, and publication requirements.
- AC2: Contract validation rejects duplicate or unsafe target IDs and every excluded target gate without a non-empty reason before release planning or evidence mutation.
- AC3: Evidence carries `target_id`; status, validation, and reset isolate evidence and state to the selected target, and a scoped reset atomically preserves every other ledger line.
- AC4: Multi-target plan, validate, evidence add, and reset reject a missing or unknown target, while status, context packs, MCP, and the viewer offer an explicit all-target overview or a selected target detail.
- AC5: Existing v1 fixtures, targetless legacy evidence, and calls without `--target` retain their current behavior; targetless evidence is not silently attributed under v2.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: A v2 fixture with two named targets evaluates each target's own version policy, tag pattern, gates, validation commands, and publication requirements.
- request-AC5 -> This backlog slice. Proof: AC2: Every excluded target gate has a non-empty reason, and contract validation rejects an exclusion without one.
- request-AC6 -> This backlog slice. Proof: AC3: Evidence carries `target_id`; status, validation, and reset isolate evidence and state to the selected target.
- request-AC7 -> This backlog slice. Proof: AC5: Existing v1 fixtures, targetless legacy evidence, and calls without `--target` retain their current behavior; targetless evidence is not silently attributed under v2.

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

# Tasks
- `task_391_add_target_scoped_release_contracts_and_evidence`
