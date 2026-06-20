## item_467_add_an_icon_to_the_settings_button - Add an icon to the Settings button
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 92%
> Progress: 0%
> Complexity: Low
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The Settings button (`#viewer-refresh-menu-button`, `clients/viewer/index.html:77`) is text-only, which is visually inconsistent with the rest of the chrome and slower to spot. It should carry an icon (gear).

# Scope
- In:
  - Add a gear icon to the Settings button, consistent with the existing icon style used elsewhere in the topbar; keep the accessible label/title.
- Out:
  - Changing the Settings menu contents or behavior.
  - A broader icon system overhaul.

# Acceptance criteria
- AC1: The Settings button displays a gear icon consistent with the existing topbar icon style.
- AC2: The button keeps its accessible name (visible label and/or `aria-label`/`title`) and its existing behavior is unchanged.
- AC3: The dual-copy `viewer_assets/` stays in sync and existing viewer tests pass.

# AC Traceability
- request-AC6 -> This backlog slice adds the Settings button icon. Proof: AC1, AC2.
- request-AC7 -> No regression. Proof: AC3 (tests pass; dual-copy synced).

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`
- Primary task(s): `task_260_add_an_icon_to_the_settings_button`

# AI Context
- Summary: Add a gear icon to the text-only Settings button while preserving its accessible name and behavior.
- Keywords: settings button, icon, gear, topbar, accessibility, aria-label
- Use when: Implementing or reviewing the Settings button icon.
- Skip when: The change is unrelated to the Settings button.

# Priority
- Impact: Low — small polish.
- Urgency: Low.

# Notes
- Hybrid rationale: Derived from request `req_263_...` and kept bounded to the Settings icon slice.
- Source file: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`.

# Tasks
- `task_260_add_an_icon_to_the_settings_button`
