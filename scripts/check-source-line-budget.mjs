import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const updateRequested = process.argv.includes("--update");

const repoRoot = process.cwd();
const defaultLimit = 1000;
const sourceRoots = ["logics_manager", "clients", "scripts"];
const sourceExtensions = new Set([".py", ".js", ".mjs", ".ts", ".mts"]);
const excludedSegments = new Set([
  ".git",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "vendor",
  "viewer_assets"
]);

const allowedOversizedFiles = new Map(
  Object.entries({
    // 1117: req_305 replaced this panel's own staleness computation with the
    // configured threshold, so one surface stopped disagreeing with the CLI.
    "clients/vscode/src/logicsCorpusInsightsHtml.ts": { maxLines: 1117, ref: "req_305" },
    // req_273: de-glued importable modules. A single large importable module beats the
    // exec(compile(concat parts)) text-glue these replaced (real tracebacks, IDE, type-check).
    // The default 1000 budget still catches genuinely new monoliths.
    // 2054: req_303 added the capability/profile tool-surface selection, uniform
    // dry_run across every mutating tool, and quoting-free argument sources.
    // Extraction was attempted and backed out: the selection needs the tool
    // registry that lives here, so a separate module only bought an injection
    // dance and an import cycle for 133 of the 316 lines.
    // 2232: req_318 added nine MCP tools (withdraw/progress/roadmap show+validate/
    // deliver/validate-closeout/repair gates+links/doctor) with no CLI equivalent
    // before. Each follows the same shell-out-or-direct-payload shape every existing
    // tool here already uses; a separate module would need to import the same
    // _run_command/_ensure_no_dirty_conflict/_workflow_write_result helpers this
    // file owns, same tradeoff req_303 already weighed and backed out of.
    // 1859: req_323 lifted TOOL_DEFINITIONS (a pure JSON-schema data literal, no
    // coupling to the dispatcher req_303's extraction attempt was about) out to
    // mcp_tool_definitions.py: 2246 -> 1859.
    // 1867: req_323 disabled allow_reuse_address on the MCP HTTP server's class -
    // Windows' permissive SO_REUSEADDR let a real port collision bind silently
    // there, confirmed on a real Windows machine (test_server_port_collisions.py).
    // 1896: req_330 added the match_runbooks MCP tool and its ALLOWED_WRITE_DIRS/
    // companion-doc entries, following the exact shape search_logics_docs and the
    // other companion kinds already use in this file.
    "logics_manager/mcp.py": { maxLines: 1896, ref: "req_330" },
    // 1029: item_674 added the install-identity helpers (_install_root, _shim_target,
    // _executable_identity) that let doctor tell one install from two. They sit beside
    // running_executable_path/shadowing_executables, the only callers and the only other
    // code in the file that reasons about where this process came from; a module for
    // three short functions used in one place next door would be indirection, not a split.
    // 1045: req_331 added the `--refresh-managed` flag and its help text to
    // `bootstrap`, the same pattern as `--sync-harnesses` beside it.
    // 1046: req_333 passes --include-deferred through to render_audit, one line in
    // the argument list this command already builds.
    // 1070: item_701 added _warn_on_runtime_drift and the CORPUS_REPORTING_COMMANDS
    // set. It lives here because main() is the single seam every command passes
    // through; the comparison itself is in logics_manager/runtime_drift.py.
    "logics_manager/cli.py": { maxLines: 1070, ref: "req_340" },
    // 1564: item_675 added `backfill_schema_versions` and the --apply/--dry-run wiring on
    // schema-status. It sits beside `_schema_status`, whose scan it repairs, and reuses the
    // same `_resolve_target_docs` targeting; a separate module would import both and gain
    // nothing but an indirection.
    // 1697: req_330 added match_runbooks_payload/list_active_runbooks_payload (the
    // runbook match/recent-list lookups) beside search_logics_docs_payload/
    // list_logics_docs_payload, the doc-loading primitives they're thin wrappers over.
    // 1699: req_335 canonicalises the target path in _resolve_target_docs, the one
    // seam every sync command resolves through.
    "logics_manager/sync.py": { maxLines: 1699, ref: "req_335" },
    // 1145: req_321 added `_reposition_ai_context()`, sitting beside the other
    // deterministic `_autofix_structure()` repairs (Status/Schema version) it extends.
    // 1169: req_330 added the runbook companion-kind entries (DOC_KINDS/REF_PREFIXES/
    // COMPANION_PLACEHOLDERS) and its own small placeholder-check loop, kept separate
    // from the product/roadmap/architecture loop since runbooks skip the primary-link
    // and mermaid requirements those three still enforce.
    // 1279: req_337 replaced the whole-text lineage scan with a declared-section
    // mapping (plus the announcement of what it stopped counting), and req_333 added
    // the deferred attribute the report withholds on. Both are amendments to rules
    // that already live here; req_339's code-anchor resolution, which is filesystem
    // work rather than corpus parsing, went to its own module instead.
    // 1281: req_335 routes --paths scoping through canonical_workflow_path so
    // scoping accepts either spelling of a workflow directory.
    // 1304: req_334 added the ungroomed-AI-Context loop. It reports here because this
    // is where findings are reported; the wording it recognises is derived from
    // logics_manager/ai_context.py, which owns what the generators write, so the check
    // and the templates cannot drift apart again.
    // 1332: the three checks added this release (prose lineage, code anchors,
    // ungroomed AI Context) were lifted out of audit_payload into named functions
    // when check_function_length flagged its growth. Each is now readable on its
    // own; the file is longer for the docstrings that move with them.
    // 1370: item_703 added _uncovered_criterion_issues -- the check that a request
    // criterion is named by some linked document at all, distinct from the findings
    // beside it, which are about proof. Lifted straight into its own function rather
    // than into audit_payload, following the split check_function_length forced earlier.
    // 1390: item_751 gives both autofix paths a dry run. `Apply fixes` edited documents with
    // no count of what it would touch and no way to look first; a separate implementation
    // for the count would be free to disagree with what the button does, so the preview is
    // the same walk taking a flag rather than a twin.
    "logics_manager/audit.py": { maxLines: 1390, ref: "req_349" },
    // 1117: req_317 added the per-gate release/branch comparison (resolving the
    // tagged commit, choosing which commit each gate is judged against, and
    // naming the comparison in stale reasons and status output). The new logic
    // lives beside the gate/staleness functions it extends; a separate module
    // would only split one cohesive comparison concept across two files.
    // 1119: req_318 added `.claude-plugin/plugin.json` as one more version source,
    // beside the two lines each existing source already takes in this same list.
    // 1121: req_323 added `package-lock.json` as one more version source, the same
    // shape as every entry already in this same list.
    "logics_manager/release.py": { maxLines: 1121, ref: "req_323" },
    // 1482: req_330 added the runbook discovery paragraph to the generated Claude
    // instructions, beside the other CLI-command bullets it follows the shape of.
    "logics_manager/assist_support.py": { maxLines: 1482, ref: "req_330" },
    // 5833: banked CDX reset endpoint (/api/cdx-reset); 5879: cdx disk payload/route;
    // 5927: release prep baseline; 5937: CDX memory read-only endpoint.
    // req_311 lifted cdx and git out of viewer.py: 5692 -> 3330. Each sub-system now
    // carries its own ceiling, and its own reason for still being over the budget: they
    // are whole surfaces, split from the core rather than reduced by it.
    // 3348: req_315 added the preference routes and their handler. The POST branch was
    // extracted to keep do_POST near its ceiling; the GET side is two lines and a table
    // for it measured longer than the branch, so the branch was kept.
    // 3388: req_322 added the per-repo registry claim call and the reused-server
    // early-return path in main(), and req_321 added the /api/apply-fixes route
    // beside the /api/bootstrap-logics handler it mirrors. Both are new callers of
    // logic that already lives elsewhere (viewer_registry.py, audit_payload) - the
    // growth here is the wiring, not new repair or reuse logic to extract further.
    // 3396: req_320 added the /api/chain-graph route, a thin wire to the new
    // logics_manager/chain_graph.py resolver - no repair/render logic lives here.
    // 3401: req_323 routed _resolve_repo_doc_path's containment check through the
    // shared path_utils primitives instead of its own inline check - a net add of
    // a few lines for a net removal of a duplicated implementation.
    // 3411: req_323 disabled allow_reuse_address on LogicsViewerServer - Windows'
    // permissive SO_REUSEADDR let a real port collision bind silently there,
    // confirmed on a real Windows machine (test_server_port_collisions.py).
    // 3481: 2.21.4 wires direct chain-graph and ChatGPT MCP connector routes.
    // The new apply-fixes, chain-graph, and MCP branches were extracted into
    // helpers to keep do_GET/do_POST under their function-length ceilings; what
    // remains here is route wiring around existing domain logic.
    // 3504: req_330 added the /api/runbooks and /api/runbook-graph routes, thin
    // wires to match_runbooks_payload/list_active_runbooks_payload/
    // resolve_runbook_library_graph - no repair/render logic lives here, same
    // shape as the /api/chain-graph route beside it.
    // 3620: req_342's fleet singleton and 2.21.9 release prep left the backend
    // as route wiring around already-extracted helpers. The prep pass split static
    // GETs, update-status POSTs, LAN mutation auth, and shutdown handling instead
    // of taking on the separate item_476 full viewer-package split.
    // 3690: req_348/req_343 Lot 1 defect work. Three fixes and the reasons they
    // exist: the demo-board opt-in that replaced a probe which shipped the demo on
    // npm and in the VSIX; the connector failure reason, which awaits the child and
    // keeps a bounded tail of its output because the child's own words are worth more
    // than anything the viewer can invent; and the connector POST dispatch, where
    // every action that was not exactly "start" used to stop the connector. Most of
    // the growth is the comments recording why -- the alternative, splitting viewer.py
    // during a bug fix, is item_476's job and would land untested next to defect
    // repairs.
    // 3715: item_726 added /api/select-fleet-root-path, the browser-side recovery for
    // adding a fleet root when the host has no native dialog. It is 20 lines mirroring
    // the project handler beside it, deliberately including its containment shape --
    // normalize, resolve, assert -- rather than sharing a helper that would have to be
    // parameterised by what the validated path is then used for.
    // 3735: item_728 separates the server's fleet capability from the launch intent that
    // `--fleet` was meant to decide. Eleven lines: one constructor parameter, one
    // assignment, one factory parameter, one call site, and the comment recording that a
    // plain `view` used to land on the Fleet home because the two were one flag.
    // 3760: item_732 reads a `full` query parameter on /api/git-diff, the same question the
    // /api/git-file-preview route below it already answered. The three lines that took made
    // do_GET grow, and the function-length gate refused it -- so the three content routes
    // (diff, commit diff, file preview) moved into _handle_git_content_get, following the
    // precedent _handle_select_fleet_root_path_post set in do_POST. The extraction costs
    // more lines than it saves, because a named function with a docstring is longer than the
    // branches it replaces; what it buys is a do_GET that stopped growing.
    // 3790: item_737 adds /api/viewer-info and _viewer_info_payload. The Settings screen
    // reported nothing about what this viewer is -- address, mode, transport, version,
    // project -- while the launch banner had printed all of it to stdout since the
    // beginning, where a browser cannot read it. The payload reads the server object rather
    // than recomputing, so the banner and the screen cannot disagree about which viewer the
    // operator is looking at.
    // 3800: item_751 reads a `preview` flag off the apply-fixes body and passes it through
    // to the same audit_payload call the repair uses.
    // req_350: +25 for item_758's directory listing. The preview builder is the one place
    // that knows how a workspace path resolves, and a directory reporting its own contents
    // is that same knowledge -- moving it out would mean resolving the path twice.
    "logics_manager/viewer.py": { maxLines: 3835, ref: "req_350" },
    // 1545: item_743 keys the cdx update cache on a fingerprint of the installed
    // executable, so running the update the banner asks for ends the banner. The
    // helper is 8 lines; the rest is the docstring stating why it stats rather than
    // running `cdx --version` (this runs on every payload build) and where the
    // approach stops working (a launcher shim that never moves).
    "logics_manager/viewer_cdx.py": { maxLines: 1545, ref: "req_348" },
    // 1069: req_323 threaded repo_root through _normalize_git_file_path so it
    // could route through the shared path_utils containment check, and removed
    // git_file_preview_payload's own now-redundant duplicate of the same check.
    // 1090: item_732 gives git_diff_payload the `full` escape hatch git_file_preview_payload
    // in the same module has always had, plus the forced ceiling it is held to. A truncated
    // diff previously reported the word "truncated" and offered no way past it.
    "logics_manager/viewer_git.py": { maxLines: 1090, ref: "req_347" },
    // 4909: release prep baseline.
    // req_311 lifted the document vocabulary into flow/docs.py: 4725 -> 3627. What is left
    // is the verbs and the CLI wiring, sitting on top of primitives that know nothing of them.
    // 3679: req_316 added the proof-format expectation to two findings, the scope block to
    // validate-closeout's help, and the ownership rule to the AC repair. Extraction was not
    // attempted: each addition sits inside the function it explains, and the module's own
    // split landed one request ago.
    // 3682: _print_repair_payload's two skipped-list loops, written for two different
    // repair kinds' shapes, merged into one that branches on the entry's type instead of
    // assuming one shape and crashing on the other.
    // 3193: req_323 lifted the --help text builders (_build_new_help through
    // _build_progress_kind_help, pure string generation with no CLI-running logic
    // of their own) out to flow/help_text.py, the same vocabulary-vs-verbs split
    // already used for flow/docs.py: 3682 -> 3193.
    // 3200: req_324 resolves roadmap refs to full slugs before writing them, in
    // _build_native_roadmap. Seven lines, all of them at the one place that knows which
    // refs a roadmap is being built from; pushing them down into flow/docs.py would put
    // the roadmap's argument shape in the vocabulary module, which is the split this
    // ledger's entry above exists to protect.
    // 3202: req_326 replaced the two-command allow-list at the end of `main` with a
    // read of `payload["ok"]`, and the comment saying why is longer than the branch it
    // replaced. Nothing to extract: this is two lines of dispatch policy at the one
    // place every flow subcommand returns through.
    // 3213: req_330 added the "runbook" branch to cmd_companion and the companion
    // subparser loop, the same shape as the existing product/architecture branches.
    // 3278: req_338 added `flow evidence add` -- the per-criterion proof record, its
    // payload and its parser -- beside `repair ac-traceability`, whose whole-request
    // --proof it composes over. Splitting them would put the two writers of the same
    // AC Traceability section in different files.
    // 3279: one re-export line for SECTION_EMPTY_PLACEHOLDERS, which the package
    // surface guard requires for every top-level name lifted into docs.py.
    // 3311: req_341 closeout exposed that recorded proof never composed into a
    // *scaffolded* task, whose criteria already carry a generated deferred line.
    // Replacing only that generated wording needs a line-locator and a rewriter,
    // both beside the repair loop that is their only caller.
    "logics_manager/flow/__init__.py": { maxLines: 3311, ref: "req_341" },
    // 1429: req_324 added resolve_ref_slug/resolve_ref_slugs (the short-ref expansion the
    // generators needed and _resolve_doc_path already did privately, per kind) plus the
    // rejoin loop in _bullet_values. Both are document vocabulary, so this is where they
    // belong; nothing was extracted because nothing here has grown a second concern.
    // 1492: req_330 added _next_runbook_ref/_build_native_runbook, document
    // vocabulary sitting beside the near-identical _next_adr_ref/_build_native_adr
    // pair they mirror.
    // 1496: req_335 canonicalises the incoming path in the two source resolvers, two
    // lines each, rather than teaching every caller about both spellings.
    "logics_manager/flow/docs.py": { maxLines: 1488, ref: "req_335" },
    // req_273: de-glued frontend sources. esbuild/concatenation now consume these directly
    // instead of a regex part-manifest + readFileSync.join, so the bundles stay byte-stable.
    // 7250: viewer screen minimization and workshop terminal follow-ups added here;
    // 7356: viewer settings/menu follow-up added two lines around the render hot spots;
    // 7405: banked CDX reset column + confirm/activate flow; 7531: CDX disk screen;
    // 7592: Git history commit diff interaction; 7713: release prep baseline;
    // 7816: CDX memory sub-screen.
    // reclaim via the paused state.js/git/workshop split.
    // 7853: req_305 added the workflow-health fetch and the on-demand
    // per-project switcher scan.
    // req_311 lifted the cdx screen into its own module: 7789 -> 5934. git was measured
    // and left: it touches 12 bindings it does not own, so a git module would carry most
    // of the viewer's state with it. That move waits for the shared state itself.
    // 4107: req_315 gave the host a record to read from and write to -- hydrate, persist,
    // and cache -- which is the point of the request rather than something to extract.
    // 4141: req_314 added the Escape route, the banner dismissal, the transient-status
    // clearing and the after-render hook -- each a handler beside the state it reads.
    // 4158: req_313 replaced the title-comparison chain with a screen registry. The
    // registry is longer than the chain it replaces because each screen now declares what
    // it is; extracting it to its own module was not done, since every entry closes over
    // a screen function the host already holds.
    // 4170: the duplicate-executable warning's dismissal (import, one guard clause, one
    // click handler) beside the notice renderer and the click-binding block it already has
    // three siblings in.
    // 4174: showDocument's missing setMeta call, the one screen-opening path that never
    // said it had rendered.
    // 4196: req_321 added applyFixes() and its click delegation, beside the
    // onboarding-action delegation it follows the same shape as.
    // 4219: req_320 wired the new Graph screen - a button getter, the
    // show/hide clause beside Status's identical one, and its click handler
    // beside Status's, following createGraphScreen's own factory pattern.
    // 4260: 2.21.4 turns Settings into a document screen, embeds chain graphs,
    // exposes ChatGPT MCP URL/token copy controls, and reports ignored busy
    // actions. Extraction was limited because each handler closes over host
    // state already owned by this coordinator.
    // 4285: req_330 wired the Runbooks Workshop tab's click delegation (open,
    // search, graph) and passed renderMermaidDiagrams/openDoc into
    // createWorkshopScreen, the same wiring shape createGraphScreen already uses.
    // 4294: req_336 generates the Workshop menu from the workshopTabs registry
    // instead of hand-written markup. The nine lines are the insertion at init;
    // the markup they replace left index.html, and the alternative -- a module
    // for one insertAdjacentHTML -- costs more than it saves.
    // 4447: req_342 added Fleet home/project switching and the 2.21.9 follow-up
    // kept the Fleet favorite click inside that surface. The remaining growth is
    // coordinator glue closing over host state; the browser-host split remains the
    // existing modularization backlog rather than a release-prep side quest.
    // 4461: item_742 routes the MCP connector POST through withPrimaryAction and
    // checks the response before rendering the result as done. It replaces a
    // `.then(() => showChatgptMcp())` that checked neither the HTTP status nor the
    // body's ok, so a refusal re-rendered unchanged state. The eleven added lines are
    // the check and the comment recording the defect; the browser-host split remains
    // the existing modularization backlog.
    // 4540: item_727 moved a failed action's reason out of the meta line, which the
    // next auto-refresh overwrote, into a banner that holds until dismissed; and
    // item_726 split the fallback folder browser so both pickers reach one recovery
    // instead of the fleet one having none. The browser is shared and only what the
    // chosen folder is used for is a parameter -- the alternative, a second modal for
    // fleet roots, is the duplication the item exists to remove.
    // 4572: item_711 makes a root screen -- the fleet home under --fleet -- give up its
    // dismiss chrome and render with nothing behind it. The added code is a title flag,
    // a body-class toggle, and the root condition folded into updateScreenActions, which
    // already owned whether minimize is shown; deciding it in a second place would have
    // won or lost by ordering. The board suppression is CSS, not host code.
    // 4614: item_712/item_714 redraw the fleet home as one row per project. Each project
    // used to be a card with three stacked metric tiles -- about 360px to show three
    // digits -- and is now about 55px. The growth is two small helpers pulled out of the
    // renderer (the state classifier and one metric) plus the degraded-state and empty
    // markup; the card renderer they replace was removed in the same change.
    // 4639: item_713 gives the fleet home a filter, attention-first ordering, and the
    // roots as toolbar chips instead of a stacked section of bordered rows above the grid.
    // The filter re-renders the screen and restores the caret rather than being held
    // outside the render, which keeps the screen a pure function of its state and costs
    // about ten lines to do honestly.
    // 4659: item_715 needed a way back into the fleet home. Separating the fleet
    // capability from the launch intent (item_728) fixed a plain `view` landing there and
    // removed the only route to it -- dropping ?project= from the URL. The switcher is
    // where that belongs: it already answers "which project am I looking at", and the
    // fleet home is "none of them yet".
    // 4670: item_731 routes the Git verdict's action to the control the Actions menu already
    // owns, rather than giving the verdict its own push. Nine lines in the delegated click
    // handler where every other screen action is already dispatched; a second push path
    // would be a second place to change when push changes.
    // 4682: item_732 dispatches the "load the rest of this diff" control in the same
    // delegated handler as the file preview's own force beside it, so asking for the rest of
    // a diff and asking for the rest of a file are one pattern rather than two.
    // 4720: item_737 turns the Settings screen into controls with state -- an identity
    // block, a binary control that shows where it sits, and destructive actions that say
    // what they cost. What came out with it: three navigation entries dressed as settings,
    // their dispatch lines, and a hero that printed the title the document panel already
    // prints above it.
    // 4745: item_770 gives the two slow corpus screens a placeholder that takes the screen's
    // place immediately and names what it is waiting for. Measured against 1 614 workflow
    // documents, they take 7.5-8.6s to become useful cold or warm -- the cost is the scan --
    // and for all that time the viewer left the previous screen up with a status line in the
    // small grey meta text. After the change the title lands in 14ms and 5ms and the wait for
    // content is unchanged.
    // 4765: item_747 splits the incomplete-chain signal by the rule item_746 recorded -- a
    // signal is a defect when it cannot resolve itself, and work in flight when time alone
    // resolves it. The headline counts only the former; the latter is reported without being
    // claimed as work needing a decision.
    // 4785: item_750 passes the corpus's own paths into the health report, which is what
    // lets a finding claiming a document is absent be checked against a corpus that lists it.
    // 4820: item_751 makes Apply fixes ask the server what it would change, name the
    // documents, and apply only if the operator agrees.
    // 4850: item_775 gives the three screens that fetched without a view token one, and checks
    // it before they commit. The guard already existed and already worked -- for the screens
    // that asked it. These three never did, which is why a fleet home could land over
    // whatever the operator opened next.
    // req_356: +45 for item_782's refresh pacing -- the measured cost of the last
    // refresh, the delay derived from it, and the control that says when the cost rather
    // than the setting is pacing the viewer. All three read the auto-refresh state this
    // file already owns; moving them out would mean exporting that state to reach it.
    // req_351: +40 for the reader's identity and its reading layout, then +25 more for
    // the filter panel's reconciled count, the recede rule on Clear filters, and the
    // number the new-request modal states -- all inside functions that already own the
    // DOM they touch. The layout builder
    // itself went to util.js, where the DOM helpers already live; what stays here is the
    // wiring -- the eyebrow, the copy-path control, and the listener handle -- which has
    // to be beside setDocument because that is what owns the document's DOM.
    "clients/viewer/src/browser-host/index.js": { maxLines: 4985, ref: "req_356" },
    // req_312: git and CI, the lift a previous request had recorded as blocked. The cdx
    // lift unblocked it -- twelve foreign bindings became two.
    "clients/viewer/src/browser-host/git.js": { maxLines: 885, ref: "req_312" },
    // req_312: the workshop screen, on the same factory-and-accessor seam as cdx.
    // 1311: 2.21.4 adds the terminal tab's explicit ready meta so the visual
    // smoke can distinguish a settled tab from a silent busy state.
    // 1397: req_330 added the Runbooks tab panel, its search/graph rendering, and
    // the runbook-graph fetch, reusing renderChainGraph from graph.js rather than
    // a new renderer. The runbook card became a real `<a>` (not `<li>` +
    // role=link) for free keyboard activation, two lines over the estimate
    // made before that accessibility fix.
    // 1407: 2.21.9 added the hidden-runbook toggle and made the runbook graph
    // use the shared collapsible chain graph. Both stay in the existing Workshop
    // factory; a second runbook submodule would only move one small tab's state.
    // req_350: +130 across item_756 (the command list's grouping, filter and duration)
    // and item_757 (the runbook rail, category grouping and verification status). Kept
    // in workshop.js because each is the rendering of one of this screen's own tabs --
    // splitting a tab's markup from the tab that owns it would mean two files to read to
    // answer one question about one panel.
    "clients/viewer/src/browser-host/workshop.js": { maxLines: 1540, ref: "req_350" },
    // req_350: +25 for item_759's blocked-launch reason and the tiles it emptied. The
    // reason has to read the plan payload the button already reads, so it stays beside it.
    "clients/viewer/src/browser-host/cdx.js": { maxLines: 3085, ref: "req_350" },
    // De-monolith passes 1-3: pure helpers/data extracted out of index.js. May
    // be split by domain (cdx/git/dom) in later passes as they grow.
    // 1151: req_314 put the environment warning's dismissal beside the renderer that reads
    // it, which is the only other place that knows the warning's shape.
    // 1176: the duplicate-executable warning's dismissal, on the same signature-in-session-
    // storage shape one function above it, so the two dismissible banners stay consistent.
    // 1225: item_734 added formatCiDuration, formatCiAgo and ciStateFromStatus. The last is
    // the one that matters: ciBadgeTone takes a badge *state* and the job rows were feeding
    // it a raw GitHub conclusion, so every job resolved to "unknown" and six rows on a run
    // were drawn identically. It mirrors logics_manager/viewer.py::_ci_badge_state rather
    // than each surface guessing, and says so, because a job read differently on the two
    // sides is a job reported two ways.
    // req_351: +90 for applyReadingLayout and trackReadingPosition. Kept here rather than
    // in render.js because both are DOM shaping over a rendered document, which is what
    // this file already is; a third module for two functions with one caller would be a
    // file to find rather than a seam.
    // req_352: +30 for item_768's focus return and Tab confinement, which belong in
    // createThemedModal/closeThemedModal because those are what open and close the modal
    // -- focus management put anywhere else is management the modal can forget to call.
    "clients/viewer/src/browser-host/util.js": { maxLines: 1380, ref: "req_352" },
    // 2546: req_305 added the workflow-health sections (blocked docs, stale docs)
    // to the health screen, which previously showed lint and audit only.
    // req_312 moved the rendering whose only consumer is the cdx screen into that screen:
    // 2546 -> 1732. Swept to a fixed point, since each move makes the next one's callers
    // single-consumer too.
    // 1735: req_321 added the "Apply fixes" button and its section header, beside
    // the findings list it acts on.
    // 1741: req_336 added renderWorkshopMenuItems beside renderWorkshopTabs, the
    // other consumer of the same registry, so both projections of workshopTabs
    // sit together rather than one drifting in markup.
    // 1800: item_734 rebuilt the CI run section around its verdict -- the duration, the job
    // ordering that puts a failure first, and the counted fold for the passing ones. It is
    // longer than what it replaced because the old version printed the same status string on
    // every row and computed nothing; this computes durations and an order.
    // 1855: item_735 and item_736 rebuilt the Release screen around a verdict that reconciles
    // the gate state, the run result and the evidence count, and reordered the gates so the
    // blocking one leads. What came *out* in the same pass: the CI and Release screens each
    // had their own copy of the job list, and both copies fed ciBadgeTone a raw GitHub
    // conclusion, so every job on both screens resolved to "unknown". One renderCiJobRows
    // now serves both -- two copies of a rendering are two places for the same defect.
    // 1910: item_749 gives Validation health the verdict it owns and stops it restating the
    // release gate's answer in another vocabulary; item_750 groups findings by file with the
    // finding as the headline, and marks a finding the repository itself contradicts. The
    // grouping is longer than the flat list it replaces because it is two levels rather than
    // one, and the contradiction check is a rule rather than a formatting change.
    // 1950: item_752 gives Getting Started a stage navigation in the width its prose measure
    // frees, and item_753 lets each stage report what this project already has there -- a
    // corpus of 1 555 documents was getting the same first-run guide as an empty one, from
    // counts the screen already received.
    // 1960: AC4 -- a document listed under a signal now names the signal that listed it. The
    // same renderer serves several lists and a document can appear under more than one, so
    // the row carries it rather than relying on a heading the reader has scrolled past.
    // req_351: +25 for the new-request modal's destination line and its submit gate.
    // Kept in the modal builder rather than split out: the three parts item_763 adds
    // all read the same field controls, and separating them would mean handing that
    // map across a boundary to save nothing.
    "clients/viewer/src/browser-host/render.js": { maxLines: 2010, ref: "req_350" },
    // 1353: req_314 taught the board to group by status, which is what its control always
    // claimed to do. The grouping itself is eleven lines; the rest is the heading element
    // the accessibility slice needed.
    // 1431: item_718 opens the board on live work. 1 382 of 1 511 documents in this
    // corpus are finished -- 91.5% -- so 13 live items sat under them. Finished work folds
    // per column behind a control that states its count. The fold is a default rather than
    // a filter: a search or a filter that selects finished work turns it off, which the
    // filter-authority tests caught when it did not.
    // 1500: item_719 reallocates the card face -- the near-constant U/C pair off it, age and
    // a status accent onto it. Moving the pure item predicates (formatCardAge,
    // isFinishedForBoard, cardStatusKey) to logicsModel.js, which already owns exactly this
    // kind of function, was tried and dropped: they reach the renderer through mainApp.js's
    // pass-through bag at four call sites, and mainApp.js sits at exactly 1040 of its own
    // 1040, so the move trades one raised ceiling for two and splits one item's logic across
    // three files for about twenty lines.
    // 1560 -> 1420: item_720 retires the card's inline preview, which repeated the details
    // panel's own header, and with it the six helpers that existed only to feed it. That is
    // 150 lines back. The ceiling comes down with them rather than being left where the
    // file's worst moment put it -- a budget that only ratchets upward stops being one.
    // 1500: item_739 makes list mode a table, which needs a row builder rather than a
    // compact card stretched to full width. This reverses what the 1420 entry said -- that
    // the previous raise should be the last -- and the reversal is deliberate rather than
    // silent. The extraction that entry called for was measured here first:
    // renderListView alone calls thirteen names from this closure (attachSentinelObserver,
    // createShowMoreControl, visibleSliceForGroup, focusListHeader, selectItemAndFocus and
    // the rest), so the seam is a design job with its own slice, not a cut taken while
    // delivering a different one. What did not happen: no facts were duplicated for the new
    // mode -- the list reuses createCardTitle, createLinkageBadges, createCardAgeSegment and
    // cardStatusKey, which is what keeps AC17 true.
    // 1510: item_740 gave the list row the same progress encoding as a card, which it had
    // none of. Seven lines, and the alternative was a second encoding that would drift.
    "clients/shared-web/media/renderBoardApp.js": { maxLines: 1510, ref: "req_345" },
    // 1050 -> 1040: item_720 makes selecting a card open the panel it fills (setSelectedId is
    // the single point selection is set from the board, so it is where the two halves of
    // "select and open" stay together), and item_721 replaced this file's copy of the
    // default-collapsed section list with the one logicsModel.js now owns -- mainCore.js had
    // a second copy of the same list, and two lists that must agree eventually stop agreeing.
    // 1045: item_724 passes the items to the activity chrome and the activity entries to the
    // details renderer. Resolving which workflow chain a changed document belongs to needs
    // both, and this file is the one place that holds them -- the resolution itself lives in
    // logicsModel.js so the feed and the panel answer it the same way.
    "clients/shared-web/media/mainApp.js": { maxLines: 1045, ref: "req_345" },
    // 1009: req_322 added stopViewerServers(), the explicit deactivate() path
    // redundant with (not a replacement for) the subscription-disposal path
    // the constructor already registers.
    // 1010: req_331 replaced the three-call startup popup chain
    // (maybeOfferStartupKitUpdate/maybeOfferCodexStartupRemediation, deleted)
    // with one silent managed-refresh call plus an explanatory comment.
    "clients/vscode/src/logicsViewProvider.ts": { maxLines: 1010, ref: "req_331" },
  })
);
const generatedFiles = new Set([
  "clients/viewer/browser-host.js"
]);

