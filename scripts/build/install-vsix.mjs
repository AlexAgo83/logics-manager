import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const vsixPath = path.join(root, `cdx-logics-vscode-${version}.vsix`);
const codeCommand = process.platform === "win32" ? "code.cmd" : "code";

if (!fs.existsSync(vsixPath)) {
  console.error(`VSIX not found: ${vsixPath}. Run npm run package first.`);
  process.exit(1);
}

execFileSync(codeCommand, ["--install-extension", vsixPath, "--force"], {
  cwd: root,
  stdio: "inherit"
});
