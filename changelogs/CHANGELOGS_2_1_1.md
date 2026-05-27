# Changelog (`2.1.0 -> 2.1.1`)

Release `2.1.1` fixes npm global installation for the CLI package.

## Why `2.1.1`

- The `2.1.0` npm package ran the repository compile step during global installation.
- Global installs do not include development-only build tools such as `tsc`, so installation could fail before the CLI was available.

## What Changed

- Removed the npm `postinstall` compile hook from the published package metadata.
- Kept build and package validation commands available for repository development and CI.

## Upgrade Notes

- Install or update the CLI with `npm install -g @grifhinz/logics-manager@latest`.
- Existing Python, VS Code, and MCP workflows are otherwise unchanged from `2.1.0`.

## Validation and Regression Evidence

- `npm pack --dry-run`
