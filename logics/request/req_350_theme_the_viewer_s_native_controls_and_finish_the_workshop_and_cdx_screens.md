## req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens - Theme the viewer's native controls and finish the Workshop and CDX screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 16:28:19

# AI Context
- Summary: The shared stylesheet declares `color-scheme: light dark` while the standalone viewer's palette is unconditionally dark, so on a host resolving to light every native control renders light on a dark UI; plus Commands repeats two constants per row, Runbooks does one of the three things its tab claims, Explorer opens on an empty pane, and CDX missions puts placeholders in metric tiles.
- Keywords: color-scheme, accent-color, native controls, workshop commands, workshop runbooks, workshop explorer, cdx missions, cdx status reference, terminals excluded
- Use when: Changing control styling anywhere in the viewer, or the Workshop Commands, Runbooks or Explorer tabs, or the CDX screens.
- Skip when: The Workshop Terminals tab, excluded by instruction; and the reader, editor, modals, dock, project tools and LAN banner.

# Needs
- Requested by the operator, 2026-08-13, to finish the sweep of viewer screens, with one explicit exclusion: the Workshop Terminals tab is not to be touched.
- The review with captures, each proved by the screen's own title, is in `logics/external/workshop_cdx_visual_review_2026_08_13.md`. The mockup this request delivers is `logics/external/mockup/workshop_cdx_redesign.html`.
- One finding in this pass is not about these screens at all: the shared stylesheet tells the browser this page supports both colour schemes, while the standalone viewer's palette is unconditionally dark. On any host that resolves to light, every native control is drawn light on a dark interface.
- It also corrects an earlier claim of mine. A previous review called the CDX family the internal reference; that was drawn from one screen and only `CDX status` deserves it.

# Context
- **The declared colour scheme and the actual palette disagree.** `clients/shared-web/media/main.css` declares `color-scheme: light dark`, which tells the browser the page follows the host's preference. That is correct for the VS Code webview, whose palette does follow the editor theme. It is wrong for the standalone viewer, whose palette is unconditionally dark: every colour in `clients/viewer/viewer.css` is a `var(--vscode-*, <dark fallback>)`, and outside the extension host those variables are undefined, so the dark fallback always wins. On any host resolving to light, the browser therefore draws light native controls on a dark interface. The browser host emits 18 checkboxes, 8 selects, 2 text inputs and 2 search inputs, and `clients/viewer/index.html` adds 10 more checkboxes -- about forty controls, all inheriting the wrong scheme. The two most visible are the Runbooks search field, a white box across the top of a dark screen, and the CDX Missions execution options, white checkboxes on the screen that launches an agent against the repository.
- **The fix has to be scoped, not global.** `clients/viewer/viewer.css` is loaded only by `clients/viewer/index.html`, so declaring the scheme there corrects the standalone viewer and leaves the webview following the editor theme. Declaring it in the shared stylesheet instead would force dark on a VS Code user running a light theme.
- *Corrected 2026-08-13 during delivery: the first statement of this finding claimed no stylesheet declared a colour scheme at all. The audit grep covered `clients/shared-web/media/css/` and missed `main.css`, which sits one directory above it. The defect is real and the symptom was captured; the cause was mis-stated.*
- **Workshop Commands repeats two constants on every row.** `package.json` appears under a heading that already says NPM scripts, and `IDLE` appears on every script that is not running -- the same defect as the near-constant metric chip on the board, twice per row. Each script costs about 110px, so roughly thirty scripts is about 3 300px of scroll, with no filter and no grouping although the names group themselves by prefix. The command the script runs is the most useful content on the row and sits third, inside a nested box.
- **Workshop Runbooks does not do what its own tab title promises.** The tab is titled "Operational runbooks: search, browse by category, verify"; the screen offers a search field, no browse-by-category and no verify. A `Search` button sits beside the search field, which means either the field does not filter as you type or the button is redundant. About 85% of the screen is empty below two runbooks, and the screen's eyebrow still reads "terminals, commands, and file explorer" although Runbooks is a fourth tab.
- **Workshop Explorer opens on its least useful selection.** The root directory is selected by default and a directory's preview is a count, so the preview pane -- the reason a two-pane explorer exists -- is empty on arrival, while the tree gets 250px and the empty pane gets three quarters of the width. This is the same shape as the Git screen opening on its empty domain, now found twice. Its dimming of ignored and generated directories is the best thing on the screen and should be kept.
- **CDX status is the reference; CDX missions is not.** `CDX status` builds a real table with a column per fact, status as a coloured pill, a compact metric strip, quota gauges, and a block naming the next safe command -- the verdict-then-action shape proposed for Git, CI and Release, already built. `CDX missions` puts two placeholders (`Plan: Not previewed`, `Run: Not launched`) in tiles at the weight of real counts, prints "Plan preview" twice as both a panel heading and the selected toggle inside it, and carries two of the forty unstyled checkboxes. It also does one thing better than most of the viewer: `Launch in terminal` stays disabled until a plan has been previewed, and that safety affordance must be kept.
- Out of scope, and stated as an instruction rather than a judgement: **the Workshop Terminals tab is not to be changed by this request**. Also out of scope: the document reader and editor, the new-document modal, the filter panel, the minimized dock, the project tools and the LAN banner, none of which have been reviewed.
- Known risk: the colour-scheme change touches every screen in the product, including screens nobody has reviewed and the Terminals tab this request must not alter. It needs checking against the terminal's own rendering before it lands, precisely because the request may not change that screen.
- Known risk: `clients/viewer/browser-host.js` is a build output of `clients/viewer/src/browser-host/index.js`, and one source feeds both the standalone viewer and the extension host.

