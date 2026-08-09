---
name: project-health
description: Run the read-only diagnostics — doctor, health, status, followups, product-consistency, audit — and read their combined output as a pre-flight check. Use when asked "is the project healthy", "run diagnostics", "what's blocked", or "check corpus health" before starting other work. Writes nothing; capturing findings as a request is /review-project's job, not this one.
---

# Project health diagnostics

Run the corpus's own read-only diagnostics and read them together as one
pre-flight check. This skill produces no document — it's the thing you run
*before* deciding whether `/review-project` or `/implement-task` is next.

## Hard rules

- **This skill writes nothing.** No request, no backlog item, no doc edit.
  If a finding here turns out to deserve a captured request, that's
  `/review-project`'s job — hand off to it, don't duplicate its capture step
  here.
- **Report what the tools actually said**, not a summary that drops the
  specific doc paths and remediation commands they printed. An agent reading
  your output next needs the exact command to run, not just "there are
  issues."
- **Don't fix anything you find.** `doctor`'s remediation lines and
  `audit`'s repair-command suggestions are for `/closeout-repair` or the
  operator to act on, not for you to apply silently mid-diagnostic.

## Recipe

Run each, in this order (cheapest structural check first, broadest last):

```bash
logics-manager doctor                    # required dirs, schema-version indicators present
logics-manager health                    # doc counts, open-doc count, issue-signal count
logics-manager status                    # open docs + concrete next actions (continue task X, groom request Y)
logics-manager followups                 # follow-up areas with a ready-to-run request-creation command
logics-manager product-consistency       # product brief lineage links still pointing at real docs
logics-manager audit --group-by-doc      # full workflow consistency and traceability pass
```

Add `--format json` to any of them if you need to correlate findings
programmatically rather than read prose.

## Reading the combined output

- **`doctor` failing on `missing_schema_version` across old docs is usually
  pre-existing debt, not a new break.** Check whether the flagged docs
  predate the schema-version convention before treating it as urgent —
  `doctor`'s own remediation line tells you the exact fix either way.
- **`health`'s `issue signals: 0` doesn't mean the corpus is clean** — it
  means the specific signals `health` tracks are clean. Cross-check against
  `audit`, which runs the full traceability/consistency pass `health`
  doesn't.
- **`status`'s "Continue or finish N active task(s)" is the fastest way to
  find in-flight work** before starting something new — check it before
  assuming a fresh task is needed.
- **`followups` gives you a ready `flow new request` command per finding** —
  if you're about to write one by hand from an audit finding, check
  `followups` first; it may have already built the exact command.
- **A blocking `audit` finding always outranks a `doctor`/`health` warning.**
  If time is short, read `audit`'s blocking issues first, then decide
  whether the rest is worth a full pass.
