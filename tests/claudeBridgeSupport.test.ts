import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { repairClaudeBridgeFiles } from "../src/claudeBridgeSupport";

describe("repairClaudeBridgeFiles", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-claude-bridge-"));
    roots.push(root);
    return root;
  }

  function writeSkill(root: string, skillDir: string, prompt: string) {
    fs.mkdirSync(path.join(root, skillDir, "agents"), { recursive: true });
    fs.writeFileSync(path.join(root, skillDir, "SKILL.md"), "# skill\n", "utf8");
    fs.writeFileSync(
      path.join(root, skillDir, "agents", "openai.yaml"),
      `interface:\n  default_prompt: "${prompt}"\n`,
      "utf8"
    );
  }

  it("creates both Claude bridge variants from the local kit skills", () => {
    const root = makeRoot();
    writeSkill(
      root,
      "logics/skills/logics-hybrid-delivery-assistant",
      "Use $logics-hybrid-delivery-assistant for delivery work."
    );
    writeSkill(
      root,
      "logics/skills/logics-flow-manager",
      "Use $logics-flow-manager for workflow docs."
    );

    const result = repairClaudeBridgeFiles(root);

    expect(result.skippedVariants).toEqual([]);
    expect(result.writtenPaths).toEqual([
      ".claude/commands/logics-assist.md",
      ".claude/agents/logics-hybrid-delivery-assistant.md",
      ".claude/commands/logics-flow.md",
      ".claude/agents/logics-flow-manager.md",
      ".claude/commands/logics-request-draft.md",
      ".claude/agents/logics-request-draft.md",
      ".claude/commands/logics-spec-first-pass.md",
      ".claude/agents/logics-spec-first-pass.md",
      ".claude/commands/logics-backlog-groom.md",
      ".claude/agents/logics-backlog-groom.md"
    ]);
    expect(fs.readFileSync(path.join(root, ".claude", "commands", "logics-assist.md"), "utf8")).toContain(
      "Use $logics-hybrid-delivery-assistant for delivery work."
    );
    expect(fs.readFileSync(path.join(root, ".claude", "commands", "logics-request-draft.md"), "utf8")).toContain(
      "Reviewer nudge:"
    );
    expect(fs.readFileSync(path.join(root, ".claude", "agents", "logics-spec-first-pass.md"), "utf8")).toContain(
      "Validate the proposed spec sections, constraints, and open questions before turning them into a real spec file."
    );
    expect(fs.readFileSync(path.join(root, ".claude", "agents", "logics-flow-manager.md"), "utf8")).toContain(
      "Use $logics-flow-manager for workflow docs."
    );
  });

  it("skips variants whose source skill packages are missing", () => {
    const root = makeRoot();
    writeSkill(
      root,
      "logics/skills/logics-flow-manager",
      "Use $logics-flow-manager for workflow docs."
    );

    const result = repairClaudeBridgeFiles(root);

    expect(result.skippedVariants).toEqual(["hybrid-assist", "request-draft", "spec-first-pass", "backlog-groom"]);
    expect(result.writtenPaths).toEqual([
      ".claude/commands/logics-flow.md",
      ".claude/agents/logics-flow-manager.md"
    ]);
    expect(fs.existsSync(path.join(root, ".claude", "commands", "logics-assist.md"))).toBe(false);
  });
});
