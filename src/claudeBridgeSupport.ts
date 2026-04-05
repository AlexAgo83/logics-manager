import * as fs from "fs";
import * as path from "path";

type ClaudeBridgeVariantSpec = {
  id: "hybrid-assist" | "flow-manager" | "request-draft" | "spec-first-pass" | "backlog-groom";
  title: string;
  commandFile: string;
  agentFile: string;
  skillDir: string;
  fallbackPrompt: string;
  promptOverride?: string;
  reviewerNudge?: string;
};

export type ClaudeBridgeRepairOutcome = {
  writtenPaths: string[];
  skippedVariants: string[];
};

const CLAUDE_BRIDGE_VARIANTS: ClaudeBridgeVariantSpec[] = [
  {
    id: "hybrid-assist",
    title: "Logics Assist",
    commandFile: ".claude/commands/logics-assist.md",
    agentFile: ".claude/agents/logics-hybrid-delivery-assistant.md",
    skillDir: "logics/skills/logics-hybrid-delivery-assistant",
    fallbackPrompt: "Use $logics-hybrid-delivery-assistant for commit-all, summaries, next-step, triage, handoff, or split-suggestion requests."
  },
  {
    id: "flow-manager",
    title: "Logics Flow",
    commandFile: ".claude/commands/logics-flow.md",
    agentFile: ".claude/agents/logics-flow-manager.md",
    skillDir: "logics/skills/logics-flow-manager",
    fallbackPrompt:
      "Use $logics-flow-manager to manage this repository's Logics workflow: create new request/backlog/task docs, promote between stages, keep From version/Understanding/Confidence/Progress indicators consistent."
  },
  {
    id: "request-draft",
    title: "Logics Request Draft",
    commandFile: ".claude/commands/logics-request-draft.md",
    agentFile: ".claude/agents/logics-request-draft.md",
    skillDir: "logics/skills/logics-hybrid-delivery-assistant",
    fallbackPrompt:
      "Use $logics-hybrid-delivery-assistant for bounded request-draft proposals from a short intent; keep the output proposal-only and do not create files directly.",
    promptOverride:
      "Use $logics-hybrid-delivery-assistant for bounded request-draft proposals from a short intent; keep the output proposal-only and do not create files directly.",
    reviewerNudge: "Validate the generated Needs and Context blocks before promoting them into a real request doc or committing follow-up work."
  },
  {
    id: "spec-first-pass",
    title: "Logics Spec First Pass",
    commandFile: ".claude/commands/logics-spec-first-pass.md",
    agentFile: ".claude/agents/logics-spec-first-pass.md",
    skillDir: "logics/skills/logics-hybrid-delivery-assistant",
    fallbackPrompt:
      "Use $logics-hybrid-delivery-assistant for bounded spec-first-pass outlines from a backlog item; keep the output proposal-only and operator-reviewed.",
    promptOverride:
      "Use $logics-hybrid-delivery-assistant for bounded spec-first-pass outlines from a backlog item; keep the output proposal-only and operator-reviewed.",
    reviewerNudge: "Validate the proposed spec sections, constraints, and open questions before turning them into a real spec file."
  },
  {
    id: "backlog-groom",
    title: "Logics Backlog Groom",
    commandFile: ".claude/commands/logics-backlog-groom.md",
    agentFile: ".claude/agents/logics-backlog-groom.md",
    skillDir: "logics/skills/logics-hybrid-delivery-assistant",
    fallbackPrompt:
      "Use $logics-hybrid-delivery-assistant for bounded backlog-groom proposals from a request doc; keep the output proposal-only and reviewable.",
    promptOverride:
      "Use $logics-hybrid-delivery-assistant for bounded backlog-groom proposals from a request doc; keep the output proposal-only and reviewable.",
    reviewerNudge: "Validate the scoped title, complexity, and acceptance-criteria proposal before creating or committing a backlog item."
  }
];

export function repairClaudeBridgeFiles(root: string): ClaudeBridgeRepairOutcome {
  const writtenPaths: string[] = [];
  const skippedVariants: string[] = [];

  for (const variant of CLAUDE_BRIDGE_VARIANTS) {
    const skillDir = path.join(root, variant.skillDir);
    const skillDoc = path.join(skillDir, "SKILL.md");
    const agentYaml = path.join(skillDir, "agents", "openai.yaml");
    if (!fs.existsSync(skillDoc) || !fs.existsSync(agentYaml)) {
      skippedVariants.push(variant.id);
      continue;
    }

    const prompt = variant.promptOverride || readDefaultPrompt(agentYaml) || variant.fallbackPrompt;
    const commandPath = path.join(root, variant.commandFile);
    const agentPath = path.join(root, variant.agentFile);
    const commandContent = renderCommandBridge(variant, prompt);
    const agentContent = renderAgentBridge(variant, prompt);

    if (writeFileIfChanged(commandPath, commandContent)) {
      writtenPaths.push(toPosixRelative(root, commandPath));
    }
    if (writeFileIfChanged(agentPath, agentContent)) {
      writtenPaths.push(toPosixRelative(root, agentPath));
    }
  }

  return {
    writtenPaths,
    skippedVariants
  };
}

function readDefaultPrompt(agentYamlPath: string): string | null {
  try {
    const content = fs.readFileSync(agentYamlPath, "utf8");
    const match = content.match(/^\s*default_prompt:\s*"(.*)"\s*$/m);
    if (!match) {
      return null;
    }
    return match[1].replace(/\\"/g, "\"").trim() || null;
  } catch {
    return null;
  }
}

function renderCommandBridge(variant: ClaudeBridgeVariantSpec, prompt: string): string {
  const lines = [
    `# ${variant.title}`,
    "",
    `Use the repository-local ${variant.title.toLowerCase()} bridge for this project.`,
    "",
    "Primary prompt:",
    prompt,
    ""
  ];
  if (variant.reviewerNudge) {
    lines.push("Reviewer nudge:", variant.reviewerNudge, "");
  }
  lines.push("References:", `- \`${variant.skillDir}/SKILL.md\``, `- \`${variant.agentFile}\``, "");
  return lines.join("\n");
}

function renderAgentBridge(variant: ClaudeBridgeVariantSpec, prompt: string): string {
  const lines = [
    `# ${variant.title} Agent`,
    "",
    `Use the repository-local ${variant.title.toLowerCase()} agent for this project.`,
    "",
    "Default prompt:",
    prompt,
    ""
  ];
  if (variant.reviewerNudge) {
    lines.push("Reviewer nudge:", variant.reviewerNudge, "");
  }
  lines.push("References:", `- \`${variant.skillDir}/SKILL.md\``, `- \`${variant.skillDir}/agents/openai.yaml\``, "");
  return lines.join("\n");
}

function writeFileIfChanged(targetPath: string, content: string): boolean {
  if (fs.existsSync(targetPath)) {
    try {
      if (fs.readFileSync(targetPath, "utf8") === content) {
        return false;
      }
    } catch {
      // fall through and rewrite the file
    }
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).split(path.sep).join("/");
}
