## req_279_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement - Reduce logics-manager workflow friction from flow-new flags to doc retirement
> From version: 2.13.0
> Schema version: 1.0
> Status: Draft
> Understanding: 95
> Confidence: 88
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Remove five concrete friction points that slow down day-to-day use of the `logics-manager` CLI, surfaced while driving a real corpus (the electrical-plan-editor project) end to end: create → groom → promote → merge → audit.
- Goal: a `flow new` / grooming loop where flags are honored, error hints actually work, doc retirement is a first-class action, and the audit headline is not misleading. Less surprise, fewer manual re-stamp round-trips.

# Context
Each item below was reproduced against the current code; file:line refer to this repo.

- **Subject 1 — `flow new request` silently ignores `--understanding/--confidence/--complexity/--theme`.** The request template hardcodes its indicator lines (`logics_manager/flow/__init__.py:1541-1545`: `> Understanding: 90%`, `> Confidence: 85%`, `> Complexity: Medium`, `> Theme: Operator workflow`), while the backlog/task template interpolates them from args (`:1611-1616`, e.g. `f"> Complexity: {getattr(args, 'complexity', 'Medium')}"`). Creating req_279 with `--title` only confirms it; passing the flags would change nothing.
- **Subject 2 — the lint auto-fix hint is broken.** On a body edit without an indicator bump, lint emits `modified without updating indicators: ... (fix: logics-manager sync update-indicators <stem>)` (`logics_manager/lint.py:558-561`). Running that exact command fails because `update_workflow_indicators_payload` requires at least one indicator value (`logics_manager/sync.py:655-656` → `At least one workflow indicator is required.`). Separately, a legitimate escape hatch exists — the `> Maintenance edit:` / `> Non-semantic edit:` markers (`logics_manager/lint.py:53-56`, checked at `:556`) — but the error never mentions it, so cosmetic edits are pushed into a false understanding/confidence re-stamp.
- **Subject 3 — no lifecycle verb to retire or fold a doc.** `flow` exposes new/promote/start/finish/closeout but no `withdraw`/`supersede`/`merge`. When two slices merge, the absorbed task stays `Ready` and keeps showing as active work in `logics-manager status`, and its open ACs keep generating traceability findings. The only workaround today is hand-written "MERGED INTO" banners, which `status`/`audit` cannot understand.
- **Subject 4 — the audit headline mixes stale and active docs.** `audit` prints a single `Blocking issues: N` count. The traceability classifier is actually correct (`logics_manager/audit.py:386-411`: `deferred = not any_task_done` → warning while a linked task is not yet Done; genuinely blocking only when a request has ACs but *no* linked task at all, `ac_no_linked_tasks` at `:782`). The problem is presentation: a couple of old, out-of-scope requests with no linked tasks dominate the headline, so an otherwise dev-ready active corpus reads as "21 blocking". There is no scoped/active view to answer "is the work I am grooming clean?".
- **Subject 5 — generated indicators use `90%` while hand-authored docs use `90`.** The generators emit a trailing `%` (`flow/__init__.py:1542-1543`, `:1612-1613`); many existing docs omit it. Lint accepts both, so the corpus drifts into mixed formats. Cosmetic, but it makes diffs and grep noisier.

