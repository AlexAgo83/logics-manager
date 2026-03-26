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

  it("reports a missing global kit when repo-local skills exist but nothing is published yet", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-overlay-"));
    roots.push(root);
    const repoSkillDir = path.join(root, "logics", "skills", "demo-skill");
    fs.mkdirSync(repoSkillDir, { recursive: true });
    fs.writeFileSync(path.join(repoSkillDir, "SKILL.md"), "# demo\n", "utf8");
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.4.0\n", "utf8");
    process.env.LOGICS_CODEX_GLOBAL_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "codex-global-"));
    roots.push(process.env.LOGICS_CODEX_GLOBAL_HOME);

    const snapshot = inspectCodexWorkspaceOverlay(root);

    expect(snapshot.status).toBe("missing-overlay");
    expect(snapshot.summary).toContain("No global Codex Logics kit is published yet");
    expect(snapshot.runCommand).toBe("codex");
  });

  it("reports a healthy global kit when manifest and published skills are aligned", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-overlay-"));
    const globalHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-global-"));
    roots.push(root, globalHome);
    process.env.LOGICS_CODEX_GLOBAL_HOME = globalHome;

    const repoSkillDir = path.join(root, "logics", "skills", "demo-skill");
    fs.mkdirSync(repoSkillDir, { recursive: true });
    fs.writeFileSync(path.join(repoSkillDir, "SKILL.md"), "# demo\n", "utf8");
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.4.0\n", "utf8");

    const publishedSkillDir = path.join(globalHome, "skills", "demo-skill");
    fs.mkdirSync(publishedSkillDir, { recursive: true });
    fs.writeFileSync(path.join(publishedSkillDir, "SKILL.md"), "# demo\n", "utf8");
    const skillStat = fs.statSync(path.join(repoSkillDir, "SKILL.md"));
    fs.writeFileSync(
      path.join(globalHome, "logics-global-kit.json"),
      JSON.stringify(
        {
          schema_version: 1,
          manifest_kind: "logics-global-kit",
          installed_version: "1.4.0",
          source_repo: path.resolve(root),
          source_revision: "abc123",
          published_at: "2026-03-26T00:00:00.000Z",
          publication_mode: "copy",
          published_skill_entries: [
            {
              name: "demo-skill",
              source_path: repoSkillDir,
              destination_path: publishedSkillDir,
              mode: "copy",
              source_mtime_ns: Number(skillStat.mtimeNs)
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const snapshot = inspectCodexWorkspaceOverlay(root);

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.publicationMode).toBe("copy");
    expect(snapshot.installedVersion).toBe("1.4.0");
    expect(snapshot.runCommand).toBe("codex");
  });

  it("builds global runtime commands", () => {
    expect(buildCodexOverlaySyncCommand()).toContain("auto-publishes the global Codex kit");
    expect(buildCodexOverlayRunCommand()).toBe("codex");
  });
});
