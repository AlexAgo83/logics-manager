## prod_110_a_review_slot_for_project_change_timelines - A Review slot for project change timelines
> Date: 2026-08-22
> Status: Proposed
> Related request: `req_381_add_a_review_slot_for_project_change_timelines`
> Related backlog: `item_857_expose_review_bursts_from_local_git`, `item_858_build_the_review_slot_timeline_ui`
> Related task: `task_393_orchestrate_the_review_slot_change_timeline`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-22 17:28:41

# Overview
Add a dedicated Review surface to the Logics viewer where operators can read project changes as bursts over time: move horizontally through the working tree and recent commits, move vertically through files in the selected burst, and inspect the selected diff without leaving the viewer.

```mermaid
flowchart LR
  Git[Local Git] --> Bursts[Review bursts]
  Bursts --> Timeline[Horizontal timeline]
  Timeline --> Files[Vertical file list]
  Files --> Diff[Diff pane]
```

# Goals
- Make project change review a first-class viewer workflow instead of a hidden part of the Git cockpit.
- Let operators navigate changes spatially: time left-to-right, files top-to-bottom, diff in the main pane.
- Reuse local Git and existing diff rendering for the first version.
- Keep the surface read-only, bounded, keyboard-reachable, and responsive.

# Non-goals
- A custom filesystem watcher, persistent event store, or live session recorder.
- Remote GitHub, GitLab, pull request, or CI review APIs.
- Git mutation actions such as commit, checkout, reset, revert, or cherry-pick.
- A branch graph, blame view, merge conflict editor, or full code review system.
- Replacing the existing Git cockpit.

# Scope and guardrails
- In: a first-class Review viewer slot backed by bounded local Git data, with working-tree and recent-commit bursts, per-file selection, diff preview, keyboard navigation, responsive layout, and focused tests.
- Out: filesystem watchers, remote provider review APIs, Git mutation actions, persistent review history, branch graphs, blame, or replacing the Git cockpit.

# Key product decisions
- Start from local Git because the existing viewer already has safe, bounded Git payloads and diff rendering.
- Treat the working tree as the first timeline burst only when it is dirty.
- Add per-file commit diffs because whole-commit patches are too coarse for vertical file navigation.

# Success signals
- Operators can review uncommitted changes and recent commits from one Review slot without leaving the viewer.
- Arrow keys move through bursts and files in the same directions the layout communicates.
- Clean, empty, unavailable, and oversized states are readable instead of breaking the screen.

# References
- Product back-reference: `req_381_add_a_review_slot_for_project_change_timelines`
- Task back-reference: `task_393_orchestrate_the_review_slot_change_timeline`
