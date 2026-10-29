# Logics Manager 2.24.1

A patch release addressing a dependency denial-of-service advisory and Marketplace publishing reliability. Release date: 2026-10-29.

## Fixes

- Override the transitive `qs` dependency to 6.16.2 to address the moderate denial-of-service advisory blocking `audit:ci` (`d26c9fdaf8b18c767887f153b42088cf58973c43`).
- Reduce the Marketplace icon below the 1024 KB limit and add a targeted Marketplace retry path for an existing release. It publishes the corrected VSIX and replaces the GitHub release asset without moving the published tag (`26d31648dc41b0c01c48f476b3a55fcf1a328d2f`).

## Maintenance

- Record CLI usage pitfalls from Codex memory, including document targets, supported flags, indicator updates, and version-bound release evidence (`5918e14b5eaabd6bed25b15350f816f72ce948a9`).
- Document keychain-safe Chrome usage, known visual campaign timing limits, and parked activity-feed ideas; the parked ideas remain unimplemented (`7b7fd71564bc1885e53f034d218fecd3e880c35a`).
- Move agent notes from Claude memory into tracked documentation while keeping `AGENTS.md` local (`7106914a7dcefca3b15a41ffb6a00baf9da982c5`).
- Document the Marketplace retry procedure and icon size limit in the release guide (`8d5a98d625543d6f9fa33502732c5bbf99d48f87`).
