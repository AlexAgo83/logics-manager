#!/usr/bin/env node
// Generate logics_manager/viewer_assets from the single committed sources.
//
// viewer_assets is NOT committed (req_285): it is the pip package's payload,
// regenerated at build/release time from the canonical sources so a shared-web
// edit is a one-file diff. Sources:
//   clients/shared-web/media/**            -> viewer_assets/media/**   (whole tree)
//   clients/viewer/{index.html,browser-host.js,browser-host.js.map,viewer.css}
//                                          -> viewer_assets/viewer/*
//   node_modules/mermaid/dist/mermaid.min.js -> viewer_assets/vendor/mermaid.min.js
//
// viewer.py falls back to the canonical sources when this tree is absent, so a
// fresh clone runs without a build.
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function copyTree(srcRoot, dstRoot) {
  let count = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        const dst = join(dstRoot, relative(srcRoot, abs));
        mkdirSync(dirname(dst), { recursive: true });
        copyFileSync(abs, dst);
        count += 1;
      }
    }
  };
  walk(srcRoot);
  return count;
}

function copyFiles(srcRoot, dstRoot, files) {
  mkdirSync(dstRoot, { recursive: true });
  for (const f of files) copyFileSync(join(srcRoot, f), join(dstRoot, f));
  return files.length;
}

// ponytail: copies sources over the (gitignored) target without pruning stale
// extras. A clean checkout starts empty, so extras only appear if you delete a
// source locally; `git clean -dx logics_manager/viewer_assets` resets it.
const media = copyTree(
  resolve(repoRoot, "clients/shared-web/media"),
  resolve(repoRoot, "logics_manager/viewer_assets/media")
);
const viewer = copyFiles(
  resolve(repoRoot, "clients/viewer"),
  resolve(repoRoot, "logics_manager/viewer_assets/viewer"),
  ["index.html", "browser-host.js", "browser-host.js.map", "viewer.css"]
);
const vendor = copyFiles(
  resolve(repoRoot, "node_modules/mermaid/dist"),
  resolve(repoRoot, "logics_manager/viewer_assets/vendor"),
  ["mermaid.min.js"]
);

console.log(`[build-assets] generated viewer_assets: ${media} media + ${viewer} viewer + ${vendor} vendor file(s)`);
