import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { addLinkToSection, replaceManagedReferenceTokens } from "./logicsDocMaintenance";
import { getManagedDocDirectories, LogicsItem } from "./logicsIndexer";
import { runGitCommand } from "./gitRuntime";
import { runPythonCommand } from "./pythonRuntime";

export function getWorkspaceRoots(): string[] {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return [];
  }
  return folders.map((folder) => folder.uri.fsPath);
}

export function hasMultipleWorkspaceFolders(): boolean {
  return getWorkspaceRoots().length > 1;
}

export function getWorkspaceRoot(): string | null {
  const roots = getWorkspaceRoots();
  if (roots.length !== 1) {
    return null;
  }
  return roots[0];
}

export function isExistingDirectory(value: string): boolean {
  try {
    return fs.existsSync(value) && fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

export function areSamePath(left: string, right: string): boolean {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  if (process.platform === "win32") {
    return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
  }
  return normalizedLeft === normalizedRight;
}

export function hasLogicsSubmodule(root: string): boolean {
  const inspection = inspectLogicsKitSubmodule(root);
  return inspection.exists && inspection.isCanonical;
}

export type LogicsKitSubmoduleInspection = {
  exists: boolean;
  isCanonical: boolean;
  remoteUrl?: string;
  reason: string;
};

export type LogicsBootstrapState = {
  status: "missing" | "incomplete" | "canonical" | "noncanonical";
  canBootstrap: boolean;
  actionTitle: string;
  promptMessage?: string;
  reason: string;
  missingPaths?: string[];
  convergenceNeeded?: boolean;
};

const REQUIRED_BOOTSTRAP_DIRS = [
  "logics/architecture",
  "logics/product",
  "logics/request",
  "logics/backlog",
  "logics/tasks",
  "logics/specs",
  "logics/external"
] as const;

const REQUIRED_GITIGNORE_ENTRIES = [
  ".env.local",
  "logics/.cache/",
  "logics/.cache/hybrid_assist_audit.jsonl",
  "logics/.cache/hybrid_assist_measurements.jsonl",
  "logics/hybrid_assist_audit.jsonl",
  "logics/hybrid_assist_measurements.jsonl",
  "logics/mutation_audit.jsonl"
] as const;

const REQUIRED_ENV_KEYS = ["OPENAI_API_KEY", "GEMINI_API_KEY"] as const;

type BootstrapConvergenceInspection = {
  needed: boolean;
  missingPaths: string[];
  reason: string;
};

export function inspectLogicsKitSubmodule(root: string): LogicsKitSubmoduleInspection {
  const skillsDir = path.join(root, "logics", "skills");
  if (!fs.existsSync(skillsDir)) {
    return {
      exists: false,
      isCanonical: false,
      reason: "logics/skills is missing from the selected repository."
    };
  }

  const gitmodulesPath = path.join(root, ".gitmodules");
  if (!fs.existsSync(gitmodulesPath)) {
    return {
      exists: true,
      isCanonical: false,
      reason: "The repository does not declare logics/skills in .gitmodules."
    };
  }

  let content = "";
  try {
    content = fs.readFileSync(gitmodulesPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exists: true,
      isCanonical: false,
      reason: `Could not read .gitmodules: ${message}`
    };
  }

  const sections = content.split(/\r?\n(?=\[submodule )/);
  for (const section of sections) {
    if (!section.includes("path = logics/skills")) {
      continue;
    }
    const urlMatch = section.match(/^\s*url\s*=\s*(.+)\s*$/m);
    const remoteUrl = urlMatch ? urlMatch[1].trim() : undefined;
    if (!remoteUrl) {
      return {
        exists: true,
        isCanonical: false,
        reason: "The logics/skills submodule is missing a configured URL in .gitmodules."
      };
    }
    const normalized = remoteUrl.toLowerCase();
    const isCanonical =
      normalized.includes("alexago83/cdx-logics-kit") ||
      normalized.includes("github.com:alexago83/cdx-logics-kit");
    return {
      exists: true,
      isCanonical,
      remoteUrl,
      reason: isCanonical
        ? "Canonical cdx-logics-kit submodule detected."
        : `logics/skills points to a non-canonical submodule URL: ${remoteUrl}`
    };
  }

  return {
    exists: true,
    isCanonical: false,
    reason: "The repository does not declare a logics/skills submodule entry in .gitmodules."
  };
}

export function inspectLogicsBootstrapState(root: string): LogicsBootstrapState {
  const logicsDir = path.join(root, "logics");
  const skillsDir = path.join(logicsDir, "skills");
  const inspection = inspectLogicsKitSubmodule(root);

  if (!fs.existsSync(logicsDir)) {
    return {
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics on this branch",
      promptMessage: "This branch does not have Logics set up yet. Bootstrap Logics by adding the cdx-logics-kit submodule?",
      reason: "No logics/ folder found on the active branch."
    };
  }

  if (!fs.existsSync(skillsDir)) {
    return {
      status: "incomplete",
      canBootstrap: true,
      actionTitle: "Repair Logics setup on this branch",
      promptMessage: "This branch has an incomplete Logics setup (logics/skills is missing). Repair by adding the cdx-logics-kit submodule?",
      reason: "The active branch has logics/ but logics/skills is still missing."
    };
  }

  if (inspection.exists && inspection.isCanonical) {
    const convergence = inspectLogicsBootstrapConvergence(root);
    if (convergence.needed) {
      return {
        status: "canonical",
        canBootstrap: true,
        actionTitle: "Reconcile Logics bootstrap on this branch",
        promptMessage:
          "This branch already has the canonical Logics kit, but repo-local bootstrap files are incomplete. Run Bootstrap Logics to converge them?",
        reason: convergence.reason,
        missingPaths: convergence.missingPaths,
        convergenceNeeded: true
      };
    }
    return {
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: inspection.reason
    };
  }

  return {
    status: "noncanonical",
    canBootstrap: false,
    actionTitle: "Bootstrap unavailable until the current logics/skills setup is repaired",
    reason: inspection.reason
  };
}

export function inspectLogicsBootstrapConvergence(root: string): BootstrapConvergenceInspection {
  const missingPaths: string[] = [];

  for (const rel of REQUIRED_BOOTSTRAP_DIRS) {
    if (!fs.existsSync(path.join(root, rel))) {
      missingPaths.push(rel);
    }
  }

  if (!fs.existsSync(path.join(root, "logics", "instructions.md"))) {
    missingPaths.push("logics/instructions.md");
  }

  if (!fs.existsSync(path.join(root, "logics.yaml"))) {
    missingPaths.push("logics.yaml");
  }

  const missingGitignoreEntries = getMissingBootstrapGitignoreEntries(root);
  if (missingGitignoreEntries.length > 0) {
    missingPaths.push(".gitignore");
  }

  const missingEnvTargets = detectBootstrapEnvTargets(root);
  if (missingEnvTargets.length > 0) {
    missingPaths.push(...missingEnvTargets);
  }

  if (missingPaths.length === 0) {
    return {
      needed: false,
      missingPaths: [],
      reason: "Repo-local Logics bootstrap is converged."
    };
  }

  return {
    needed: true,
    missingPaths,
    reason: `Repo-local Logics bootstrap is missing or stale: ${Array.from(new Set(missingPaths)).join(", ")}.`
  };
}

function getMissingBootstrapGitignoreEntries(root: string): string[] {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return [...REQUIRED_GITIGNORE_ENTRIES];
  }
  let content = "";
  try {
    content = fs.readFileSync(gitignorePath, "utf-8");
  } catch {
    return [...REQUIRED_GITIGNORE_ENTRIES];
  }
  const existing = new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
  return REQUIRED_GITIGNORE_ENTRIES.filter((entry) => !existing.has(entry));
}

function getMissingBootstrapEnvKeys(root: string): string[] {
  const presentKeys = new Set(
    getBootstrapEnvFileNames(root).flatMap((fileName) => readBootstrapEnvKeys(path.join(root, fileName)))
  );
  return REQUIRED_ENV_KEYS.filter((key) => !presentKeys.has(key));
}

function getBootstrapEnvFileNames(root: string): string[] {
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(".env"))
      .map((entry) => entry.name)
      .sort((left, right) => {
        const leftPriority = bootstrapEnvFilePriority(left);
        const rightPriority = bootstrapEnvFilePriority(right);
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return left.localeCompare(right);
      });
  } catch {
    return [];
  }
}

