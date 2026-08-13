#!/usr/bin/env node
// Generates clients/vscode/src/workflowStatuses.generated.ts from the single
// source of truth logics_manager/statuses.json, so Python and TypeScript can
// never disagree on statuses. Run with --check in CI to fail on drift.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const sourcePath = resolve(repoRoot, "logics_manager", "statuses.json");
const targetPath = resolve(repoRoot, "clients", "vscode", "src", "workflowStatuses.generated.ts");
// item_722: the shared web client needs the same per-stage status sequences to draw a
// document's lifeline. It gets a generated copy for the same reason TypeScript does --
// a hand-written second list is a list that eventually disagrees with this one.
const webTargetPath = resolve(repoRoot, "clients", "shared-web", "media", "workflowStatuses.generated.js");

const data = JSON.parse(readFileSync(sourcePath, "utf-8"));
const j = (value) => JSON.stringify(value);

const stageEntries = Object.entries(data.stages)
  .map(([stage, values]) => `  ${j(stage)}: ${j(values)}`)
  .join(",\n");

const content = `// AUTO-GENERATED from logics_manager/statuses.json. Do not edit by hand.
// Regenerate with \`npm run generate:status-constants\` (checked by \`npm run check:status-constants\`).
export const STATUS_STAGES: Record<string, readonly string[]> = {
${stageEntries}
};

export const OPEN_STATUSES = new Set<string>(${j(data.open)});
export const CLOSED_STATUSES = new Set<string>(${j(data.closed)});
export const TERMINAL_STATUSES = new Set<string>(${j(data.terminal)});

export function statusTransitionError(stage: string, previous: string | null, target: string): string | null {
  const allowed = STATUS_STAGES[stage];
  if (allowed && !allowed.includes(target)) {
    return \`\${target} is not a valid status for \${stage} (allowed: \${allowed.join(", ")}).\`;
  }
  const prev = (previous || "").trim();
  if (prev && prev !== target && TERMINAL_STATUSES.has(prev)) {
    return \`\${prev} is terminal; cannot transition to \${target}.\`;
  }
  return null;
}
`;

const webContent = `// AUTO-GENERATED from logics_manager/statuses.json. Do not edit by hand.
// Regenerate with \`npm run generate:status-constants\` (checked by \`npm run check:status-constants\`).
(() => {
  window.CdxWorkflowStatuses = {
    STATUS_STAGES: ${j(data.stages)},
    OPEN_STATUSES: ${j(data.open)},
    CLOSED_STATUSES: ${j(data.closed)},
    TERMINAL_STATUSES: ${j(data.terminal)}
  };
})();
`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(targetPath, "utf-8");
  } catch {
    current = "";
  }
  let currentWeb = "";
  try {
    currentWeb = readFileSync(webTargetPath, "utf-8");
  } catch {
    currentWeb = "";
  }
  if (current !== content || currentWeb !== webContent) {
    console.error("[generate-status-constants] generated status modules are out of date; run `npm run generate:status-constants`.");
    process.exit(1);
  }
  console.log("[generate-status-constants] in sync");
} else {
  writeFileSync(targetPath, content, "utf-8");
  writeFileSync(webTargetPath, webContent, "utf-8");
  console.log(`[generate-status-constants] wrote ${targetPath} and ${webTargetPath}`);
}
