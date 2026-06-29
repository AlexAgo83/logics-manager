import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    sourcemap: "linked",
    legalComments: "none",
    logLevel: "silent"
  });
  normalizeBundle(outputPath, `${outputPath}.map`);

  if (checkOnly) {
    const expected = readFileSync(outputPath, "utf8");
    const actual = readFileSync(outfile, "utf8");
    const expectedMap = readFileSync(`${outputPath}.map`, "utf8");
    const actualMap = existsSync(`${outfile}.map`) ? readFileSync(`${outfile}.map`, "utf8") : "";
    if (actual !== expected || actualMap !== expectedMap) {
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

function normalizeBundle(filePath, mapPath) {
  let contents = readFileSync(filePath, "utf8");
  let removedLeadingLines = 0;
  if (contents.startsWith('"use strict";\n')) {
    contents = contents.slice('"use strict";\n'.length);
    removedLeadingLines += 1;
  }
  // Drop esbuild's leading entry-path banner so the artifact stays byte-stable.
  const withoutBanner = contents.replace(/^\s*\/\/ .*browser-host[/-].*\.js\n/, "");
  if (withoutBanner !== contents) removedLeadingLines += 1;
  contents = withoutBanner;
  writeFileSync(filePath, contents);
  if (existsSync(mapPath)) {
    const sourceMap = JSON.parse(readFileSync(mapPath, "utf8"));
    if (removedLeadingLines > 0) {
      sourceMap.mappings = String(sourceMap.mappings || "").split(";").slice(removedLeadingLines).join(";");
    }
    sourceMap.sources = (sourceMap.sources || []).map((source) => {
      const normalized = String(source).replace(/\\/g, "/");
      const marker = "/clients/viewer/";
      const markerIndex = normalized.lastIndexOf(marker);
      if (markerIndex >= 0) return normalized.slice(markerIndex + marker.length);
      return normalized.replace(/^clients\/viewer\//, "");
    });
    writeFileSync(mapPath, JSON.stringify(sourceMap));
  }
}
