import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getManagedDocDirectories: vi.fn(),
  runGitCommand: vi.fn(),
  runPythonCommand: vi.fn(),
  openTextDocument: vi.fn(),
  showTextDocument: vi.fn()
}));

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: []
  },
  window: {
    showTextDocument: mocks.showTextDocument
  },
  env: {}
}));

vi.mock("../src/logicsIndexer", () => ({
  getManagedDocDirectories: mocks.getManagedDocDirectories
}));

vi.mock("../src/gitRuntime", () => ({
  runGitCommand: mocks.runGitCommand
}));

vi.mock("../src/pythonRuntime", () => ({
  runPythonCommand: mocks.runPythonCommand
}));

vi.mock("../src/logicsDocMaintenance", async () => {
  const actual = await vi.importActual<typeof import("../src/logicsDocMaintenance")>("../src/logicsDocMaintenance");
  return actual;
});

import * as vscode from "vscode";
import {
  addLinkToSectionOnDisk,
  areSamePath,
  buildMinimalTemplate,
  collectManagedMarkdownFiles,
  detectDangerousGitignorePatterns,
  detectKitInstallType,
  findCreatedDocPathFromOutput,
  getCompanionDocScriptPath,
  getFlowManagerScriptPath,
  hasLogicsSubmodule,
  isExistingDirectory,
  runGitWithOutput,
  runPythonWithOutput,
  updateMainHeadingId,
  updateManagedReferencesForRename
} from "../src/logicsProviderUtils";

