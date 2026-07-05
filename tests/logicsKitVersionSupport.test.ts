import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectKitUpdateNeed } from "../clients/vscode/src/logicsKitVersionSupport";

describe("inspectKitUpdateNeed", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns null when VERSION is missing or malformed", () => {
    const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-missing-"));
    roots.push(missingRoot);

    expect(inspectKitUpdateNeed(missingRoot)).toBeNull();

    const malformedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-malformed-"));
    roots.push(malformedRoot);
    fs.writeFileSync(path.join(malformedRoot, "VERSION"), "not-a-version\n", "utf8");

    expect(inspectKitUpdateNeed(malformedRoot)).toBeNull();
  });

  it("flags versions below the minimum and above the maximum", () => {
    const oldRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-old-"));
    roots.push(oldRoot);
    fs.writeFileSync(path.join(oldRoot, "VERSION"), "1.6.9\n", "utf8");

    expect(inspectKitUpdateNeed(oldRoot)).toEqual({
      currentVersion: "1.6.9",
      minimumVersion: "1.7.x",
      maximumVersion: "2.15.x",
      kind: "too-old",
      signature: "kit-too-old:1.6.9->1.7.x"
    });

    const newRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-new-"));
    roots.push(newRoot);
    fs.writeFileSync(path.join(newRoot, "VERSION"), "2.16.0\n", "utf8");

    expect(inspectKitUpdateNeed(newRoot)).toEqual({
      currentVersion: "2.16.0",
      minimumVersion: "1.7.x",
      maximumVersion: "2.15.x",
      kind: "too-new",
      signature: "kit-too-new:2.16.0->2.15.x"
    });

    const supportedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-supported-"));
    roots.push(supportedRoot);
    fs.writeFileSync(path.join(supportedRoot, "VERSION"), "2.15.7\n", "utf8");

    expect(inspectKitUpdateNeed(supportedRoot)).toBeNull();
  });
});
