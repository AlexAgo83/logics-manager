#!/usr/bin/env node
// Copy third-party vendor assets into the packaged viewer_assets tree.
//
// Only mermaid lives at viewer_assets/vendor/ (the media/vendor/* trees are
// hand-authored under clients/shared-web/media and mirrored by sync-webview-media).
// mermaid ships from node_modules, so it has no committed source under clients/;
// build:assets regenerates it here instead of versioning a copy.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = resolve(repoRoot, "node_modules/mermaid/dist/mermaid.min.js");
const DST = resolve(repoRoot, "logics_manager/viewer_assets/vendor/mermaid.min.js");

mkdirSync(dirname(DST), { recursive: true });
copyFileSync(SRC, DST);
console.log("[copy-vendor-assets] copied mermaid.min.js -> viewer_assets/vendor/");
