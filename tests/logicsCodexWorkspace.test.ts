import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCodexOverlayRunCommand, buildCodexOverlaySyncCommand, inspectCodexWorkspaceOverlay } from "../src/logicsCodexWorkspace";

describe("inspectCodexWorkspaceOverlay", () => {
  const roots: string[] = [];
  const originalGlobal = process.env.LOGICS_CODEX_GLOBAL_HOME;
  const originalWorkspaces = process.env.LOGICS_CODEX_WORKSPACES_HOME;

  afterEach(() => {
    process.env.LOGICS_CODEX_GLOBAL_HOME = originalGlobal;
    process.env.LOGICS_CODEX_WORKSPACES_HOME = originalWorkspaces;
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a missing overlay when the manager exists but no workspace overlay is materialized", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-overlay-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_codex_workspace.py"),
      "#!/usr/bin/env python\n",
      "utf8"
    );
    process.env.LOGICS_CODEX_WORKSPACES_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "codex-workspaces-"));
    roots.push(process.env.LOGICS_CODEX_WORKSPACES_HOME);

    const snapshot = inspectCodexWorkspaceOverlay(root);

    expect(snapshot.status).toBe("missing-overlay");
    expect(snapshot.syncCommand).toContain("logics_codex_workspace.py sync");
  });

  it("reports a healthy overlay when manifest and projected skills are aligned", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-overlay-"));
    const globalHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-global-"));
    const workspacesHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-workspaces-"));
    roots.push(root, globalHome, workspacesHome);
    process.env.LOGICS_CODEX_GLOBAL_HOME = globalHome;
    process.env.LOGICS_CODEX_WORKSPACES_HOME = workspacesHome;

    const managerDir = path.join(root, "logics", "skills", "logics-flow-manager", "scripts");
    const repoSkillDir = path.join(root, "logics", "skills", "demo-skill");
    fs.mkdirSync(managerDir, { recursive: true });
    fs.mkdirSync(repoSkillDir, { recursive: true });
    fs.writeFileSync(path.join(managerDir, "logics_codex_workspace.py"), "#!/usr/bin/env python\n", "utf8");
    fs.writeFileSync(path.join(repoSkillDir, "SKILL.md"), "# demo\n", "utf8");

    const resolvedRoot = path.resolve(root);
    const workspaceId = `${path.basename(resolvedRoot).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}-${crypto
      .createHash("sha256")
      .update(resolvedRoot)
      .digest("hex")
      .slice(0, 12)}`;
    const overlayRoot = path.join(workspacesHome, workspaceId);
    const overlaySkillDir = path.join(overlayRoot, "skills", "demo-skill");
    fs.mkdirSync(overlaySkillDir, { recursive: true });
    fs.writeFileSync(path.join(overlaySkillDir, "SKILL.md"), "# demo\n", "utf8");
    const skillStat = fs.statSync(path.join(repoSkillDir, "SKILL.md"));
    fs.writeFileSync(
      path.join(overlayRoot, "logics-codex-overlay.json"),
      JSON.stringify(
        {
          workspace_id: workspaceId,
          repo_root: resolvedRoot,
          overlay_root: overlayRoot,
          codex_home: overlayRoot,
          publication_mode: "copy",
          repo_skill_entries: [
            {
              name: "demo-skill",
              source_path: repoSkillDir,
              destination_path: overlaySkillDir,
              mode: "copy",
              source_mtime_ns: Number(skillStat.mtimeNs)
            }
          ],
          global_skill_entries: [],
          shared_asset_entries: []
        },
        null,
        2
      ),
      "utf8"
    );

    const snapshot = inspectCodexWorkspaceOverlay(root);

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.publicationMode).toBe("copy");
    expect(snapshot.runCommand).toContain("logics_codex_workspace.py run -- codex");
  });

  it("builds overlay commands from the detected python launcher", () => {
    expect(
      buildCodexOverlaySyncCommand({ command: "python3", argsPrefix: [], displayLabel: "python3" })
    ).toBe("python3 logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync");
    expect(
      buildCodexOverlayRunCommand({ command: "py", argsPrefix: ["-3"], displayLabel: "py -3" })
    ).toBe("py -3 logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex");
  });
});