# Decisions
- Subject 1: make the request template interpolate `status/understanding/confidence/complexity/theme` from args exactly like the backlog/task template, so `flow new request --theme X --confidence N` is honored. Remove the divergent hardcoded literals.
- Subject 2: change the lint hint to a runnable command (include a real flag, e.g. `--confidence <n>`) AND mention the `> Non-semantic edit:` marker as the alternative for cosmetic edits.
- Subject 3: add `flow withdraw <doc> --superseded-by <ref>` that sets the existing `Obsolete` status (already a closed state for request/backlog/task — `statuses.json` `closed: [Done, Obsolete, Archived, Settled]`) rather than inventing a new state, and records the supersede link. Confirm `status` and `audit` already treat `Obsolete` as non-active/non-blocking (closed set); if so the verb is mostly a guarded transition + link writer. (`Superseded` exists only for product/architecture, so don't add it to the work kinds.)
- Subject 4: add a scoped/active audit view (e.g. `audit --active` or a `dev-ready` summary) that reports blocking findings only for docs that are not terminal and in the requested scope, so the headline answers dev-readiness of the active set.
- Subject 5: normalize indicator percentage format at generation (pick `90%` everywhere, or strip the `%`) so generated and hand-authored docs agree; optionally normalize on `sync update-indicators`.

# Acceptance criteria
- AC1: `flow new request --understanding U --confidence C --complexity X --theme T` produces a request whose indicator lines reflect U/C/X/T (no hardcoded `90%`/`85%`/`Medium`/`Operator workflow`); parity with `flow new backlog`/`task`.
- AC2: The lint "modified without updating indicators" hint prints a command that succeeds as-is, and names the `> Non-semantic edit:` marker as the alternative; running the printed command on a drifted doc resolves the finding.
- AC3: `flow withdraw <doc> --superseded-by <ref>` sets a terminal status, drops the doc from `logics-manager status` active work, and stops its ACs from producing blocking traceability findings; the supersede link is recorded and lint stays green.
- AC4: An active/scoped audit view reports blocking issues only for in-scope, non-terminal docs, so a clean active corpus reports zero blocking even when stale out-of-scope docs have findings.
- AC5: Indicator percentage formatting is consistent between generated and hand-authored docs (single convention), and a regression test pins it.
- AC6: New/changed behavior is covered by tests under `tests/python/` and `lint --require-status` + `audit` stay green on this repo.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Scope
- In: the five fixes above to `flow` (request template + `withdraw`), `lint` (hint text), `sync` (format normalization), `audit` (scoped view), plus tests.
- Out: redesigning the indicator model or the audit severity semantics (the classifier is correct); migrating existing docs' `%` formatting in bulk (separate cleanup); viewer/MCP surfaces; changing status vocabulary beyond adding a terminal "withdrawn/superseded" state.

# Risks / Open questions
- RESOLVED — terminal status: reuse existing `Obsolete` (closed set for request/backlog/task in `statuses.json`); no new state needed. Verify the request→`Obsolete` transition is allowed in `statuses.py` transition rules and that `flow withdraw` records `> Superseded by:` link without tripping the "don't hand-edit links" rule (the verb writes it).
- Subject 4: decide the scoping mechanism (explicit `--active`/status filter vs a separate `dev-ready` command) so it composes with existing `--group-by-doc`/`--legacy-cutoff-version` flags.
- Subject 5: choosing to strip `%` vs keep `%` — keep `%` is the lower-churn choice since generators already emit it; verify lint/audit/sync parsers are tolerant either way before flipping.
- Subjects 1, 2, 5 touch generation/format paths with existing golden-file tests — update fixtures in the same change.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow/__init__.py:1541-1545` (request template, hardcoded indicators — Subject 1)
- `logics_manager/flow/__init__.py:1611-1616` (backlog/task template, args-driven indicators — Subject 1 reference impl)
- `logics_manager/lint.py:558-561` (broken auto-fix hint — Subject 2)
- `logics_manager/lint.py:53-56`, `:439-441`, `:556` (non-semantic edit markers — Subject 2)
- `logics_manager/sync.py:650-679` (`update_workflow_indicators_payload`, requires a flag — Subject 2)
- `logics_manager/flow/__init__.py` (no withdraw/supersede verb — Subject 3)
- `logics_manager/audit.py:386-411`, `:782`, `:913-931` (traceability classification + blocking headline — Subject 4)
- `logics_manager/statuses.py` / `logics_manager/statuses.json` (status transitions — Subject 3)

# AI Context
- Summary: Five CLI ergonomics fixes surfaced from real corpus use — honor flow-new request flags, make the lint fix hint runnable (and mention the non-semantic marker), add a doc-retirement verb, add a scoped/active audit view, and normalize indicator % formatting.
- Keywords: flow-new, indicators, lint-hint, non-semantic-edit, withdraw, supersede, audit-scoping, percentage-format
- Use when: implementing the CLI/workflow ergonomics fixes in flow/lint/sync/audit.
- Skip when: working on viewer/MCP surfaces or the indicator/severity model itself.
# Backlog
- none
- `item_506_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement`
