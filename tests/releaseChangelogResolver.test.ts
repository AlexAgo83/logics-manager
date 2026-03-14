import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

async function loadModule() {
  const modulePath = path.resolve(process.cwd(), "scripts/release/resolve-release-changelog.mjs");
  return import(pathToFileURL(modulePath).href);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("release changelog resolver", () => {
  it("normalizes version and tag inputs", async () => {
    const { normalizeTagOrVersion } = await loadModule();
    expect(normalizeTagOrVersion("1.9.1")).toEqual({ tag: "v1.9.1", version: "1.9.1" });
    expect(normalizeTagOrVersion("v1.9.1")).toEqual({ tag: "v1.9.1", version: "1.9.1" });
    expect(normalizeTagOrVersion("bad")).toBeNull();
  });

  it("resolves the curated changelog path from package version contract", async () => {
    const { resolveReleaseChangelog, getChangelogFilenameForVersion } = await loadModule();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-release-changelog-"));
    tempDirs.push(tmp);
    fs.mkdirSync(path.join(tmp, "changelogs"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ version: "1.9.1" }, null, 2));
    fs.writeFileSync(path.join(tmp, "changelogs", "CHANGELOGS_1_9_1.md"), "# ok\n");

    expect(getChangelogFilenameForVersion("1.9.1")).toBe("CHANGELOGS_1_9_1.md");

    const resolution = resolveReleaseChangelog({ cwd: tmp, tagOrVersion: "1.9.1" });
    expect(resolution.ok).toBe(true);
    expect(resolution.tag).toBe("v1.9.1");
    expect(resolution.relativePath).toBe(path.join("changelogs", "CHANGELOGS_1_9_1.md"));
    expect(resolution.exists).toBe(true);
  });
});
