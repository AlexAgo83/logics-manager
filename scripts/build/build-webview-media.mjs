import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const checkOnly = process.argv.includes("--check");
const bundles = [
  {
    entry: "clients/shared-web/src/main-app/index.js",
    outputs: ["clients/shared-web/media/mainApp.js", "logics_manager/viewer_assets/media/mainApp.js"]
  },
  {
    entry: "clients/shared-web/src/render-board-app/index.js",
    outputs: ["clients/shared-web/media/renderBoardApp.js", "logics_manager/viewer_assets/media/renderBoardApp.js"]
  }
];

const diffs = [];

for (const bundle of bundles) {
  const source = buildSource(bundle.entry);
  for (const relOutput of bundle.outputs) {
    const outputPath = path.join(repoRoot, relOutput);
    if (checkOnly) {
      const current = readFileSync(outputPath, "utf8");
      if (hash(current) !== hash(source)) {
        diffs.push(relOutput);
      }
      continue;
    }
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, source);
  }
}

if (checkOnly) {
  if (diffs.length) {
    console.error(`[build-webview-media] OUT OF DATE: ${diffs.join(", ")}`);
    console.error("Run: npm run bundle:webview-media");
    process.exit(1);
  }
  console.log("[build-webview-media] bundles are up to date");
} else {
  console.log("[build-webview-media] wrote shared web media bundles");
}

function buildSource(relEntry) {
  const entry = path.join(repoRoot, relEntry);
  const sourceRoot = path.dirname(entry);
  return readPartManifest(entry)
    .map((partPath) => readFileSync(path.join(sourceRoot, partPath), "utf8"))
    .join("");
}

function readPartManifest(entry) {
  const source = readFileSync(entry, "utf8");
  const match = source.match(/webviewPartFiles\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error(`Missing webviewPartFiles manifest in ${path.relative(repoRoot, entry)}`);
  }
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (partMatch) => partMatch[1]);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}
