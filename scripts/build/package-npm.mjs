import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const artifactsDir = path.join(root, "artifacts", "npm");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmArgs = process.platform === "win32"
  ? ["pack", "--pack-destination", artifactsDir]
  : ["pack", "--pack-destination", artifactsDir];

fs.mkdirSync(artifactsDir, { recursive: true });
execFileSync(npmCommand, npmArgs, {
  cwd: root,
  stdio: "inherit",
});
