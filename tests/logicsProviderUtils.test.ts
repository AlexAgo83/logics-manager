import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: []
  },
  window: {},
  env: {}
}));

import {
  areSamePath,
  buildLogicsKitUpdateCommand,
  detectDangerousGitignorePatterns,
  detectRuntimeInstallType,
  getCreateConfig,
  getNextSequence,
  getWorkspaceRoot,
  inspectLogicsBootstrapConvergence,
  inspectLogicsBootstrapState,
  inspectLogicsRuntimeSource,
  hasMultipleWorkspaceFolders,
  normalizeRelationPath,
  updateIndicatorsOnDisk
} from "../src/logicsProviderUtils";
import { createTempRootTracker } from "./helpers/tempRootTracker";

describe("inspectLogicsBootstrapState", () => {
  const tracker = createTempRootTracker("logics-bootstrap-state-");

  afterEach(() => {
    tracker.cleanup();
  });

  function makeCanonicalRoot(): string {
    const root = tracker.makeRoot();
    for (const rel of [
      "logics",
      "scripts",
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
    fs.writeFileSync(path.join(root, "AGENTS.md"), "# agents\n", "utf8");
    fs.writeFileSync(path.join(root, "LOGICS.md"), "# logics\n", "utf8");
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "# bundled runtime\n", "utf8");
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

    expect(state.status).toBe("incomplete");
    expect(state.canBootstrap).toBe(true);
    expect(state.convergenceNeeded).toBe(true);
    expect(state.missingPaths).toContain("logics.yaml");
    expect(state.actionTitle).toContain("Repair");
  });

  it("keeps canonical repos non-bootstrappable once repo-local bootstrap is converged", () => {
    const root = makeCanonicalRoot();

    const state = inspectLogicsBootstrapState(root);

    expect(state.status).toBe("canonical");
    expect(state.canBootstrap).toBe(false);
    expect(state.convergenceNeeded).toBeUndefined();
  });

  it("reports AGENTS.md and LOGICS.md as required convergence files", () => {
    const root = makeCanonicalRoot();
    fs.rmSync(path.join(root, "AGENTS.md"));
    fs.rmSync(path.join(root, "LOGICS.md"));

    const convergence = inspectLogicsBootstrapConvergence(root);

    expect(convergence.needed).toBe(true);
    expect(convergence.missingPaths).toContain("AGENTS.md");
    expect(convergence.missingPaths).toContain("LOGICS.md");
  });

  it("keeps canonical bootstrap converged when AGENTS.md and LOGICS.md are present", () => {
    const root = makeCanonicalRoot();

    const convergence = inspectLogicsBootstrapConvergence(root);

    expect(convergence.needed).toBe(false);
    expect(convergence.missingPaths).toEqual([]);
  });

  it("reports every repo env file missing provider placeholders during convergence", () => {
    const root = makeCanonicalRoot();
    fs.writeFileSync(path.join(root, ".env"), "OPENAI_API_KEY=sk-test\n", "utf8");
    fs.writeFileSync(path.join(root, ".env.production"), "GEMINI_API_KEY=gm-test\n", "utf8");
    fs.writeFileSync(path.join(root, ".env.local"), "OPENAI_API_KEY=sk-test\n", "utf8");

    const state = inspectLogicsBootstrapState(root);

    expect(state.status).toBe("incomplete");
    expect(state.canBootstrap).toBe(true);
    expect(state.convergenceNeeded).toBe(true);
    expect(state.missingPaths).toContain(".env");
    expect(state.missingPaths).toContain(".env.local");
    expect(state.missingPaths).toContain(".env.production");
  });
});

