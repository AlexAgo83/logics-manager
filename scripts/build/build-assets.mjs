#!/usr/bin/env node
// Generate logics_manager/viewer_assets from the single committed sources.
//
// viewer_assets is NOT committed (req_285): it is the pip package's payload,
// regenerated at build/release time from the canonical sources so a shared-web
// edit is a one-file diff. Sources:
//   clients/shared-web/media/**    -> viewer_assets/media/**   (whole tree)
//   clients/viewer/{index.html,viewer.css} -> viewer_assets/viewer/* (plain copy)
//   clients/viewer/browser-host.js -> viewer_assets/viewer/browser-host.js (minified; item_787)
//   node_modules/mermaid/dist/mermaid.min.js -> viewer_assets/vendor/mermaid.min.js
//
// viewer.py falls back to the canonical sources when this tree is absent, so a
// fresh clone runs without a build.
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

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

// item_787: clients/viewer/browser-host.js stays committed unminified -- its
// own build script (build-viewer-browser-host.mjs) enforces a byte-stable
// `--check` against that file for reviewable diffs. What's actually served
// has no reason to inherit that readability requirement, so it's minified
// here, at the last step before it reaches viewer_assets.
//
// ponytail: the emitted sourcemap only maps the minified output back to the
// already-bundled clients/viewer/browser-host.js, not through to the original
// per-module sources under clients/viewer/src/ -- composing through both
// bundling and minification is more machinery than a packaging step needs.
// Upgrade to a composed source map if debugging the minified asset in the
// field becomes a real need.
async function buildMinifiedViewerBundle(srcRoot, dstRoot) {
  mkdirSync(dstRoot, { recursive: true });
  await build({
    entryPoints: [join(srcRoot, "browser-host.js")],
    outfile: join(dstRoot, "browser-host.js"),
    bundle: false,
    minify: true,
    sourcemap: "linked",
    allowOverwrite: true,
    logLevel: "silent",
  });
  return 1;
}

// ponytail: copies sources over the (gitignored) target without pruning stale
// extras. A clean checkout starts empty, so extras only appear if you delete a
// source locally; `git clean -dx logics_manager/viewer_assets` resets it.
const media = copyTree(
  resolve(repoRoot, "clients/shared-web/media"),
  resolve(repoRoot, "logics_manager/viewer_assets/media")
);
const viewer =
  copyFiles(
    resolve(repoRoot, "clients/viewer"),
    resolve(repoRoot, "logics_manager/viewer_assets/viewer"),
    ["index.html", "viewer.css"]
  ) +
  (await buildMinifiedViewerBundle(
    resolve(repoRoot, "clients/viewer"),
    resolve(repoRoot, "logics_manager/viewer_assets/viewer")
  ));
const vendor = copyFiles(
  resolve(repoRoot, "node_modules/mermaid/dist"),
  resolve(repoRoot, "logics_manager/viewer_assets/vendor"),
  ["mermaid.min.js"]
);

console.log(`[build-assets] generated viewer_assets: ${media} media + ${viewer} viewer + ${vendor} vendor file(s)`);