function bootstrapEnvFilePriority(fileName: string): number {
  if (fileName === ".env.local") {
    return 0;
  }
  if (fileName === ".env") {
    return 1;
  }
  return 2;
}

function detectBootstrapEnvTargets(root: string): string[] {
  const envFiles = getBootstrapEnvFileNames(root);
  if (envFiles.length === 0) {
    return [".env.local"];
  }
  return envFiles.filter((fileName) => {
    const presentKeys = new Set(readBootstrapEnvKeys(path.join(root, fileName)));
    return REQUIRED_ENV_KEYS.some((key) => !presentKeys.has(key));
  });
}

function readBootstrapEnvKeys(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return fs
      .readFileSync(filePath, "utf-8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=", 1)[0].trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function buildLogicsKitUpdateCommand(): string {
  return "git submodule update --init --remote --merge -- logics/skills";
}

export type CreateItemConfig = { dir: string; prefix: string; label: string };

export function getCreateConfig(kind: "request" | "backlog" | "task"): CreateItemConfig | null {
  if (kind === "request") {
    return { dir: "logics/request", prefix: "req_", label: "request" };
  }
  if (kind === "backlog") {
    return { dir: "logics/backlog", prefix: "item_", label: "backlog item" };
  }
  if (kind === "task") {
    return { dir: "logics/tasks", prefix: "task_", label: "task" };
  }
  return null;
}

export function getNextSequence(dirPath: string, prefix: string): number {
  if (!fs.existsSync(dirPath)) {
    return 1;
  }
  const entries = fs.readdirSync(dirPath);
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped}(\\d+)`);
  let max = 0;
  for (const entry of entries) {
    const match = entry.match(regex);
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      max = Math.max(max, value);
    }
  }
  return max + 1;
}

export function buildMinimalTemplate(id: string, title: string): string {
  return `## ${id} - ${title}
> From version: 0.0.0
> Understanding: 75%
> Confidence: 75%
> Complexity: Medium
> Theme: Workflow
> Reminder: Update Understanding/Confidence and dependencies/references when you edit this doc.

# Needs
- TBD

# Context
- TBD

# Clarifications
- TBD

# Backlog
- (none yet)
`;
}

export function updateMainHeadingId(filePath: string, oldId: string, newId: string): void {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("## ")) {
      continue;
    }
    const match = line.match(/^##\s+(\S+)(\s*-\s*.*)?$/);
    if (!match) {
      break;
    }
    if (match[1] !== oldId) {
      break;
    }
    const suffix = match[2] ?? "";
    lines[i] = `## ${newId}${suffix}`;
    changed = true;
    break;
  }

  if (changed) {
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  }
}

