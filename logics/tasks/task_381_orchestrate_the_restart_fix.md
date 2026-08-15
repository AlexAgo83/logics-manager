## task_381_orchestrate_the_restart_fix - Orchestrate the restart fix
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: orchestrate, restart, fix
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Reproduce the failure first and record the ports it was reproduced on, so the fix is measured against an observation rather than a theory.
- [x] 2. Allow the rebind where it is safe, and prove the collision guarantee still holds.
- [x] 3. Establish what the registry already does with a dead claim before writing anything to fix it.
- [x] 4. Verify by restarting a running viewer over HTTP, not by reading the socket options.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_828_let_the_restart_rebind_its_own_port`
- `item_829_stop_the_registry_advertising_a_viewer_that_is_gone`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_828_let_the_restart_rebind_its_own_port`. Proof: measured over HTTP on a viewer bound to a fixed port -- before, `up:200` then `after-restart:000` with `Port 8794 on 127.0.0.1 is already in use` in the log; after, `up:200` then `after-restart:200` on the same address.
- request-AC2 -> This task, via `item_828_let_the_restart_rebind_its_own_port`. Proof: starting a second viewer on port 8795 while the first was live still exited with the same "already in use" message, and the first kept answering 200. `allow_reuse_address` is now `os.name != "nt"`, so Windows keeps the refusal the original decision was made for -- on POSIX SO_REUSEADDR never allowed binding a port with a live listener, which is what the existing collision test asserts and it passes unchanged.
- request-AC3 -> This task, via `item_829_stop_the_registry_advertising_a_viewer_that_is_gone`. Proof: checked before changing anything -- `claim_or_reuse` probes, and its startup grace loop waits for an answer rather than assuming one, so a claim it cannot reach is never returned as live. This slice is the case that fails if that stops being true, not a fix.
- request-AC4 -> This task, via both slices. Proof: `tests/python/test_server_port_collisions.py` rebinds a port a viewer just released, and `tests/python/test_viewer_registry.py` registers a claim, takes its viewer away, and asserts the next claim rebinds rather than reusing.

# Validation
- 188 cases across `test_viewer_cli.py`, `test_server_port_collisions.py` and `test_viewer_registry.py`.
- The restart itself verified by restarting a running viewer over HTTP, not by reading socket options.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- The cause was a decision, not an oversight: `allow_reuse_address = False` was set deliberately, on a real Windows finding, and its own comment named the price -- "trades away instant-restart-after-crash convenience for the one-viewer-per-port guarantee". What nobody noticed is that the price included a button in the product.
- The guarantee never depended on the refusal outside Windows, which the same comment says. Narrowing it to Windows costs the guarantee nothing and gives the restart back.
- Not fixed, and out of scope by decision: a viewer started with `--port 0` still restarts onto a different port -- 49842 became 49845 in measurement. It asked for any free port and that is what it gets; a link written before such a restart is dead, and the registry is how it is rewritten.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_828_let_the_restart_rebind_its_own_port`, `item_829_stop_the_registry_advertising_a_viewer_that_is_gone`
- Related request(s): `req_370_make_settings_restart_bring_the_viewer_back`

# Links
- Request: `req_370_make_settings_restart_bring_the_viewer_back`
- Product brief(s): `prod_101_a_restart_that_comes_back`
- Architecture decision(s): (none yet)
