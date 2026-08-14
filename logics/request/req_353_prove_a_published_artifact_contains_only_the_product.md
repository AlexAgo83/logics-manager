## req_353_prove_a_published_artifact_contains_only_the_product - Prove a published artifact contains only the product
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Split out of req_343 when its AC6 was amended: the demo board no longer needs an artifact check, but nothing defines dev-only and nothing inspects what a published artifact actually contains.
- Keywords: dev-only definition, published artifact, npm package, vsix, pip wheel, build and inspect, release hook, prod_079
- Use when: Defining what makes a file dev-only, or checking the contents of a published artifact.
- Skip when: The demo board, closed under req_343, and what any channel ships.

# Needs
- Split out of `logics/request/req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact.md` on 2026-08-13, when its AC6 was amended with the operator's approval.
- That AC asked for a regression that builds each published artifact and inspects it. The demo board no longer needs one -- its gate reads an environment variable and nothing else, so no packaging change can reach it, and an invariant test proves that more strongly than three build-and-inspect cases would.
- But the need the AC expressed is real and larger than the demo board. `prod_079` is called "A release that contains only the product", and nothing today checks that a published artifact contains only the product.
- Scoping it separately rather than smuggling it into an AC it outgrew is the point of this request.

# Context
- **The demo board was one instance of a class nobody has named.** It shipped because a development affordance was gated on something a release artifact happened to carry. The fix removed that specific inference. Nothing prevents the next dev-only affordance from being added with its own inference, and nothing would report it.
- **There is no definition of "dev-only" anywhere in the repository.** That is the first piece of work, and it is not a formality: without it, a check can only look for the things somebody remembered, which is the same weakness the old test had when it monkeypatched the gate's answer.
- **The channels differ in what they ship, which is why an artifact-level check is worth its cost.** `package.json` `files` and `.vscodeignore` were each individually correct on the day the demo board shipped -- the defect was in their combination with a probe. A check that reads the manifests would have passed. Only a check that inspects what was actually built would have caught it.
- **Measured, so the cost is not guessed at:** `npm pack --dry-run` completes in about one second, `vsce` is already a local dependency, and `python -m build` is available. Building the three artifacts is cheap; installing and running each is the part that needs a decision about where it belongs -- every commit, every release, or on demand.
- Out of scope: the demo board itself, delivered and closed under `req_343`; and any change to what the three channels ship. This request checks what is shipped, it does not decide it.
- Known risk: a check that inspects artifacts can only assert what it was told to look for. If the definition of dev-only stays a list of known offenders, this becomes a list nobody maintains. The definition should be a property of the file -- where it lives, how it is produced -- rather than an enumeration.
- Known risk: whichever build hook this lands in must not make a release slower to cut than the team will tolerate, or it will be skipped with `--no-verify` and stop protecting anything.

# Acceptance criteria
- AC1: What makes a file dev-only is defined as a property that can be evaluated against any file, rather than as a list of the files somebody remembered.
- AC2: Each published artifact -- the npm package, the VS Code extension and the pip wheel -- is built and inspected against that definition.
- AC3: An artifact containing something dev-only fails the check, naming the file and why it was judged dev-only.
- AC4: The check runs where a release cannot be cut without it, and its cost is stated so the choice of hook is deliberate rather than inherited.
- AC5: The check is proven load-bearing by reintroducing a dev-only file into an artifact and observing the failure, not by assuming it would.
- AC6: A development checkout is unaffected: the definition classifies files, it does not remove them.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_089_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)

# References
- package.json
- .vscodeignore
- pyproject.toml
- scripts/build/package-npm.mjs
- scripts/build/package-vscode-extension.mjs
- scripts/ci-check.mjs
- logics_manager/viewer.py
- tests/python/test_viewer_cli.py
- logics/request/req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact.md

# Backlog
- `item_771_define_dev_only_as_a_property_rather_than_a_list`
- `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`
- `item_773_put_the_check_where_a_release_cannot_skip_it`
