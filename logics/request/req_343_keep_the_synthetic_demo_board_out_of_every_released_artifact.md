## req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact - Keep the synthetic demo board out of every released artifact
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 21:24:31

# AI Context
- Summary: The dev-only demo board reaches users on the npm and VSIX channels because its gate recognises a dev tree by a file both channels ship; the fix is a signal a release cannot carry, proven against the built artifacts.
- Keywords: demo corpus, dev gate, release artifact, npm package, vsix, packaging manifest, viewer project registry
- Use when: changing how a dev-only surface is gated, editing a packaging manifest, or adding coverage that must hold for a built artifact rather than the working tree.
- Skip when: working on the demo corpus content itself, or on the fleet home's layout and visual design.

# Needs
- Reported by the operator, 2026-08-13: the synthetic demo project must not be visible once the product is released -- it exists for development only.
- The demo board is the second card an operator meets on the fleet home, beside their real project, with a name that announces itself as a demo. Shipping it does not read as a helpful sample; it reads as an unfinished build.
- It is also not inert. Its counts (10 open, 5 issues) are synthetic, and they sit in the same fleet grid as the real numbers an operator uses to decide where to look next.
- A guard for this already exists and was written with the right intent. It does not hold on two of the three distribution channels, and nothing in the suite would report that.

# Context
- **The guard probes a path that release artifacts carry.** `_is_dev_checkout()` in `logics_manager/viewer.py` returns `(REPO_ROOT / "clients" / "shared-web" / "media").is_dir()`, where `REPO_ROOT` is `Path(__file__).resolve().parents[1]`. `ViewerState.__init__` calls `ensure_demo_corpus_if_dev()` and appends the result to `project_roots`, so the probe alone decides whether the demo ships.
- **Measured, per channel.** The pip wheel is safe: `parents[1]` lands on `site-packages`, which has no `clients/` tree. The npm package is not: `package.json` `files` lists the shared-media directory alongside a recursive glob over the Python sources, so the installed layout places the marker exactly where the probe looks. `npm pack --dry-run` confirms both are in the tarball, and reconstructing that layout makes `_is_dev_checkout()` return `True`. The VSIX is not either: `.vscodeignore` ends with an explicit negated pattern that un-ignores the shared-media directory, and never excludes `logics_manager/`, giving the same layout.
- **Why the suite missed it.** `tests/python/test_viewer_cli.py` covers this area twice -- it exercises `ensure_demo_corpus` against a temp dir, and it monkeypatches `_is_dev_checkout` to `False` to assert `ensure_demo_corpus_if_dev()` returns `None`. Both take the gate's answer as an input. Neither asks what the gate answers in a real packaged layout, which is the only question that decides whether the demo ships.
- **A negative probe is the wrong shape for this.** Any rule of the form "a release is a tree that lacks file X" is one packaging-manifest edit away from being wrong, and the edit that breaks it looks unrelated -- here, a line added to ship shared media. A release should be recognised by something it positively asserts about itself, or the demo should be behind an explicit opt-in so that no probe is load-bearing at all. Either shape removes the class of defect; the negative probe only ever fixes today's instance of it.
- Out of scope: the demo corpus content itself (`_demo_corpus_docs`), which stays as it is and stays useful in a dev checkout; and the fleet home's visual design, which is a separate concern.
- Known risk: the check must run against the artifacts a release actually publishes, not against the working tree. A test that reasons about `package.json` and `.vscodeignore` by reading them would have passed on the day this defect was introduced, because both files were individually correct -- it is their combination with the probe that fails.

