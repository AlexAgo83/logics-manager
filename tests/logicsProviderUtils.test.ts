import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: []
  },
  window: {},
  env: {}
}));

import { areSamePath, inspectLogicsBootstrapState } from "../src/logicsProviderUtils";

describe("inspectLogicsBootstrapState", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function makeCanonicalRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-bootstrap-state-"));
    roots.push(root);
    for (const rel of [
      "logics",
      "logics/skills",
      "logics/architecture",
      "logics/product",
      "logics/request",
      "logics/backlog",
      "logics/tasks",
      "logics/specs",
      "logics/external"
    ]) {
      fs.mkdirSync(path.join(root, rel), { recursive: true });
    }
    fs.writeFileSync(
      path.join(root, ".gitmodules"),
      '[submodule "logics/skills"]\n\tpath = logics/skills\n\turl = https://github.com/AlexAgo83/cdx-logics-kit\n',
      "utf8"
    );
    fs.writeFileSync(path.join(root, "logics", "instructions.md"), "# instructions\n", "utf8");
    fs.writeFileSync(path.join(root, "logics.yaml"), "version: 1\n", "utf8");
    fs.writeFileSync(
      path.join(root, ".gitignore"),
      [
        ".env.local",
        "logics/.cache/",
        "logics/.cache/hybrid_assist_audit.jsonl",
        "logics/.cache/hybrid_assist_measurements.jsonl",
        "logics/hybrid_assist_audit.jsonl",
        "logics/hybrid_assist_measurements.jsonl",
        "logics/mutation_audit.jsonl"
      ].join("\n") + "\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(root, ".env.local"),
      "OPENAI_API_KEY=sk-test\nGEMINI_API_KEY=gm-test\n",
      "utf8"
    );
    return root;
  }

  it("marks canonical repos with missing repo-local bootstrap files as convergable", () => {
    const root = makeCanonicalRoot();
    fs.rmSync(path.join(root, "logics.yaml"));

    const state = inspectLogicsBootstrapState(root);

    expect(state.status).toBe("canonical");
    expect(state.canBootstrap).toBe(true);
    expect(state.convergenceNeeded).toBe(true);
    expect(state.missingPaths).toContain("logics.yaml");
    expect(state.actionTitle).toContain("Reconcile");
  });

  it("keeps canonical repos non-bootstrappable once repo-local bootstrap is converged", () => {
    const root = makeCanonicalRoot();

    const state = inspectLogicsBootstrapState(root);

    expect(state.status).toBe("canonical");
    expect(state.canBootstrap).toBe(false);
    expect(state.convergenceNeeded).toBeUndefined();
  });

  it("reports every repo env file missing provider placeholders during convergence", () => {
    const root = makeCanonicalRoot();
    fs.writeFileSync(path.join(root, ".env"), "OPENAI_API_KEY=sk-test\n", "utf8");
    fs.writeFileSync(path.join(root, ".env.production"), "GEMINI_API_KEY=gm-test\n", "utf8");
    fs.writeFileSync(path.join(root, ".env.local"), "OPENAI_API_KEY=sk-test\n", "utf8");

    const state = inspectLogicsBootstrapState(root);

    expect(state.status).toBe("canonical");
    expect(state.canBootstrap).toBe(true);
    expect(state.convergenceNeeded).toBe(true);
    expect(state.missingPaths).toContain(".env");
    expect(state.missingPaths).toContain(".env.local");
    expect(state.missingPaths).toContain(".env.production");
  });
});

describe("areSamePath", () => {
  function withPlatform<T>(platform: NodeJS.Platform, callback: () => T): T {
    const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", {
      value: platform
    });
    try {
      return callback();
    } finally {
      if (descriptor) {
        Object.defineProperty(process, "platform", descriptor);
      }
    }
  }

  it("matches Windows paths across case, slash direction, trailing slashes, and UNC roots", () => {
    withPlatform("win32", () => {
      expect(areSamePath("C:\\Users\\project", "c:\\users\\project")).toBe(true);
      expect(areSamePath("C:/Users/project", "C:\\Users\\project")).toBe(true);
      expect(areSamePath("C:\\Users\\project\\", "C:\\Users\\project")).toBe(true);
      expect(areSamePath("\\\\server\\share\\repo", "\\\\SERVER\\share\\repo\\")).toBe(true);
    });
  });

  it("keeps identical POSIX paths equal without introducing false positives", () => {
    withPlatform("darwin", () => {
      expect(areSamePath("/workspace/mock/logics", "/workspace/mock/logics")).toBe(true);
      expect(areSamePath("/workspace/mock/logics", "/workspace/mock/other")).toBe(false);
    });
  });
});
