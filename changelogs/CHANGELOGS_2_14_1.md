# Logics Manager 2.14.1

## Workshop

- Fixed Workshop terminal character spacing by using a stable monospace font stack for xterm and forcing zero letter spacing.
- Kept the generated browser viewer host and packaged viewer assets synchronized with the terminal rendering fix.

## Validation

- `rtk npm run check:viewer-host`
- `rtk node scripts/ci-check.mjs`