export function normalizeRelationPath(value: string, items: LogicsItem[], root: string): string | null {
  const trimmed = value.replace(/`/g, "").trim();
  if (!trimmed) {
    return null;
  }

  const byId = items.find((item) => item.id === trimmed);
  let normalized = byId ? byId.relPath : trimmed;
  normalized = normalized.replace(/\\/g, "/").replace(/^\.\//, "");

  if (path.isAbsolute(normalized)) {
    const rel = path.relative(root, normalized);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
      normalized = rel.replace(/\\/g, "/");
    }
  }

  return normalized;
}

export function updateManagedReferencesForRename(
  root: string,
  oldRelPath: string,
  newRelPath: string,
  oldId: string,
  newId: string
): number {
  const files = collectManagedMarkdownFiles(root);
  let changedCount = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const updated = replaceManagedReferenceTokens(content, oldRelPath, newRelPath, oldId, newId);
    if (!updated.changed) {
      continue;
    }
    fs.writeFileSync(filePath, updated.content, "utf8");
    changedCount += 1;
  }

  return changedCount;
}

export function collectManagedMarkdownFiles(root: string): string[] {
  const targets = getManagedDocDirectories(root);
  const files: string[] = [];

  for (const dir of targets) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    collectMarkdownFilesRecursive(dir, files);
  }

  return files;
}

export function collectMarkdownFilesRecursive(dirPath: string, files: string[]): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFilesRecursive(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
}

export function addLinkToSectionOnDisk(
  filePath: string,
  sectionTitle: "References" | "Used by",
  linkPath: string
): { changed: boolean } {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = addLinkToSection(content, sectionTitle, linkPath);
  if (!updated.changed) {
    return { changed: false };
  }
  fs.writeFileSync(filePath, updated.content, "utf8");
  return { changed: true };
}

export function updateIndicatorsOnDisk(filePath: string, updates: Record<string, string>): boolean {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const normalizedUpdates = Object.entries(updates)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => key.length > 0 && value.length > 0);
  if (!normalizedUpdates.length) {
    return false;
  }

  const indicatorIndexes = new Map<string, number>();
  let headingIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (headingIndex < 0 && line.startsWith("## ")) {
      headingIndex = i;
    }
    if (!line.startsWith(">")) {
      continue;
    }
    const trimmed = line.replace(/^>\s*/, "").trim();
    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim().toLowerCase();
    if (!indicatorIndexes.has(key)) {
      indicatorIndexes.set(key, i);
    }
  }

  let changed = false;
  const missing: Array<[string, string]> = [];
  for (const [key, value] of normalizedUpdates) {
    const targetLine = `> ${key}: ${value}`;
    const existingIndex = indicatorIndexes.get(key.toLowerCase());
    if (typeof existingIndex === "number") {
      if (lines[existingIndex] !== targetLine) {
        lines[existingIndex] = targetLine;
        changed = true;
      }
    } else {
      missing.push([key, value]);
    }
  }

  if (missing.length > 0) {
    let insertAt = headingIndex >= 0 ? headingIndex + 1 : 0;
    while (insertAt < lines.length && lines[insertAt].startsWith(">")) {
      insertAt += 1;
    }
    const insertion = missing.map(([key, value]) => `> ${key}: ${value}`);
    lines.splice(insertAt, 0, ...insertion);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  }
  return changed;
}

export function getFlowManagerScriptPath(root: string): string | null {
  const scriptPath = path.join(
    root,
    "logics",
    "skills",
    "logics-flow-manager",
    "scripts",
    "logics_flow.py"
  );
  return fs.existsSync(scriptPath) ? scriptPath : null;
}

export function getCompanionDocScriptPath(root: string, kind: "product" | "architecture"): string | null {
  const scriptPath =
    kind === "product"
      ? path.join(
          root,
          "logics",
          "skills",
          "logics-product-brief-writer",
          "scripts",
          "new_product_brief.py"
        )
      : path.join(
          root,
          "logics",
          "skills",
          "logics-architecture-decision-writer",
          "scripts",
          "new_adr.py"
        );
  return fs.existsSync(scriptPath) ? scriptPath : null;
}

export function findCreatedDocPathFromOutput(stdout: string): string {
  const match = stdout.match(/Wrote (.+)/);
  return match ? match[1].trim() : "";
}

export async function openCreatedDocFromOutput(stdout: string): Promise<void> {
  const createdPath = findCreatedDocPathFromOutput(stdout);
  if (!createdPath) {
    return;
  }
  if (!fs.existsSync(createdPath)) {
    return;
  }
  const document = await vscode.workspace.openTextDocument(createdPath);
  await vscode.window.showTextDocument(document, { preview: false });
}

export async function runPythonWithOutput(
  cwd: string,
  scriptPath: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; error?: Error }> {
  return runPythonCommand(cwd, scriptPath, args);
}

export async function runGitWithOutput(
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; error?: Error }> {
  return runGitCommand(cwd, args);
}
