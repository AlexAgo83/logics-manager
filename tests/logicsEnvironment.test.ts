import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectClaudeBridgeStatus, inspectLogicsEnvironment } from "../src/logicsEnvironment";
import { createTempRootTracker } from "./helpers/tempRootTracker";

describe("inspectLogicsEnvironment", () => {
  const tracker = createTempRootTracker("logics-env-");
  const originalClaudeHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME;

  afterEach(() => {
    if (typeof originalClaudeHome === "string") {
      process.env.LOGICS_CLAUDE_GLOBAL_HOME = originalClaudeHome;
    } else {
      delete process.env.LOGICS_CLAUDE_GLOBAL_HOME;
    }
    tracker.cleanup();
  });

  it("distinguishes a partial bootstrap from a broken kit", async () => {
    const root = tracker.makeRoot();
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "#!/usr/bin/env python\n", "utf8");

    const snapshot = await inspectLogicsEnvironment(root, undefined, {
      detectGit: async () => true,
      detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" }),
      inspectOverlay: () => ({
        status: "missing-overlay",
        summary: "Overlay missing.",
        issues: ["Workspace overlay is missing or not initialized."],
        warnings: [],
        syncCommand: "python -m logics_manager codex sync",
        runCommand: "python -m logics_manager codex run -- codex"
      })
    });

    expect(snapshot.repositoryState).toBe("partial-bootstrap");
    expect(snapshot.missingWorkflowDirs).toEqual(["logics/request", "logics/backlog", "logics/tasks"]);
    expect(snapshot.capabilities.readOnly.status).toBe("available");
    expect(snapshot.capabilities.workflowMutation.status).toBe("available");
    expect(snapshot.capabilities.codexRuntime.status).toBe("unavailable");
  });

  it("marks workflow mutation unavailable when python is missing even if the kit is present", async () => {
    const root = tracker.makeRoot();
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "backlog"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "tasks"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "#!/usr/bin/env python\n", "utf8");

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
        runCommand: "python -m logics_manager codex run -- codex"
      })
    });

    expect(snapshot.repositoryState).toBe("ready");
    expect(snapshot.capabilities.workflowMutation.status).toBe("unavailable");
    expect(snapshot.capabilities.workflowMutation.summary).toContain("Python 3");
    expect(snapshot.capabilities.codexRuntime.status).toBe("available");
  });

  it("surfaces hybrid runtime readiness and capability state", async () => {
    const root = tracker.makeRoot();
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = tracker.makeRoot();
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "backlog"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "tasks"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "#!/usr/bin/env python\n", "utf8");

    const snapshot = await inspectLogicsEnvironment(root, undefined, {
      detectGit: async () => true,
      detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" }),
      inspectOverlay: () => ({
        status: "healthy",
        summary: "Overlay ready.",
        issues: [],
        warnings: [],
        runCommand: "python -m logics_manager codex run -- codex"
      }),
      inspectHybridRuntime: async () => ({
        state: "ready",
        summary: "Hybrid assist runtime ready (ollama).",
        backend: "ollama",
        requestedBackend: "auto",
        degraded: false,
        degradedReasons: [],
        claudeBridgeAvailable: true,
        windowsSafeEntrypoint: "python -m logics_manager assist runtime-status --format json"
      })
    });

    expect(snapshot.hybridRuntime?.state).toBe("ready");
    expect(snapshot.claudeGlobalKit?.status).toBe("missing-overlay");
    expect(snapshot.capabilities.hybridAssist?.status).toBe("available");
    expect(snapshot.capabilities.hybridAssist?.summary).toContain("Hybrid assist runtime ready");
  });

  it("detects the canonical Claude bridge variant", () => {
    const root = tracker.makeRoot();
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = root;
    fs.mkdirSync(path.join(root, "commands"), { recursive: true });
    fs.mkdirSync(path.join(root, "agents"), { recursive: true });

    let status = detectClaudeBridgeStatus(root);
    expect(status.available).toBe(false);
    expect(status.detectedVariants).toEqual([]);

    fs.writeFileSync(path.join(root, "commands", "logics-assist.md"), "bridge\n", "utf8");
    fs.writeFileSync(path.join(root, "agents", "logics-hybrid-delivery-assistant.md"), "bridge\n", "utf8");
    status = detectClaudeBridgeStatus(root);
    expect(status.available).toBe(true);
    expect(status.detectedVariants).toEqual(["hybrid-assist"]);
    expect(status.canonicalVariants).toEqual(["hybrid-assist"]);
  });

  it("reports no Claude bridge when the canonical bridge files are absent", async () => {
    const root = tracker.makeRoot();
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = tracker.makeRoot();
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "backlog"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "tasks"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "#!/usr/bin/env python\n", "utf8");

    const snapshot = await inspectLogicsEnvironment(root, undefined, {
      detectGit: async () => true,
      detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" }),
      inspectOverlay: () => ({
        status: "healthy",
        summary: "Overlay ready.",
        issues: [],
        warnings: [],
        runCommand: "python -m logics_manager codex run -- codex"
      }),
      inspectHybridRuntime: async () => ({
        state: "ready",
        summary: "Hybrid assist runtime ready (codex).",
        backend: "codex",
        requestedBackend: "auto",
        degraded: false,
        degradedReasons: [],
        claudeBridgeAvailable: false,
        windowsSafeEntrypoint: "python -m logics_manager assist runtime-status --format json"
      })
    });

    expect(snapshot.hybridRuntime?.claudeBridgeAvailable).toBe(false);
  });
});

