# Logics Manager 2.15.4

## Viewer terminal safety

- Prevents viewer subprocesses from inheriting the hosting terminal as standard input, so an interactive or timed-out child cannot leave the terminal in raw mode and make Ctrl+C appear broken.
- Adds regression coverage for every viewer subprocess launch path.

## Validation

- `node scripts/ci-check.mjs`
- `logics-manager health`
- `logics-manager audit`
- `logics-manager lint`
