---
name: roadmap-deliver
description: Propose, inspect, or validate a versioned roadmap doc, and deliver a request/backlog/task chain straight from a product brief. Use when asked to "propose a roadmap", "check the roadmap", "validate the roadmap", or "deliver this product brief" — the product-level chain above requests.
---

# Roadmap and delivery

Work the layer above requests: a versioned roadmap that groups milestones,
and `deliver`, which turns a settled product brief directly into a linked
request/backlog/task chain without going through `/corpus`'s scaffold input.

## Hard rules

- **A roadmap groups milestones; it does not replace `/corpus`.** If the
  work behind a milestone still needs scoping (needs, acceptance criteria,
  backlog slices), scaffold that with `/corpus` and link it into the roadmap
  — don't write scope directly into roadmap prose.
- **`deliver` only works from a product brief that already exists.** If the
  product framing itself isn't settled yet, that's a `/corpus`
  `--source-ref`/companion problem to solve first, not a `deliver` problem.
- **Never hand-edit roadmap indicators or milestone headings.** `roadmap
  validate`'s contract (see Gotchas) depends on their exact shape; edit
  through `flow roadmap propose` or plain prose inside a milestone section,
  never the heading or indicator lines.

## Recipe

**Propose** a roadmap companion doc, linking whatever already exists:
```bash
logics-manager flow roadmap propose --title "Q3 platform work" \
  --milestone "0.1: MVP" --milestone "0.2: Hardening" \
  --product-ref prod_017_logics_delivery_loop_ergonomics
```
Repeat `--milestone` for each one; add `--request-ref`/`--backlog-ref`/
`--task-ref` for whatever's already scoped under it.

**Show** a bounded view of an existing roadmap:
```bash
logics-manager flow roadmap show road_004_q3_platform_work
```

**Validate** its contract before relying on it:
```bash
logics-manager flow roadmap validate road_004_q3_platform_work
```

**Deliver** a request/backlog/task chain straight from a settled product
brief:
```bash
logics-manager flow deliver --from-product prod_017_logics_delivery_loop_ergonomics
# or, to name the request explicitly instead of reusing the brief's title:
logics-manager flow deliver --from-product prod_017_logics_delivery_loop_ergonomics --title "Implement flow deliver"
```
Add `--finish` only if the resulting task is already done in practice — it
finishes the task immediately rather than leaving it `Ready`.

## Gotchas

- **`roadmap validate` checks a specific, narrow contract** — not general
  prose quality. It fails on: a missing or malformed doc heading; any of
  `Date`, `Status`, `Related product`, `Related request`, `Reminder` absent
  from the indicator block; zero headings matching a versioned milestone
  pattern (`## 0.1 - ...` or `## 0.1.2 - ...`); and it separately *warns*
  (not fails) about any other `##` heading that isn't the title or a
  milestone — a stray `## Notes` heading reads as an unparsed heading, not
  an error, but it means nothing under it is treated as milestone content.
- **A milestone heading's numbering matters for parsing, its wording doesn't.**
  `## 0.1: MVP` in `--milestone` becomes a `## 0.1 - MVP`-shaped heading; the
  validator's regex is `\d+(?:\.\d+){1,2}\s+-\s+`, so a milestone written as
  plain text without that numeric-dash pattern won't be counted at all.
- **`deliver` names its own request/backlog/task**; it does not require or
  consult `logics/scaffold/*.json` the way `/corpus` does. Don't mix the two
  flows on the same product brief expecting shared state.
- **`--finish` on `deliver` skips the normal `implement-task` cycle entirely.**
  Only use it when you are delivering a chain for work that's already
  verified done elsewhere — it is not a shortcut to mark unfinished work
  complete.
