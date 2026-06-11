# Changelog (`2.5.2 -> 2.6.0`)

Release `2.6.0` focuses on the local viewer cockpit: richer Git and CI visibility, a cleaner utility surface, clearer assistant status, and tighter stacked details behavior.

## Highlights

- Redesigned the local viewer Insights screen so corpus and workflow signals are easier to scan.
- Added local viewer shortcuts for GitHub, project folder access, Git history reveal, and GitHub Actions CI status.
- Grouped viewer utility actions under Settings to keep the top bar compact.
- Added an active assistant indicator on the CDX button.
- Fixed bottom-docked details spacing and width behavior in narrow and collapsed layouts.
- Kept Logics workflow docs synchronized with the viewer work completed for this release.

## What Changed

### Local Viewer Insights

- Reworked the corpus insights dashboard for denser status summaries and more readable signal wrapping.
- Closed the completed viewer workflow requests and kept generated backlog/task docs aligned with the implementation trail.

### Viewer Git and CI Cockpit

- Added repository shortcuts to the viewer top bar.
- Added progressive reveal for Git history commits.
- Added GitHub Actions CI status visibility in the viewer.
- Added server connection and disconnect status for the local viewer backend.

### Viewer Controls and Assistant Status

- Moved viewer utility actions into a grouped Settings surface.
- Added an active assistant badge on the CDX button.

### Layout Fixes

- Fixed stacked details panel width in bottom-docked layouts.
- Fixed excess empty spacing when bottom details are collapsed.
- Updated shared and packaged viewer assets together so source and runtime assets remain in sync.

## Upgrade Notes

- Restart any already-running `logics-manager view` server so the browser loads the updated viewer backend and bundled assets.
- If the viewer is open during upgrade, refresh the browser tab after restarting the server to pick up the new top bar and details layout behavior.

## Validation and Regression Evidence

- `logics-manager audit`
- `logics-manager lint`
- `npm run ci:check`
- `npm run release:changelog:validate`
