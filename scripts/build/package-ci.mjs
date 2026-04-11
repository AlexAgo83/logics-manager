import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outPath = path.join(os.tmpdir(), "cdx-logics-vscode-ci.vsix");

execFileSync("node", ["scripts/run-python.mjs", "scripts/build/package-vsix.py", "--out", outPath], {
  cwd: root,
  stdio: "inherit"
});
