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
    "logics_manager/cli.py": { maxLines: 1046, ref: "req_333" },
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
    "logics_manager/audit.py": { maxLines: 1304, ref: "req_334" },
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
    "logics_manager/viewer.py": { maxLines: 3504, ref: "req_330" },
    "logics_manager/viewer_cdx.py": { maxLines: 1523, ref: "req_311" },
    // 1069: req_323 threaded repo_root through _normalize_git_file_path so it
    // could route through the shared path_utils containment check, and removed
    // git_file_preview_payload's own now-redundant duplicate of the same check.
    "logics_manager/viewer_git.py": { maxLines: 1069, ref: "req_323" },
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
    "logics_manager/flow/__init__.py": { maxLines: 3278, ref: "req_338" },
    // 1429: req_324 added resolve_ref_slug/resolve_ref_slugs (the short-ref expansion the
    // generators needed and _resolve_doc_path already did privately, per kind) plus the
    // rejoin loop in _bullet_values. Both are document vocabulary, so this is where they
    // belong; nothing was extracted because nothing here has grown a second concern.
    // 1492: req_330 added _next_runbook_ref/_build_native_runbook, document
    // vocabulary sitting beside the near-identical _next_adr_ref/_build_native_adr
    // pair they mirror.
    // 1496: req_335 canonicalises the incoming path in the two source resolvers, two
    // lines each, rather than teaching every caller about both spellings.
    "logics_manager/flow/docs.py": { maxLines: 1496, ref: "req_335" },
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
    "clients/viewer/src/browser-host/index.js": { maxLines: 4294, ref: "req_336" },
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
    "clients/viewer/src/browser-host/workshop.js": { maxLines: 1397, ref: "req_330" },
    "clients/viewer/src/browser-host/cdx.js": { maxLines: 3057, ref: "req_312" },
    // De-monolith passes 1-3: pure helpers/data extracted out of index.js. May
    // be split by domain (cdx/git/dom) in later passes as they grow.
    // 1151: req_314 put the environment warning's dismissal beside the renderer that reads
    // it, which is the only other place that knows the warning's shape.
    // 1176: the duplicate-executable warning's dismissal, on the same signature-in-session-
    // storage shape one function above it, so the two dismissible banners stay consistent.
    "clients/viewer/src/browser-host/util.js": { maxLines: 1176, ref: "req_314" },
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
    "clients/viewer/src/browser-host/render.js": { maxLines: 1741, ref: "req_336" },
    // 1353: req_314 taught the board to group by status, which is what its control always
    // claimed to do. The grouping itself is eleven lines; the rest is the heading element
    // the accessibility slice needed.
    "clients/shared-web/media/renderBoardApp.js": { maxLines: 1353, ref: "req_314" },
    "clients/shared-web/media/mainApp.js": { maxLines: 1040, ref: "req_273" },
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
