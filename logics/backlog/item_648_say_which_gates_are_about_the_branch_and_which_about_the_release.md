## item_648_say_which_gates_are_about_the_branch_and_which_about_the_release - Say which gates are about the branch and which about the release
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: A stated comparison
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Gates are grouped today by evidence kind: command, file, git and ci are compared against a commit, while the external kinds are compared against a tag. That grouping is about how the evidence was gathered, not about what the gate claims.
- A claim that the work was pushed is about a branch and moves with it. A claim about the changelog, the version metadata or a validation run is about the released tree and does not. Nothing states which is which, so an operator reading a stale gate cannot tell whether it is a real regression or a comparison that was never meant to hold.
- Choosing this per gate is a decision, not a default: it belongs in the contract, where the gates are already declared.

# Scope
- In:
  - Let a gate declare which comparison it makes, defaulting to the release tree so nothing silently keeps the old behaviour.
  - Decide and record the comparison for each gate the contract ships with, with the reason for any that is about the branch.
  - Report the comparison a gate makes in its status, so a reader does not have to infer it.
  - Document the distinction where the release process is described.
- Out:
  - Adding gates.
  - Changing the evidence kinds.
  - Making the comparison configurable per run rather than per gate.

# Acceptance criteria
- AC1: A gate declares the comparison it makes, and defaults to the release tree.
- AC2: Every gate the contract ships with has its comparison recorded, with a reason for any judged against the branch.
- AC3: A gate's status states which comparison it makes.
- AC4: The release documentation explains the distinction.
- AC5: A test covers a branch-judged gate and a release-judged one, and fails against the current implementation.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: A gate declares the comparison it makes, and defaults to the release tree.
- request-AC5 -> This backlog slice. Proof: AC2: Every gate the contract ships with has its comparison recorded, with a reason for any judged against the branch.
- request-AC6 -> This backlog slice. Proof: AC3: A gate's status states which comparison it makes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_065_evidence_about_the_release`
- Architecture decision(s): (none yet)
- Request: `req_317_judge_release_evidence_against_the_commit_the_release_was_cut_from`
- Primary task(s): `task_314_orchestrate_judging_evidence_against_the_release`

# AI Context
- Summary: Say which gates are about the branch and which about the release
- Keywords: scaffolded-backlog, say which gates are about the branch and which about the release, implementation-ready
- Use when: Implementing the scaffolded slice for Say which gates are about the branch and which about the release.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - the distinction decides what each gate means
- Rationale: Set by scaffold input or defaulted for grooming.
