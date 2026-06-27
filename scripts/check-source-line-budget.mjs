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
    "clients/vscode/src/logicsCorpusInsightsHtml.ts": { maxLines: 1114, ref: "unplanned-current" },
    // req_273: de-glued importable modules. A single large importable module beats the
    // exec(compile(concat parts)) text-glue these replaced (real tracebacks, IDE, type-check).
    // The default 1000 budget still catches genuinely new monoliths.
    "logics_manager/mcp.py": { maxLines: 1700, ref: "req_273" },
    "logics_manager/sync.py": { maxLines: 1600, ref: "req_273" },
    "logics_manager/audit.py": { maxLines: 1200, ref: "req_273" },
    "logics_manager/release.py": { maxLines: 1200, ref: "req_273" },
    "logics_manager/assist_support.py": { maxLines: 1600, ref: "req_273" },
    "logics_manager/viewer.py": { maxLines: 5700, ref: "req_273" },
    "logics_manager/flow/__init__.py": { maxLines: 4520, ref: "req_273" },
    // req_273: de-glued frontend sources. esbuild/concatenation now consume these directly
    // instead of a regex part-manifest + readFileSync.join, so the bundles stay byte-stable.
    // 7100: viewer screen minimization and workshop terminal follow-ups added here;
    // reclaim via the paused state.js/git/workshop split.
    "clients/viewer/src/browser-host/index.js": { maxLines: 7100, ref: "req_273" },
    // De-monolith passes 1-3: pure helpers/data extracted out of index.js. May
    // be split by domain (cdx/git/dom) in later passes as they grow.
    "clients/viewer/src/browser-host/util.js": { maxLines: 1200, ref: "browser-host-split" },
    "clients/viewer/src/browser-host/render.js": { maxLines: 2500, ref: "browser-host-split" },
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