const violations = [];

for (const root of sourceRoots) {
  for (const filePath of walk(path.join(repoRoot, root))) {
    const relPath = toRepoPath(filePath);
    if (generatedFiles.has(relPath)) {
      continue;
    }
    const lineCount = countLines(filePath);
    const allowance = allowedOversizedFiles.get(relPath);
    if (lineCount <= defaultLimit) {
      continue;
    }
    if (allowance && lineCount <= allowance.maxLines) {
      continue;
    }
    violations.push({
      relPath,
      lineCount,
      limit: allowance?.maxLines ?? defaultLimit,
      ref: allowance?.ref ?? "new"
    });
  }
}

if (violations.length) {
  console.error(`[line-budget] ${violations.length} source file(s) exceed the configured line budget:`);
  for (const violation of violations) {
    console.error(`- ${violation.relPath}: ${violation.lineCount} lines > ${violation.limit} (${violation.ref})`);
  }
  console.error("A raised ceiling needs a reason in the entry: what was tried, and why the size was kept.");
  process.exit(1);
}

// The ledger only ever went up: each delivery that made a file longer raised its ceiling,
// and nothing lowered one when a file came back down. A ledger that cannot record progress
// records only surrender, so a file now under its recorded ceiling is reported here and
// `--update` writes the lower number back.
const lowerable = [];
for (const [relPath, allowance] of allowedOversizedFiles) {
  const absolute = path.join(repoRoot, relPath);
  if (!existsSync(absolute)) {
    continue;
  }
  const lineCount = countLines(absolute);
  if (lineCount < allowance.maxLines) {
    lowerable.push({ relPath, lineCount, maxLines: allowance.maxLines });
  }
}