describe("logicsProviderUtils extra coverage", () => {
  const roots: string[] = [];
  const workspace = vscode.workspace as { workspaceFolders: Array<{ uri: { fsPath: string } }> };

  beforeEach(() => {
    mocks.getManagedDocDirectories.mockReset();
    mocks.runGitCommand.mockReset();
    mocks.runPythonCommand.mockReset();
    mocks.openTextDocument.mockReset();
    mocks.showTextDocument.mockReset();
    workspace.workspaceFolders = [];
  });

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
    workspace.workspaceFolders = [];
  });

  function makeRoot(prefix: string): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    roots.push(root);
    return root;
  }

  it("covers basic filesystem and path helpers", async () => {
    const root = makeRoot("logics-utils-basic-");
    const dir = path.join(root, "folder");
    const file = path.join(root, "file.txt");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, "file", "utf8");

    expect(isExistingDirectory(dir)).toBe(true);
    expect(isExistingDirectory(file)).toBe(false);
    expect(areSamePath(dir, dir)).toBe(true);
    expect(buildMinimalTemplate("req_001_demo", "Demo")).toContain("## req_001_demo - Demo");
    expect(findCreatedDocPathFromOutput("Wrote logics/request/req_001_demo.md")).toBe(
      "logics/request/req_001_demo.md"
    );

    const mainHeadingPath = path.join(root, "heading.md");
    fs.writeFileSync(mainHeadingPath, "## req_001_old - Old title\nbody\n", "utf8");
    updateMainHeadingId(mainHeadingPath, "req_001_old", "req_001_new");
    expect(fs.readFileSync(mainHeadingPath, "utf8")).toContain("## req_001_new - Old title");
  });

  it("detects dangerous gitignore patterns, install types, and canonical submodules", () => {
    const root = makeRoot("logics-utils-install-");

    expect(detectDangerousGitignorePatterns(root)).toEqual({
      hasDangerousPatterns: false,
      matchedPatterns: [],
      reason: "No .gitignore file was found."
    });

    fs.writeFileSync(path.join(root, ".gitignore"), "logics/**\n# comment\n!keep\n", "utf8");
    expect(detectDangerousGitignorePatterns(root)).toMatchObject({
      hasDangerousPatterns: true,
      matchedPatterns: ["logics/**"]
    });

    expect(detectKitInstallType(root)).toBe("plain-copy");

    const standaloneRoot = makeRoot("logics-utils-standalone-");
    fs.mkdirSync(path.join(standaloneRoot, "logics", "skills", ".git"), { recursive: true });
    expect(detectKitInstallType(standaloneRoot)).toBe("standalone-clone");

    const submoduleRoot = makeRoot("logics-utils-submodule-");
    fs.mkdirSync(path.join(submoduleRoot, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(submoduleRoot, "logics", "skills", ".git"), "gitdir: ../.git/modules/skills\n", "utf8");
    expect(detectKitInstallType(submoduleRoot)).toBe("submodule");

    const canonicalRoot = makeRoot("logics-utils-canonical-");
    fs.mkdirSync(path.join(canonicalRoot, "logics", "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(canonicalRoot, ".gitmodules"),
      '[submodule "logics/skills"]\n\tpath = logics/skills\n\turl = https://github.com/AlexAgo83/cdx-logics-kit\n',
      "utf8"
    );
    expect(hasLogicsSubmodule(canonicalRoot)).toBe(true);
  });

  it("covers managed markdown traversal and reference updates", () => {
    const root = makeRoot("logics-utils-managed-");
    const requestDir = path.join(root, "logics", "request");
    const backlogDir = path.join(root, "logics", "backlog");
    fs.mkdirSync(requestDir, { recursive: true });
    fs.mkdirSync(backlogDir, { recursive: true });

    const requestDoc = path.join(requestDir, "req_001_old.md");
    const backlogDoc = path.join(backlogDir, "item_001.md");
    fs.writeFileSync(requestDoc, "## req_001_old - Old\nSee `req_001_old` and [old](logics/request/req_001_old.md)\n", "utf8");
    fs.writeFileSync(backlogDoc, "## item_001 - Item\n", "utf8");

    mocks.getManagedDocDirectories.mockReturnValue([requestDir, backlogDir]);

    expect(collectManagedMarkdownFiles(root).sort()).toEqual([backlogDoc, requestDoc].sort());
    expect(
      updateManagedReferencesForRename(
        root,
        "logics/request/req_001_old.md",
        "logics/request/req_001_new.md",
        "req_001_old",
        "req_001_new"
      )
    ).toBe(1);
    expect(fs.readFileSync(requestDoc, "utf8")).toContain("req_001_new");
    expect(fs.readFileSync(requestDoc, "utf8")).toContain("logics/request/req_001_new.md");
  });

  it("covers link insertion, script discovery, and process wrappers", async () => {
    const root = makeRoot("logics-utils-scripts-");
    const referencesDoc = path.join(root, "refs.md");
    fs.writeFileSync(referencesDoc, "# References\n- (none yet)\n", "utf8");

    expect(addLinkToSectionOnDisk(referencesDoc, "References", "logics/request/req_001.md")).toEqual({
      changed: true
    });
    expect(fs.readFileSync(referencesDoc, "utf8")).toContain("`logics/request/req_001.md`");

    const flowManagerScript = path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py");
    const productScript = path.join(
      root,
      "logics",
      "skills",
      "logics-product-brief-writer",
      "scripts",
      "new_product_brief.py"
    );
    const architectureScript = path.join(
      root,
      "logics",
      "skills",
      "logics-architecture-decision-writer",
      "scripts",
      "new_adr.py"
    );
    fs.mkdirSync(path.dirname(flowManagerScript), { recursive: true });
    fs.mkdirSync(path.dirname(productScript), { recursive: true });
    fs.mkdirSync(path.dirname(architectureScript), { recursive: true });
    fs.writeFileSync(flowManagerScript, "", "utf8");
    fs.writeFileSync(productScript, "", "utf8");
    fs.writeFileSync(architectureScript, "", "utf8");

    expect(getFlowManagerScriptPath(root)).toBe(flowManagerScript);
    expect(getCompanionDocScriptPath(root, "product")).toBe(productScript);
    expect(getCompanionDocScriptPath(root, "architecture")).toBe(architectureScript);

    mocks.runGitCommand.mockResolvedValue({ stdout: "git ok", stderr: "" });
    mocks.runPythonCommand.mockResolvedValue({ stdout: "python ok", stderr: "" });
    await expect(runGitWithOutput(root, ["status"])).resolves.toEqual({ stdout: "git ok", stderr: "" });
    await expect(runPythonWithOutput(root, "script.py", ["--help"])).resolves.toEqual({
      stdout: "python ok",
      stderr: ""
    });
  });
});
