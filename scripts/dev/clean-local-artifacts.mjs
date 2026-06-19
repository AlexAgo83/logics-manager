import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import process from "node:process";

export const DEFAULT_ARTIFACT_TARGETS = Object.freeze([
  "artifacts",
  "build",
  "coverage",
  ".code-review-graph",
  "logics/.cache"
]);

export function parseCleanArgs(argv) {
  const options = {
    apply: false,
    targets: [...DEFAULT_ARTIFACT_TARGETS]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg === "--target") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --target.");
      }
      options.targets.push(value);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function buildCleanupPlan(repoRoot, targets = DEFAULT_ARTIFACT_TARGETS) {
  const root = resolve(repoRoot);
  return targets.map((target) => {
    const absolutePath = resolve(root, target);
    const relPath = relative(root, absolutePath);
    if (relPath === "" || relPath.startsWith(`..${sep}`) || relPath === ".." || absolutePath === root) {
      throw new Error(`Refusing to clean path outside the repository: ${target}`);
    }

    const exists = existsSync(absolutePath);
    const sizeBytes = exists ? directorySize(absolutePath) : 0;
    return {
      target,
      path: relPath,
      absolutePath,
      exists,
      sizeBytes
    };
  });
}

export function cleanLocalArtifacts(repoRoot, options = {}) {
  const apply = Boolean(options.apply);
  const plan = buildCleanupPlan(repoRoot, options.targets ?? DEFAULT_ARTIFACT_TARGETS);
  const removed = [];

  if (apply) {
    for (const entry of plan) {
      if (!entry.exists) {
        continue;
      }
      rmSync(entry.absolutePath, { recursive: true, force: true });
      removed.push(entry.path);
    }
  }

  return { apply, plan, removed };
}

export function formatCleanupResult(result) {
  const action = result.apply ? "Removed local artifacts:" : "Local artifacts cleanup preview:";
  const lines = [action];
  for (const entry of result.plan) {
    const marker = entry.exists ? formatBytes(entry.sizeBytes) : "missing";
    lines.push(`- ${entry.path} (${marker})`);
  }
  if (!result.apply) {
    lines.push("Run with --apply to remove the listed paths.");
  }
  return lines.join("\n");
}

function directorySize(path) {
  const stats = statSync(path, { throwIfNoEntry: false });
  if (!stats) {
    return 0;
  }
  if (stats.isFile()) {
    return stats.size;
  }
  if (!stats.isDirectory()) {
    return 0;
  }
  let total = 0;
  for (const entry of readdirSafe(path)) {
    total += directorySize(resolve(path, entry));
  }
  return total;
}

function readdirSafe(path) {
  try {
    return statSync(path).isDirectory() ? readdirSync(path) : [];
  } catch {
    return [];
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  for (const unit of units) {
    if (value < 1024) {
      return `${value.toFixed(1)} ${unit}`;
    }
    value /= 1024;
  }
  return `${value.toFixed(1)} TB`;
}

export function printHelp() {
  console.log([
    "Usage: node scripts/dev/clean-local-artifacts.mjs [--apply] [--target <repo-relative-path>]",
    "",
    "Default targets:",
    ...DEFAULT_ARTIFACT_TARGETS.map((target) => `- ${target}`),
    "",
    "The command previews by default. Pass --apply to remove the listed paths."
  ].join("\n"));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const options = parseCleanArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const result = cleanLocalArtifacts(process.cwd(), options);
    console.log(formatCleanupResult(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
