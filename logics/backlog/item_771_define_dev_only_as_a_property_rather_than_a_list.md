## item_771_define_dev_only_as_a_property_rather_than_a_list - Define dev-only as a property rather than a list
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 11:32:50

# AI Context
- Summary: No definition of dev-only exists anywhere in the repository; without one a check can only look for what somebody remembered, which is the weakness that let the demo board ship.
- Keywords: dev-only property, classification rule, not an enumeration, checkout unaffected
- Use when: Before writing any check that decides whether a file belongs in a release.
- Skip when: Building or inspecting artifacts, which depends on this answer.

# Problem
- No definition of dev-only exists anywhere in the repository. Without one, a check can only look for what somebody remembered -- the same weakness as the test that monkeypatched the gate's answer and so could not report what the gate actually said.

# Scope
- In:
  - Establish what makes a file dev-only as something evaluable against any file: where it lives, how it is produced, what it is for.
  - Record it where the check and a future contributor can both read it.
  - Confirm a development checkout is unaffected -- the definition classifies, it does not remove.
- Out:
  - Building or inspecting artifacts, which depends on this answer.

# Definition

Established 2026-08-14 from what the three artifacts actually carry, not from intuition.

**A file is dev-only when it exists to build, verify or document the construction of the
product, and no published entry point reads it at runtime.**

Both halves matter. "Not needed at runtime" alone would condemn `README.md`, `LICENSE` and
`CHANGELOG.md`, which are shipped deliberately. "Exists to build or verify" alone would
condemn a bundled output whose source is the build input. The property is the conjunction.

It is decided mechanically by these predicates, each a statement about where a file lives
or how it is produced -- never a list of remembered filenames:

| Predicate | Why it is dev-only |
| --- | --- |
| Under `tests/`, or named `*.test.*`, `*.spec.*`, `test_*.py`, `conftest.py` | Verifies the product; the product never reads it. |
| Under `scripts/`, except the published entry points `scripts/npm/` and `scripts/logics-manager.py` | Builds and checks the repository, not the product. |
| Under `logics/` | This repository's own corpus. A consumer's corpus lives in their repository; shipping ours would put our planning documents in their tree. |
| A build input whose built output is itself published -- `clients/*/src/**` when the bundle it produces is in the artifact | The artifact already carries the answer; the source is how the answer was made. |
| Working-copy metadata: `.github/`, `.claude/`, `.vscode/`, `.git*`, `.env*`, `tsconfig.json`, `vitest.config.*` | Configures the checkout, not the product. |
| Build and test residue: `coverage/`, `__pycache__/`, `.pytest_cache/`, `node_modules/`, `out/`, `debug/` | Produced by developing; carries no product behaviour. |

**What this is not.** It is not a rule that a released artifact must be minimal. A file that
is none of the above and merely looks unnecessary is not dev-only, and the check must not
report it -- a check that flags what it does not understand is the failure this exists to
prevent, and the reason `req_343` shipped in the first place.

**A development checkout is unaffected.** The definition classifies; it removes nothing.
`logics/` and `tests/` stay where they are, and the classifier is only ever pointed at the
contents of a built artifact.

**How it answers the original defect.** The demo board shipped because `_is_dev_checkout()`
inferred "development" from `clients/shared-web/media/` being present -- and that directory
is deliberately published, so the inference was reading a product file as a development
signal. Under this definition that directory is not dev-only, and the fixed gate reads an
environment variable instead, which no artifact can carry.

# Acceptance criteria
- AC1: Dev-only is a property that can be evaluated against any file.
- AC6: A development checkout is unaffected.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Dev-only is a property that can be evaluated against any file.
- request-AC6 -> This backlog slice. Proof: AC6: A development checkout is unaffected.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_089_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
- Request: `req_353_prove_a_published_artifact_contains_only_the_product`
- Primary task(s): `task_350_deliver_the_released_artifact_content_check`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_350_deliver_the_released_artifact_content_check`

# Notes
- Task `task_350_deliver_the_released_artifact_content_check` was finished via `logics-manager flow finish task` on 2026-08-14.
