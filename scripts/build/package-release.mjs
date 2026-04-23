import fs from "node:fs";
import path from "node:path";
import { packageVsix } from "./package-vscode-extension.mjs";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const outPath = path.join(root, `logics-manager-${version}.vsix`);

packageVsix(outPath);
