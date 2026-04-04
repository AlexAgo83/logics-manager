import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  grantReleaseBranchFastForwardConsent,
  inspectReleaseBranchFastForwardConsent
} from "../src/releaseBranchConsent";

describe("release branch fast-forward consent", () => {
  const roots: string[] = [];

  afterEach(() => {
    while (roots.length > 0) {
      fs.rmSync(roots.pop()!, { recursive: true, force: true });
    }
  });

  function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-consent-"));
    roots.push(root);
    return root;
  }

  it("reports missing logics.yaml as unavailable", () => {
    const root = makeRoot();
    const state = inspectReleaseBranchFastForwardConsent(root);

    expect(state.available).toBe(false);
    expect(state.allowed).toBe(false);
    expect(state.reason).toBe("missing-logics-yaml");
  });

  it("reports consent as not granted by default", () => {
    const root = makeRoot();
    fs.writeFileSync(path.join(root, "logics.yaml"), "version: 1\n", "utf-8");

    const state = inspectReleaseBranchFastForwardConsent(root);

    expect(state.available).toBe(true);
    expect(state.allowed).toBe(false);
    expect(state.reason).toBe("not-granted");
  });

  it("persists repo-local consent in logics.yaml", () => {
    const root = makeRoot();
    fs.writeFileSync(path.join(root, "logics.yaml"), "version: 1\n", "utf-8");

    const state = grantReleaseBranchFastForwardConsent(root);
    const yaml = fs.readFileSync(path.join(root, "logics.yaml"), "utf-8");

    expect(state.available).toBe(true);
    expect(state.allowed).toBe(true);
    expect(yaml).toContain("release:");
    expect(yaml).toContain("maintenance:");
    expect(yaml).toContain("allow_fast_forward_local_release_branch: true");
  });
});
