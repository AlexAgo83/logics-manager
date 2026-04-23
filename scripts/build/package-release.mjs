import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const outPath = path.join(root, `logics-manager-${version}.vsix`);

execFileSync("node", ["scripts/run-python.mjs", "scripts/build/package-vsix.py", "--out", outPath], {
  cwd: root,
  stdio: "inherit"
});
