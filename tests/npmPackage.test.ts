import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function npmCommand() {
  return process.platform === "win32" ? "cmd.exe" : "npm";
}

function npmArgs(args: string[]) {
  return process.platform === "win32" ? ["/d", "/s", "/c", "npm", ...args] : args;
}

function packPackage() {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-npm-cache-"));
  const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-npm-pack-"));
  const output = execFileSync(npmCommand(), npmArgs(["pack", "--json", "--pack-destination", packageDir]), {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: cacheDir }
  });
  const payload = JSON.parse(output) as Array<{
    entryCount: number;
    filename: string;
    files: Array<{ path: string }>;
  }>;
  fs.rmSync(cacheDir, { recursive: true, force: true });
  return { ...payload[0], packageDir };
}

describe("npm package surface", () => {
  it("packages the CLI wrapper without bundling the whole repo", () => {
    const packed = packPackage();
    try {
      const filePaths = packed.files.map((entry) => entry.path);

      expect(packed.entryCount).toBeLessThan(75);
      expect(filePaths).toContain("VERSION");
      expect(filePaths).toContain("scripts/npm/logics-manager.mjs");
      expect(filePaths).toContain("scripts/logics-manager.py");
      expect(filePaths).toContain("logics_manager/cli.py");
      expect(filePaths).toContain("logics_manager/viewer.py");
      expect(filePaths).toContain("clients/viewer/index.html");
      expect(filePaths).toContain("clients/viewer/browser-host.js");
      expect(filePaths).toContain("clients/viewer/viewer.css");
      expect(filePaths).toContain("dist/vendor/mermaid.min.js");
      expect(filePaths).toContain("clients/shared-web/media/mainApp.js");
      expect(filePaths).not.toContain("src/logicsViewProvider.ts");
      expect(filePaths).not.toContain("clients/vscode/src/logicsViewProvider.ts");
      expect(filePaths).not.toContain("logics/request/req_201_add_a_local_web_viewer_for_cli_driven_logics_work.md");
      expect(filePaths).not.toContain("tests/logicsManagerNpmWrapper.test.ts");
    } finally {
      fs.rmSync(packed.packageDir, { recursive: true, force: true });
    }
  });

  it("installs and runs the published CLI wrapper from a packed tarball", () => {
    const packed = packPackage();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-npm-install-"));
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-npm-cache-"));

    try {
      execFileSync(
        npmCommand(),
        npmArgs(["install", "--ignore-scripts", "--no-package-lock", path.join(packed.packageDir, packed.filename)]),
        {
          cwd: tempRoot,
          encoding: "utf8",
          env: { ...process.env, npm_config_cache: cacheDir }
        }
      );

      const wrapperPath = path.join(
        tempRoot,
        "node_modules",
        "@grifhinz",
        "logics-manager",
        "scripts",
        "npm",
        "logics-manager.mjs"
      );
      execFileSync("node", [wrapperPath, "--help"], {
        cwd: tempRoot,
        encoding: "utf8",
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.rmSync(packed.packageDir, { recursive: true, force: true });
    }
  }, 30000);
});
