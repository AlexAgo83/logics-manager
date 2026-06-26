## req_283_minimize_desktop_viewer_screens_to_a_bottom_left_dock - Minimize desktop viewer screens to a bottom-left dock
> From version: 2.13.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- A desktop viewer screen can be minimized to keep it at hand instead of closing it, and reopened later in the same state.
- Several screens can be minimized at once and reopened individually; screens stay unique (no multi-instance).
- Minimizing preserves the screen's live state, notably the Workshop terminal/PTY, rather than tearing it down.
- The affordance reuses the existing screen model (body-class full-page screens whose DOM persists) rather than introducing a draggable/resizable window manager.

# Context
- Viewer screens (document, workshop, project, activity) are mutually-exclusive full-page views switched by toggling a `viewer-screen-*` class on body; the screen DOM stays mounted across switches, so 'minimize = keep mounted + hide + show a pill' needs no new window system.
- Screens are already singletons, so minimize/restore does not introduce multi-instance.
- The Workshop hosts a live terminal/PTY; hiding the screen must not dispose terminals, and restore must re-fit the terminal (ties into the req_281 xterm re-measure work).
- The viewer already distinguishes desktop from LAN/read-only (viewer_lan.py), giving a clean gate for a desktop-only control.
- Out of scope: free repositioning/resizing, multi-instance, and persisting the dock across reloads — YAGNI until a real windowed desktop is wanted.

# Acceptance criteria
- AC1: On desktop, each minimizable screen header shows a minimize button positioned on the left immediately after the close button and before the other header buttons; the control is absent in LAN/mobile.
- AC2: Minimizing a screen hides it while keeping it mounted (state not destroyed) and shows a pill at the bottom-left carrying the screen title and a close button.
- AC3: Clicking a pill restores its screen; clicking the pill's close button kills (closes) that screen and removes the pill.
- AC4: Multiple screens can be minimized at once with their pills stacking upward from the bottom-left; screens remain unique (no multi-instance), with a documented behavior when the stack would overflow vertically.
- AC5: Live screen state is preserved while minimized — the Workshop terminal/PTY is not disposed — and on restore the terminal re-fits and renders cleanly with no leftover artifacts.
- AC6: The feature is desktop-only, existing screen switching and close behavior are unchanged, and the viewer smoke/render tests pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_032_minimizable_viewer_screens`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/browser-host.js` (screens are full-page views toggled by `viewer-screen-*` body classes; DOM stays mounted on switch, e.g. setDocumentChromeOpen :905)
- `clients/viewer/browser-host.js` (workshop terminal hosts / PTY lifecycle: ensureWorkshopTerminalHostFor, releaseWorkshopTerminalObserver, FitAddon re-measure)
- `logics_manager/viewer_lan.py` (desktop vs LAN/read-only distinction used to gate desktop-only affordances)
- req_281 / task_278 (xterm re-measure work the restore re-fit builds on)

# AI Context
- Summary: Minimize desktop viewer screens to a bottom-left dock
- Keywords: request-chain-scaffold, minimize desktop viewer screens to a bottom-left dock, development-ready
- Use when: You need to implement or review the scaffolded workflow for Minimize desktop viewer screens to a bottom-left dock.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_513_add_minimize_restore_screen_state_and_the_header_minimize_button`
- `item_514_build_the_bottom_left_minimized_dock_of_stacked_pills`
- `item_515_preserve_live_screen_state_across_minimize_and_re_fit_terminal_on_restore`
