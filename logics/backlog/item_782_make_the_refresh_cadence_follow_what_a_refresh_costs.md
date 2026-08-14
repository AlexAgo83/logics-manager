## item_782_make_the_refresh_cadence_follow_what_a_refresh_costs - Make the refresh cadence follow what a refresh costs
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:28

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: refresh, cadence, follow, costs
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The client polls every 15 seconds by a constant chosen when the corpus was a fraction of this size, and each open tab polls independently. The 85% CPU reading that raised this was taken with 124 leftover headless browsers connected, which is corrected in the request: it measures the cost per client, not an idle server.

# Scope
- In:
  - Have the interval account for how long a refresh actually takes.
  - Bound what an idle viewer costs, and state the bound.
  - Consider what several open tabs do, since each carries its own timer.
- Out:
  - Removing auto-refresh, which is why the screen is worth leaving open.

# Delivery notes
- **A refresh may never occupy more than a tenth of the time between refreshes**, on both sides. That is what "the cadence accounts for the cost" means when the cost is not known in advance and grows with the corpus: the interval stays the operator's setting until honouring it would leave the viewer working more than a tenth of the time.
- Client side: the wall time of each automatic refresh is measured and the next delay is `max(configured, measured x 10)`. On the corpus after `item_781` a refresh costs about 0.15s, so the configured 15s always wins -- this changes nothing until it needs to, which is the point.
- The cost is recorded on failure too. Pacing off a cost of zero after a slow failure would retry a struggling server as fast as the interval allows, which is the behaviour the slice exists to prevent.
- **The control says when the cost, not the setting, is pacing the viewer.** A select reading `15 sec` while the viewer refreshes every minute is a control that lies about what it does, and the operator's only clue would be that the screen feels stale.
- Server side, the same rule on the event stream. Its snapshot walks the whole corpus -- measured at **12.5ms for 1615 documents**, 1.3% of a core at one poll a second, and not a constant worth trusting at ten times the size. The `git` half of the snapshot is 0.2ms and is not the concern.
- A tab nobody is looking at does not refresh at all. That was already true and is now asserted, because it is half of what bounds the idle cost.

## The bound, stated (AC5)

Measured on this repository at 1615 documents, nothing else running:

| Condition | Cost |
|---|---|
| Idle, zero clients connected | **0.04s CPU over 240s wall** -- 0.017% of a core |
| Per connected client | one corpus snapshot per second, 12.5ms, capped at a tenth of the interval |

- **A correction worth recording.** The 85% CPU figure that raised `req_356` was taken with 124 leftover headless Chrome processes from this cycle's capture scripts still connected, each holding an event stream. The reading was real and the per-client polling cost it exposed is real, but it measured a server under many clients, not an idle one. The request has been corrected. Two lessons: kill the capture browsers, and say what was connected when quoting a CPU figure.

# Acceptance criteria
- AC4: The cadence accounts for the cost of a refresh.
- AC5: Idle CPU is bounded and the bound is stated.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: The cadence accounts for the cost of a refresh.
- request-AC5 -> This backlog slice. Proof: AC5: Idle CPU is bounded and the bound is stated.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_092_a_viewer_that_stays_as_fast_as_it_started`
- Architecture decision(s): (none yet)
- Request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Primary task(s): `task_356_keep_the_viewer_as_fast_as_it_started`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_356_keep_the_viewer_as_fast_as_it_started` was finished via `logics-manager flow finish task` on 2026-08-14.
