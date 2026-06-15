# Logics Manager 2.9.0

## Highlights

- **Workshop** — new top-bar entry between Explorer and Git, with a Terminals sub-screen (stdlib-pty backend on Unix, xterm.js 5.3 vendored frontend, multi-session lifecycle, resize via TIOCSWINSZ, restore on reload) and a Commands sub-screen (auto-discovered `package.json` scripts and `pyproject.toml` project/poetry scripts, SSE streaming, clean stop). A counter badge on the Workshop button surfaces running terminals (blue) and command runs (orange).
- **Explorer restyle** — SVG file/folder icons, a clickable breadcrumb, distinct hover/focus/selected states, density parity with Git/CDX, dedicated placeholder states for empty / unavailable / truncated trees.
- **LAN exposure** — opt-in `--lan` CLI flag, per-launch `secrets.token_urlsafe(32)` bearer kept in memory only, HTTP-layer read-only enforcement via a `VIEWER_MUTATING_ROUTES` registry, query-to-sessionStorage handoff with URL scrubbing, in-app banner with a working Copy URL fallback for insecure contexts, scannable QR matrix when the optional `segno` package is installed (textual fallback otherwise). Static UI assets bypass the bearer so the page actually loads on a phone.
- **Responsive viewer** — `<=600px` and `<=420px` breakpoints applied across the viewer chrome, Git diff/file lists, CDX/CI/Workspace/Insights grids, filter panel, topbar (wraps actions, keeps Settings panel readable), update banner, document inset; LAN banner collapses to a compact form at `<=720px` (short message + Copy button on phones).
- **Two new ADRs** — `adr_023` (Workshop terminal transport, PTY library, emulator bundling — Settled, phase 2.1 ships stdlib-only) and `adr_024` (LAN viewer auth model, read-only contract, QR library choice — Settled).

## Viewer

- Workshop terminals fire SIGTERM on a 60s idle-kill timer once the last SSE consumer drops, with a fast cancel-on-reattach path so reloads and tab switches do not orphan the PTY.
- Closing a terminal swaps the `×` glyph for a spinner and dims the row while the SIGTERM → SIGKILL cycle runs.
- `window.logicsViewer.launchTerminal(command, label)` exposes the launcher hook for CDX / handoff integration.
- The viewer LAN URL is derived from the OS-picked outbound IP (UDP-socket probe) so phones reach the real LAN address instead of `0.0.0.0`; the share URL is delivered by the server payload, never reconstructed from sessionStorage.
- Explorer drops its internal scroll so the document scrolls as a unit (iso with Git / CDX); the Workshop view scrolls the page instead of a constrained panel.

## Workflow Corpus

- Closes `req_244` (Explorer + Workshop), `req_245` (LAN exposure), and `req_246` (Responsive viewer). All linked backlog slices (items 419-428) are Done.
- Splits the deferred PTY + xterm.js work from `task_219` into `task_222` and ships it under `adr_023` phase 2.1 (stdlib pty + SSE+POST + vendored xterm.js).
- Promotes `adr_023` and `adr_024` to Settled now that production matches the consequences sections.

## Validation

- `npm run release:changelog:validate`
- `npm test -- tests/viewer.browser-host.test.ts` (88/88 passed)
- `python -m pytest tests/python/test_logics_manager_cli.py -k 'workshop or lan or terminal or viewer'` (passed)
- `logics-manager lint`
- `logics-manager audit`
