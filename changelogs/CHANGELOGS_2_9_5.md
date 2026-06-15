# Logics Manager 2.9.5

## Fixes

- Workshop terminal panel stretches to the available viewport height with a clamp so the page no longer scrolls vertically, and the terminal host refits on window resize.
- Open folder / open file on WSL no longer relies on `gio`: detect WSL, translate paths with `wslpath -w`, and launch `explorer.exe` directly.
- Subprocess timeouts (git, cdx status, gh, logics flow/command, cdx missions) scale up automatically when the viewer runs in WSL against a repo on `/mnt/<drive>/`, and a banner surfaces the slowdown with the recommended remediation.
- `Shift+Enter` in Workshop terminals now inserts a newline (`ESC+CR`) instead of submitting, so multi-line prompts in `cdx` / readline tools behave as expected.
- Workshop topbar button greys out alongside the other primary actions while a blocking action is running.
- Only the active Workshop terminal keeps an SSE stream open; inactive sessions stay alive on the server and resume from `?since=<lastSeq>` on reactivation, fixing the freeze that hit after spawning ~6 terminals (HTTP/1.1 per-origin connection cap).
- Workshop terminal panel and host heights reduced so the screen no longer scrolls.

## Docs

- Quick Start in `README.md` recommends the npm install path; pip / pipx installs are marked as deprecated for end users (publishing pipelines unchanged).

## Validation

- `logics-manager audit`
- `logics-manager lint`
- `npm run release:changelog:validate`
- `npm run ci:check`
- `git diff --check`
