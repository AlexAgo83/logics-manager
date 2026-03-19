import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outPath = path.join(os.tmpdir(), "cdx-logics-vscode-ci.vsix");

if (process.platform === "win32") {
  execFileSync("cmd.exe", ["/d", "/s", "/c", "npx", "@vscode/vsce", "package", "--out", outPath], {
    cwd: root,
    stdio: "inherit"
  });
} else {
  execFileSync("npx", ["@vscode/vsce", "package", "--out", outPath], {
    cwd: root,
    stdio: "inherit"
  });
}
