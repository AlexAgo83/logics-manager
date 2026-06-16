# Logics Manager 2.9.8

## Improvements

- CDX status table now refreshes automatically after toggling the **ON/OFF** column so the status badge reflects the new `enabled` state without a full reload, scoped to the current screen only.
- New **clickable `logged_out` auth status** on the CDX status table: when a session reports `logged_out`, the cell renders a styled button that opens a Workshop terminal running `cdx login <session>`.
- Document panel header now exposes a dedicated **refresh button** (icon + label) next to **Close**. Refresh re-fetches only the screen currently open (CDX status, CDX missions, CDX runs, CI status, Git status, Explorer, Workshop, Corpus insights, Validation health, or a Markdown document) without touching the rest of the viewer.
- Close button now ships with an icon (`✕`); on mobile (`max-width: 900px`), both Refresh and Close collapse to icon-only to save header space.
- New **Git pull** and **Git push** buttons in the Git status screen header, shown only when the Git status screen is open. Each spawns a Workshop terminal running the corresponding command so authentication prompts and progress are visible.
- Primary viewer actions are now **cancellable**: clicking a second action (Git, CI, CDX, etc.) while the previous one is still loading aborts the in-flight fetches via `AbortController`, so the late screen no longer appears after the new one has been requested.

## Validation

- `logics-manager audit`
- `logics-manager lint`
- `npm run release:changelog:validate`
- `npm run ci:check`
- `git diff --check`
