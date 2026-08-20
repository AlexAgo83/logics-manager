## req_379_github_issue_22_release_contract_is_single_target_a_project_shipping_two_artefacts_cannot_be_modelled - GitHub issue #22: Release contract is single-target: a project shipping two artefacts cannot be modelled
> From version: 2.22.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: GitHub issue intake
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: github, issue, release, contract, single, target, project, shipping, two, artefacts, cannot, modelled
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Needs
- Release contract is single-target: a project shipping two artefacts cannot be modelled

# Context
- Untrusted source issue: https://github.com/AlexAgo83/logics-manager/issues/22
- ### Problem to solve

The release contract models one releasable artefact per project. A project that ships two — a front end and a server, a CLI and a library — cannot express that, and the gap is not cosmetic: it makes `release status` report a state that is true for one artefact and silent about the other.

Concretely, in a project (`cts`) that releases a dashboard to a PaaS and a self-hosted worker to a private host:

- `version_sources` names one path. The dashboard's version lives in `package.json`; the worker has no version of its own, so a worker release has nothing for `version_metadata` to read.
- `changelog.required` is global. The changelog gate exists to produce the in-app release note the dashboard renders. The worker has no interface and no reader for it, so the gate can only be satisfied by writing a file nobody opens.
- `git.tag_policy.pattern` is a single `v{version}`. Two trains need two prefixes, and the pattern is the natural place to declare them.
- The evidence ledger is single-target. This is the blocking one: `release evidence add` writes into a ledger currently holding the dashboard's `0.9.8` at `ready`. Recording worker evidence there would corrupt the state of an unrelated release, so worker proofs had to be kept outside the tool entirely.
- `release status` returns one state machine. With two artefacts it answers a question nobody asked.

What made this concrete: on 2026-08-20 the worker of that project was tagged and deployed **without passing a single one of the seven gates** — no version source, no changelog, no `release plan`, no `release validate`, no evidence. Not because anyone decided to skip the contract, but because there was nothing for a server release to be inside of. The contract's silence read as permission.

### Desired outcome

A contract that can declare more than one release target, so each artefact is released against gates that describe it.

The workaround built in the meantime is offered as evidence of the shape a real project needed, not as a proposed design:

- `logics/release/contract.json` grew a `targets` array — `id`, `tag_pattern`, `version_source`, `gates`, `gates_excluded` with a written reason per exclusion, `production_proof`, `runbook`. `logics-manager` ignores unknown keys, so this parses and changes nothing.
- Because the tool ignores it, enforcement had to be reimplemented locally: `worker/deploy/release.sh` reads its tag pattern from the contract, and `scripts/release-targets.test.mjs` reads both the contract and the CI workflow and fails when their tag prefixes disagree.
- A `targets_note` field records, in the contract itself, that the tool's state stays global and that the real rules live elsewhere.

That last point is the smell worth acting on: a project had to write down, inside the contract, that the contract is not what enforces it.

### Acceptance criteria

- AC1: A contract can declare N named release targets, each with its own version source and tag pattern.
- AC2: Each target declares which gates apply to it, and a gate excluded from a target carries a recorded reason — an omission should read as a decision, not an oversight.
- AC3: `release status` reports per-target state rather than one global state, and names the target each piece of evidence belongs to.
- AC4: `release evidence add` accepts a target, so evidence for one artefact cannot alter the state of another.
- AC5: `release plan <version>` and `release validate <version>` know which target's version they are planning.
- AC6: A single-target contract keeps working unchanged, with no migration required.
- AC7: An unknown or missing target in a command fails loudly rather than defaulting to the first one.

# Acceptance criteria
- AC1: The issue is triaged into a bounded Logics workflow before implementation.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow.py`
- `logics_manager/assist.py`
- `tests/python/test_logics_manager_cli.py`

# Backlog
- none

# Provenance
- Origin: `github`
- Actor: `AlexAgo83`
- External id: `#22`
- External issue: https://github.com/AlexAgo83/logics-manager/issues/22
- Approval: required before implementation starts.
