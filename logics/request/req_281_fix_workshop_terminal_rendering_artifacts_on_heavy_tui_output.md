## req_281_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output - Fix Workshop terminal rendering artifacts on heavy TUI output
> From version: 2.13.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90
> Confidence: 78
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Stop the rendering artifacts in the Workshop in-app terminal when a heavy TUI (notably Claude Code) prints wide box-drawing tables: the table's right border leaks into the cell text (`┤`/`┐` mid-line) and columns desync.
- Goal: the embedded terminal renders full-screen redrawing TUIs cleanly, the way an external terminal does. Lighter CLIs are fine today; the failure is specific to heavy redraw + wide content.

# Context
- The Workshop terminal is xterm.js, vendored at `clients/shared-web/media/vendor/xterm/` — **xterm.js 5.3.0**, `xterm-addon-fit 0.8.0`, `xterm-addon-web-links 0.9.0` (`PROVENANCE.md` documents the `curl` refresh used to vendor them). Loaded via plain `<script>`/`<link>`, no bundler.
- Backend is a stdlib `pty` session (`logics_manager/viewer_workshop.py`): PTY fork, initial 80x24 (`:439-450`), resize via `TIOCSWINSZ` ioctl (`resize()` `:570-578`).
- Frontend resize plumbing exists and is broadly correct: `FitAddon.fit()` + `proposeDimensions()`, clamps to `WORKSHOP_TERMINAL_MIN_COLS`, posts `{rows, cols}` to the backend resize endpoint (`clients/viewer/browser-host.js:2878-2888`, `:3209`, init at `:6365-6398`, ResizeObserver + rAF at `:798-808`, `:6587-6598`). So this is NOT the gross "PTY stuck at 80" bug.
- Observed (user screenshots, 2026-06-26): narrow tables render fine; wide tables break with the right border landing inside the text; intermittent, appearing "whenever it glitched" — consistent with a reflow/width event, not a constant offset.
- Most probable cause: xterm 5.3.0 reflow of lines containing box-drawing/wide characters, aggravated by a ±1 column width oscillation when the scrollbar appears/disappears (FitAddon recomputes cols, the PTY/TUI redraws at one width while already-printed buffer lines are re-wrapped at another). xterm 5.4/5.5 shipped reflow and wide-char fixes.

# Decisions
- **Primary fix: bump the vendored xterm.js 5.3.0 → latest 5.x (5.5.0)** plus matching addons, then re-test the table artifact. Cheapest, highest-probability fix; it is a vendored-file swap following the documented `PROVENANCE.md` refresh, no bundler change.
- **Secondary: stabilize the rendered width** so the scrollbar appearing/disappearing does not oscillate the column count by ±1 (reserve a scrollbar gutter / give the terminal host a stable content width). Removes the reflow trigger even if a residual xterm reflow glitch remains.
- **Confirm-then-stop**: if the bump alone clears the artifact in a repro (resize the pane while Claude Code prints a wide table), ship that and treat the width-stabilization as optional hardening rather than mandatory.

# Acceptance criteria
- AC1: With the updated terminal, a heavy TUI (Claude Code) printing a wide box-drawing table renders with borders aligned — no `┤`/`┐` leaking into cell text — at the default pane size.
- AC2: Resizing the terminal pane while such output is on screen does not corrupt already-printed tables (reflow stays consistent); a full redraw restores a clean frame.
- AC3: The scrollbar appearing/disappearing does not change the effective column count in a way that breaks in-flight table borders (width is stable or the gutter is reserved).
- AC4: Existing terminal behavior is unchanged for normal CLIs (no regression in input, resize, links, or PTY lifecycle); `PROVENANCE.md` is updated to the new pinned versions.
- AC5: A documented manual repro (or lightweight check) demonstrates the artifact before and its absence after.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Scope
- In: upgrade the vendored xterm.js + addons; optional scrollbar-gutter/width stabilization in the terminal host; update PROVENANCE.md; a repro/check for the artifact.
- Out: replacing xterm.js with another emulator; adding a bundler/build step for the viewer assets; changing the PTY backend; fixing Claude Code's own output (the fix is on the emulator side); adding the WebGL renderer addon unless the version bump proves insufficient.

# Risks / Open questions
- Addon package rename: at xterm 5.4+ the npm packages moved to the `@xterm/*` scope (`@xterm/addon-fit`, `@xterm/addon-web-links`) and the global may change (`window.FitAddon` vs `@xterm/addon-fit`). The frontend already guards both shapes (`browser-host.js:6365` checks `window.FitAddon` and `window.FitAddon.FitAddon`) — verify the new bundle still exposes a compatible global, or adjust the loader. Pin exact versions in PROVENANCE.
- The artifact could not be reproduced deterministically from screenshots alone; the bump is the cheapest high-probability bet but AC must be validated against a real repro, not assumed.
- If the bump does not fully fix it, the width-stabilization (Secondary) becomes mandatory; keep both tracks scoped in the same task.
- Vendored-file swap means no automated dependency test — manual smoke of the Workshop terminal (input, resize, web-links, a wide table) is required.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/shared-web/media/vendor/xterm/PROVENANCE.md` (vendored versions + refresh command)
- `clients/shared-web/media/vendor/xterm/xterm.js` / `xterm-addon-fit.js` / `xterm-addon-web-links.js` (files to bump)
- `clients/viewer/browser-host.js:2878-2888`, `:3209`, `:6365-6398`, `:6587-6598`, `:798-808` (fit/resize plumbing, addon loading)
- `logics_manager/viewer_workshop.py:439-450`, `:570-578` (PTY init + TIOCSWINSZ resize)

# AI Context
- Summary: Workshop in-app terminal corrupts wide box-drawing tables from heavy TUIs (Claude Code) — borders leak into text. Primary fix is bumping vendored xterm.js 5.3.0 -> 5.5.0 + addons; secondary is stabilizing rendered width against scrollbar-driven ±1 col jitter; validate with a real repro.
- Keywords: xterm, workshop-terminal, rendering-artifact, box-drawing, reflow, fit-addon, pty, claude-code
- Use when: fixing terminal display corruption in the Workshop viewer.
- Skip when: working on the PTY backend lifecycle, non-terminal viewer surfaces, or the TUI app itself.
# Backlog
- none
- `item_508_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output`
