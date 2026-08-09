import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCleanupPlan,
  cleanLocalArtifacts,
  formatCleanupResult,
  parseCleanArgs
} from "../scripts/dev/clean-local-artifacts.mjs";

function withTempRepo(run: (repoRoot: string) => void) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-clean-artifacts-"));
  try {
    run(repoRoot);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true, maxRetries: 3 });
  }
}

describe("clean-local-artifacts", () => {
  it("previews bounded local artifact targets without deleting them", () => {
    withTempRepo((repoRoot) => {
      const artifactFile = path.join(repoRoot, "artifacts", "local-viewer-smoke", "summary.json");
      fs.mkdirSync(path.dirname(artifactFile), { recursive: true });
      fs.writeFileSync(artifactFile, "{}\n");

      const result = cleanLocalArtifacts(repoRoot, { targets: ["artifacts"] });

      expect(result.apply).toBe(false);
      expect(result.removed).toEqual([]);
      expect(result.plan).toMatchObject([{ path: "artifacts", exists: true }]);
      expect(fs.existsSync(artifactFile)).toBe(true);
      expect(formatCleanupResult(result)).toContain("Run with --apply");
    });
  });

  it("removes only requested repo-relative targets when apply is set", () => {
    withTempRepo((repoRoot) => {
      const buildFile = path.join(repoRoot, "build", "package", "extension.vsix");
      const cacheFile = path.join(repoRoot, "logics", ".cache", "index.json");
      const sourceFile = path.join(repoRoot, "README.md");
      fs.mkdirSync(path.dirname(buildFile), { recursive: true });
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(buildFile, "vsix");
      fs.writeFileSync(cacheFile, "{}");
      fs.writeFileSync(sourceFile, "# keep\n");

      const result = cleanLocalArtifacts(repoRoot, {
        apply: true,
        targets: ["build", "logics/.cache"]
      });

      expect(result.removed).toEqual(["build", "logics/.cache"]);
      expect(fs.existsSync(path.join(repoRoot, "build"))).toBe(false);
      expect(fs.existsSync(path.join(repoRoot, "logics", ".cache"))).toBe(false);
      expect(fs.existsSync(sourceFile)).toBe(true);
    });
  });

  it("rejects targets outside the repository root", () => {
    withTempRepo((repoRoot) => {
      expect(() => buildCleanupPlan(repoRoot, ["../outside"])).toThrow(/outside the repository/);
    });
  });

  it("parses apply and extra target arguments", () => {
    expect(parseCleanArgs(["--apply", "--target", "tmp/cache"])).toMatchObject({
      apply: true,
      targets: expect.arrayContaining(["tmp/cache"])
    });
  });
});
