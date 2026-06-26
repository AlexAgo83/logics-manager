## req_282_let_the_assistant_prioritize_execution_order_of_backlog_items - Let the assistant prioritize execution order of backlog items
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Workflow prioritization
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The assistant can express, and the tooling can act on, a priority that orders which backlog items get worked first.
- `logics-manager status` recommends open work in priority order instead of filesystem order.
- Priority lives at the item (subject) level; tasks inherit it rather than carrying a competing priority.
- The assistant is instructed to set a deliberate priority when grooming and to sequence its delivery plan / roadmap by that priority, so the field is used rather than left at default.
- The solution reuses the existing `# Priority` block and current metadata-parsing patterns rather than adding a new scoring engine or dependency.

# Context
- Items already render a `# Priority` section (Impact:/Urgency:) authored by assist_support.py and flow/__init__.py, but it is always empty and never parsed, so it is dead today.
- status_payload (insights.py) groups open work by category (blocked, active, promote, groom) then slices [:limit] in collection order, with no ordering within a category.
- The chain is request -> item (backlog) -> task, typically ~1 task per item, so an item is the unit of a subject and the natural home for priority.
- LogicsDoc parses status and progress with a simple line-prefix scan; a priority field can be parsed the same way.
- Hard ordering constraints between subjects are rare today; Status: Blocked already covers the one-off case, so a dependency graph is out of scope (YAGNI).

# Acceptance criteria
- AC1: Backlog items carry a single parsed priority field (enum, e.g. P0/P1/P2 with a documented default) sourced from the existing `# Priority` block; LogicsDoc exposes it.
- AC2: `logics-manager status` orders each open-work list by priority (highest first), with a stable tiebreak, before truncating to the limit, and surfaces the priority tier on each rendered status line.
- AC3: Tasks do not store their own priority; for ordering they inherit the priority of their linked item.
- AC4: New items authored via assist and via flow scaffold/new are emitted with a populated priority (default tier) instead of an empty Impact:/Urgency: block; no new runtime dependency is introduced.
- AC5: A runnable check covers the priority parse and the status sort, and `logics-manager lint` and `audit` pass on the resulting corpus and code.
- AC6: The viewer (`cdx view`) shows each backlog item's priority as a card badge consistent with the existing status/progress/complexity badges.
- AC7: The generated logics instructions and the `backlog-groom` assist guidance direct the assistant to set a deliberate priority tier (with a one-line rationale) when grooming or creating an item, instead of leaving the default.
- AC8: The generated instructions direct the assistant to sequence its delivery plan / roadmap by `status` priority order, so priority drives what gets worked first rather than being decorative.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_031_assistant_driven_work_prioritization`
- Architecture decision(s): (none yet)

# References
- `logics_manager/insights.py` (status_payload builds work lists and truncates [:limit] in file order, no priority sort)
- `logics_manager/insights.py` (LogicsDoc dataclass: kind/status/progress/ref/title, no priority field)
- `logics_manager/assist_support.py` (emits the `# Priority` block with empty Impact:/Urgency: on new items)
- `logics_manager/flow/__init__.py` (emits the `# Priority` block in item templates)
- `logics/backlog/*.md` (existing items already carry a dead `# Priority` section)

# AI Context
- Summary: Let the assistant prioritize execution order of backlog items
- Keywords: request-chain-scaffold, let the assistant prioritize execution order of backlog items, development-ready
- Use when: You need to implement or review the scaffolded workflow for Let the assistant prioritize execution order of backlog items.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_509_parse_item_priority_and_order_status_output_by_it`
- `item_510_populate_item_priority_on_authoring_and_scaffolding`
- `item_511_show_item_priority_as_a_viewer_card_badge`
- `item_512_teach_the_assistant_to_set_and_plan_by_priority`
