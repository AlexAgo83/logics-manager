# prod_048 — field answers, session of 2026-08-01

Answers to the grooming questions raised while turning `prod_048` into a dev-ready
corpus. Written by the agent that produced the original brief, from its own
session record rather than from memory where the data was recoverable.

Source project: `cts` (recruiting dashboard), `logics-manager 2.19.5`.
Repository path at time of writing: `/Users/alexandreagostini/Documents/cts`, branch `main`.

Notation: `LOGICS_SLASH` stands for the `logics/` path prefix wherever a literal
reference would otherwise be resolved by the audit. See finding 13.

---

## 1. [BLOCKING] Finding 4 — repairs that repair nothing

Invocations, in the order they were run:

```
logics-manager flow repair ac-traceability --dry-run
→ error: the following arguments are required: source

logics-manager flow repair mermaid --dry-run
→ error: the following arguments are required: --refs

logics-manager flow repair ac-traceability task_034_coordinate_candidate_and_pipeline_ux_review_remediation --dry-run
→ Source not found: task_034_coordinate_candidate_and_pipeline_ux_review_remediation

logics-manager flow repair mermaid --refs prod_033_recruiting_dashboard_candidate_and_pipeline_usability --dry-run
→ Workflow source not found: prod_033_recruiting_dashboard_candidate_and_pipeline_usability

logics-manager flow repair ac-traceability LOGICS_SLASH/tasks/task_034_coordinate_candidate_and_pipeline_ux_review_remediation.md --dry-run
→ Expected source under `LOGICS_SLASH/request`. Got: `LOGICS_SLASH/tasks/task_034_coordinate_candidate_and_pipeline_ux_review_remediation.md`.

logics-manager flow repair mermaid --refs LOGICS_SLASH/product/prod_033_recruiting_dashboard_candidate_and_pipeline_usability.md --dry-run
→ Workflow source not found: LOGICS_SLASH/product/prod_033_recruiting_dashboard_candidate_and_pipeline_usability.md

logics-manager flow repair ac-traceability LOGICS_SLASH/request/req_032_candidate_and_pipeline_ux_review_remediation.md --dry-run
→ Repair ac-traceability: would change 0 file(s).

logics-manager flow repair mermaid --refs req_032_candidate_and_pipeline_ux_review_remediation --dry-run
→ Repair mermaid: would change 0 file(s).
```

Audit output that named the warnings:

```
Workflow audit: OK (warnings)
Workflow docs inspected: 197
Blocking issues: 0; warnings: 4; strict-only findings: 0
- LOGICS_SLASH/product/prod_030_recruiting_assistant_code_review_remediation.md: WARNING: [companion_doc_missing_mermaid] companion doc is missing its overview Mermaid diagram
- LOGICS_SLASH/product/prod_031_recruiting_dashboard_candidate_list_and_pipeline_reliability.md: WARNING: [companion_doc_missing_mermaid] companion doc is missing its overview Mermaid diagram
- LOGICS_SLASH/product/prod_032_recruiting_assistant_security_posture.md: WARNING: [companion_doc_missing_mermaid] companion doc is missing its overview Mermaid diagram
- LOGICS_SLASH/product/prod_033_recruiting_dashboard_candidate_and_pipeline_usability.md: WARNING: [companion_doc_missing_mermaid] companion doc is missing its overview Mermaid diagram
```

**Kinds targeted.** Mermaid: four **product briefs** (companions), plus an
**architecture** doc that appeared later as a fifth warning. AC traceability:
four **tasks**. Both commands accept only a **request**, and the
`would change 0 file(s)` corresponds to a request whose *tasks* carry the
boilerplate — so "nothing to do" on the request, while the finding lives on the
task.

This may be a misreading of the intended scope of these commands on my side, and
it is uncertainty #1 in the brief. Either way, the audit reports a finding that
no command fixes.

---

## 2. [BLOCKING] Finding 5 — the six literal reference strings