describe("workspace root helpers", () => {
  afterEach(() => {
    (vscode.workspace as { workspaceFolders: Array<{ uri: { fsPath: string } }> }).workspaceFolders = [];
  });

  it("reports zero, single, and multiple workspace folders consistently", () => {
    const workspace = vscode.workspace as { workspaceFolders: Array<{ uri: { fsPath: string } }> };

    workspace.workspaceFolders = [];
    expect(getWorkspaceRoot()).toBeNull();
    expect(hasMultipleWorkspaceFolders()).toBe(false);

    workspace.workspaceFolders = [{ uri: { fsPath: "/workspace/one" } }];
    expect(getWorkspaceRoot()).toBe("/workspace/one");
    expect(hasMultipleWorkspaceFolders()).toBe(false);

    workspace.workspaceFolders = [
      { uri: { fsPath: "/workspace/one" } },
      { uri: { fsPath: "/workspace/two" } }
    ];
    expect(getWorkspaceRoot()).toBeNull();
    expect(hasMultipleWorkspaceFolders()).toBe(true);
  });
});

describe("inspectLogicsRuntimeSource", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports missing and canonical runtime entrypoints precisely", () => {
    const missingSkillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-missing-skills-"));
    roots.push(missingSkillsRoot);
    const missingSkills = inspectLogicsRuntimeSource(missingSkillsRoot);
    expect(missingSkills.exists).toBe(false);
    expect(missingSkills.isCanonical).toBe(false);
    expect(missingSkills.reason).toContain("bundled Logics runtime entrypoint");

    const canonicalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-canonical-runtime-"));
    roots.push(canonicalRoot);
    fs.mkdirSync(path.join(canonicalRoot, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(canonicalRoot, "scripts", "logics-manager.py"), "# runtime\n", "utf8");

    const canonical = inspectLogicsRuntimeSource(canonicalRoot);
    expect(canonical.exists).toBe(true);
    expect(canonical.isCanonical).toBe(true);
    expect(canonical.reason).toContain("Bundled Logics runtime entrypoint");
  });

  it("flags missing bundled runtime entrypoints", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-noncanonical-"));
    roots.push(root);
    const inspection = inspectLogicsRuntimeSource(root);

    expect(inspection.exists).toBe(false);
    expect(inspection.isCanonical).toBe(false);
  });
});

describe("bootstrap state helpers", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("distinguishes missing and incomplete bootstrap setups", () => {
    const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-bootstrap-missing-"));
    roots.push(missingRoot);

    const missing = inspectLogicsBootstrapState(missingRoot);
    expect(missing.status).toBe("missing");
    expect(missing.canBootstrap).toBe(true);
    expect(missing.actionTitle).toContain("Bootstrap");

    const incompleteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-bootstrap-incomplete-"));
    roots.push(incompleteRoot);
    fs.mkdirSync(path.join(incompleteRoot, "logics"), { recursive: true });
    fs.mkdirSync(path.join(incompleteRoot, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(incompleteRoot, "scripts", "logics-manager.py"), "# runtime\n", "utf8");

    const incomplete = inspectLogicsBootstrapState(incompleteRoot);
    expect(incomplete.status).toBe("incomplete");
    expect(incomplete.canBootstrap).toBe(true);
    expect(incomplete.actionTitle).toContain("Repair");
  });

  it("ignores gitmodules drift once the repo-local bootstrap is converged", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-bootstrap-converged-"));
    roots.push(root);
    for (const rel of [
      "logics",
      "scripts",
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
    fs.writeFileSync(path.join(root, "AGENTS.md"), "# agents\n", "utf8");
    fs.writeFileSync(path.join(root, "LOGICS.md"), "# logics\n", "utf8");
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
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "# runtime\n", "utf8");

    const state = inspectLogicsBootstrapState(root);

    expect(state.status).toBe("canonical");
    expect(state.canBootstrap).toBe(false);
    expect(state.reason).toBe("Repo-local Logics bootstrap is converged.");
  });
});

