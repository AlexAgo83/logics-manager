import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectKitUpdateNeed } from "../src/logicsKitVersionSupport";

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
    fs.mkdirSync(path.join(missingRoot, "logics", "skills"), { recursive: true });

    expect(inspectKitUpdateNeed(missingRoot)).toBeNull();

    const malformedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-malformed-"));
    roots.push(malformedRoot);
    fs.mkdirSync(path.join(malformedRoot, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(malformedRoot, "logics", "skills", "VERSION"), "not-a-version\n", "utf8");

    expect(inspectKitUpdateNeed(malformedRoot)).toBeNull();
  });

  it("flags versions below the minimum and ignores newer ones", () => {
    const oldRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-old-"));
    roots.push(oldRoot);
    fs.mkdirSync(path.join(oldRoot, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(oldRoot, "logics", "skills", "VERSION"), "1.6.9\n", "utf8");

    expect(inspectKitUpdateNeed(oldRoot)).toEqual({
      currentVersion: "1.6.9",
      minimumVersion: "1.7.x",
      signature: "kit-too-old:1.6.9->1.7.x"
    });

    const newRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-version-new-"));
    roots.push(newRoot);
    fs.mkdirSync(path.join(newRoot, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(newRoot, "logics", "skills", "VERSION"), "1.7.0\n", "utf8");

    expect(inspectKitUpdateNeed(newRoot)).toBeNull();
  });
});
