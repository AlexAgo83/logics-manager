import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";

const repoRoot = process.cwd();
const entryPoint = path.join(repoRoot, "clients", "viewer", "src", "browser-host", "index.js");
const outfile = path.join(repoRoot, "clients", "viewer", "browser-host.js");
const checkOnly = process.argv.includes("--check");

const outputPath = checkOnly ? path.join(mkdtempSync(path.join(tmpdir(), "logics-viewer-host-")), "browser-host.js") : outfile;
const buildEntryPoint = await resolveBuildEntryPoint();

try {
  await build({
    entryPoints: [buildEntryPoint],
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
  if (buildEntryPoint !== entryPoint) {
    rmSync(path.dirname(buildEntryPoint), { recursive: true, force: true });
  }
}

function resolveBuildEntryPoint() {
  const partFiles = readPartManifest();
  if (partFiles.length === 0) {
    return entryPoint;
  }
  const tempDir = mkdtempSync(path.join(tmpdir(), "logics-viewer-host-src-"));
  const tempEntry = path.join(tempDir, "browser-host-entry.js");
  const sourceRoot = path.dirname(entryPoint);
  const source = partFiles
    .map((partPath) => readFileSync(path.join(sourceRoot, partPath), "utf8"))
    .join("");
  writeFileSync(tempEntry, source);
  return tempEntry;
}

function readPartManifest() {
  const source = readFileSync(entryPoint, "utf8");
  const match = source.match(/browserHostPartFiles\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    return [];
  }
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (partMatch) => partMatch[1]);
}

function normalizeBundle(filePath) {
  let contents = readFileSync(filePath, "utf8");
  if (contents.startsWith('"use strict";\n')) {
    contents = contents.slice('"use strict";\n'.length);
  }
  contents = contents.replace(/^\s*\/\/ .*browser-host-entry\.js\n/m, "");
  writeFileSync(filePath, contents);
}