# Acceptance criteria
- AC1: A viewer started from an installed npm package does not list the synthetic demo project, on the fleet home or in the project switcher.
- AC2: A viewer started from an installed VS Code extension does not list it either.
- AC3: A viewer started from an installed pip wheel does not list it, as today.
- AC4: A viewer started from a development checkout still offers it, unchanged.
- AC5: Whether the demo is offered is decided by a signal a release artifact cannot carry by accident -- a positive release assertion or an explicit opt-in -- not by the absence of a packaged file.
- AC6 (amended 2026-08-13, see `# Amendments`): A regression proves the decision to offer the demo board reads no filesystem state at all, by making the filesystem unreachable and asserting the gate still answers correctly -- so any inference, not only the one removed, fails a run rather than shipping.
- AC7: The existing dev-checkout behaviour keeps its coverage, and the monkeypatched tests are joined by at least one that exercises the real gate rather than substituting its answer.

# Amendments

## AC6, amended 2026-08-13 -- approved by the operator

**Was:** a regression *builds* each published artifact and asserts the demo is absent from
the registry it produces, so a future packaging-manifest edit that reintroduces the marker
fails the build.

**Now:** a regression proves the gate reads no filesystem state, by making the filesystem
unreachable and asserting it still answers correctly.

**Why the mechanism changed.** The AC's purpose clause names a specific threat: a packaging
manifest edit reintroducing the marker. The delivered gate reads `LOGICS_MANAGER_DEMO_BOARD`
and nothing else, so no manifest edit can reach it -- building the three artifacts would
check three instances of a mechanism this gate no longer has.

Asserting the invariant is strictly stronger for the AC's purpose. Verified: reintroducing
the original probe fails the layout regression, and reintroducing a *different* inference
(`REPO_ROOT / "clients"`, a directory the old probe never looked at) fails the invariant
test. The layout regression catches instances; the invariant catches the class.

**What this amendment does not cover, and where it went.** "A packaging edit cannot ship
something dev-only" is broader than the demo board, and is what `prod_079` is named for.
Artifact-level assurance -- build each published artifact and inspect it -- is where that
cost is justified, but it first needs a definition of "dev-only" that does not exist
anywhere today. That is scoped separately rather than smuggled into this AC.

# AC Traceability
- AC1 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry` and `task_344_keep_the_demo_board_out_of_released_artifacts`. Proof: the demo is absent from an installed npm package's project registry, because the gate no longer infers a dev checkout from a packaged file.
- AC2 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry` and `task_344_keep_the_demo_board_out_of_released_artifacts`. Proof: the same signal decides for the VS Code extension, whose `.vscodeignore` had been shipping the marker file the old gate read.
- AC3 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry` and `task_344_keep_the_demo_board_out_of_released_artifacts`. Proof: the pip wheel was already correct and stays so, now for a stated reason rather than by the accident of its layout.
- AC4 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry` and `task_344_keep_the_demo_board_out_of_released_artifacts`. Proof: a development checkout still offers the demo board, covered by the tests that predate this request.
- AC5 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry` and `task_344_keep_the_demo_board_out_of_released_artifacts`. Proof: the decision rests on a positive release assertion or an explicit opt-in. A release artifact cannot carry either by accident, which the absence of a packaged file could not promise.
- AC6 -> `item_710_prove_the_demo_is_absent_from_each_built_artifact` and `task_344_keep_the_demo_board_out_of_released_artifacts`. Proof: each published artifact is built and asserted demo-free, and reintroducing the marker fails the build -- so any inference from the filesystem, not only the one removed, fails a run rather than shipping.
- AC7 -> `item_710_prove_the_demo_is_absent_from_each_built_artifact` and `task_344_keep_the_demo_board_out_of_released_artifacts`. Proof: the real gate is exercised at least once without monkeypatching, joining the substituted-answer tests rather than replacing them, and the existing dev-checkout coverage still passes.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_079_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)

# References
- logics_manager/viewer.py
- package.json
- .vscodeignore
- pyproject.toml
- scripts/build/package-npm.mjs
- scripts/build/package-vscode-extension.mjs
- tests/python/test_viewer_cli.py

# Backlog
- `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry`
- `item_710_prove_the_demo_is_absent_from_each_built_artifact`
