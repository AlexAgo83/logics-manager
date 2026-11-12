# Logics Manager 2.24.5

Retire abandoned workflow documents and manage companion statuses through the CLI.

## Lifecycle commands

- Add `flow withdraw <source> --reason <text>` without a replacement. Mark eligible linked parents Obsolete, record the reason in each document, and preserve incomplete progress and checkboxes. Existing replacement withdrawals retain their behavior.
- Add `flow status <product|architecture|runbook|roadmap> <source> --status <status> --reason <text>` with per-type status validation, terminal transition guards, and dry-run support.
- Explain that retired runbooks use Archived, and list valid status alternatives on errors.
- Update generated assistant instructions, the LOGICS bridge, and lifecycle skills to use the commands instead of manual status edits.

## Validation

- Cover retirement, conditional propagation, replacement compatibility, companion statuses, invalid transitions, reasons, and dry-run behavior in CLI tests.
