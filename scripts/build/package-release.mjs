import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { packageVsix } from "./package-vscode-extension.mjs";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const artifactsDir = path.join(root, "artifacts", "vscode");
const outPath = path.join(artifactsDir, `logics-manager-${version}.vsix`);

fs.mkdirSync(artifactsDir, { recursive: true });
packageVsix(outPath);

// item_773: inspect the artifact that was just produced, in the script that produced it.
// Rebuilding it to inspect it would check a different artifact from the released one, and
// checking it anywhere later would be checking something a release can be cut without.
// Measured warm on this repository: 1.7s, on top of a build the release already pays for.
execFileSync(process.execPath, [path.join(root, "scripts", "check-artifact-contents.mjs"), "VS Code"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit"
});
