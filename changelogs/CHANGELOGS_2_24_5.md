# Logics Manager 2.24.5

Retire abandoned workflow documents, manage companion statuses through the CLI, and respect Git worktree boundaries. Release date: 2026-11-12.

## Lifecycle commands

Delivered in PR #64 (commit `342fea817fbfb08c77088a0baa36ecd278d285bb`): [M-1014] Add reasoned retirement and companion status commands.

- Add `flow withdraw <source> --reason <text>` without a replacement. Mark eligible linked parents Obsolete, record the reason in each document, and preserve incomplete progress and checkboxes. Existing replacement withdrawals retain their behavior.
- Add `flow status <product|architecture|runbook|roadmap> <source> --status <status> --reason <text>` with per-type status validation, terminal transition guards, and dry-run support.
- Explain that retired runbooks use Archived, and list valid status alternatives on errors.
- Update generated assistant instructions, the LOGICS bridge, and lifecycle skills to use the commands instead of manual status edits.

## Repository root discovery

Delivered in PR #63 (commit `1618283633acabef76cbb8fa69a2b5ad95f63380`): [M-986] Respect Git worktree boundaries during repository root discovery.

- Stop automatic discovery at the nearest `.git` entry, including the `.git` file of a linked worktree, instead of treating a `logics/` directory as a repository boundary.
- Require explicit `--repo-root` targeting outside a Git work tree, including for `bootstrap`, and document the discovery contract in the CLI guide.

## Maintenance

- PR #62 (commit `75b5d3b6c42f864136a5b57e6578cf8872fd6d4f`): Use neutral host and project names in documentation and tests, with no behavior change.
- Align release declarations, the README version badge, and lockfiles for 2.24.5, and regenerate the aggregate changelog.

## Validation

- Cover retirement, conditional propagation, replacement compatibility, companion statuses, invalid transitions, reasons, and dry-run behavior in CLI tests.
