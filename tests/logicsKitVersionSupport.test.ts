import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectKitUpdateNeed } from "../clients/vscode/src/logicsKitVersionSupport";

describe("inspectKitUpdateNeed", () => {
  const roots: string[] = [];

  function repoWithRuntime(version: string): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-"));
    roots.push(root);
    fs.writeFileSync(path.join(root, "VERSION"), `${version}\n`, "utf8");
    return root;
  }

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 });
    }
  });

  it("returns null when VERSION is missing or malformed", () => {
    const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-missing-"));
    roots.push(missingRoot);

    expect(inspectKitUpdateNeed(missingRoot, "2.20.0")).toBeNull();

    const malformedRoot = repoWithRuntime("not-a-version");

    expect(inspectKitUpdateNeed(malformedRoot, "2.20.0")).toBeNull();
  });

  it("says nothing about a runtime released with this plugin", () => {
    // The defect: a hand-maintained bound went stale, so the plugin warned about the
    // very pairing its own release had produced.
    expect(inspectKitUpdateNeed(repoWithRuntime("2.20.0"), "2.20.0")).toBeNull();
    expect(inspectKitUpdateNeed(repoWithRuntime("2.20.7"), "2.20.0")).toBeNull();
    expect(inspectKitUpdateNeed(repoWithRuntime("2.15.0"), "2.20.0")).toBeNull();
  });

  it("still warns about a runtime newer than the plugin, naming the plugin's own version", () => {
    expect(inspectKitUpdateNeed(repoWithRuntime("2.21.0"), "2.20.0")).toEqual({
      currentVersion: "2.21.0",
      minimumVersion: "1.7.x",
      maximumVersion: "2.20.x",
      kind: "too-new",
      signature: "kit-too-new:2.21.x->2.20.x"
    });
  });

  it("still flags a runtime below the floor, which is a real bound and stays a constant", () => {
    expect(inspectKitUpdateNeed(repoWithRuntime("1.6.9"), "2.20.0")).toEqual({
      currentVersion: "1.6.9",
      minimumVersion: "1.7.x",
      maximumVersion: "2.20.x",
      kind: "too-old",
      signature: "kit-too-old:1.6.9->1.7.x"
    });
  });

  it("reports nothing as too new when the plugin version is unknown", () => {
    // No plugin version means no honest upper bound; a guess is what produced the defect.
    expect(inspectKitUpdateNeed(repoWithRuntime("9.9.9"), null)).toBeNull();
    expect(inspectKitUpdateNeed(repoWithRuntime("1.6.9"), null)?.kind).toBe("too-old");
  });

  it("keeps too-new prompts stable across patch updates", () => {
    const root = repoWithRuntime("2.21.3");
    const first = inspectKitUpdateNeed(root, "2.20.0")?.signature;

    fs.writeFileSync(path.join(root, "VERSION"), "2.21.4\n", "utf8");
    expect(inspectKitUpdateNeed(root, "2.20.0")?.signature).toBe(first);
  });
});
