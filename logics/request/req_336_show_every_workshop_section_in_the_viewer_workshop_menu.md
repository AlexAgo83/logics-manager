## req_336_show_every_workshop_section_in_the_viewer_workshop_menu - Show every Workshop section in the viewer Workshop menu
> From version: 2.21.6
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Viewer navigation
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The viewer's Workshop menu is hand-written HTML listing three of the four Workshop sections, so Runbooks has no entry and is only reachable by opening another section first and finding it in the tab strip.
- Keywords: viewer, workshop-menu, runbooks, navigation, hardcoded-menu
- Use when: Adding or reordering a Workshop section, or fixing a section that cannot be reached from the top bar.
- Skip when: The work concerns what a Workshop section *does* rather than how it is reached.

# Needs
- Reported by the operator, 2026-08-11: "in the viewer, in the Workshop menu I don't have the Runbook button and I have to go into one of the screens to find it in the slider — that's a pain."
- Every Workshop section should be reachable in one gesture from the Workshop menu. Runbooks currently costs two: open a section that *is* listed, then locate Runbooks in the tab strip.
- Runbooks are the newest surface (`req_330`), which makes this the section most likely to be looked for and least likely to be found.

# Context
- The registry `workshopTabs` in `clients/viewer/src/browser-host/constants.js` declares four sections in order: `terminals`, `commands`, `runbooks`, `explorer`.
- The menu in `clients/viewer/index.html` is separate, hand-written markup listing three: `workshop:terminals`, `workshop:commands`, `workshop:explorer`. `runbooks` is absent, and the order also diverges from the registry.
- So this is drift between two hand-maintained lists, not a missing feature: the Runbooks panel is fully implemented in `clients/viewer/src/browser-host/workshop.js` (search, category browsing, graph view) and routing already works — `data-viewer-nav-target="workshop:runbooks"` would be handled by the existing dispatcher in `index.js` with no new plumbing.
- Adding one `<button>` fixes the symptom in a minute and leaves the cause in place: the next section added to `workshopTabs` will be missed the same way. Generating the menu from the registry is the fix that holds, and a test asserting the menu covers the registry is what keeps it holding.
- Out of scope: the VS Code extension's Board webview, which does not carry this top-bar menu, and any change to the Workshop tab strip itself.

# Acceptance criteria
- AC1: Runbooks is reachable in one gesture from the Workshop menu, opening the same panel the tab strip opens.
- AC2: The Workshop menu is derived from the `workshopTabs` registry rather than hand-written per entry, so its contents and order follow the registry by construction.
- AC3: A section added to `workshopTabs` appears in the menu with no edit to `index.html`.
- AC4: Existing menu behaviour is unchanged — the project tools below the separator, their hidden states, keyboard navigation, and the `role="menu"` / `role="menuitem"` semantics all survive.
- AC5: A test fails if any registry section has no menu entry, and covers activation of the Runbooks entry end to end.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/viewer/index.html`
- `clients/viewer/src/browser-host/constants.js`
- `clients/viewer/src/browser-host/workshop.js`
- `clients/viewer/src/browser-host/index.js`
- `logics/request/req_330_make_operational_runbooks_a_discoverable_logics_companion_document.md`

# Backlog
- none
- `item_697_show_every_workshop_section_in_the_viewer_workshop_menu`