# Acceptance criteria
- AC1: Every native control in the viewer renders in the interface's own colour scheme, with no control appearing as a light-mode widget on a dark screen.
- AC2: The control theming is declared once at the root rather than per screen, so a control added later is covered without anyone remembering to style it.
- AC3: The Workshop Terminals tab renders exactly as it does today; the control theming is verified against it rather than assumed harmless.
- AC4: A list of runnable commands shows each command beside its name, groups them by the structure their names already have, and can be filtered.
- AC5: No row repeats a value that is constant for its whole list or already stated by its heading; a state that is the default is not printed on every row, while a state that is not the default is visible along with how long it has held.
- AC6: The runbooks screen does what its tab title claims: search, browse by category, and see which runbooks are due for verification.
- AC7: A control that duplicates a live filter is removed, and no screen's eyebrow describes a set of tabs it no longer matches.
- AC8: The explorer opens with its preview pane holding something worth reading, and the pane widths reflect which side carries the content.
- AC9: A directory's preview reports its contents usefully rather than as a single count in an empty pane.
- AC10: CDX missions keeps its metric tiles for metrics: a state that says nothing has happened yet belongs to the panel it describes, not to a tile.
- AC11: A disabled action states why it is disabled, and the preview-before-launch safety on CDX missions is preserved.
- AC12: A screen title is printed once.
- AC13: The CDX screens other than status adopt the table and strip shape that status already establishes, rather than each inventing its own.
- AC14: The reviewed screens hold at 1440x900, 820x1180 and 390x844, and the viewer UI campaign covers them, waiting for each screen and proving which one it captured.
- AC15: Every change is made in the shared sources and rebuilt, and behaves the same in the standalone viewer and in the extension host.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)

# References
- clients/viewer/viewer.css
- clients/shared-web/media/css/toolbar.css
- clients/viewer/index.html
- clients/viewer/src/browser-host/workshop.js
- clients/viewer/src/browser-host/cdx.js
- clients/viewer/src/browser-host/index.js
- scripts/build/build-viewer-browser-host.mjs
- tests/run_local_viewer_visual_smoke.mjs
- tests/helpers/viewer-layout-checks.mjs
- logics/external/workshop_cdx_visual_review_2026_08_13.md
- logics/external/mockup/workshop_cdx_redesign.html

# Backlog
- `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`
- `item_756_make_the_command_list_readable_at_the_size_it_actually_is`
- `item_757_make_the_runbooks_screen_do_what_its_tab_claims`
- `item_758_open_the_explorer_on_something_worth_reading`
- `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`
- `item_760_cover_the_reviewed_workshop_and_cdx_screens`
