## item_501_remove_workshop_terminal_race_conditions - Remove workshop terminal race conditions
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Concurrency correctness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- In viewer_workshop.py, write() and resize() use _master_fd without holding the lock while _read_loop() can close it, and write() assigns self.error without the lock while status_payload() reads it under the lock.

# Scope
- In:
  - Take the existing session lock around the check-and-use of _master_fd in write() and resize()
  - Set _master_fd to None under the lock when _read_loop() closes it
  - Read and write self.error only under the lock
  - Add a test exercising concurrent write/resize while the read loop closes the fd
  - Hoist the duplicated inline imports to module level while here
- Out:
  - Merging the two duplicated session classes (separate low-priority cleanup)
  - Changing the terminal protocol or payload shapes

# Acceptance criteria
- AC1: _master_fd and self.error are only accessed under the session lock.
- AC2: A test demonstrates no race between write/resize and read-loop close.
- AC3: The workshop pytest suite passes unchanged.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: _master_fd and self.error are only accessed under the session lock.
- request-AC12 -> This backlog slice. Proof: AC2: A test demonstrates no race between write/resize and read-loop close.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Remove workshop terminal race conditions
- Keywords: scaffolded-backlog, remove workshop terminal race conditions, implementation-ready
- Use when: Implementing the scaffolded slice for Remove workshop terminal race conditions.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
