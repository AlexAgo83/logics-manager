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
    "logics_manager/mcp.py": { maxLines: 1867, ref: "req_323" },
    "logics_manager/sync.py": { maxLines: 1524, ref: "req_273" },
    // 1145: req_321 added `_reposition_ai_context()`, sitting beside the other
    // deterministic `_autofix_structure()` repairs (Status/Schema version) it extends.
    "logics_manager/audit.py": { maxLines: 1145, ref: "req_321" },
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
    "logics_manager/assist_support.py": { maxLines: 1477, ref: "req_273" },
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
    "logics_manager/viewer.py": { maxLines: 3411, ref: "req_323" },
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
    "logics_manager/flow/__init__.py": { maxLines: 3200, ref: "req_324" },
    // 1429: req_324 added resolve_ref_slug/resolve_ref_slugs (the short-ref expansion the
    // generators needed and _resolve_doc_path already did privately, per kind) plus the
    // rejoin loop in _bullet_values. Both are document vocabulary, so this is where they
    // belong; nothing was extracted because nothing here has grown a second concern.
    "logics_manager/flow/docs.py": { maxLines: 1429, ref: "req_324" },
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
    "clients/viewer/src/browser-host/index.js": { maxLines: 4219, ref: "req_320" },
    // req_312: git and CI, the lift a previous request had recorded as blocked. The cdx
    // lift unblocked it -- twelve foreign bindings became two.
    "clients/viewer/src/browser-host/git.js": { maxLines: 885, ref: "req_312" },
    // req_312: the workshop screen, on the same factory-and-accessor seam as cdx.
    "clients/viewer/src/browser-host/workshop.js": { maxLines: 1310, ref: "req_314" },
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
    "clients/viewer/src/browser-host/render.js": { maxLines: 1735, ref: "req_321" },
    // 1353: req_314 taught the board to group by status, which is what its control always
    // claimed to do. The grouping itself is eleven lines; the rest is the heading element
    // the accessibility slice needed.
    "clients/shared-web/media/renderBoardApp.js": { maxLines: 1353, ref: "req_314" },
    "clients/shared-web/media/mainApp.js": { maxLines: 1040, ref: "req_273" },
    // 1009: req_322 added stopViewerServers(), the explicit deactivate() path
    // redundant with (not a replacement for) the subscription-disposal path
    // the constructor already registers.
    "clients/vscode/src/logicsViewProvider.ts": { maxLines: 1009, ref: "req_322" },
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
