## prod_100_a_viewer_link_worth_writing - A viewer link worth writing
> Date: 2026-08-15
> Status: Proposed
> Related request: `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`
> Related backlog: `item_825_resolve_a_document_from_its_short_id`, `item_826_select_a_project_by_the_name_the_switcher_shows`, `item_827_write_down_the_link_forms_where_a_writer_will_look`
> Related task: `task_380_orchestrate_the_short_viewer_link_work`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Make the address of a document short enough that naming it and linking to it are the same act.

# Goals
- The link an operator would write by hand is the link that works.
- Short means unambiguous or nothing -- never a guess at which document was meant.
- Nothing that works today stops working.
- The form is written down where it will be read.

# Non-goals
- A URL shortener, a redirect service, or any state that has to be stored to resolve a link.
- Changing what focusing a document does once it resolves.
- Making the port discoverable: a link assumes the default port, and one on another port is a link to somewhere else.
- Deep links to anything but a document.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_369_make_a_viewer_link_short_enough_to_write_in_a_sentence`
- Task back-reference: `task_380_orchestrate_the_short_viewer_link_work`
