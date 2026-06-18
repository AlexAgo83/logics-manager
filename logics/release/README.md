# Release Workflow Contract

The release workflow contract is a repo-owned JSON document that tells humans,
CLI commands, viewers, MCP clients, and assistants how a project proves release
readiness. Version 1 of the contract is defined by
`release-contract.v1.schema.json`.

## Contract Location

Projects should place their active contract at `logics/release/contract.json`.
The examples in `logics/release/fixtures/` show project-specific profiles
without hard-coding those projects into the global model.

## State Machine

The common state machine is:

1. `planning` - target version and expected surfaces are known.
2. `preparing` - metadata, changelog, and release notes are being updated.
3. `local_validation` - local validation commands are running or being fixed.
4. `commit_ready` - release files and local evidence are ready to commit.
5. `pushed` - release commit and optional tag are pushed.
6. `ci_verification` - remote CI evidence is pending or being checked.
7. `github_release` - GitHub release publication is pending or verified.
8. `external_publication` - package registry, deployment, or external checks are pending or verified.
9. `ready` - every required gate has current matching evidence.
10. `blocked` - a required gate is missing, failed, stale, or points at the wrong commit, tag, or version.

## Gates

Every configured gate has one of these statuses: `pending`, `passed`,
`failed`, `stale`, `skipped`, `not_configured`, or `blocked`.

Required gates should include evidence with the target version, commit, and
timestamp whenever that information exists. Evidence that omits those fields
cannot prove final readiness for gates that depend on source state.

## Evidence

Evidence entries are normalized records for commands, files, git state, CI
runs, GitHub releases, and external publication checks. They should include:

- `kind`: `command`, `file`, `git`, `ci`, `github_release`, or `external`.
- `status`: gate status at the time the evidence was recorded.
- `observed_at`: ISO-8601 timestamp.
- `target_version`: release version the evidence applies to.
- `commit`: source commit when the evidence depends on source state.
- `tag`: release tag when the evidence depends on a tag.
- `summary`: short operator-readable result.
- Optional `command`, `path`, `url`, `run_id`, and `details` fields.

Evidence is stale when it was recorded before the current release source
commit, uses a different target version, uses a different tag, or refers to a
superseded CI or publication run.

## Assistant Readiness Rule

Assistants must inspect project-owned release contract and evidence before
claiming a release is ready. Conversation memory, prior chat state, or a
successful local command without matching evidence is not enough. Publication
actions must remain explicit operator actions unless the project contract and
current permission model say otherwise.