describe("catalog helpers", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("maps creation kinds and sequence prefixes", () => {
    expect(getCreateConfig("request")).toEqual({
      dir: "logics/request",
      prefix: "req_",
      label: "request"
    });
    expect(getCreateConfig("backlog")).toEqual({
      dir: "logics/backlog",
      prefix: "item_",
      label: "backlog item"
    });
    expect(getCreateConfig("task")).toEqual({
      dir: "logics/tasks",
      prefix: "task_",
      label: "task"
    });
    expect(getCreateConfig("other" as never)).toBeNull();
  });

  it("returns the next numeric suffix for a prefix and ignores unrelated files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-next-sequence-"));
    roots.push(root);
    const dir = path.join(root, "logics", "request");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "req_001_alpha.md"), "", "utf8");
    fs.writeFileSync(path.join(dir, "req_007_beta.md"), "", "utf8");
    fs.writeFileSync(path.join(dir, "req_notes.md"), "", "utf8");
    fs.writeFileSync(path.join(dir, "other.txt"), "", "utf8");

    expect(getNextSequence(dir, "req_")).toBe(8);
    expect(getNextSequence(path.join(root, "missing"), "req_")).toBe(1);
  });

  it("normalizes relation paths and update indicators on disk", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-paths-"));
    roots.push(root);
    const markdownPath = path.join(root, "logics", "request", "req_001_example.md");
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.writeFileSync(
      markdownPath,
      "## req_001_example - Example\n> Status: Draft\n",
      "utf8"
    );

    const item = { id: "req_001_example", relPath: "logics/request/req_001_example.md" };
    expect(normalizeRelationPath("", [item], root)).toBeNull();
    expect(normalizeRelationPath("req_001_example", [item], root)).toBe(item.relPath);
    expect(
      normalizeRelationPath(path.join(root, "logics", "backlog", "item_010.md"), [item], root)
    ).toBe("logics/backlog/item_010.md");

    const outsidePath = path.resolve(root, "../outside.md");
    expect(normalizeRelationPath(outsidePath, [item], root)).toBe(outsidePath);

    expect(updateIndicatorsOnDisk(markdownPath, {})).toBe(false);
    expect(
      updateIndicatorsOnDisk(markdownPath, {
        Status: "Ready",
        Progress: "50%"
      })
    ).toBe(true);
    expect(fs.readFileSync(markdownPath, "utf8")).toContain("> Progress: 50%");
  });

  it("exposes the runtime update command string", () => {
    expect(buildLogicsKitUpdateCommand()).toBe("python3 -m logics_manager bootstrap");
  });
});

describe("detectDangerousGitignorePatterns", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("detects broad logics patterns that would hide the bundled runtime", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-gitignore-"));
    roots.push(root);
    fs.writeFileSync(
      path.join(root, ".gitignore"),
      [
        "# generated",
        "logics/",
        "logics/*",
        "logics/**",
        "!logics/request/"
      ].join("\n"),
      "utf8"
    );

    const inspection = detectDangerousGitignorePatterns(root);

    expect(inspection.hasDangerousPatterns).toBe(true);
    expect(inspection.matchedPatterns).toEqual(["logics/", "logics/*", "logics/**"]);
    expect(inspection.reason).toContain("repo-local Logics runtime paths");
  });

  it("ignores harmless .gitignore entries", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-gitignore-"));
    roots.push(root);
    fs.writeFileSync(path.join(root, ".gitignore"), "node_modules/\n*.vsix\n", "utf8");

    const inspection = detectDangerousGitignorePatterns(root);

    expect(inspection.hasDangerousPatterns).toBe(false);
    expect(inspection.matchedPatterns).toEqual([]);
  });
});

describe("detectRuntimeInstallType", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("detects the bundled runtime when the entrypoint exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-install-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "# runtime\n", "utf8");

    expect(detectRuntimeInstallType(root)).toBe("bundled-runtime");
  });

  it("falls back to plain-copy when the bundled entrypoint is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-install-"));
    roots.push(root);
    expect(detectRuntimeInstallType(root)).toBe("plain-copy");
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
