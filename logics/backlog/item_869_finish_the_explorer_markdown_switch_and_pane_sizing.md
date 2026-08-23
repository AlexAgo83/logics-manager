## item_869_finish_the_explorer_markdown_switch_and_pane_sizing - Finish the Explorer markdown switch and pane sizing
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 92%
> Confidence: 88%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer explorer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Closes the gaps left in the Explorer markdown switch: file types, truncation, fallback, persistence, stale payloads, and pane height.
- Keywords: finish, explorer, markdown, switch, pane, sizing
- Use when: touching the Explorer detail header, its markdown rendering, or its pane sizing.
- Skip when: changing the Explorer's selection and scroll behavior, which is correct.

# Problem
- The markdown test is `/\.md(?:own)?$/i`, which excludes `.markdown`, and the `contentType` test beside it never matches because `mimetypes.guess_type` returns nothing for markdown suffixes, so the payload reports `text/plain`.
- Preview mode drops the truncation notice raw mode shows, leaving a truncated document looking complete, and the missing-renderer fallback is a bare `<pre>` rather than the code viewer.
- The chosen mode is written straight to `localStorage`, so unlike every other viewer preference it never reaches the server or the embedded viewer.
- `loadWorkshopExplorer` re-renders the Explorer without clearing the host's cached tree and preview payloads, so a mode switch after returning to the tab can repaint a different file than the selected one.
- `.viewer-workspace` was given `height: min(72vh, 760px)`, a viewport-derived height with a hard ceiling, where the slice asked for a height derived from the Workshop panel.

# Scope
- In:
  - Cover `.md` and `.markdown`, and either make the content-type test match real payloads or drop it rather than leave a dead branch.
  - Keep the truncation notice and the load-anyway control visible in preview mode.
  - Fall back to the code viewer, not to unstyled text, when the markdown renderer is absent.
  - Persist the chosen mode through `updateViewerPreferences` and read it from the same place, keeping a safe default when nothing is stored.
  - Clear or refresh the host's cached tree and preview payloads wherever the Explorer is re-rendered, `loadWorkshopExplorer` included.
  - Derive the pane height from the Workshop panel with no fixed pixel ceiling, keeping the two independent scrollers and the phone single-axis behavior.
- Out:
  - Changing the 100 KB default-mode threshold, which is the decision the request already recorded.
  - Rendering markdown anywhere but the Explorer detail pane.
  - The Explorer's selection and scroll behavior, which is correct.

# Acceptance criteria
- AC1: A `.markdown` file shows the switch and a `.txt` file does not.
- AC2: A truncated markdown file shows its truncation notice and load-anyway control in both modes.
- AC3: With no markdown renderer present, preview mode renders the code viewer.
- AC4: The chosen mode round-trips through `updateViewerPreferences` and is applied on a later file and after a reload.
- AC5: Re-entering the Explorer tab and switching mode repaints the selected file, never a previously cached one.
- AC6: The panes size from the Workshop panel with no fixed pixel ceiling, and the two scrollers stay independent at desktop and tablet with one axis on phone.
- AC7: Browser-host tests cover the extension coverage, both truncation cases, the fallback, the persistence round trip, and the stale-payload regression.
- AC8: The bundle is regenerated and the targeted vitest checks and `npm run lint` pass for this slice.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC1: A `.markdown` file shows the switch and a `.txt` file does not.
- request-AC10 -> This backlog slice. Proof: AC2: A truncated markdown file shows its truncation notice and load-anyway control in both modes. Also: AC3: With no markdown renderer present, preview mode renders the code viewer.
- request-AC11 -> This backlog slice. Proof: AC4: The chosen mode round-trips through `updateViewerPreferences` and is applied on a later file and after a reload.
- request-AC12 -> This backlog slice. Proof: AC5: Re-entering the Explorer tab and switching mode repaints the selected file, never a previously cached one.
- request-AC13 -> This backlog slice. Proof: AC6: The panes size from the Workshop panel with no fixed pixel ceiling, and the two scrollers stay independent at desktop and tablet with one axis on phone.
- request-AC15 -> This backlog slice. Proof: AC8: The bundle is regenerated and the targeted vitest checks and `npm run lint` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)
- Request: `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`
- Primary task(s): `task_396_orchestrate_the_review_and_explorer_repair`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
