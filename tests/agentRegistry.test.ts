import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { extractExplicitAgentInvocation, loadAgentRegistry } from "../src/agentRegistry";

const tempRoots: string[] = [];

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-agents-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
  return root;
}

function writeYaml(root: string, skillName: string, content: string): void {
  const filePath = path.join(root, "logics", "skills", skillName, "agents", "openai.yaml");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root && fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("agentRegistry", () => {
  it("loads valid openai.yaml agents and derives invocation id from skill folder", () => {
    const root = mkRepo();
    writeYaml(
      root,
      "logics-spec-writer",
      [
        "interface:",
        "  display_name: \"Spec Writer\"",
        "  short_description: \"Write specs\"",
        "  default_prompt: \"Use $logics-spec-writer\""
      ].join("\n")
    );
    writeYaml(
      root,
      "logics-flow-manager",
      [
        "interface:",
        "  display_name: \"Flow Manager\"",
        "  short_description: \"Manage workflow docs\"",
        "  default_prompt: \"Use $logics-flow-manager\""
      ].join("\n")
    );

    const snapshot = loadAgentRegistry(root);
    expect(snapshot.scannedFiles).toBe(2);
    expect(snapshot.issues).toHaveLength(0);
    expect(snapshot.agents).toHaveLength(2);
    expect(snapshot.agents.map((agent) => agent.id)).toEqual(["$logics-flow-manager", "$logics-spec-writer"]);
  });

  it("reports missing or invalid required fields", () => {
    const root = mkRepo();
    writeYaml(
      root,
      "logics-invalid",
      [
        "interface:",
        "  display_name: \"Invalid\"",
        "  short_description: 42",
        "  default_prompt: \"\""
      ].join("\n")
    );

    const snapshot = loadAgentRegistry(root);
    expect(snapshot.agents).toHaveLength(0);
    expect(snapshot.issues.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.issues.some((issue) => issue.message.includes("short_description must be a string"))).toBe(true);
    expect(snapshot.issues.some((issue) => issue.message.includes("default_prompt cannot be empty"))).toBe(true);
  });

  it("loads multiline prompt bodies and YAML comments", () => {
    const root = mkRepo();
    writeYaml(
      root,
      "logics-flow-manager",
      [
        "# Agent file",
        "interface:",
        "  display_name: \"Flow Manager\"",
        "  short_description: \"Manage workflow docs\"",
        "  default_prompt: |",
        "    Use $logics-flow-manager",
        "    Keep the workflow clean."
      ].join("\n")
    );

    const snapshot = loadAgentRegistry(root);
    expect(snapshot.issues).toHaveLength(0);
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.agents[0].defaultPrompt).toContain("Keep the workflow clean.");
  });

  it("loads optional routing and response fields when present", () => {
    const root = mkRepo();
    writeYaml(
      root,
      "logics-flow-manager",
      [
        "interface:",
        "  display_name: \"Flow Manager\"",
        "  short_description: \"Manage workflow docs\"",
        "  default_prompt: \"Use $logics-flow-manager\"",
        "  preferred_context_profile: \"tiny\"",
        "  allowed_doc_stages:",
        "    - request",
        "    - backlog",
        "  blocked_doc_stages:",
        "    - spec",
        "  response_style: \"balanced\""
      ].join("\n")
    );

    const snapshot = loadAgentRegistry(root);
    expect(snapshot.issues).toHaveLength(0);
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.agents[0].preferredContextProfile).toBe("tiny");
    expect(snapshot.agents[0].allowedDocStages).toEqual(["request", "backlog"]);
    expect(snapshot.agents[0].blockedDocStages).toEqual(["spec"]);
    expect(snapshot.agents[0].responseStyle).toBe("balanced");
  });

  it("flags duplicate derived invocation ids", () => {
    const root = mkRepo();
    writeYaml(
      root,
      "logics-dup",
      [
        "interface:",
        "  display_name: \"Dup A\"",
        "  short_description: \"A\"",
        "  default_prompt: \"Use $logics-dup\""
      ].join("\n")
    );
    writeYaml(
      root,
      "logics-dup!",
      [
        "interface:",
        "  display_name: \"Dup B\"",
        "  short_description: \"B\"",
        "  default_prompt: \"Use $logics-dup\""
      ].join("\n")
    );

    const snapshot = loadAgentRegistry(root);
    expect(snapshot.agents).toHaveLength(0);
    expect(snapshot.issues.some((issue) => issue.message.includes("Duplicate invocation id detected: $logics-dup"))).toBe(
      true
    );
  });

  it("extracts explicit $logics invocation from a chat draft", () => {
    expect(extractExplicitAgentInvocation("$logics-spec-writer please draft ACs")).toBe("$logics-spec-writer");
    expect(extractExplicitAgentInvocation("Use $LOGICS-FLOW-MANAGER now")).toBe("$logics-flow-manager");
    expect(extractExplicitAgentInvocation("No explicit invocation")).toBeNull();
  });

  it("rejects deeply nested block YAML before parsing", () => {
    const root = mkRepo();
    const nestedLines = [
      "interface:",
      "  display_name: \"Flow Manager\"",
      "  short_description: \"Manage workflow docs\"",
      "  default_prompt: \"Use $logics-flow-manager\"",
      "  metadata:"
    ];
    for (let depth = 0; depth < 45; depth += 1) {
      nestedLines.push(`${"  ".repeat(depth + 2)}level_${depth}:`);
    }
    nestedLines.push(`${"  ".repeat(47)}leaf: true`);
    writeYaml(root, "logics-flow-manager", nestedLines.join("\n"));

    const snapshot = loadAgentRegistry(root);
    expect(snapshot.agents).toHaveLength(0);
    expect(
      snapshot.issues.some((issue) => issue.message.includes("safe block-depth limit"))
    ).toBe(true);
  });

  it("rejects deeply nested flow YAML before parsing", () => {
    const root = mkRepo();
    const deeplyNested = `${"[".repeat(45)}0${"]".repeat(45)}`;
    writeYaml(
      root,
      "logics-flow-manager",
      [
        "interface:",
        "  display_name: \"Flow Manager\"",
        "  short_description: \"Manage workflow docs\"",
        "  default_prompt: \"Use $logics-flow-manager\"",
        `  allowed_doc_stages: ${deeplyNested}`
      ].join("\n")
    );

    const snapshot = loadAgentRegistry(root);
    expect(snapshot.agents).toHaveLength(0);
    expect(
      snapshot.issues.some((issue) => issue.message.includes("safe flow-depth limit"))
    ).toBe(true);
  });
});
