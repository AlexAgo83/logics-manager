import * as fs from "fs";
import * as path from "path";

type ClaudeBridgeVariantSpec = {
  id: "hybrid-assist" | "flow-manager";
  title: string;
  commandFile: string;
  agentFile: string;
  skillDir: string;
  fallbackPrompt: string;
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

    const prompt = readDefaultPrompt(agentYaml) || variant.fallbackPrompt;
    const commandPath = path.join(root, variant.commandFile);
    const agentPath = path.join(root, variant.agentFile);
    const commandContent = renderCommandBridge(variant, prompt);
    const agentContent = renderAgentBridge(variant, prompt);

    if (writeFileIfChanged(commandPath, commandContent)) {
      writtenPaths.push(path.relative(root, commandPath));
    }
    if (writeFileIfChanged(agentPath, agentContent)) {
      writtenPaths.push(path.relative(root, agentPath));
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
  return [
    `# ${variant.title}`,
    "",
    `Use the repository-local ${variant.title.toLowerCase()} bridge for this project.`,
    "",
    "Primary prompt:",
    prompt,
    "",
    "References:",
    `- \`${variant.skillDir}/SKILL.md\``,
    `- \`${variant.agentFile}\``,
    ""
  ].join("\n");
}

function renderAgentBridge(variant: ClaudeBridgeVariantSpec, prompt: string): string {
  return [
    `# ${variant.title} Agent`,
    "",
    `Use the repository-local ${variant.title.toLowerCase()} agent for this project.`,
    "",
    "Default prompt:",
    prompt,
    "",
    "References:",
    `- \`${variant.skillDir}/SKILL.md\``,
    `- \`${variant.skillDir}/agents/openai.yaml\``,
    ""
  ].join("\n");
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
