# Changelog (`1.10.6 -> 1.10.7`)

## Major Highlights

- Fixed the extension development workflow so a fresh clone now produces the runtime bundle expected by VS Code debug sessions.
- Hardened Windows Python execution for Logics bootstrap and workflow actions by accepting `python`, `py -3`, and `py` when `python3` is unavailable.
- Kept release preparation aligned with the extension version, curated changelog contract, and validation flow for `1.10.7`.

## Version 1.10.7

### Debug and packaging workflow

- Added a `postinstall` build step so dependency installation prepares the compiled extension bundle immediately for local debug sessions.
- Aligned the VS Code launch configuration with the bundled `dist/` output and enabled bundle source maps for more useful extension-host debugging.
- Preserved the packaged runtime contract around `dist/extension.js` and bundled assets while validating the release workflow against the updated build output.

### Windows Python compatibility

- Replaced the hardcoded `python3` invocation path with runtime resolution across `python3`, `python`, `py -3`, and `py`.
- Improved missing-Python guidance so Windows users get actionable PATH/launcher instructions instead of a misleading bootstrap failure.
- Added targeted test coverage for Python launcher fallback detection and platform-specific error messaging.

### Validation

- `npm run compile`
- `npx vitest run tests/pythonRuntime.test.ts`
- `npm run release:changelog:validate`
