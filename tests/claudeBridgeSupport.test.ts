import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {},
  window: {},
  env: {}
}));

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

  it("creates all Claude bridge variants without requiring the kit skills", async () => {
    const root = makeRoot();

    const result = await repairClaudeBridgeFiles(root);

    expect(result.skippedVariants).toEqual([]);
    expect(result.writtenPaths).toEqual([
      ".claude/commands/logics-assist.md",
      ".claude/agents/logics-hybrid-delivery-assistant.md",
      ".claude/commands/logics-request-draft.md",
      ".claude/agents/logics-request-draft.md",
      ".claude/commands/logics-spec-first-pass.md",
      ".claude/agents/logics-spec-first-pass.md",
      ".claude/commands/logics-backlog-groom.md",
      ".claude/agents/logics-backlog-groom.md"
    ]);
    expect(fs.readFileSync(path.join(root, ".claude", "commands", "logics-assist.md"), "utf8")).toContain(
      "Use $logics-hybrid-delivery-assistant for commit-all, summaries, next-step, triage, handoff, or split-suggestion requests."
    );
    expect(fs.readFileSync(path.join(root, ".claude", "commands", "logics-request-draft.md"), "utf8")).toContain(
      "Reviewer nudge:"
    );
    expect(fs.readFileSync(path.join(root, ".claude", "agents", "logics-spec-first-pass.md"), "utf8")).toContain(
      "Validate the proposed spec sections, constraints, and open questions before turning them into a real spec file."
    );
  });
});
