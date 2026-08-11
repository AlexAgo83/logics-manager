## req_340_close_the_three_trust_gaps_the_2_21_7_cycle_exposed - Close the three trust gaps the 2.21.7 cycle exposed
> From version: 2.21.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Tooling trust
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Three gaps found by driving one release through this workflow: a runtime one version behind reporting a corpus as clean, a guard that only exists in CI, and a request criterion no linked document accounts for.
- Keywords: runtime-drift, git-hooks, ac-coverage, tooling-trust, developer-loop
- Use when: Changing what a command reports about its own runtime, where a guard runs, or how criteria coverage is checked.
- Skip when: The work concerns how proof is matched or worded, rather than whether the tool is telling the truth about itself.

# Needs
- Every finding here came from one release cycle driving this workflow end to end on 2026-08-11, not from a review of what might go wrong. Each one cost real time or produced a real false result.
- The severe one manufactures false confidence rather than merely getting in the way: `logics-manager audit` answered `0 blocking` from a bundled runtime one version behind the working tree. A wrong measurement was taken from that answer and written into a request as acceptance proof. It was caught only by re-running through `python3 -m logics_manager`, which reported 4 blocking findings and 234 warnings for the same corpus. Nothing anywhere said the two disagreed.
- The second wastes a round trip: `scripts/check_function_length.py` runs in CI and from no local entry point, so a function that grows past its ledger entry is discovered after the push. `check:line-budget` sits inside `npm run lint` and is reachable; this one is not.
- The third lets a chain drift silently: `item_695` carried five acceptance criteria while its request carried six, because the request gained one during grooming and the item never learned of it. Nothing reported the gap until closeout, where it surfaced as a blocking finding at the worst moment.

# Context
- **Version drift.** `logics_manager/doctor.py` checks schema versions inside documents and never compares its own runtime version against the repository it is inspecting. `logics-manager` resolves to a bundled npm install; a repository at 2.21.7 audited by a 2.21.6 runtime is silently a different tool. The failure is one-sided and that is what makes it dangerous: the stale runtime reports *fewer* findings, so the corpus looks healthier than it is and the operator has no reason to look twice.
- The comparison is cheap and already available: the runtime knows its own version and the repository has `VERSION` at its root. Only reporting is missing.
- **Dead hook configuration compounds it.** `package.json` still runs `git config core.hooksPath .githooks` on every install, via both `prepare` and `setup-hooks`, but `.githooks/` was deleted in 0038628b (item_521, 2026-06-27). Every clone is therefore pointed at a directory that does not exist, so no hook runs and nothing says so. Whatever local gate might have caught the function-length growth cannot exist while this is true.
- **AC drift.** The audit carries `ac_no_linked_backlog` and `ac_no_linked_tasks` but nothing compares the *set* of criteria a request declares against the set its linked items and tasks account for. A criterion added to a request after its chain was scaffolded is invisible until a closeout gate demands proof for it.
- Out of scope: changing how proof is matched or reported, retrofitting existing documents, and reinstating the mirror-sync tooling that was deliberately retired with `.githooks`.
- Known risk: a version-drift check that blocks would make every slightly-stale install unusable, including legitimate ones. It has to inform, not gate.

# Acceptance criteria
- AC1: When the runtime's own version differs from the repository's `VERSION`, every command that reports on the corpus says so once, naming both versions and how to update.
- AC2: The drift notice never blocks and never changes an exit code, so a deliberately pinned runtime stays usable.
- AC3: `scripts/check_function_length.py` is reachable from a local npm script, alongside the other guards, and that script is named in the contributing docs.
- AC4: `core.hooksPath` is no longer configured to a path that does not exist: either the hooks directory is restored with the guards it should run, or the configuration is removed.
- AC5: A request criterion that no linked backlog item or task accounts for is reported before closeout, naming the criterion and the documents that were checked.
- AC6: That criterion-coverage finding is a warning that cannot block lint or audit, and stays silent on a chain whose coverage is complete.
- AC7: Tests cover a matching and a mismatching runtime version, a local invocation of the function-length guard, the hooks-path configuration, and a chain with one uncovered criterion against one fully covered.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_076_tooling_that_tells_the_truth_about_itself`
- Architecture decision(s): (none yet)

# References
- logics_manager/doctor.py
- scripts/check_function_length.py
- logics_manager/audit.py
- package.json

# Backlog
- `item_701_report_a_runtime_that_disagrees_with_the_repository_it_audits`
- `item_702_make_every_guard_reachable_before_the_push`
- `item_703_report_a_request_criterion_no_linked_document_accounts_for`
