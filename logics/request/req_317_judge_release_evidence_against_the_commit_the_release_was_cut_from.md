## req_317_judge_release_evidence_against_the_commit_the_release_was_cut_from - Judge release evidence against the commit the release was cut from
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Evidence about a release, not about whatever landed since
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Let a published release stay green while work continues on the branch.
- Let the sequence 'publish, then satisfy the gate' terminate.
- Tell apart a claim about the released tree from a claim about the branch.

# Context
- Reported from cutting a real release: every release invalidates its own evidence. Recording evidence for all nine gates against `HEAD` and publishing leaves the state ready; two commits later, six of the nine report `evidence targets a different commit`.
- Confirmed in the code rather than inferred. `release_status_payload` resolves the comparison commit with `_current_commit`, which is `git rev-parse HEAD`, and every gate whose evidence kind is one of command, file, git or ci is compared against it. The three that survive are the ones whose evidence is external -- the GitHub release, npm, PyPI -- because those are matched against the tag instead.
- The two commits that break it are not incidental, which is what makes this structural. One is written by the project's own workflow on the release event, recording the archive checksums so the ledger stops accumulating gaps. The other is the closeout the release gate asks for. So satisfying the gate moves `HEAD`, which invalidates the gate: the loop cannot terminate.
- Re-pinning each stale gate restores the ready state, but only until the next commit, which makes a green release a snapshot of a moment rather than a fact about what was published.
- The commit a tag points at is immutable, is what the published artifacts were built from, and is what the evidence actually describes. Version metadata, the changelog, the local validation run and CI are all statements about that tree.
- Not every gate is about that tree, and the reporter says so. A claim that the work was pushed is arguably about the branch; a claim about the changelog is about the release. Which gates are which has to be decided rather than assumed, and stated where an operator reads it.
- A release being prepared has no tag yet, so there is a window in which comparing against `HEAD` is the only thing that can be meant. Whatever is built has to keep working there.

# Acceptance criteria
- AC1: Evidence for a gate about the released tree is compared against the commit the release tag points at, not against current `HEAD`.
- AC2: A published release stays valid when unrelated commits land afterwards, including the ones the release process itself produces.
- AC3: A release being prepared, with no tag yet, still validates against the working commit.
- AC4: Any gate deliberately judged against the branch rather than the release is identified as such, and says so where an operator reads it.
- AC5: A gate whose evidence targets neither the release commit nor the branch it claims still fails, with a reason naming which comparison it failed.
- AC6: Each behavior leaves behind a test that fails against the current implementation.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_065_evidence_about_the_release`
- Architecture decision(s): (none yet)

# References
- logics_manager/release.py
- docs/release.md
- logics/product/prod_064_a_gate_you_can_satisfy.md

# AI Context
- Summary: Judge release evidence against the commit the release was cut from
- Keywords: request-chain-scaffold, judge release evidence against the commit the release was cut from, development-ready
- Use when: You need to implement or review the scaffolded workflow for Judge release evidence against the commit the release was cut from.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_647_compare_release_tree_evidence_against_the_tagged_commit`
- `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`
