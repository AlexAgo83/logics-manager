import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publishClaudeGlobalKit } from "../src/logicsClaudeGlobalKit";
import { inspectRuntimeLaunchers } from "../src/runtimeLaunchers";

describe("inspectRuntimeLaunchers", () => {
  const roots: string[] = [];
  const previousClaudeHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME;

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
    if (typeof previousClaudeHome === "string") {
      process.env.LOGICS_CLAUDE_GLOBAL_HOME = previousClaudeHome;
    } else {
      delete process.env.LOGICS_CLAUDE_GLOBAL_HOME;
    }
  });

  function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-launchers-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "logics", "skills", "demo-skill", "agents"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "logics", "skills", "demo-skill", "SKILL.md"),
      "# Demo\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(root, "logics", "skills", "demo-skill", "agents", "openai.yaml"),
      [
        "tier: core",
        "interface:",
        "  display_name: Demo Skill",
        "  short_description: Demo launcher test skill",
        "  default_prompt: Use the demo skill."
      ].join("\n") + "\n",
      "utf8"
    );
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.21.1\n", "utf8");
    fs.mkdirSync(path.join(root, ".claude", "commands"), { recursive: true });
    fs.mkdirSync(path.join(root, ".claude", "agents"), { recursive: true });
    fs.writeFileSync(path.join(root, ".claude", "commands", "logics-flow.md"), "bridge\n", "utf8");
    fs.writeFileSync(path.join(root, ".claude", "agents", "logics-flow-manager.md"), "bridge\n", "utf8");
    return root;
  }

  function setClaudeHome(): string {
    const claudeHome = fs.mkdtempSync(path.join(os.tmpdir(), "logics-claude-home-"));
    roots.push(claudeHome);
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = claudeHome;
    return claudeHome;
  }

  it("keeps the Claude launcher disabled when no global Claude kit is published", async () => {
    const root = makeRoot();
    setClaudeHome();

    const snapshot = await inspectRuntimeLaunchers(root, {
      detectCommand: async () => true
    });

    expect(snapshot.hasCodex).toBe(true);
    expect(snapshot.hasClaude).toBe(true);
    expect(snapshot.claude.available).toBe(false);
    expect(snapshot.claude.title).toContain("No global Claude Logics kit is published yet");
  });

  it("enables the Claude launcher only after the global Claude kit is healthy", async () => {
    const root = makeRoot();
    setClaudeHome();
    publishClaudeGlobalKit(root);

    const snapshot = await inspectRuntimeLaunchers(root, {
      detectCommand: async () => true
    });

    expect(snapshot.hasCodex).toBe(true);
    expect(snapshot.hasClaude).toBe(true);
    expect(snapshot.claude.available).toBe(true);
    expect(snapshot.claude.title).toContain("globally published Logics kit");
  });
});
