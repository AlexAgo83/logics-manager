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
  const originalClaudeHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME;

  afterEach(() => {
    if (typeof originalClaudeHome === "string") {
      process.env.LOGICS_CLAUDE_GLOBAL_HOME = originalClaudeHome;
    } else {
      delete process.env.LOGICS_CLAUDE_GLOBAL_HOME;
    }
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
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = makeRoot();

    const result = await repairClaudeBridgeFiles(root);

    expect(result.skippedVariants).toEqual([]);
    expect(result.writtenPaths).toEqual([
      "commands/logics-assist.md",
      "agents/logics-hybrid-delivery-assistant.md",
      "commands/logics-request-draft.md",
      "agents/logics-request-draft.md",
      "commands/logics-spec-first-pass.md",
      "agents/logics-spec-first-pass.md",
      "commands/logics-backlog-groom.md",
      "agents/logics-backlog-groom.md",
      "logics-global-kit-claude.json"
    ]);
    const globalHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME!;
    expect(fs.readFileSync(path.join(globalHome, "commands", "logics-assist.md"), "utf8")).toContain(
      "Use $logics-hybrid-delivery-assistant for commit-all, summaries, next-step, triage, handoff, or split-suggestion requests."
    );
    expect(fs.readFileSync(path.join(globalHome, "commands", "logics-request-draft.md"), "utf8")).toContain(
      "Reviewer nudge:"
    );
    expect(fs.readFileSync(path.join(globalHome, "agents", "logics-spec-first-pass.md"), "utf8")).toContain(
      "Validate the proposed spec sections, constraints, and open questions before turning them into a real spec file."
    );
  });
});
