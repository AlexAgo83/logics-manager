## item_877_commit_only_literal_selected_git_paths - Commit only literal selected Git paths
> From version: 2.23.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:05:22

# AI Context
- Summary: A selected filename is interpreted as a Git pathspec and commits an unselected matching file; F1 is reproduced.
- Keywords: req_387, viewer, review, validation
- Use when: Implementing or investigating this bounded slice.
- Skip when: Working on unrelated review findings.

# Problem
A selected filename is interpreted as a Git pathspec and commits an unselected matching file; F1 is reproduced.

# Scope
- In: Trace all callers of _normalize_git_file_path and Git invocation helpers. Preserve filenames literally for add, commit and affected diff calls. Keep containment and symlink checks.
- Out: Do not change commit scope to the whole index, add a new Git abstraction, or rewrite unrelated Git operations.

# Acceptance criteria
- AC1: A selected literal filename containing `*`, `?` or brackets cannot cause any unselected file to be staged or committed; the response matches the actual commit.
- AC4: Any accepted fix has a focused regression check reproducing the corresponding failure above. Dependency-gate failures are reported separately from behavior-test results.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A selected literal filename containing `*`, `?` or brackets cannot cause any unselected file to be staged or committed; the response matches the actual commit.
- request-AC4 -> This backlog slice. Proof: AC4: Any accepted fix has a focused regression check reproducing the corresponding failure above. Dependency-gate failures are reported separately from behavior-test results.

# Decision framing
- Product framing: Covered by the linked shared product brief
- Product signals: Operator-visible behavior and review acceptance criteria.
- Product follow-up: Keep the shared brief aligned with delivered behavior.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): `prod_116_trustworthy_viewer_actions_and_persistent_project_navigation`
- Architecture decision(s): (none yet)
- Request: `logics/request/req_387_review_findings_literal_git_paths_repair_input_validation_and_update_cache_resilience.md`
- Primary task(s): `task_399_deliver_the_repository_review_fixes_and_viewer_followups`

# Priority
- Priority: High
- Rationale: Prevent writes beyond the operator intent; reproduced before implementation.

# Notes
- Entry point: `logics_manager/viewer_git.py`. Read its callers before choosing the smallest fix.
- Validation: Use a temporary real Git repository with part*.txt and part-secret.txt; also cover question marks and brackets. Assert the committed tree, returned file list and untouched unselected changes, including already-staged unrelated changes. Run focused tests in tests/python/test_viewer_cli.py.
- Dependencies and order: Independent. Deliver before lower-priority viewer ergonomics. This slice owns request AC4 aggregation: the orchestration task must record checks for every accepted sibling fix.
- Evidence state: see the corresponding F finding in req_387; prior suite passes are baseline evidence, not proof of this future fix.
- Documentation: update the affected product/CLI documentation if its user-visible contract changes, and record evidence in task_399.

# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`
