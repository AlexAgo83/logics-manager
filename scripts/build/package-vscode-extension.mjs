import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const EXTENSION_NAME = "cdx-logics-vscode";

export function packageVsix(outputPath) {
  const root = process.cwd();
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), "logics-vsce-stage-"));

  try {
    const extensionManifest = {
      ...packageJson,
      name: EXTENSION_NAME,
    };

    delete extensionManifest.bin;
    delete extensionManifest.files;
    delete extensionManifest.publishConfig;

    fs.writeFileSync(
      path.join(stageDir, "package.json"),
      `${JSON.stringify(extensionManifest, null, 2)}\n`,
      "utf8",
    );

    for (const fileName of ["README.md", "LICENSE"]) {
      const source = path.join(root, fileName);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(stageDir, fileName));
      }
    }

    copyTree(path.join(root, "dist"), path.join(stageDir, "dist"));
    copyTree(path.join(root, "media"), path.join(stageDir, "media"));
    copyTree(path.join(root, "logics_manager"), path.join(stageDir, "logics_manager"));
    fs.mkdirSync(path.join(stageDir, "scripts"), { recursive: true });
    fs.copyFileSync(
      path.join(root, "scripts", "logics-manager.py"),
      path.join(stageDir, "scripts", "logics-manager.py"),
    );

    execFileSync(process.execPath, [resolveVsceEntrypoint(root), "package", "--out", outputPath], {
      cwd: stageDir,
      stdio: "inherit",
    });
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
}

function resolveVsceEntrypoint(root) {
  const packageDirectory = path.join(root, "node_modules", "@vscode", "vsce");
  const packageManifestPath = path.join(packageDirectory, "package.json");
  if (!fs.existsSync(packageManifestPath)) {
    throw new Error(`Missing local VSCE package at ${packageDirectory}. Run npm install before packaging the extension.`);
  }

  const packageManifest = JSON.parse(fs.readFileSync(packageManifestPath, "utf8"));
  const binField = typeof packageManifest.bin === "string" ? packageManifest.bin : packageManifest.bin?.vsce;
  if (typeof binField !== "string" || binField.length === 0) {
    throw new Error(`Invalid VSCE bin entry in ${packageManifestPath}.`);
  }

  return path.join(packageDirectory, binField);
}

function copyTree(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyTree(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}
