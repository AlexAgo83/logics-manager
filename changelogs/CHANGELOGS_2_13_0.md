# Logics Manager 2.13.0

## Viewer

- Hardened the viewer server against malformed `Content-Length` headers and path traversal edge cases in media serving.
- Improved workshop terminal robustness by bounding remembered command sessions, terminal session memory, and related race-prone state.
- Kept viewer/browser assets in sync after the recent browser-host and shared web model updates.

## Workflow and Logics

- Unified workflow status handling across Python and TypeScript with generated status constants and shared validation tests.
- Added null-safe public `CdxLogicsModel` behavior for webview consumers.
- Consolidated duplicated Python parsing helpers into shared document parsing code.
- Cleaned up dead or duplicated MCP, CLI, viewer, and client JavaScript/TypeScript code.

## Security and Reliability

- Added defense-in-depth fixes for local-only audit findings across markdown link handling, release path validation, CSP nonce generation, environment propagation, and media path decoding.
- Fixed confirmed correctness one-liners found during the audit remediation pass.
- Closed the audit remediation workflow chain and corrected stale audit findings.

## Validation

- `rtk npm run release:changelog:validate`
- `rtk npm run ci:check`
- `rtk git diff --check`
