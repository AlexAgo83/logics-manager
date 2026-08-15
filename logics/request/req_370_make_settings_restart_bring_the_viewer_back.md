## req_370_make_settings_restart_bring_the_viewer_back - Make Settings' restart bring the viewer back
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: settings, restart, bring, viewer, back
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Needs
- As an operator pressing Restart in Settings, I need the viewer to come back on the address I am already looking at, not to disappear.
- As an operator, I need the viewer registry to stop advertising a viewer that is no longer there.

# Context
- `LogicsViewerServer.allow_reuse_address` was set to `False` on every platform, deliberately: `http.server` sets it to 1 unconditionally, and Winsock's SO_REUSEADDR is permissive enough that a second bind onto a port with a live listener succeeds silently on Windows -- confirmed on a real machine, where the collision test never raised at all. The comment recording that decision also names its price: it 'trades away instant-restart-after-crash convenience for the one-viewer-per-port guarantee'.
- That price turned out to include a button in the product. Settings' Restart re-execs the process, and the connection that carried the restart request is still in TIME_WAIT on that port, so the bind fails with EADDRINUSE and the new process exits. The viewer does not come back. Reproduced twice, on ports 8793 and 8794: the server answered 200, the restart was requested, and every request after it was refused, with `Port 879x on 127.0.0.1 is already in use` in the log.
- On POSIX, SO_REUSEADDR does not let a second process bind a port that has a live listener -- the guarantee the refusal was protecting does not depend on it there. The comment says so itself; only Windows needed the refusal.
- A viewer started with `--port 0` restarts onto a different port instead of dying -- measured 49842 becoming 49845 -- so a restart is never transparent today: it either kills the viewer or moves it.
- The registry keeps its claim when the process dies this way, so `~/.cache/logics-manager/viewers.json` goes on naming a port with nothing behind it. That file is what `view` reads to reuse a running viewer, and what an assistant reads to write a link, so a stale claim produces dead links and confusing reuse messages.
- Found while checking whether the short viewer links of req_369 survive a restart from Settings. They do not, and neither does the viewer.

# Acceptance criteria
- AC1: Restarting from Settings brings the viewer back on the same address, and a request made after the restart is answered.
- AC2: A second viewer on a port that already has a live listener is still refused, on POSIX and on Windows.
- AC3: A registry entry naming a viewer that is gone does not survive as a live claim.
- AC4: The restart behaviour is covered by a test that fails if the viewer stops coming back, rather than by a note.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_101_a_restart_that_comes_back`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_020_local_web_viewer_for_cli_driven_logics_work.md
- logics_manager/viewer.py
- logics_manager/viewer_registry.py
- tests/python/test_server_port_collisions.py

# Backlog
- `item_828_let_the_restart_rebind_its_own_port`
- `item_829_stop_the_registry_advertising_a_viewer_that_is_gone`
