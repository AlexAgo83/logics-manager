## req_281_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output - Fix Workshop terminal rendering artifacts on heavy TUI output
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 95
> Confidence: 91
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
- **Reproduced (user screenshots, 2026-06-26 14:07–14:09)** by printing wide decorations into the Workshop terminal and resizing the pane. Three distinct failure modes confirmed:
  1. **Catastrophic reflow on resize** (capture 14:08:57): resizing the pane while box-drawing tables sit in the scrollback makes xterm 5.3.0 re-wrap the whole buffer and desync every border — rows duplicate/fragment, the screen scrambles. This is the heaviest artifact and the clearest signature of the xterm reflow bug.
  2. **Table wider than the terminal wraps badly** (capture 14:08:32): a table exceeding the column count wraps ("Colonn" + newline "e E finale très étirée") and the `│` borders no longer align on continuation lines.
  3. **Wide-glyph width desync** (États 3/4): emoji (`⚡ 📶 ☕`) render as replacement/tofu glyphs (the terminal font has no emoji) AND their expected 2-cell width is not honored, shifting following columns.
- Earlier captures (13:26) showed the milder right-border-into-text case; plain wrapped prose (14:03) renders clean — so the failure is specific to wide box-drawing + wide-glyph content and to resize/reflow, not a constant offset.
- Most probable cause: a **character-measurement / cell-width bug in xterm 5.3.0** that misplaces columns for wide/box-drawing content, surfaced intermittently by Claude Code's wide tables. Two pieces of evidence raise this above a guess:
  1. **xterm 5.4.0 changelog cluster, squarely in this bug family** (verified on the GitHub release): new default text-metrics measure strategy #4929 ("improves cases where characters would be cut off"), **fix spacing when measuring before the element is attached to the DOM #4973** (a measurement-timing bug), move WidthCache measurement container #4807, and DOM-renderer fixes #4762/#4815/#4837. These are exactly width/measurement defects that produce misaligned columns.
  2. **Negative evidence from fresh captures (2026-06-26 14:03)**: plain wrapped text (no tables) renders perfectly; only wide box-drawing tables break. That points at width/measurement of specific content, not a constant wrong-font or PTY-size bug.
- Measurement-timing angle: the terminal mounts → `fit()` → later re-fits on `document.fonts.ready` (`browser-host.js:~6400`). If the first measurement runs with the fallback font before the monospace font loads, cells are mis-sized until the re-fit, and already-printed lines stay corrupted — consistent with the intermittency.
- Config smell: the terminal is created with `convertEol: true` (`browser-host.js:6363`), unusual for a raw PTY-backed terminal (the TUI emits its own line/cursor control); worth flipping to `false` and testing.

# Decisions
- **Primary fix: bump the vendored xterm.js 5.3.0 → latest 5.x (5.5.0)** plus matching addons, then re-test the table artifact. Cheapest, highest-probability fix; it is a vendored-file swap following the documented `PROVENANCE.md` refresh, no bundler change.
- **Secondary: stabilize the rendered width** so the scrollbar appearing/disappearing does not oscillate the column count by ±1 (reserve a scrollbar gutter / give the terminal host a stable content width). Removes the reflow trigger even if a residual xterm reflow glitch remains.
- **Cheap co-fixes to test alongside the bump** (both one-liners, low risk): set `convertEol: false` for the PTY terminal, and ensure a `refresh()`/`fit()` re-measure fires after `document.fonts.ready` so the first frame is never measured with the fallback font. These address the measurement-timing cause directly even if the bump is partial.
- **Confirm-then-stop**: if the bump (+ co-fixes) clears the artifact in a repro (resize the pane while Claude Code prints a wide table), ship that and treat the width-stabilization as optional hardening rather than mandatory.

# Acceptance criteria
- AC1: With the updated terminal, a heavy TUI (Claude Code) printing a wide box-drawing table renders with borders aligned — no `┤`/`┐` leaking into cell text — at the default pane size.
- AC2: Resizing the terminal pane while such output is on screen does not corrupt already-printed tables (reflow stays consistent); a full redraw restores a clean frame.
- AC3: The scrollbar appearing/disappearing does not change the effective column count in a way that breaks in-flight table borders (width is stable or the gutter is reserved).
- AC4: Existing terminal behavior is unchanged for normal CLIs (no regression in input, resize, links, or PTY lifecycle); `PROVENANCE.md` is updated to the new pinned versions.
- AC5: A documented manual repro demonstrates the artifact before and its absence after. The "before" baseline already exists (captures 2026-06-26 14:07–14:09: wide table + resize → reflow scramble; wide-glyph column shift); re-run the same steps after the fix.

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
- The artifact is now reproduced (captures 14:07–14:09) and its modes match the 5.4.0 measurement/metrics + reflow fix family (#4929/#4973/#4807), so the bump is a well-supported bet. The remaining unknown is whether 5.5.0 fully clears all three modes — validate the *fix* against the same repro before closing (the diagnosis itself is confirmed).
- If the bump does not fully fix it, the width-stabilization (Secondary) becomes mandatory; keep both tracks scoped in the same task.
- Vendored-file swap means no automated dependency test — manual smoke of the Workshop terminal (input, resize, web-links, a wide table) is required.
- Failure mode #2 (table genuinely wider than the terminal) is partly inherent: any emulator must wrap a too-wide table. The bump should fix the *corruption* on wrap/reflow, but a table wider than the pane will still wrap — not a regression, just physics. Out of scope to reflow Claude Code's own table widths.
- Emoji rendering as tofu (mode #3) has two parts: the *width desync* (in scope — xterm metrics) and the *missing emoji glyph* (cosmetic; the terminal font has no color emoji). Adding an emoji fallback font is optional and out of scope unless trivially free.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/shared-web/media/vendor/xterm/PROVENANCE.md` (vendored versions + refresh command)
- `clients/shared-web/media/vendor/xterm/xterm.js` / `xterm-addon-fit.js` / `xterm-addon-web-links.js` (files to bump)
- `clients/viewer/browser-host.js:2878-2888`, `:3209`, `:6365-6398`, `:6587-6598`, `:798-808` (fit/resize plumbing, addon loading)
- `clients/viewer/browser-host.js:6363` (`convertEol: true` smell), `:~6400` (`document.fonts.ready` re-fit)
- `logics_manager/viewer_workshop.py:439-450`, `:570-578` (PTY init + TIOCSWINSZ resize)
- xterm.js 5.4.0 release notes (#4929 text metrics, #4973 measure-before-DOM-attach, #4807 WidthCache): https://github.com/xtermjs/xterm.js/releases/tag/5.4.0

# AI Context
- Summary: Workshop in-app terminal corrupts wide box-drawing tables from heavy TUIs (Claude Code) — borders leak into text. Primary fix is bumping vendored xterm.js 5.3.0 -> 5.5.0 + addons; secondary is stabilizing rendered width against scrollbar-driven ±1 col jitter; validate with a real repro.
- Keywords: xterm, workshop-terminal, rendering-artifact, box-drawing, reflow, fit-addon, pty, claude-code
- Use when: fixing terminal display corruption in the Workshop viewer.
- Skip when: working on the PTY backend lifecycle, non-terminal viewer surfaces, or the TUI app itself.
# Backlog
- none
- `item_508_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output`
