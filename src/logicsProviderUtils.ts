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
  const normalizedLeft = normalizeComparablePath(left);
  const normalizedRight = normalizeComparablePath(right);
  if (process.platform === "win32") {
    return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
  }
  return normalizedLeft === normalizedRight;
}

function normalizeComparablePath(value: string): string {
  const pathApi = process.platform === "win32" ? path.win32 : path.posix;
  const resolved = pathApi.resolve(value);
  const normalized = pathApi.normalize(resolved);
  if (normalized.length <= 1) {
    return normalized;
  }
  return normalized.replace(/[\\/]+$/, "");
}

export function hasLogicsRuntimeSource(root: string): boolean {
  const inspection = inspectLogicsRuntimeSource(root);
  return inspection.exists && inspection.isCanonical;
}

export function detectDangerousGitignorePatterns(root: string): DangerousGitignorePatternInspection {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return {
      hasDangerousPatterns: false,
      matchedPatterns: [],
      reason: "No .gitignore file was found."
    };
  }

  let content = "";
  try {
    content = fs.readFileSync(gitignorePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      hasDangerousPatterns: false,
      matchedPatterns: [],
      reason: `Could not read .gitignore: ${message}`
    };
  }

  const matchedPatterns = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) {
      continue;
    }
    const normalized = line.replace(/^\/+/, "");
    if (normalized === "logics" || normalized === "logics/" || normalized === "logics/*" || normalized === "logics/**") {
      matchedPatterns.add(normalized);
    }
  }

  const matches = Array.from(matchedPatterns).sort();
  return {
    hasDangerousPatterns: matches.length > 0,
    matchedPatterns: matches,
    reason: matches.length > 0
      ? `Broad .gitignore pattern(s) cover repo-local Logics runtime paths: ${matches.join(", ")}.`
      : "No broad .gitignore pattern covering repo-local Logics runtime paths was detected."
  };
}

export function detectRuntimeInstallType(root: string): LogicsRuntimeInstallType {
  const bundledEntryPoint = path.join(root, "scripts", "logics-manager.py");
  return fs.existsSync(bundledEntryPoint) ? "bundled-runtime" : "plain-copy";
}

export type LogicsRuntimeSourceInspection = {
  exists: boolean;
  isCanonical: boolean;
  remoteUrl?: string;
  reason: string;
};

export type LogicsKitSubmoduleInspection = LogicsRuntimeSourceInspection;

export type DangerousGitignorePatternInspection = {
  hasDangerousPatterns: boolean;
  matchedPatterns: string[];
  reason: string;
};

export type LogicsRuntimeInstallType = "bundled-runtime" | "plain-copy";
export type LogicsKitInstallType = LogicsRuntimeInstallType;

export type LogicsBootstrapState = {
  status: "missing" | "incomplete" | "canonical";
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

const LEGACY_RUNTIME_PATHS = [".claude", "logics/skills"] as const;

type BootstrapConvergenceInspection = {
  needed: boolean;
  missingPaths: string[];
  reason: string;
};

export function inspectLogicsRuntimeSource(root: string): LogicsRuntimeSourceInspection {
  const bundledEntryPoint = path.join(root, "scripts", "logics-manager.py");
  if (!fs.existsSync(bundledEntryPoint)) {
    return {
      exists: false,
      isCanonical: false,
      reason: "No bundled Logics runtime entrypoint was detected in the selected repository."
    };
  }

  return {
    exists: true,
    isCanonical: true,
    reason: "Bundled Logics runtime entrypoint detected."
  };
}

export function inspectLogicsBootstrapState(root: string, hasBootstrapScript = true): LogicsBootstrapState {
  const logicsDir = path.join(root, "logics");

  if (!fs.existsSync(logicsDir)) {
    return {
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics on this branch",
      promptMessage: hasBootstrapScript
        ? "This branch does not have Logics set up yet. Bootstrap Logics by provisioning the local runtime?"
        : "This branch does not have Logics set up yet. Bootstrap Logics will provision the local runtime from the extension bundle.",
      reason: "No logics/ folder found on the active branch."
    };
  }

  const convergence = inspectLogicsBootstrapConvergence(root);
  if (convergence.needed) {
    return {
      status: "incomplete",
      canBootstrap: true,
      actionTitle: "Repair Logics setup on this branch",
      promptMessage: hasBootstrapScript
        ? "This branch has an incomplete Logics setup. Repair by provisioning the local runtime?"
        : "This branch has an incomplete Logics setup. Repair will provision the local runtime from the extension bundle.",
      reason: convergence.reason,
      missingPaths: convergence.missingPaths,
      convergenceNeeded: true
    };
  }

  return {
    status: "canonical",
    canBootstrap: false,
    actionTitle: "Bootstrap already completed",
    reason: convergence.reason
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

  for (const rel of LEGACY_RUNTIME_PATHS) {
    if (fs.existsSync(path.join(root, rel))) {
      missingPaths.push(rel);
    }
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
    reason: `Repo-local Logics bootstrap is missing, stale, or still contains legacy runtime artifacts: ${Array.from(new Set(missingPaths)).join(", ")}.`
  };
}

export function buildLogicsRuntimeUpdateCommand(): string {
  return "python3 -m logics_manager bootstrap";
}

export const inspectLogicsKitSubmodule = inspectLogicsRuntimeSource;
export const detectKitInstallType = detectRuntimeInstallType;
export const buildLogicsKitUpdateCommand = buildLogicsRuntimeUpdateCommand;

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
  const candidate = byId ? byId.relPath : trimmed;

  if (path.isAbsolute(candidate)) {
    const rel = path.relative(root, candidate);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
      return rel.replace(/\\/g, "/");
    }
    return path.normalize(candidate);
  }

  return candidate.replace(/\\/g, "/").replace(/^\.\//, "");
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

export function getCanonicalLogicsManagerScriptPath(extensionPath: string): string {
  return path.join(extensionPath, "scripts", "logics-manager.py");
}

export function getBundledLogicsManagerScriptPath(): string {
  return path.join(__dirname, "..", "scripts", "logics-manager.py");
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
