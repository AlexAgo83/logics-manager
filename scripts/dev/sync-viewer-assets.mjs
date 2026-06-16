#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = resolve(repoRoot, "clients/viewer");
const DST = resolve(repoRoot, "logics_manager/viewer_assets/viewer");
const FILES = ["index.html", "browser-host.js", "viewer.css"];
const checkOnly = process.argv.includes("--check");

const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const diffs = FILES.filter((f) => hash(resolve(SRC, f)) !== hash(resolve(DST, f)));

if (checkOnly) {
  if (diffs.length) {
    console.error(`[sync-viewer-assets] OUT OF SYNC: ${diffs.join(", ")}`);
    console.error("Run: npm run sync:viewer-assets");
    process.exit(1);
  }
  console.log("[sync-viewer-assets] in sync");
  process.exit(0);
}

mkdirSync(DST, { recursive: true });
for (const f of FILES) copyFileSync(resolve(SRC, f), resolve(DST, f));
console.log(`[sync-viewer-assets] synced ${FILES.length} files: clients/viewer/ → viewer_assets/viewer/`);
