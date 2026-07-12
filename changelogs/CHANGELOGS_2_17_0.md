# Logics Manager 2.17.0

## CDX 0.10.0 integration in the viewer

- Adds a BANKED column to the CDX status table showing banked Codex rate-limit resets; clicking the counter activates one reset after an explicit confirmation (`cdx reset <name> --yes` behind `/api/cdx-reset`).
- Adds a CDX disk screen (Disk tab and nav entry) with total usage, per-profile sizes and shares, and safe cleanup candidates from `cdx disk profiles --json --candidates`; scans are cached server-side for 5 minutes with the scan timestamp shown on screen.
- Shows a scanning placeholder during long disk scans and marks forced rescans triggered from Refresh.

## VS Code viewer updates

- Opens terminals launched from the embedded viewer in the viewer's active project root instead of the workspace root, so the project switcher and multi-folder workspaces get the right starting directory.
- Avoids repeated too-new runtime prompts.
