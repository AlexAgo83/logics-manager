## item_826_select_a_project_by_the_name_the_switcher_shows - Select a project by the name the switcher shows
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: A link short enough to write
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: select, project, name, switcher, shows
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `?project=` takes `_viewer_project_id`, twelve characters of a SHA-1 of the resolved path. Nobody writes `c0b5091ab49d` from memory, so a cross-project link has to be looked up before it can be written.
- The switcher already shows every project by name, which is what an operator would write.

# Scope
- In:
  - Accept the displayed project name where the opaque id is accepted, resolving against the projects the viewer already knows.
  - Keep the opaque id working, since it is what the viewer itself emits.
  - Say which project could not be found when a name matches none, or more than one.
- Out:
  - Adding projects to the registry from a URL.
  - Changing how projects are discovered or how their ids are computed.

# Acceptance criteria
- AC1: `?project=logics-manager` selects that project.
- AC2: An unknown or ambiguous name is refused with a message naming what was tried, not silently ignored.
- AC3: The opaque id keeps working.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: `?project=logics-manager` selects that project.
- request-AC4 -> This backlog slice. Proof: AC2: An unknown or ambiguous name is refused with a message naming what was tried, not silently ignored.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_100_a_viewer_link_worth_writing`
- Architecture decision(s): (none yet)
- Request: `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`
- Primary task(s): `task_380_orchestrate_the_short_viewer_link_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
