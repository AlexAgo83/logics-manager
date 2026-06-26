## task_278_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output - Fix Workshop terminal rendering artifacts on heavy TUI output
> From version: 2.13.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95
> Confidence: 86
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] **Repro first (AC5)** — capture the artifact: run Claude Code (or any wide box-drawing table) in the Workshop terminal, resize the pane, confirm the right border leaks into text. Note the pane cols.
- [ ] **Primary — bump xterm (AC1/AC4)** — replace vendored `clients/shared-web/media/vendor/xterm/{xterm.js,xterm.css,xterm-addon-fit.js,xterm-addon-web-links.js}` with 5.5.0 + matching addons; update `PROVENANCE.md` versions and curl URLs. Verify the global still resolves (`browser-host.js:6365` guards `window.FitAddon` / `.FitAddon`); adjust the loader if the `@xterm/*` rename changed the global.
- [ ] **Re-test (AC1/AC2)** — repeat the repro; borders aligned, resize no longer corrupts printed tables.
- [ ] **Cheap co-fixes (test with the bump)** — set `convertEol: false` (`browser-host.js:6363`); ensure a `fit()`/`refresh()` re-measure runs after `document.fonts.ready` so the first frame isn't measured with the fallback font.
- [ ] **Secondary if still broken (AC3)** — stabilize rendered width: reserve a scrollbar gutter / fix the terminal host content width so FitAddon does not oscillate cols by ±1.
- [ ] **Smoke (AC4)** — input, resize, web-links, PTY lifecycle unchanged for normal CLIs.
- [ ] Validation: `lint --require-status` green; manual Workshop terminal smoke documented.

# Backlog
- `item_508_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output`

# Acceptance criteria
- AC1: With the updated terminal, a heavy TUI (Claude Code) printing a wide box-drawing table renders with borders aligned — no `┤`/`┐` leaking into cell text — at the default pane size.
- AC2: Resizing the terminal pane while such output is on screen does not corrupt already-printed tables (reflow stays consistent); a full redraw restores a clean frame.
- AC3: The scrollbar appearing/disappearing does not change the effective column count in a way that breaks in-flight table borders (width is stable or the gutter is reserved).
- AC4: Existing terminal behavior is unchanged for normal CLIs (no regression in input, resize, links, or PTY lifecycle); `PROVENANCE.md` is updated to the new pinned versions.
- AC5: A documented manual repro (or lightweight check) demonstrates the artifact before and its absence after.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_278_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement fix workshop terminal rendering artifacts on heavy tui output.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_281_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
