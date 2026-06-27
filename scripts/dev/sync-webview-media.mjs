#!/usr/bin/env node
// Mirror the canonical shared-web media tree into the packaged viewer assets.
//
// The pip package ships logics_manager/viewer_assets/media/* verbatim (declared
// as package-data in pyproject.toml; no build hook regenerates it). Every
// hand-authored media file (mainApp.js, renderBoardApp.js, webviewChrome.js,
// mainCore.js, the CSS, ...) lives under clients/shared-web/media; without this
// sync the packaged copies drift behind clients/shared-web/media and ship stale
// to pip installs. This script keeps the whole tree in lockstep.
//
// Usage:
//   node scripts/dev/sync-webview-media.mjs           # copy canonical -> packaged
//   node scripts/dev/sync-webview-media.mjs --check    # fail if out of sync (CI/lint)
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = resolve(repoRoot, "clients/shared-web/media");
const DST = resolve(repoRoot, "logics_manager/viewer_assets/media");
const checkOnly = process.argv.includes("--check");

const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        out.push(relative(root, abs));
      }
    }
  };
  walk(root);
  return out.sort();
}

const srcFiles = listFiles(SRC);
const dstFiles = new Set(listFiles(DST));

const outOfSync = [];
for (const rel of srcFiles) {
  const srcPath = join(SRC, rel);
  const dstPath = join(DST, rel);
  if (!dstFiles.has(rel) || hash(srcPath) !== hash(dstPath)) {
    outOfSync.push(rel);
  }
}
const extras = [...dstFiles].filter((rel) => !srcFiles.includes(rel)).sort();

if (checkOnly) {
  if (outOfSync.length || extras.length) {
    if (outOfSync.length) {
      console.error(`[sync-webview-media] OUT OF SYNC: ${outOfSync.join(", ")}`);
    }
    if (extras.length) {
      console.error(`[sync-webview-media] EXTRA in packaged mirror (not in canonical): ${extras.join(", ")}`);
    }
    console.error("Run: npm run sync:webview-media");
    process.exit(1);
  }
  console.log(`[sync-webview-media] in sync (${srcFiles.length} files)`);
  process.exit(0);
}

for (const rel of outOfSync) {
  const dstPath = join(DST, rel);
  mkdirSync(dirname(dstPath), { recursive: true });
  copyFileSync(join(SRC, rel), dstPath);
}
if (extras.length) {
  console.warn(`[sync-webview-media] note: ${extras.length} file(s) exist only in the packaged mirror and were left untouched: ${extras.join(", ")}`);
}
console.log(`[sync-webview-media] synced ${outOfSync.length} file(s): clients/shared-web/media/ → viewer_assets/media/`);
