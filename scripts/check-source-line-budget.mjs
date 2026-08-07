import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

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
    "logics_manager/sync.py": { maxLines: 1600, ref: "req_273" },
    "logics_manager/audit.py": { maxLines: 1200, ref: "req_273" },
    "logics_manager/release.py": { maxLines: 1200, ref: "req_273" },
    "logics_manager/assist_support.py": { maxLines: 1600, ref: "req_273" },
    // 5833: banked CDX reset endpoint (/api/cdx-reset); 5879: cdx disk payload/route;
    // 5927: release prep baseline; 5937: CDX memory read-only endpoint.
    "logics_manager/viewer.py": { maxLines: 5937, ref: "req_273" },
    // 4909: release prep baseline.
    "logics_manager/flow/__init__.py": { maxLines: 4909, ref: "req_273" },
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
    "clients/viewer/src/browser-host/index.js": { maxLines: 7853, ref: "req_305" },
    // De-monolith passes 1-3: pure helpers/data extracted out of index.js. May
    // be split by domain (cdx/git/dom) in later passes as they grow.
    "clients/viewer/src/browser-host/util.js": { maxLines: 1200, ref: "browser-host-split" },
    // 2546: req_305 added the workflow-health sections (blocked docs, stale docs)
    // to the health screen, which previously showed lint and audit only.
    "clients/viewer/src/browser-host/render.js": { maxLines: 2546, ref: "req_305" },
    "clients/shared-web/media/renderBoardApp.js": { maxLines: 1500, ref: "req_273" },
    "clients/shared-web/media/mainApp.js": { maxLines: 1200, ref: "req_273" },
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
  process.exit(1);
}

console.log("[line-budget] source line budget passed");

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
