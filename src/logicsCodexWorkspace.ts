import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PythonCommand } from "./pythonRuntime";

export type CodexOverlayStatus = "unavailable" | "missing-manager" | "missing-overlay" | "stale" | "warning" | "healthy";

type OverlayManifestEntry = {
  name: string;
  source_path: string;
  destination_path: string;
  mode?: string;
  source_mtime_ns?: number;
  present?: boolean;
};

type OverlayManifest = {
  workspace_id?: string;
  repo_root?: string;
  overlay_root?: string;
  codex_home?: string;
  publication_mode?: string;
  repo_skill_entries?: OverlayManifestEntry[];
  global_skill_entries?: OverlayManifestEntry[];
  shared_asset_entries?: OverlayManifestEntry[];
};

export type CodexOverlaySnapshot = {
  status: CodexOverlayStatus;
  summary: string;
  issues: string[];
  warnings: string[];
  workspaceId?: string;
  overlayRoot?: string;
  codexHome?: string;
  publicationMode?: string;
  managerScriptPath?: string;
  syncCommand?: string;
  runCommand?: string;
};

const MANIFEST_NAME = "logics-codex-overlay.json";

export function buildCodexOverlaySyncCommand(pythonCommand?: PythonCommand | null): string {
  return `${buildPythonLauncher(pythonCommand)} logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync`;
}

export function buildCodexOverlayRunCommand(pythonCommand?: PythonCommand | null): string {
  return `${buildPythonLauncher(pythonCommand)} logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex`;
}

export function inspectCodexWorkspaceOverlay(root: string | null, pythonCommand?: PythonCommand | null): CodexOverlaySnapshot {
  if (!root) {
    return {
      status: "unavailable",
      summary: "Select a project root before checking Codex overlay runtime state.",
      issues: [],
      warnings: []
    };
  }

  const resolvedRoot = path.resolve(root);
  const managerScriptPath = path.join(
    resolvedRoot,
    "logics",
    "skills",
    "logics-flow-manager",
    "scripts",
    "logics_codex_workspace.py"
  );
  const syncCommand = buildCodexOverlaySyncCommand(pythonCommand);
  const runCommand = buildCodexOverlayRunCommand(pythonCommand);
  if (!fs.existsSync(managerScriptPath)) {
    return {
      status: "missing-manager",
      summary: "Overlay manager script is missing from logics/skills. Repair or update the Logics kit before relying on Codex workspace overlays.",
      issues: ["Overlay manager script is missing."],
      warnings: [],
      managerScriptPath,
      syncCommand,
      runCommand
    };
  }

  const identity = computeOverlayIdentity(resolvedRoot);
  const overlayRoot = path.join(getWorkspacesHome(), identity);
  const manifestPath = path.join(overlayRoot, MANIFEST_NAME);
  const base: CodexOverlaySnapshot = {
    status: "healthy",
    summary: "Codex workspace overlay is ready for this repository.",
    issues: [],
    warnings: [],
    workspaceId: identity,
    overlayRoot,
    codexHome: overlayRoot,
    managerScriptPath,
    syncCommand,
    runCommand
  };

  if (!fs.existsSync(overlayRoot) || !fs.existsSync(manifestPath)) {
    return {
      ...base,
      status: "missing-overlay",
      summary: "Repo-local Logics is available, but the Codex workspace overlay has not been materialized yet. Run the overlay sync before terminal Codex sessions should see this repo's skills.",
      issues: ["Workspace overlay is missing or not initialized."]
    };
  }

  let manifest: OverlayManifest | null = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as OverlayManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      status: "stale",
      summary: "Overlay manifest is unreadable. Re-sync the workspace overlay to recover deterministic state.",
      issues: [`Overlay manifest is unreadable: ${message}`]
    };
  }

  const issues: string[] = [];
  const warnings: string[] = [];
  if (manifest.repo_root && path.resolve(manifest.repo_root) !== resolvedRoot) {
    warnings.push("Manifest repo root differs from the current repository path.");
  }

  const repoSkillNames = discoverRepoSkillNames(resolvedRoot);
  const manifestRepoEntries = manifest.repo_skill_entries ?? [];
  const manifestRepoNames = manifestRepoEntries.map((entry) => entry.name).sort();
  if (JSON.stringify(repoSkillNames) !== JSON.stringify(manifestRepoNames)) {
    issues.push("Repo skill set drift detected between the repository and the overlay manifest.");
  }

  for (const entry of [...manifestRepoEntries, ...(manifest.global_skill_entries ?? [])]) {
    if (!fs.existsSync(entry.source_path)) {
      issues.push(`Source is missing for \`${entry.name}\`.`);
      continue;
    }
    if (!existsOrSymlink(entry.destination_path)) {
      issues.push(`Destination is missing for \`${entry.name}\`.`);
      continue;
    }
    if (entry.mode === "copy") {
      const currentSourceMtime = readSkillMtime(entry.source_path);
      if (
        typeof currentSourceMtime === "number" &&
        typeof entry.source_mtime_ns === "number" &&
        currentSourceMtime !== entry.source_mtime_ns
      ) {
        issues.push(`Copied overlay content is stale for \`${entry.name}\`.`);
      }
    }
  }

  for (const entry of manifest.shared_asset_entries ?? []) {
    if (entry.present && !fs.existsSync(entry.source_path)) {
      issues.push(`Shared asset source is missing for \`${entry.name}\`.`);
    }
    if (entry.present && !existsOrSymlink(entry.destination_path)) {
      issues.push(`Shared asset destination is missing for \`${entry.name}\`.`);
    }
  }

  const status: CodexOverlayStatus = issues.length > 0 ? "stale" : warnings.length > 0 ? "warning" : "healthy";
  const summary =
    status === "healthy"
      ? `Codex workspace overlay is ready (${identity}). Use the overlay run command for terminal Codex sessions.`
      : status === "warning"
        ? "Codex workspace overlay is usable, but some metadata no longer matches the current repository path."
        : "Codex workspace overlay needs repair or re-sync before it is a reliable runtime surface.";

  return {
    ...base,
    status,
    summary,
    issues,
    warnings,
    publicationMode: manifest.publication_mode ?? undefined
  };
}

function buildPythonLauncher(pythonCommand?: PythonCommand | null): string {
  if (!pythonCommand) {
    return "python";
  }
  return [pythonCommand.command, ...pythonCommand.argsPrefix].join(" ");
}

function computeOverlayIdentity(root: string): string {
  const digest = crypto.createHash("sha256").update(root).digest("hex").slice(0, 12);
  const safeSlug = path
    .basename(root)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "workspace";
  return `${safeSlug}-${digest}`;
}

function getWorkspacesHome(): string {
  return path.resolve(process.env.LOGICS_CODEX_WORKSPACES_HOME || path.join(os.homedir(), ".codex-workspaces"));
}

function discoverRepoSkillNames(root: string): string[] {
  const skillsRoot = path.join(root, "logics", "skills");
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function existsOrSymlink(target: string): boolean {
  if (fs.existsSync(target)) {
    return true;
  }
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

function readSkillMtime(target: string): number | null {
  const marker = path.join(target, "SKILL.md");
  if (fs.existsSync(marker)) {
    return Math.trunc(fs.statSync(marker).mtimeMs * 1_000_000);
  }
  if (fs.existsSync(target)) {
    return Math.trunc(fs.statSync(target).mtimeMs * 1_000_000);
  }
  return null;
}
