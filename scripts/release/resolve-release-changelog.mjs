import fs from "node:fs";
import path from "node:path";

const CHANGELOG_DIR = "changelogs";
const CHANGELOG_PREFIX = "CHANGELOGS_";
const CHANGELOG_SUFFIX = ".md";

const isVersionLike = (value) => /^\d+\.\d+\.\d+$/.test(value);
const isTagLike = (value) => /^v\d+\.\d+\.\d+$/.test(value);

export const normalizeTagOrVersion = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (isTagLike(trimmed)) {
    return {
      tag: trimmed,
      version: trimmed.slice(1)
    };
  }
  if (isVersionLike(trimmed)) {
    return {
      tag: `v${trimmed}`,
      version: trimmed
    };
  }
  return null;
};

export const getChangelogFilenameForVersion = (version) =>
  `${CHANGELOG_PREFIX}${version.replaceAll(".", "_")}${CHANGELOG_SUFFIX}`;

export const resolveReleaseChangelog = ({ cwd = process.cwd(), tagOrVersion }) => {
  const normalized = normalizeTagOrVersion(tagOrVersion);
  if (!normalized) {
    return {
      ok: false,
      error: `Invalid release tag/version '${tagOrVersion ?? ""}'. Expected vX.Y.Z or X.Y.Z.`
    };
  }

  const filename = getChangelogFilenameForVersion(normalized.version);
  const relativePath = path.join(CHANGELOG_DIR, filename);
  const absolutePath = path.join(cwd, relativePath);
  const exists = fs.existsSync(absolutePath);

  return {
    ok: true,
    ...normalized,
    filename,
    relativePath,
    absolutePath,
    exists
  };
};

const readPackageVersion = (cwd) => {
  const packageJsonPath = path.join(cwd, "package.json");
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!isVersionLike(parsed.version)) {
    throw new Error(`package.json version is invalid: '${parsed.version ?? ""}'`);
  }
  return parsed.version;
};

const writeGithubOutputs = (outputPath, resolution) => {
  if (!outputPath) {
    return;
  }
  const lines = [
    `found=${resolution.exists ? "true" : "false"}`,
    `tag=${resolution.tag}`,
    `version=${resolution.version}`,
    `relative_path=${resolution.relativePath}`,
    `filename=${resolution.filename}`
  ];
  if (resolution.exists) {
    lines.push(`body_path=${resolution.relativePath}`);
  }
  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`);
};

const emitWarning = (message) => {
  if (process.env.GITHUB_ACTIONS === "true") {
    process.stdout.write(`::warning title=Release changelog missing::${message}\n`);
    return;
  }
  process.stderr.write(`Warning: ${message}\n`);
};

const parseArgs = (argv) => {
  let tagOrVersion = null;
  let githubOutputPath = null;
  let validateCurrent = false;
  let requireCurated = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--github-output") {
      githubOutputPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--validate-current") {
      validateCurrent = true;
      continue;
    }
    if (arg === "--require-curated") {
      requireCurated = true;
      continue;
    }
    if (!arg.startsWith("--") && tagOrVersion === null) {
      tagOrVersion = arg;
    }
  }

  return { tagOrVersion, githubOutputPath, validateCurrent, requireCurated };
};

const main = () => {
  const { tagOrVersion, githubOutputPath, validateCurrent, requireCurated } = parseArgs(process.argv.slice(2));
  const resolvedInput = tagOrVersion ?? (validateCurrent ? readPackageVersion(process.cwd()) : null);
  if (!resolvedInput) {
    process.stderr.write(
      "Usage: node scripts/release/resolve-release-changelog.mjs <vX.Y.Z|X.Y.Z> [--github-output <path>] [--validate-current] [--require-curated]\n"
    );
    process.exitCode = 1;
    return;
  }

  const resolution = resolveReleaseChangelog({ tagOrVersion: resolvedInput });
  if (!resolution.ok) {
    process.stderr.write(`${resolution.error}\n`);
    process.exitCode = 1;
    return;
  }

  writeGithubOutputs(githubOutputPath, resolution);

  const summary = resolution.exists
    ? `Resolved curated changelog for ${resolution.tag}: ${resolution.relativePath}`
    : `No curated changelog found for ${resolution.tag}; expected ${resolution.relativePath}. Falling back to generated notes.`;
  process.stdout.write(`${summary}\n`);
  if (!resolution.exists) {
    if (requireCurated) {
      process.stderr.write(`${summary}\n`);
      process.exitCode = 1;
      return;
    }
    emitWarning(summary);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
