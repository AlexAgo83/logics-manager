import os from "node:os";
import path from "node:path";
import { packageVsix } from "./package-vscode-extension.mjs";

const outPath = path.join(os.tmpdir(), "cdx-logics-vscode-ci.vsix");

packageVsix(outPath);