```
req_030_candidate_list_and_pipeline_p0_interaction_fixes
task_034_coordinate_candidate_and_pipeline_ux_review_remediation
prod_033_recruiting_dashboard_candidate_and_pipeline_usability
LOGICS_SLASH/tasks/task_034_coordinate_candidate_and_pipeline_ux_review_remediation.md
LOGICS_SLASH/product/prod_033_recruiting_dashboard_candidate_and_pipeline_usability.md
LOGICS_SLASH/request/req_032_candidate_and_pipeline_ux_review_remediation.md
```

| Command | Form | Result |
| --- | --- | --- |
| `flow validate` | bare request ref | OK |
| `sync update-indicators` | bare task ref | OK |
| `flow repair ac-traceability` | bare task ref | `Source not found` |
| `flow repair ac-traceability` | task file path | `Expected source under LOGICS_SLASH/request` |
| `flow repair mermaid --refs` | bare product-brief ref | `Workflow source not found` |
| `flow repair mermaid --refs` | product-brief file path | `Workflow source not found` |

Priority test case: **the same document produces two different messages depending
on whether a bare ref or a path is passed.** The bare ref says "does not exist"
(false); the path says "wrong kind" (true).

---

## 3. [BLOCKING] Finding 10 — closeout, the input/output pair

`# Validation` as generated (commit `44d13af`):

```
# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
```

Full command, using the flag the preflight itself suggested:

```
logics-manager flow closeout task_032_coordinate_candidate_list_and_pipeline_p0_fixes \
  --validation "npm test passed (26 assertions, 0 failures); npm run lint passed; npm run check:size passed; npm run build passed; npm run a11y passed; drag states verified by scripts/capture-drag-states.mjs (is-target, is-blocked, is-dragging observed and cleared after Escape-cancel)" \
  --index --lint --audit
```

Full output:

```
Closeout: FAILED for LOGICS_SLASH/tasks/task_032_coordinate_candidate_list_and_pipeline_p0_fixes.md
- changed files: 0
- preflight issues:
  - validation_evidence_missing: `# Validation` has no concrete passing validation evidence (LOGICS_SLASH/tasks/task_032_coordinate_candidate_list_and_pipeline_p0_fixes.md)
```

What unblocked it: rewriting the section by hand in the past tense, then re-running
`flow closeout` **without** `--validation`.

`# Validation` after the successful closeout (commit `2e46070`):

```
# Validation
- `npm test` passed on 2026-08-01: 26 assertions, 0 failures, including the new `shouldResetPage` and `clampPage` cases.
- `npm run lint` passed on 2026-08-01 across `dashboard/` and `scripts/`.
- `npm run check:size` passed on 2026-08-01.
- `npm run build` passed on 2026-08-01.
- `npm run a11y` passed on 2026-08-01 (end-to-end suite, no accessibility violations).
- Drag feedback passed visual verification on 2026-08-01 through `scripts/capture-drag-states.mjs`: `column is-target` on an accepting column, `column is-blocked` on the candidate's own column, `candidate is-dragging` on the dragged card, and every class cleared after an Escape-cancelled drag.
- `logics-manager lint` and `logics-manager audit` passed on 2026-08-01 with 0 blocking issues and 0 warnings.
- Finish workflow executed on 2026-08-01.
- Linked backlog/request close verification passed.
```

**The observation that most affects the spec:** the last two lines were **appended
by the successful closeout itself**. So the writer into `# Validation` exists and
works. The problem is **execution order** — the preflight runs before the writer
and rejects, so the flag cannot satisfy a gate that prevents the flag from running.
This is not "the flag does not write", it is "the gate sits upstream of the writer".

---

## 4. Finding 14 — dropped milestones

Verbatim headings:

```
## 0.9.1 - Lot 3: Candidate list and pipeline P0 fixes
## 0.9.2 - Lot 4: Code review remediation and structural headroom
## 0.9.3 - Lot 5: Candidate and pipeline UX remediation
## 0.9.S - Lot S: Security posture (parallel track)
```

Output:

```
Roadmap validation: OK
- path: LOGICS_SLASH/roadmap/road_002_active_corpus_delivery_roadmap.md
- milestones: 3
```

