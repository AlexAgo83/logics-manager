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

const vsixPath = path.join(os.tmpdir(), `cdx-logics-vscode-smoke-${Date.now()}.vsix`);
runVscePackage(vsixPath, "ignore");

const entries = await listZipEntries(vsixPath);
assertHas(entries, "extension/package.json");
assertHas(entries, "extension/dist/extension.js");
assertHas(entries, "extension/dist/vendor/mermaid.min.js");
assertHas(entries, "extension/media/main.js");
assertHas(entries, "extension/media/main.css");
assertHas(entries, "extension/media/uiStatus.js");
assertHas(entries, "extension/media/harnessApi.js");
assertHas(entries, "extension/media/layoutController.js");
assertHas(entries, "extension/media/renderBoard.js");
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
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", "npx", "@vscode/vsce", "package", "--out", outputPath], {
      cwd: root,
      stdio
    });
    return;
  }

  execFileSync("npx", ["@vscode/vsce", "package", "--out", outputPath], {
    cwd: root,
    stdio
  });
}
