import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "logics-manager.py");

function resolvePythonBinary(): string {
  const candidates = ["python3.11", "python3", "python"];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.error || result.status !== 0) {
      continue;
    }
    const versionText = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    const match = versionText.match(/Python\s+(\d+)\.(\d+)/i);
    if (!match) {
      continue;
    }
    const major = Number.parseInt(match[1], 10);
    const minor = Number.parseInt(match[2], 10);
    if (major > 3 || (major === 3 && minor >= 10)) {
      return candidate;
    }
  }
  throw new Error("No Python 3.10+ interpreter found for logics-manager help tests.");
}

function runCliHelp(args: string[]) {
  const python = resolvePythonBinary();
  const result = spawnSync(python, [scriptPath, ...args], { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

describe("logics-manager CLI help", () => {
  it("prints a rich top-level recap on --help", () => {
    const { status, output } = runCliHelp(["--help"]);

    expect(status).toBe(0);
    expect(output).toContain("Logics Manager CLI");
    expect(output).toContain("Commands:");
    expect(output).toContain("flow");
    expect(output).toContain("Subcommands: new, companion, promote, split, close, finish");
    expect(output).toContain("audit");
    expect(output).toContain("self-update");
    expect(output).toContain("Examples:");
  });

  it("prints a rich flow recap on flow --help", () => {
    const { status, output } = runCliHelp(["flow", "--help"]);

    expect(status).toBe(0);
    expect(output).toContain("Logics Flow CLI");
    expect(output).toContain("new <request|backlog|task>");
    expect(output).toContain("companion <product|architecture>");
    expect(output).toContain("split request <source>");
    expect(output).toContain("finish task <source>");
    expect(output).toContain("Examples:");
  });

  it("prints a rich flow kind recap on flow new request --help", () => {
    const { status, output } = runCliHelp(["flow", "new", "request", "--help"]);

    expect(status).toBe(0);
    expect(output).toContain("Logics Flow New");
    expect(output).toContain("request");
    expect(output).toContain("--fixture");
    expect(output).toContain("--smoke-test");
  });

  it("prints a rich recap for every flow variant help page", () => {
    const cases: Array<{ args: string[]; expected: string[] }> = [
      { args: ["flow", "new", "backlog", "--help"], expected: ["Logics Flow New Backlog", "--progress", "--auto-create-product-brief"] },
      { args: ["flow", "new", "task", "--help"], expected: ["Logics Flow New Task", "--progress", "--auto-create-adr"] },
      { args: ["flow", "companion", "product", "--help"], expected: ["Logics Flow Companion Product", "--source-ref", "--request-ref"] },
      { args: ["flow", "companion", "architecture", "--help"], expected: ["Logics Flow Companion Architecture", "--source-ref", "--task-ref"] },
      { args: ["flow", "promote", "request-to-backlog", "--help"], expected: ["Logics Flow Promote Request to Backlog", "--auto-create-product-brief"] },
      { args: ["flow", "promote", "backlog-to-task", "--help"], expected: ["Logics Flow Promote Backlog to Task", "--auto-create-adr"] },
      { args: ["flow", "split", "request", "--help"], expected: ["Logics Flow Split Request", "--title (repeatable)"] },
      { args: ["flow", "split", "backlog", "--help"], expected: ["Logics Flow Split Backlog", "--title (repeatable)"] },
      { args: ["flow", "close", "request", "--help"], expected: ["Logics Flow Close Request", "--format {text,json}", "--dry-run"] },
      { args: ["flow", "close", "backlog", "--help"], expected: ["Logics Flow Close Backlog", "--format {text,json}", "--dry-run"] },
      { args: ["flow", "close", "task", "--help"], expected: ["Logics Flow Close Task", "--format {text,json}", "--dry-run"] },
      { args: ["flow", "finish", "task", "--help"], expected: ["Logics Flow Finish Task", "--format {text,json}", "--dry-run"] },
    ];

    for (const testCase of cases) {
      const { status, output } = runCliHelp(testCase.args);
      expect(status).toBe(0);
      for (const fragment of testCase.expected) {
        expect(output).toContain(fragment);
      }
    }
  });

  it("prints a rich sync recap on sync --help", () => {
    const { status, output } = runCliHelp(["sync", "--help"]);

    expect(status).toBe(0);
    expect(output).toContain("Logics Sync CLI");
    expect(output).toContain("close-eligible-requests");
    expect(output).toContain("schema-status [sources...]");
    expect(output).toContain("context-pack <ref>");
    expect(output).toContain("export-graph");
  });

  it("prints a rich sync subcommand recap on sync context-pack --help", () => {
    const { status, output } = runCliHelp(["sync", "context-pack", "--help"]);

    expect(status).toBe(0);
    expect(output).toContain("Logics Sync Context Pack");
    expect(output).toContain("--mode {summary-only,diff-first,full}");
    expect(output).toContain("--profile {tiny,normal,deep}");
    expect(output).toContain("--out");
  });

  it("prints a rich recap for every sync variant help page", () => {
    const cases: Array<{ args: string[]; expected: string[] }> = [
      { args: ["sync", "close-eligible-requests", "--help"], expected: ["Logics Sync Close Eligible Requests", "--dry-run"] },
      { args: ["sync", "refresh-mermaid-signatures", "--help"], expected: ["Logics Sync Refresh Mermaid Signatures", "--dry-run"] },
      { args: ["sync", "schema-status", "--help"], expected: ["Logics Sync Schema Status", "[sources...]"] },
      { args: ["sync", "export-graph", "--help"], expected: ["Logics Sync Export Graph", "--out"] },
    ];

    for (const testCase of cases) {
      const { status, output } = runCliHelp(testCase.args);
      expect(status).toBe(0);
      for (const fragment of testCase.expected) {
        expect(output).toContain(fragment);
      }
    }
  });

  it("prints a rich assist recap on assist --help", () => {
    const { status, output } = runCliHelp(["assist", "--help"]);

    expect(status).toBe(0);
    expect(output).toContain("Logics Assist CLI");
    expect(output).toContain("runtime-status");
    expect(output).toContain("roi-report");
    expect(output).toContain("context <flow_name> [ref]");
    expect(output).toContain("request-draft");
    expect(output).toContain("closure-summary");
  });

  it("prints a rich recap for every assist variant help page", () => {
    const cases: Array<{ args: string[]; expected: string[] }> = [
      { args: ["assist", "runtime-status", "--help"], expected: ["Logics Assist Runtime Status", "--backend", "--dry-run"] },
      { args: ["assist", "diff-risk", "--help"], expected: ["Logics Assist Diff Risk", "--format {text,json}"] },
      { args: ["assist", "commit-plan", "--help"], expected: ["Logics Assist Commit Plan", "--dry-run"] },
      { args: ["assist", "changed-surface-summary", "--help"], expected: ["Logics Assist Changed Surface Summary", "--dry-run"] },
      { args: ["assist", "doc-consistency", "--help"], expected: ["Logics Assist Doc Consistency", "--dry-run"] },
      { args: ["assist", "review-checklist", "--help"], expected: ["Logics Assist Review Checklist", "--dry-run"] },
      { args: ["assist", "validation-checklist", "--help"], expected: ["Logics Assist Validation Checklist", "--dry-run"] },
      { args: ["assist", "validation-summary", "--help"], expected: ["Logics Assist Validation Summary", "--dry-run"] },
      { args: ["assist", "test-impact-summary", "--help"], expected: ["Logics Assist Test Impact Summary", "--dry-run"] },
      { args: ["assist", "roi-report", "--help"], expected: ["Logics Assist ROI Report", "--audit-log", "--measurement-log"] },
      { args: ["assist", "claude-bridges", "--help"], expected: ["Logics Assist Claude Bridges", "--format {text,json}"] },
      { args: ["assist", "claude-instructions", "--help"], expected: ["Logics Assist Claude Instructions", "--format {text,json}"] },
      { args: ["assist", "context", "--help"], expected: ["Logics Assist Context", "--context-mode {summary-only,diff-first,full}"] },
      { args: ["assist", "next-step", "--help"], expected: ["Logics Assist Next Step", "[ref]"] },
      { args: ["assist", "request-draft", "--help"], expected: ["Logics Assist Request Draft", "--intent"] },
      { args: ["assist", "spec-first-pass", "--help"], expected: ["Logics Assist Spec First Pass", "--execution-mode {suggestion-only,execute}"] },
      { args: ["assist", "backlog-groom", "--help"], expected: ["Logics Assist Backlog Groom", "--execution-mode {suggestion-only,execute}"] },
      { args: ["assist", "closure-summary", "--help"], expected: ["Logics Assist Closure Summary", "--dry-run"] },
    ];

    for (const testCase of cases) {
      const { status, output } = runCliHelp(testCase.args);
      expect(status).toBe(0);
      for (const fragment of testCase.expected) {
        expect(output).toContain(fragment);
      }
    }
  });
});
