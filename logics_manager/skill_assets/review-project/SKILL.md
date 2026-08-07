---
name: review-project
description: Review a codebase and capture the findings as one lightweight Logics request — candidates for future work, not a commitment to do any of it. Use when asked to "review this project", "audit the codebase", or "what should we fix here".
---

# Review a project into a captured request

Read the codebase, write up what you found as a single Logics request. This is
capture, not design: a review surfaces candidates, it does not commit to them.

## Hard rules

- **Capture, do not scope.** No backlog items, no tasks, no product brief. If a
  finding turns out to deserve real work, `/corpus` scaffolds it later, with the
  scoping judgement that step deserves.
- **One request for the whole review**, not one per finding. A wall of requests
  is not a review.
- **Every finding must name evidence** — a file, a line, a command whose output
  you saw. A finding you cannot point at is a hunch; leave it out or label it.
- **Write in English**, whatever language the request came in.
- **No real company, supplier, or client names** in the doc.
- **Do not fix anything.** A review that quietly rewrites code is not a review.

## Recipe

1. **Check what is already known.** Do not re-report work the corpus has already
   captured:
   ```bash
   logics-manager status
   logics-manager health --format json
   logics-manager sync search-docs "<topic>" --limit 10
   ```

2. **Read the code**, and run whatever the project's own validation says is
   authoritative (tests, lint, type-check, audit). Record the actual commands
   and their real results — including failures.

3. **Capture the findings as one request:**
   ```bash
   logics-manager flow new request --title "Review findings: <area>" --complexity <Low|Medium|High>
   ```
   Then fill its sections: `Needs` for what should change, `Context` for what you
   observed and where, `Acceptance criteria` for what "addressed" would mean.

4. **Validate and index:**
   ```bash
   logics-manager lint --require-status
   logics-manager audit --group-by-doc
   logics-manager index
   ```

5. **Commit the request.** Do not push: a review finding has not been verified
   against anything yet.

## Gotchas

- Rank findings by evidence strength, not by how alarming they sound. "This
  test is skipped and has been since <commit>" beats "this design seems risky".
- Distinguish "wrong" from "not to my taste". Only the first belongs in
  `Needs`; the second, if worth saying at all, belongs in `Context`.
- If the review found nothing worth acting on, say so and create no request.
  An empty finding list is a valid result.
