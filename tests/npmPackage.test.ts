import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function packPackage() {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-npm-cache-"));
  const output = execFileSync("npm", ["pack", "--json"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: cacheDir }
  });
  const payload = JSON.parse(output) as Array<{
    entryCount: number;
    files: Array<{ path: string }>;
  }>;
  return payload[0];
}

describe("npm package surface", () => {
  it("packages the CLI wrapper without bundling the whole repo", () => {
    const packed = packPackage();
    const filePaths = packed.files.map((entry) => entry.path);

    expect(packed.entryCount).toBeLessThan(40);
    expect(filePaths).toContain("VERSION");
    expect(filePaths).toContain("scripts/npm/logics-manager.mjs");
    expect(filePaths).toContain("scripts/logics-manager.py");
    expect(filePaths).toContain("logics_manager/cli.py");
    expect(filePaths).not.toContain("src/logicsViewProvider.ts");
    expect(filePaths).not.toContain("tests/logicsManagerNpmWrapper.test.ts");
  });

  it("installs and runs the published CLI wrapper from a packed tarball", () => {
    const packed = packPackage();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-npm-install-"));
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-npm-cache-"));

    try {
      execFileSync("npm", ["install", "--ignore-scripts", "--no-package-lock", path.join(root, packed.filename)], {
        cwd: tempRoot,
        encoding: "utf8",
        env: { ...process.env, npm_config_cache: cacheDir }
      });

      const wrapperPath = path.join(tempRoot, "node_modules", "logics-manager", "scripts", "npm", "logics-manager.mjs");
      execFileSync("node", [wrapperPath, "--help"], {
        cwd: tempRoot,
        encoding: "utf8",
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  });
});
