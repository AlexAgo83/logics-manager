import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectLogicsEnvironment } from "../src/logicsEnvironment";

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
});