if (lowerable.length) {
  const verb = updateRequested ? "Lowered" : "Lowerable";
  console.log(`[line-budget] ${verb} ${lowerable.length} ledger entr(y/ies):`);
  for (const entry of lowerable) {
    console.log(`- ${entry.relPath}: ${entry.lineCount} lines, ceiling ${entry.maxLines}`);
  }
  if (updateRequested) {
    lowerLedger(lowerable);
  } else {
    console.log("Run `npm run check:line-budget -- --update` to write the lower numbers back.");
  }
}

console.log("[line-budget] source line budget passed");

function lowerLedger(entries) {
  const selfPath = fileURLToPath(import.meta.url);
  let source = readFileSync(selfPath, "utf8");
  for (const entry of entries) {
    const pattern = new RegExp(`("${entry.relPath.replace(/[.*+?^$()|[\]\\]/g, "\\$&")}":\\s*\\{\\s*maxLines:\\s*)\\d+`);
    source = source.replace(pattern, `$1${entry.lineCount}`);
  }
  writeFileSync(selfPath, source);
}

function* walk(directory) {
  const stats = statSync(directory, { throwIfNoEntry: false });
  if (!stats?.isDirectory()) {
    return;
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const relSegments = toRepoPath(fullPath).split("/");
    if (entry.isDirectory()) {
      if (relSegments.some((segment) => excludedSegments.has(segment))) {
        continue;
      }
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

function countLines(filePath) {
  const contents = readFileSync(filePath, "utf8");
  if (!contents) {
    return 0;
  }
  return contents.endsWith("\n") ? contents.split("\n").length - 1 : contents.split("\n").length;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
