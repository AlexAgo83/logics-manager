## item_647_compare_release_tree_evidence_against_the_tagged_commit - Compare release-tree evidence against the tagged commit
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: The commit the evidence describes
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The comparison commit is `git rev-parse HEAD`, so every gate carrying command, file, git or ci evidence goes stale the moment anything lands after the release.
- The commits that land are the ones the release process itself produces: the checksum write-back on the release event, and the closeout the gate asks for. Satisfying the gate moves the comparison, so the sequence cannot terminate.
- The tag already resolves elsewhere in the same file: the publication gates match evidence against it, which is why those three alone survive.

# Scope
- In:
  - Resolve the release commit from the tag the contract's pattern names, and compare release-tree evidence against it.
  - Fall back to the working commit while no tag exists, so a release in preparation behaves as it does today.
  - Name the comparison in the failure reason, so a stale gate says whether it missed the release commit or the branch.
  - Cover a release with commits landing after the tag, and one with no tag yet.
- Out:
  - Changing what evidence a gate requires.
  - Changing the publication gates, which already match the tag.
  - Changing how evidence is recorded.

# Acceptance criteria
- AC1: Evidence recorded at the tagged commit stays valid when later commits land.
- AC2: A release with no tag still validates against the working commit.
- AC3: Evidence targeting neither commit fails, and the reason names which comparison it failed.
- AC4: The publication gates are unchanged.
- AC5: A test lands commits after a tag and fails against the current implementation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Evidence recorded at the tagged commit stays valid when later commits land.
- request-AC2 -> This backlog slice. Proof: AC2: A release with no tag still validates against the working commit.
- request-AC3 -> This backlog slice. Proof: AC3: Evidence targeting neither commit fails, and the reason names which comparison it failed.
- request-AC5 -> This backlog slice. Proof: AC4: The publication gates are unchanged.
- request-AC6 -> This backlog slice. Proof: AC5: A test lands commits after a tag and fails against the current implementation.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_065_evidence_about_the_release`
- Architecture decision(s): (none yet)
- Request: `req_317_judge_release_evidence_against_the_commit_the_release_was_cut_from`
- Primary task(s): `task_314_orchestrate_judging_evidence_against_the_release`

# AI Context
- Summary: Compare release-tree evidence against the tagged commit
- Keywords: scaffolded-backlog, compare release-tree evidence against the tagged commit, implementation-ready
- Use when: Implementing the scaffolded slice for Compare release-tree evidence against the tagged commit.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the release process invalidates its own gates
- Rationale: Set by scaffold input or defaulted for grooming.
