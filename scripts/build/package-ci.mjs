import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outPath = path.join(os.tmpdir(), "cdx-logics-vscode-ci.vsix");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

execFileSync(npxCommand, ["@vscode/vsce", "package", "--out", outPath], {
  cwd: root,
  stdio: "inherit"
});
