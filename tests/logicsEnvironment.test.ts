import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectClaudeBridgeStatus, inspectLogicsEnvironment } from "../src/logicsEnvironment";

describe("inspectLogicsEnvironment", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("distinguishes a partial bootstrap from a broken kit", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-env-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py"),
      "#!/usr/bin/env python\n",
      "utf8"
    );

    const snapshot = await inspectLogicsEnvironment(root, undefined, {
      detectGit: async () => true,
      detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" }),
      inspectOverlay: () => ({
        status: "missing-overlay",
        summary: "Overlay missing.",
        issues: ["Workspace overlay is missing or not initialized."],
        warnings: [],
        syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
        runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
      })
    });

    expect(snapshot.repositoryState).toBe("partial-bootstrap");
    expect(snapshot.missingWorkflowDirs).toEqual(["logics/request", "logics/backlog", "logics/tasks"]);
    expect(snapshot.capabilities.readOnly.status).toBe("available");
    expect(snapshot.capabilities.workflowMutation.status).toBe("available");
    expect(snapshot.capabilities.codexRuntime.status).toBe("unavailable");
  });

  it("marks workflow mutation unavailable when python is missing even if the kit is present", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-env-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "backlog"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "tasks"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py"),
      "#!/usr/bin/env python\n",
      "utf8"
    );

    const snapshot = await inspectLogicsEnvironment(root, undefined, {
      detectGit: async () => true,
      detectPython: async () => null,
      inspectOverlay: () => ({
        status: "healthy",
        summary: "Overlay ready.",
        issues: [],
        warnings: [],
        workspaceId: "demo-workspace",
        codexHome: "/tmp/demo-overlay",
        runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
      })
    });

    expect(snapshot.repositoryState).toBe("ready");
    expect(snapshot.capabilities.workflowMutation.status).toBe("unavailable");
    expect(snapshot.capabilities.workflowMutation.summary).toContain("Python 3");
    expect(snapshot.capabilities.codexRuntime.status).toBe("available");
  });

  it("surfaces hybrid runtime readiness and capability state", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-env-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "backlog"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "tasks"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py"),
      "#!/usr/bin/env python\n",
      "utf8"
    );

    const snapshot = await inspectLogicsEnvironment(root, undefined, {
      detectGit: async () => true,
      detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" }),
      inspectOverlay: () => ({
        status: "healthy",
        summary: "Overlay ready.",
        issues: [],
        warnings: [],
        runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
      }),
      inspectHybridRuntime: async () => ({
        state: "ready",
        summary: "Hybrid assist runtime ready (ollama).",
        backend: "ollama",
        requestedBackend: "auto",
        degraded: false,
        degradedReasons: [],
        claudeBridgeAvailable: true,
        windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
      })
    });

    expect(snapshot.hybridRuntime?.state).toBe("ready");
    expect(snapshot.capabilities.hybridAssist?.status).toBe("available");
    expect(snapshot.capabilities.hybridAssist?.summary).toContain("Hybrid assist runtime ready");
  });

  it("detects both supported Claude bridge variants with a stable preference order", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-env-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, ".claude", "commands"), { recursive: true });
    fs.mkdirSync(path.join(root, ".claude", "agents"), { recursive: true });

    let status = detectClaudeBridgeStatus(root);
    expect(status.available).toBe(false);
    expect(status.detectedVariants).toEqual([]);

    fs.writeFileSync(path.join(root, ".claude", "commands", "logics-flow.md"), "bridge\n", "utf8");
    fs.writeFileSync(path.join(root, ".claude", "agents", "logics-flow-manager.md"), "bridge\n", "utf8");
    status = detectClaudeBridgeStatus(root);
    expect(status.available).toBe(true);
    expect(status.preferredVariant).toBe("flow-manager");
    expect(status.detectedVariants).toEqual(["flow-manager"]);

    fs.writeFileSync(path.join(root, ".claude", "commands", "logics-assist.md"), "bridge\n", "utf8");
    fs.writeFileSync(path.join(root, ".claude", "agents", "logics-hybrid-delivery-assistant.md"), "bridge\n", "utf8");
    status = detectClaudeBridgeStatus(root);
    expect(status.available).toBe(true);
    expect(status.preferredVariant).toBe("hybrid-assist");
    expect(status.detectedVariants).toEqual(["hybrid-assist", "flow-manager"]);
    expect(status.supportedVariants).toEqual(["hybrid-assist", "flow-manager"]);
  });
});

describe("branch-state transitions", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function makeReadyRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-branch-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py"),
      "#!/usr/bin/env python\n",
      "utf8"
    );
    fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "backlog"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "tasks"), { recursive: true });
    return root;
  }

  const stubbedOptions = {
    detectGit: async () => true,
    detectPython: async (): Promise<import("../src/pythonRuntime").PythonCommand | null> =>
      ({ command: "python", argsPrefix: [], displayLabel: "python" }),
    inspectOverlay: () =>
      ({
        status: "missing-overlay" as const,
        summary: "Overlay missing.",
        issues: [],
        warnings: [],
        syncCommand: "python logics/skills/logics.py ...",
        runCommand: "python logics/skills/logics.py ..."
      })
  };

  it("transitions from ready to missing-logics when logics/ is removed and re-inspected", async () => {
    const root = makeReadyRoot();

    const beforeSwitch = await inspectLogicsEnvironment(root, undefined, stubbedOptions);
    expect(beforeSwitch.repositoryState).toBe("ready");
    expect(beforeSwitch.capabilities.readOnly.status).toBe("available");

    // Simulate branch switch: remove logics/ (as git checkout would on a branch without it)
    fs.rmSync(path.join(root, "logics"), { recursive: true, force: true });

    const afterSwitch = await inspectLogicsEnvironment(root, undefined, stubbedOptions);
    expect(afterSwitch.repositoryState).toBe("missing-logics");
    expect(afterSwitch.capabilities.readOnly.status).toBe("unavailable");
    expect(afterSwitch.capabilities.readOnly.summary).toContain("branch");
  });

  it("transitions from ready to partial-bootstrap when workflow dirs are removed and re-inspected", async () => {
    const root = makeReadyRoot();

    const beforeSwitch = await inspectLogicsEnvironment(root, undefined, stubbedOptions);
    expect(beforeSwitch.repositoryState).toBe("ready");

    // Simulate branch switch: remove one workflow directory
    fs.rmSync(path.join(root, "logics", "tasks"), { recursive: true, force: true });

    const afterSwitch = await inspectLogicsEnvironment(root, undefined, stubbedOptions);
    expect(afterSwitch.repositoryState).toBe("partial-bootstrap");
    expect(afterSwitch.missingWorkflowDirs).toContain("logics/tasks");
    expect(afterSwitch.capabilities.readOnly.status).toBe("available");
  });

  it("missing-logics readOnly summary uses branch-local copy, not generic repository message", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-branch-"));
    roots.push(root);

    const snapshot = await inspectLogicsEnvironment(root, undefined, stubbedOptions);
    expect(snapshot.repositoryState).toBe("missing-logics");
    expect(snapshot.capabilities.readOnly.summary).toMatch(/branch/i);
    expect(snapshot.capabilities.readOnly.summary).not.toMatch(/repository/i);
  });
});
