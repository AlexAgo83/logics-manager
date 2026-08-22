# Logics Manager 2.22.3

A corrective release for split Logics work. Closing one task slice no longer forces proof
onto every sibling slice in the same request, and generated traceability repairs now keep
human evidence separate from deferred placeholders.

## Split task closeout is scoped to the slice being finished

`flow closeout` and `flow validate-closeout` now judge request AC proof through the
backlog items linked to the task being closed. A Done slice can close with its own
criteria proven while later slices stay Ready with deferred proof. The global audit uses
the same ownership rule, so a request with multiple task slices reports only the proof
that is actually due for the finished work.

## Traceability repair stops leaking generated proof

`flow repair ac-traceability` accepts an explicit task scope and refuses ambiguous proof
promotion when a request has several linked tasks. Generated deferred lines are matched
exactly, so human-written proof that merely resembles the old placeholder is preserved.
Missing task proof now records a deferred closeout line instead of a `TODO` stub.

## Validation corpus tightened

Historic Done tasks with missing task-level proof were repaired, and the regression suite
now covers sibling-slice closeout, scoped repair, exact placeholder replacement, and
rollback reporting.