`OK`, no warning, no mention of the ignored heading. After renaming to `0.9.4`:
`milestones: 4`.

---

## 5. Finding 2 — companion invocation

```
logics-manager flow companion architecture \
  --title "Pipeline triage model for the New stage" \
  --request-ref req_032_candidate_and_pipeline_ux_review_remediation
```

**`--request-ref` only.** No backlog or task ref. The generated doc did carry that
link correctly into its `# References` — the wiring works; only the body is foreign.

---

## 6. [BLOCKING] Finding 1 — generated / rewritten pair

`task_034` as generated, commit `903b1d5`:

```
# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.
```

Rewritten by hand, commit `565c5c0`:

```
# AC Traceability
- request-AC1, request-AC2 -> `item_124`. Proof: unassigned-count unit test, plus a screenshot of one page showing uniform row heights.
- request-AC3, request-AC4 -> `item_125`. Proof: filter bar screenshots with and without active filters, at desktop and mobile.
- request-AC5, request-AC6 -> `item_126`. Proof: pipeline card screenshots at rest, on hover, on keyboard focus, and on a touch emulation, plus cards with and without a project score.
- request-AC7 -> `item_127`. Proof: board screenshots showing the overflow affordance and a collapsed column, and a drag interaction still working afterwards.
- request-AC8, request-AC9, request-AC10 -> `item_128`. Proof: dossier screenshots at desktop and mobile, in normal and confidential mode.
- request-AC11 -> `item_129`. Proof: upload modal screenshot before file selection and after, and the stated limits matching the validation helper.
- request-AC12, request-AC13 -> `item_130`. Proof: 390px screenshots of the candidate list and pipeline captured by `scripts/capture-screens.mjs`.
- request-AC14 -> This task. Proof: npm test, lint, check:size, build, a11y output, and updated `docs/rh-recruit-dashboard.md`.
```

**Key point for the generator:** this whole mapping was **already in the scaffold
input**, under `backlog_items[].request_acs`. I re-derived it by hand while the data
was sitting in the file. `item_124` declared `["AC1","AC2","AC14"]`, and so on for
every slice.

Re-deriving it is also what surfaced **two real coverage holes**: `req_029` AC9 and
`req_031` **AC7** were claimed by no backlog item — AC7 being the operator-only
proofs that no agent can produce. A generator that builds traceability from
`request_acs` could report "AC7 is claimed by no item" at scaffold time. That is the
highest-value item in the lot.

---

## 7. `# Validation` seeding — option (a), with a nuance

**(a) empty section**, but not literally empty: one obviously-not-evidence line such
as `- (no validation recorded yet)`. A truly empty section reads as "nothing to
validate", and the `validation_evidence_missing` gate needs something to reject.

(b) is tempting but redundant: if finding 10 is fixed, closeout fills the section at
the right moment with real facts. (c) is a feature and out of scope here.

---

## 8. Finding 2 — neutral prompts, not empty

`- (decision to document)`. Two reasons: an empty section may be swallowed by a
parser or read as broken, and more importantly the prompt must be **impossible to
mistake for content**. That is exactly what failed — the generated text was
plausible, so it was not detected as a placeholder.

---

## 9. `--touch` — signature only

**Refresh the signature without touching values.** The entire problem in finding 8 is
that the values become false; a re-baseline that changes them recreates the defect
under another name. `--touch` should mean "I edited the body, my level of
understanding did not change", which is the honest case most of the time.

---

## 10. [BLOCKING] Ranking by time actually lost

Different from the severity order in the brief.

