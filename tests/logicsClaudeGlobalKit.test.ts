import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectClaudeGlobalKit, publishClaudeGlobalKit } from "../src/logicsClaudeGlobalKit";

describe("Claude global kit", () => {
  const roots: string[] = [];
  const originalClaudeHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME;

  afterEach(() => {
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = originalClaudeHome;
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function makeRoot(prefix: string): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    roots.push(root);
    return root;
  }

  function writeSkill(root: string, skillName: string, prompt: string) {
    const skillDir = path.join(root, "logics", "skills", skillName, "agents");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", skillName, "SKILL.md"), "# skill\n", "utf8");
    fs.writeFileSync(
      path.join(skillDir, "openai.yaml"),
      `tier: core\ninterface:\n  display_name: "${skillName}"\n  short_description: "Bounded skill."\n  default_prompt: "${prompt}"\n`,
      "utf8"
    );
  }

  it("reports a missing Claude kit when repo-local skills exist but nothing is published yet", () => {
    const root = makeRoot("logics-claude-kit-");
    writeSkill(root, "demo-skill", "Use $demo-skill.");
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.21.1\n", "utf8");
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = makeRoot("claude-global-");

    const snapshot = inspectClaudeGlobalKit(root);

    expect(snapshot.status).toBe("missing-overlay");
    expect(snapshot.summary).toContain("No global Claude Logics kit is published yet");
  });

  it("publishes a global Claude kit and reports it healthy", () => {
    const root = makeRoot("logics-claude-kit-");
    writeSkill(root, "demo-skill", "Use $demo-skill.");
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.21.1\n", "utf8");
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = makeRoot("claude-global-");

    const result = publishClaudeGlobalKit(root);

    expect(result.publicationMode).toBe("copy");
    expect(result.publishedSkillNames).toEqual(["demo-skill"]);
    expect(fs.existsSync(path.join(process.env.LOGICS_CLAUDE_GLOBAL_HOME!, "agents", "demo-skill.md"))).toBe(true);
    expect(fs.existsSync(path.join(process.env.LOGICS_CLAUDE_GLOBAL_HOME!, "commands", "demo-skill.md"))).toBe(true);
    expect(fs.existsSync(path.join(process.env.LOGICS_CLAUDE_GLOBAL_HOME!, "logics-global-kit-claude.json"))).toBe(true);

    const snapshot = inspectClaudeGlobalKit(root);
    expect(snapshot.status).toBe("healthy");
    expect(snapshot.installedVersion).toBe("1.21.1");
    expect(snapshot.publishedSkillNames).toEqual(["demo-skill"]);
  });
});
