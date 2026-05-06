import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("workflow legacy checkout cleanup", () => {
  const workflowDir = path.join(process.cwd(), ".github", "workflows");

  it("does not require recursive submodule checkout in CI or release workflows", () => {
    const files = ["audit.yml", "ci.yml", "publish-npm.yml", "publish-pypi.yml", "release.yml"];
    const offenders: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(workflowDir, file), "utf8");
      if (content.includes("submodules: recursive")) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