describe("branch-state transitions", () => {
  const tracker = createTempRootTracker("logics-branch-");

  afterEach(() => {
    tracker.cleanup();
  });

  function makeReadyRoot(): string {
    const root = tracker.makeRoot();
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "#!/usr/bin/env python\n", "utf8");
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
        syncCommand: "python -m logics_manager ...",
        runCommand: "python -m logics_manager ..."
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
    const root = tracker.makeRoot();

    const snapshot = await inspectLogicsEnvironment(root, undefined, stubbedOptions);
    expect(snapshot.repositoryState).toBe("missing-logics");
    expect(snapshot.capabilities.readOnly.summary).toMatch(/branch/i);
    expect(snapshot.capabilities.readOnly.summary).not.toMatch(/repository/i);
  });

  it("covers no-root, missing kit, and bootstrap repair capability branches", async () => {
    try {
      const noRoot = await inspectLogicsEnvironment(null, undefined, {
        detectGit: async () => false,
        detectPython: async () => null
      });
      expect(noRoot.repositoryState).toBe("no-root");
      expect(noRoot.capabilities.readOnly.status).toBe("unavailable");
      expect(noRoot.capabilities.bootstrapRepair.status).toBe("unavailable");
      expect(noRoot.capabilities.codexRuntime.status).toBe("unavailable");
      expect(noRoot.capabilities.hybridAssist?.status).toBe("unavailable");

      const missingLogicsRoot = tracker.makeRoot();
      const missingLogics = await inspectLogicsEnvironment(missingLogicsRoot, undefined, {
        detectGit: async () => true,
        detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" })
      });
      expect(missingLogics.repositoryState).toBe("missing-logics");
      expect(missingLogics.capabilities.bootstrapRepair.status).toBe("available");
      expect(missingLogics.capabilities.bootstrapRepair.summary).toContain("extension");
      expect(missingLogics.capabilities.workflowMutation.status).toBe("unavailable");
      expect(missingLogics.capabilities.readOnly.summary).toContain("logics/");

      const missingFlowManagerRoot = tracker.makeRoot();
      fs.mkdirSync(path.join(missingFlowManagerRoot, "logics", "skills"), { recursive: true });
      const missingFlowManager = await inspectLogicsEnvironment(missingFlowManagerRoot, undefined, {
        detectGit: async () => true,
        detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" })
      });
      expect(missingFlowManager.repositoryState).toBe("partial-bootstrap");
      expect(missingFlowManager.capabilities.workflowMutation.status).toBe("available");

      const bootstrapRoot = tracker.makeRoot();
      fs.mkdirSync(path.join(bootstrapRoot, "scripts"), { recursive: true });
      fs.writeFileSync(path.join(bootstrapRoot, "scripts", "logics-manager.py"), "#!/usr/bin/env python\n", "utf8");
      fs.mkdirSync(path.join(bootstrapRoot, "logics", "request"), { recursive: true });
      fs.mkdirSync(path.join(bootstrapRoot, "logics", "backlog"), { recursive: true });
      fs.mkdirSync(path.join(bootstrapRoot, "logics", "tasks"), { recursive: true });

      const bootstrapUnavailable = await inspectLogicsEnvironment(bootstrapRoot, undefined, {
        detectGit: async () => true,
        detectPython: async () => null
      });
      expect(bootstrapUnavailable.capabilities.bootstrapRepair.status).toBe("unavailable");
      expect(bootstrapUnavailable.capabilities.bootstrapRepair.summary).toContain("Python 3");

      const gitUnavailable = await inspectLogicsEnvironment(bootstrapRoot, undefined, {
        detectGit: async () => false,
        detectPython: async () => ({ command: "python", argsPrefix: [], displayLabel: "python" })
      });
      expect(gitUnavailable.capabilities.bootstrapRepair.status).toBe("unavailable");
      expect(gitUnavailable.capabilities.bootstrapRepair.summary).toContain("Git on PATH");
    } finally {
      tracker.cleanup();
    }
  });
});
