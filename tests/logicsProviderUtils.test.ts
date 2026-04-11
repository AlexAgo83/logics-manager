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
  detectKitInstallType,
  getCreateConfig,
  getNextSequence,
  getWorkspaceRoot,
  inspectLogicsBootstrapState,
  inspectLogicsKitSubmodule,
  hasMultipleWorkspaceFolders,
  normalizeRelationPath,
  updateIndicatorsOnDisk
} from "../src/logicsProviderUtils";

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

describe("inspectLogicsKitSubmodule", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports missing skills and gitmodules states precisely", () => {
    const missingSkillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-missing-skills-"));
    roots.push(missingSkillsRoot);
    fs.writeFileSync(path.join(missingSkillsRoot, ".gitmodules"), "", "utf8");

    const missingSkills = inspectLogicsKitSubmodule(missingSkillsRoot);
    expect(missingSkills.exists).toBe(false);
    expect(missingSkills.isCanonical).toBe(false);
    expect(missingSkills.reason).toContain("logics/skills");

    const missingGitmodulesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-missing-gitmodules-"));
    roots.push(missingGitmodulesRoot);
    fs.mkdirSync(path.join(missingGitmodulesRoot, "logics", "skills"), { recursive: true });

    const missingGitmodules = inspectLogicsKitSubmodule(missingGitmodulesRoot);
    expect(missingGitmodules.exists).toBe(true);
    expect(missingGitmodules.isCanonical).toBe(false);
    expect(missingGitmodules.reason).toContain(".gitmodules");
  });

  it("flags non-canonical submodule URLs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-noncanonical-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".gitmodules"),
      '[submodule "logics/skills"]\n\tpath = logics/skills\n\turl = https://example.com/other-kit.git\n',
      "utf8"
    );

    const inspection = inspectLogicsKitSubmodule(root);

    expect(inspection.exists).toBe(true);
    expect(inspection.isCanonical).toBe(false);
    expect(inspection.remoteUrl).toBe("https://example.com/other-kit.git");
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

    const incomplete = inspectLogicsBootstrapState(incompleteRoot);
    expect(incomplete.status).toBe("incomplete");
    expect(incomplete.canBootstrap).toBe(true);
    expect(incomplete.actionTitle).toContain("Repair");
  });

  it("flags non-canonical bootstrap setups when the submodule URL drifts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-bootstrap-noncanonical-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".gitmodules"),
      '[submodule "logics/skills"]\n\tpath = logics/skills\n\turl = https://example.com/other-kit.git\n',
      "utf8"
    );

    const state = inspectLogicsBootstrapState(root);

    expect(state.status).toBe("noncanonical");
    expect(state.canBootstrap).toBe(false);
    expect(state.reason).toContain("non-canonical");
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

  it("exposes the kit update command string", () => {
    expect(buildLogicsKitUpdateCommand()).toContain("git submodule update");
  });
});

describe("detectDangerousGitignorePatterns", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("detects broad logics patterns that would hide logics/skills", () => {
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
    expect(inspection.reason).toContain("logics/skills");
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

describe("detectKitInstallType", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("detects the canonical submodule when .git is file-backed", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-install-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", ".git"), "gitdir: ../../.git/modules/logics/skills\n", "utf8");

    expect(detectKitInstallType(root)).toBe("submodule");
  });

  it("detects a standalone clone when .git is a directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-install-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills", ".git"), { recursive: true });

    expect(detectKitInstallType(root)).toBe("standalone-clone");
  });

  it("falls back to plain-copy when no .git metadata is present", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-install-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });

    expect(detectKitInstallType(root)).toBe("plain-copy");
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
