import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";

const repoRoot = process.cwd();
const entryPoint = path.join(repoRoot, "clients", "viewer", "src", "browser-host", "index.js");
const outfile = path.join(repoRoot, "clients", "viewer", "browser-host.js");
const checkOnly = process.argv.includes("--check");

const outputPath = checkOnly ? path.join(mkdtempSync(path.join(tmpdir(), "logics-viewer-host-")), "browser-host.js") : outfile;

try {
  await build({
    entryPoints: [entryPoint],
    outfile: outputPath,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    sourcemap: false,
    legalComments: "none",
    logLevel: "silent"
  });
  normalizeBundle(outputPath);

  if (checkOnly) {
    const expected = readFileSync(outputPath, "utf8");
    const actual = readFileSync(outfile, "utf8");
    if (actual !== expected) {
      console.error("[build-viewer-browser-host] OUT OF DATE: run npm run bundle:viewer-host");
      process.exit(1);
    }
    console.log("[build-viewer-browser-host] bundle is up to date");
  } else {
    console.log("[build-viewer-browser-host] wrote clients/viewer/browser-host.js");
  }
} finally {
  if (checkOnly) {
    rmSync(path.dirname(outputPath), { recursive: true, force: true });
  }
}

function normalizeBundle(filePath) {
  let contents = readFileSync(filePath, "utf8");
  if (contents.startsWith('"use strict";\n')) {
    contents = contents.slice('"use strict";\n'.length);
  }
  // Drop esbuild's leading entry-path banner so the artifact stays byte-stable.
  contents = contents.replace(/^\s*\/\/ .*browser-host[/-].*\.js\n/m, "");
  writeFileSync(filePath, contents);
}