| Rank | Finding | Real cost |
| --- | --- | --- |
| 1 | **1** — task boilerplate | Four tasks rewritten plus mapping re-derivation on two corpora I did not author. By far the largest single cost. |
| 2 | **10** — closeout | Four attempts, each needing diagnosis. Expensive because the documented repair **points at the wrong fix**. |
| 3 | **7 + 8** — indicator gate | ~8 occurrences over the session, two commands each. A permanent tax. |
| 4 | **13** — citing a reference | Three audit failures while writing the brief, each requiring a hunt for the offending token. The fenced-code-block case was genuinely surprising. |
| 5 | **5** — reference resolution | Six attempts across two commands. |
| 6 | **4** — inert repairs | Four invocations, then abandonment. |
| 7 | **3** — Drivers | One lint failure, one-line fix. |
| 8 | **2** — foreign ADR body | Detected immediately, marginal extra cost (the ADR had to be written anyway). |
| 9 | **6, 9, 11, 12, 14** | Seconds each. |

**The inversion worth acting on:** findings 6 (dry-run) and 14 (dropped milestone)
cost almost nothing but carry the **highest latent risk** — I only caught both
because I double-checked out of caution. A agent in a hurry misses both. Do not
prioritise those two by time lost.

---

## 11. Hard blocks versus quick workarounds

**Hard blocks** — could not proceed without resolving:

- **10**: could not close the task until I guessed the expected shape.
- **7**: lint red on the roadmap with no honest exit.
- **3**: lint red the moment the ADR was created.

**Worked around in minutes**: 4, 5, 6, 9, 11, 12, 14.

**Neither**: 1 and 2 — never blocking, just heavily expensive in rewriting.

---

## 12. `doctor` — separate request

Separate. It is the only feature in the brief; bundling it would delay corrections
that pay off immediately. Its value also depends on the corrections: if vocabularies
are surfaced in errors and repairs actually work, `doctor` becomes less necessary.
Decide after.

---

## 13. Finding 13 — split in two

**In this lot**: stop resolving references inside fenced code blocks and inline
code. That is not a design decision, it is a parser fix — a reference inside a code
block is text, not a link.

**Deferred**: an escape syntax for citing a reference in prose. That needs design,
and the parser fix already covers about 90% of the real need.

---

## 14. Regression versus never-worked — unknown

I only ever used **2.19.5**, in a single session. I have no basis for comparison and
would rather say so than mislead the tests.

Suggestion: `git log` on the scaffold templates and on the closeout preflight module
will settle it faster than my intuition. My subjective impression, with no evidential
weight: findings 1, 2 and 3 feel like "never worked" (frozen boilerplate), while 10
feels like an ordering regression between a gate and a writer.

---

## 15. Things encountered and not written up

- **`flow start` modifies more than the named doc.** It also touched the three linked
  backlog items. Possibly intended, but not announced in the output.
- **`logics-manager index` always prints `Wrote LOGICS_SLASH/INDEX.md`**, even when
  nothing changed. No way to tell whether it did anything.
- **`flow progress task --progress 100%`** lists changed files but never confirms the
  resulting value.
- **The scaffold input accepts `priority` on backlog items**, which is absent from the
  documented key list in the `corpus` skill. I included it because I was mirroring an
  existing file.
- **The `corpus` skill documents the `context_pack.profile` enum but not the
  `complexity` enum.** I passed `Small` and was rejected on the first dry-run.
- **`flow companion architecture --dry-run` prints the full document body** — which is
  genuinely useful — but combined with the trailing `Created`, it reads as a report of
  something written.

---

## 16. Repository access and useful commits

`/Users/alexandreagostini/Documents/cts`, branch `main`.

| Commit | Contents |
| --- | --- |
| `44d13af` | scaffold of `req_030` — tasks in generated state |
| `903b1d5` | scaffold of `req_032` — same, seven items |
| `565c5c0` | my rewrites of the four tasks, plus `adr_002` |
| `955d9b8` | `road_001` settled, `road_002` created with the `0.9.S` heading |
| `8a38b40` | `road_002` regrouped onto a single version |

`git diff 903b1d5 565c5c0 -- LOGICS_SLASH/tasks/` yields all four generated/rewritten
pairs at once. Scaffold inputs are in `LOGICS_SLASH/scaffold/*.json` — that is where
the `request_acs` the generator does not consume can be seen.

`prod_048` itself still has no linked request, hence the
`companion_doc_missing_primary_link` warning left in place deliberately.
