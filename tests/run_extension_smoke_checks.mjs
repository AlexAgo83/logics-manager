import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { promisify } from "node:util";
import yauzl from "yauzl";

const openZip = promisify(yauzl.open);
const root = process.cwd();
const outPath = path.join(root, "dist", "extension.js");

if (!fs.existsSync(outPath)) {
  throw new Error("Missing compiled extension bundle at dist/extension.js. Run npm run compile first.");
}

const compiledBundle = fs.readFileSync(outPath, "utf8");
if (!/activate:\s*\(\)\s*=>\s*activate/.test(compiledBundle) || !/module\.exports\s*=/.test(compiledBundle)) {
  throw new Error("Compiled extension bundle does not expose an activate() export.");
}
if (!/deactivate:\s*\(\)\s*=>\s*deactivate/.test(compiledBundle) || !/module\.exports\s*=/.test(compiledBundle)) {
  throw new Error("Compiled extension bundle does not expose a deactivate() export.");
}

const vsixPath = path.join(os.tmpdir(), `logics-manager-smoke-${Date.now()}.vsix`);
runVscePackage(vsixPath, "ignore");

const entries = await listZipEntries(vsixPath);
const packageJson = JSON.parse(await readZipEntry(vsixPath, "extension/package.json"));
if (packageJson.name !== "cdx-logics-vscode") {
  throw new Error(`Expected VSIX package name to be cdx-logics-vscode, got ${packageJson.name || "undefined"}.`);
}
assertHas(entries, "extension/package.json");
assertHas(entries, "extension/dist/extension.js");
assertHas(entries, "extension/dist/vendor/mermaid.min.js");
assertHas(entries, "extension/media/main.js");
assertHas(entries, "extension/media/mainApp.js");
assertHas(entries, "extension/media/main.css");
assertHas(entries, "extension/media/uiStatus.js");
assertHas(entries, "extension/media/harnessApi.js");
assertHas(entries, "extension/media/layoutController.js");
assertHas(entries, "extension/media/renderBoard.js");
assertHas(entries, "extension/media/renderBoardApp.js");
assertHas(entries, "extension/media/renderDetails.js");
assertHas(entries, "extension/media/renderMarkdown.js");
assertHas(entries, "extension/media/css/layout.css");
assertHas(entries, "extension/media/css/toolbar.css");
assertHas(entries, "extension/media/css/board.css");
assertHas(entries, "extension/media/css/details.css");
assertMissingPrefix(entries, "extension/node_modules/");
assertMissingPrefix(entries, "extension/tests/");
assertMissingPrefix(entries, "extension/debug/");
assertMissingPrefix(entries, "extension/src/");
assertMissingPrefix(entries, "extension/.github/");
assertMissingPrefix(entries, "extension/.claude/");
assertMissingPrefix(entries, "extension/changelogs/");
assertMissing(entries, "extension/.gitignore");
assertMissing(entries, "extension/.gitmodules");
assertMissing(entries, "extension/tsconfig.json");
assertMissing(entries, "extension/vitest.config.ts");
assertMissing(entries, "extension/vitest.config.mts");

const releaseVsixPath = path.join(os.tmpdir(), `logics-manager-release-${Date.now()}.vsix`);
runReleasePackage(releaseVsixPath);

const releaseEntries = await listZipEntries(releaseVsixPath);
const releasePackageJson = JSON.parse(await readZipEntry(releaseVsixPath, "extension/package.json"));
const releaseManifest = await readZipEntry(releaseVsixPath, "extension.vsixmanifest");
assertHas(releaseEntries, "[Content_Types].xml");
assertHas(releaseEntries, "extension.vsixmanifest");
if (releasePackageJson.name !== "cdx-logics-vscode") {
  throw new Error(`Expected release VSIX package name to be cdx-logics-vscode, got ${releasePackageJson.name || "undefined"}.`);
}
if (!releaseManifest.includes('Identity Id="cdx-logics-vscode"')) {
  throw new Error("Expected release VSIX manifest to declare the Marketplace identity.");
}
if (!releaseManifest.includes('Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"')) {
  throw new Error("Expected release VSIX manifest to expose the extension package.json asset.");
}

console.log("Extension smoke checks: OK");

async function listZipEntries(vsixFile) {
  const zip = await openZip(vsixFile, { lazyEntries: true });
  const names = [];
  await new Promise((resolve, reject) => {
    zip.readEntry();
    zip.on("entry", (entry) => {
      names.push(entry.fileName);
      zip.readEntry();
    });
    zip.once("end", resolve);
    zip.once("error", reject);
  });
  return names;
}

async function readZipEntry(vsixFile, entryName) {
  const zip = await openZip(vsixFile, { lazyEntries: true });
  return await new Promise((resolve, reject) => {
    let resolved = false;
    zip.readEntry();
    zip.on("entry", (entry) => {
      if (entry.fileName !== entryName) {
        zip.readEntry();
        return;
      }
      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          reject(error || new Error(`Missing read stream for ${entryName}.`));
          return;
        }
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.once("error", reject);
        stream.once("end", () => {
          resolved = true;
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      });
    });
    zip.once("end", () => {
      if (!resolved) {
        reject(new Error(`Expected VSIX to include ${entryName}.`));
      }
    });
    zip.once("error", reject);
  });
}

function assertHas(entries, expected) {
  if (!entries.includes(expected)) {
    throw new Error(`Expected VSIX to include ${expected}.`);
  }
}

function assertMissingPrefix(entries, prefix) {
  if (entries.some((entry) => entry.startsWith(prefix))) {
    throw new Error(`Expected VSIX to exclude ${prefix}`);
  }
}

function assertMissing(entries, unexpected) {
  if (entries.includes(unexpected)) {
    throw new Error(`Expected VSIX to exclude ${unexpected}`);
  }
}

function runVscePackage(outputPath, stdio) {
  execFileSync("node", ["scripts/run-python.mjs", "scripts/build/package-vsix.py", "--out", outputPath], {
    cwd: root,
    stdio
  });
}

function runReleasePackage(outputPath) {
  execFileSync("node", ["scripts/run-python.mjs", "scripts/build/package-vsix.py", "--out", outputPath], {
    cwd: root,
    stdio: "ignore"
  });
}
