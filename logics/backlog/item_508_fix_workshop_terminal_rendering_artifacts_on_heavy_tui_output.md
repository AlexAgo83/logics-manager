## item_508_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output - Fix Workshop terminal rendering artifacts on heavy TUI output
> From version: 2.13.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Stop the rendering artifacts in the Workshop in-app terminal when a heavy TUI (notably Claude Code) prints wide box-drawing tables: the table's right border leaks into the cell text (`┤`/`┐` mid-line) and columns desync.
Goal: the embedded terminal renders full-screen redrawing TUIs cleanly, the way an external terminal does. Lighter CLIs are fine today; the failure is specific to heavy redraw + wide content.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: With the updated terminal, a heavy TUI (Claude Code) printing a wide box-drawing table renders with borders aligned — no `┤`/`┐` leaking into cell text — at the default pane size.
- AC2: Resizing the terminal pane while such output is on screen does not corrupt already-printed tables (reflow stays consistent); a full redraw restores a clean frame.
- AC3: The scrollbar appearing/disappearing does not change the effective column count in a way that breaks in-flight table borders (width is stable or the gutter is reserved).
- AC4: Existing terminal behavior is unchanged for normal CLIs (no regression in input, resize, links, or PTY lifecycle); `PROVENANCE.md` is updated to the new pinned versions.
- AC5: A documented manual repro (or lightweight check) demonstrates the artifact before and its absence after.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: With the updated terminal, a heavy TUI (Claude Code) printing a wide box-drawing table renders with borders aligned — no `┤`/`┐` leaking into cell text — at the default pane size.
- request-AC2 -> This backlog slice. Proof: AC2: Resizing the terminal pane while such output is on screen does not corrupt already-printed tables (reflow stays consistent); a full redraw restores a clean frame.
- request-AC3 -> This backlog slice. Proof: AC3: The scrollbar appearing/disappearing does not change the effective column count in a way that breaks in-flight table borders (width is stable or the gutter is reserved).
- request-AC4 -> This backlog slice. Proof: AC4: Existing terminal behavior is unchanged for normal CLIs (no regression in input, resize, links, or PTY lifecycle); `PROVENANCE.md` is updated to the new pinned versions.
- request-AC5 -> This backlog slice. Proof: AC5: A documented manual repro (or lightweight check) demonstrates the artifact before and its absence after.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_281_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Fix Workshop terminal rendering artifacts on heavy TUI output
- Keywords: backlog-groom, request, fix workshop terminal rendering artifacts on heavy tui output, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Fix Workshop terminal rendering artifacts on heavy TUI output.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_281_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_281_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output.md`.
- Generated locally by logics-manager.

# Tasks
- `task_278_fix_workshop_terminal_rendering_artifacts_on_heavy_tui_output`
