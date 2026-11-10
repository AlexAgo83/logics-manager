# Logics Manager 2.24.4

Correct workflow audits for abandoned work and requests delivered by merged executions. Release date: 2026-11-10.

## Workflow audit fixes

Delivered in PR #60 (commit `326a7eab4a645e0b4039924447aa91ec058aeda8`): [M-876] Honor obsolete status and merged execution evidence in audits.

- Keep structural checks for Obsolete documents, including reference resolution and execution-table validity, without requiring abandoned delivery gates, traceability, failed-run remediation, or automatic proof repairs. Obsolete documents cannot supply delivery proof for other work.
- Accept a valid merged execution with a nonempty PR URL on an explicitly Done request as delivery evidence in place of its backlog/task chain and DoR. Active requests retain their existing requirements; malformed tables, other execution states, and empty PR cells do not qualify.
- Explain how to record merged delivery evidence with `flow record-run` in missing-evidence findings, and document the audit rules in the CLI guide.

## Maintenance

- PR #59 (commit `9d3c1a8a7e5954665178998f20b2d520bff234bd`): Document the existing scheduled security audit fix and its validation evidence. The minimatch 11.0.4 fix already shipped in 2.24.3; this change adds no dependency or audit-policy changes.
- PR #58 (commit `5ccef50ad2c20de5f04f4a2a8eec954d456ac3aa`): Retry transient VS Code Marketplace publishing failures up to three attempts, waiting 60 seconds between attempts. Accept an existing publication only for the exact extension version and stop immediately on other errors.
- Align release declarations, the README version badge, and lockfiles for 2.24.4, and regenerate the aggregate changelog.
