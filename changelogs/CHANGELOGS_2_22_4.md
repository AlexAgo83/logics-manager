# Logics Manager 2.22.4

A corrective release for the security-alert and bootstrap-policy fixes delivered after
2.22.3.

## Security alert triage is explicit

The viewer no longer resolves an arbitrary `/api/remove-fleet-root` request value as a
filesystem path. Removal now matches the submitted value against the fleet roots the
viewer already published, and regression coverage proves traversal-like values are
refused while the exact trusted root still works.

The remaining Secure MCP Tunnel storage alerts were triaged as intentional local
machine-key persistence: POSIX owner-only mode is tested, secret-bearing messages are
covered, and the Windows ACL boundary is documented.

## Bootstrap leaves version-control policy to the repository

`logics-manager bootstrap` still creates and refreshes `AGENTS.md`, `LOGICS.md`, and
`logics/instructions.md`, but it no longer creates or edits `.gitignore`. Teams can now
decide locally whether assistant bridge files are versioned or ignored.

## Release-target contract cleanup

The multi-target release contract work is closed out with the follow-up ADR settled, so
release evidence can describe branch, release, CI, GitHub release, and publication
targets without overloading a single target model.
