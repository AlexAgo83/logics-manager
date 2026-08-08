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
    "logics_manager/mcp.py": { maxLines: 2054, ref: "req_303" },
    "logics_manager/sync.py": { maxLines: 1524, ref: "req_273" },
    "logics_manager/audit.py": { maxLines: 1107, ref: "req_273" },
    "logics_manager/release.py": { maxLines: 1070, ref: "req_273" },
    "logics_manager/assist_support.py": { maxLines: 1477, ref: "req_273" },
    // 5833: banked CDX reset endpoint (/api/cdx-reset); 5879: cdx disk payload/route;
    // 5927: release prep baseline; 5937: CDX memory read-only endpoint.
    // req_311 lifted cdx and git out of viewer.py: 5692 -> 3330. Each sub-system now
    // carries its own ceiling, and its own reason for still being over the budget: they
    // are whole surfaces, split from the core rather than reduced by it.
    "logics_manager/viewer.py": { maxLines: 3322, ref: "req_311" },
    "logics_manager/viewer_cdx.py": { maxLines: 1523, ref: "req_311" },
    "logics_manager/viewer_git.py": { maxLines: 1064, ref: "req_311" },
    // 4909: release prep baseline.
    // req_311 lifted the document vocabulary into flow/docs.py: 4725 -> 3627. What is left
    // is the verbs and the CLI wiring, sitting on top of primitives that know nothing of them.
    "logics_manager/flow/__init__.py": { maxLines: 3626, ref: "req_311" },
    "logics_manager/flow/docs.py": { maxLines: 1368, ref: "req_311" },
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
    "clients/viewer/src/browser-host/index.js": { maxLines: 5829, ref: "req_312" },
    "clients/viewer/src/browser-host/cdx.js": { maxLines: 3057, ref: "req_312" },
    // De-monolith passes 1-3: pure helpers/data extracted out of index.js. May
    // be split by domain (cdx/git/dom) in later passes as they grow.
    "clients/viewer/src/browser-host/util.js": { maxLines: 1122, ref: "browser-host-split" },
    // 2546: req_305 added the workflow-health sections (blocked docs, stale docs)
    // to the health screen, which previously showed lint and audit only.
    // req_312 moved the rendering whose only consumer is the cdx screen into that screen:
    // 2546 -> 1732. Swept to a fixed point, since each move makes the next one's callers
    // single-consumer too.
    "clients/viewer/src/browser-host/render.js": { maxLines: 1732, ref: "req_312" },
    "clients/shared-web/media/renderBoardApp.js": { maxLines: 1325, ref: "req_273" },
    "clients/shared-web/media/mainApp.js": { maxLines: 1040, ref: "req_273" },
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
