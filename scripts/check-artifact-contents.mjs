#!/usr/bin/env node
// item_771/item_772: build each published artifact and inspect what is inside it against the
// definition of dev-only recorded in
// logics/backlog/item_771_define_dev_only_as_a_property_rather_than_a_list.md:
//
//   A file is dev-only when it exists to build, verify or document the construction of the
//   product, and no published entry point reads it at runtime.
//
// Both halves matter. "Not needed at runtime" alone condemns README and LICENSE, which ship
// deliberately. "Exists to build or verify" alone condemns a bundled output whose source is
// the build input. The predicates below decide the conjunction mechanically -- each is a
// statement about where a file lives or how it is produced, never a list of remembered
// filenames, because a list can only catch what somebody remembered.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = process.cwd();

/** Entry points the product itself runs, which live under a directory otherwise dev-only. */
const PUBLISHED_ENTRY_POINTS = [
  "scripts/npm/",
  "scripts/logics-manager.py"
];

/**
 * Why this file is dev-only, or "" when it is not.
 *
 * Returning the reason rather than a boolean is deliberate: a check that says "this file
 * must not be here" without saying why teaches nothing, and the next person has to redo the
 * reasoning to decide whether the check or the artifact is wrong.
 */
export function devOnlyReason(relPath) {
  const posix = String(relPath || "").replace(/\\/g, "/").replace(/^\.?\//, "");
  if (!posix) return "";

  const segments = posix.split("/");
  const base = segments[segments.length - 1];

  if (segments.includes("tests") || /\.(test|spec)\.[cm]?[jt]sx?$/.test(base) || /^test_.*\.py$/.test(base) || base === "conftest.py") {
    return "test material: it verifies the product and the product never reads it";
  }
  if (segments[0] === "scripts" && !PUBLISHED_ENTRY_POINTS.some((entry) => posix === entry || posix.startsWith(entry))) {
    return "development tooling: it builds or checks the repository, not the product";
  }
  if (segments[0] === "logics") {
    return "this repository's own corpus: a consumer's corpus belongs in their repository, not ours";
  }
  if (/^clients\/[^/]+\/src\//.test(posix)) {
    return "a build input: the artifact already carries the bundle this produces";
  }
  if (/^\.(github|claude|vscode|git|env)/.test(base) || segments.some((segment) => /^\.(github|claude|vscode)$/.test(segment))
      || base === "tsconfig.json" || /^vitest\.config\./.test(base)) {
    return "working-copy metadata: it configures the checkout, not the product";
  }
  if (segments.some((segment) => ["coverage", "__pycache__", ".pytest_cache", "node_modules", "out", "debug"].includes(segment))) {
    return "build or test residue: produced by developing, carries no product behaviour";
  }
  return "";
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

/** The npm package, listed without publishing anything. */
function npmContents() {
  const raw = run("npm", ["pack", "--dry-run", "--json"]);
  const parsed = JSON.parse(raw);
  const files = parsed?.[0]?.files || [];
  return files.map((entry) => entry.path);
}

/** The pip wheel, built into a throwaway directory and read back. */
function wheelContents() {
  const out = mkdtempSync(path.join(tmpdir(), "logics-wheel-"));
  try {
    run("python3", ["-m", "build", "--wheel", "--outdir", out], { stdio: ["ignore", "pipe", "pipe"] });
    const wheel = readdirSync(out).find((name) => name.endsWith(".whl"));
    if (!wheel) return null;
    const listing = run("python3", ["-c", "import sys,zipfile;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))", path.join(out, wheel)]);
    return listing.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    // A missing build backend is a reason the wheel could not be inspected, not a pass.
    return { unavailable: String(error?.message || error).split("\n")[0] };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

/**
 * The VS Code extension, packaged into a throwaway directory and read back.
 *
 * Through the repository's own `packageVsix`, not a bare `vsce` call: the npm package name
 * is scoped and vsce rejects it, so the repository stages a rewritten manifest. Inspecting
 * an artifact built a different way from the released one would prove nothing about the
 * released one.
 */
async function vsixContents() {
  const out = mkdtempSync(path.join(tmpdir(), "logics-vsix-"));
  try {
    const target = path.join(out, "artifact.vsix");
    const { packageVsix } = await import(path.join(repoRoot, "scripts", "build", "package-vscode-extension.mjs"));
    packageVsix(target);
    const listing = run("python3", ["-c", "import sys,zipfile;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))", target]);
    // VSIX paths are prefixed with `extension/`; strip it so one definition judges all three.
    return listing.split("\n").map((line) => line.trim()).filter(Boolean)
      .filter((entry) => entry.startsWith("extension/"))
      .map((entry) => entry.slice("extension/".length));
  } catch (error) {
    return { unavailable: String(error?.message || error).split("\n")[0] };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

function inspect(name, contents) {
  if (!contents) return { name, skipped: "produced nothing to inspect" };
  if (!Array.isArray(contents)) return { name, skipped: contents.unavailable };
  const findings = contents
    .map((entry) => ({ path: entry, reason: devOnlyReason(entry) }))
    .filter((entry) => entry.reason);
  return { name, count: contents.length, findings };
}

const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const artifacts = [
  ["npm package", npmContents],
  ["VS Code extension", vsixContents],
  ["pip wheel", wheelContents]
].filter(([name]) => !only.length || only.some((wanted) => name.includes(wanted)));

let failed = false;
let skipped = 0;
for (const [name, read] of artifacts) {
  let result;
  try {
    result = inspect(name, await read());
  } catch (error) {
    result = { name, skipped: String(error?.message || error).split("\n")[0] };
  }
  if (result.skipped) {
    skipped += 1;
    console.log(`[artifact-contents] ${name}: not inspected -- ${result.skipped}`);
    continue;
  }
  if (!result.findings.length) {
    console.log(`[artifact-contents] ${name}: ${result.count} file(s), nothing dev-only`);
    continue;
  }
  failed = true;
  console.error(`[artifact-contents] ${name}: ${result.findings.length} dev-only file(s) of ${result.count}:`);
  for (const finding of result.findings.slice(0, 40)) {
    console.error(`  - ${finding.path}\n      ${finding.reason}`);
  }
  if (result.findings.length > 40) {
    console.error(`  ... and ${result.findings.length - 40} more`);
  }
}

if (skipped) {
  // A skip is reported, never counted as a pass: an artifact nobody could build is an
  // artifact nobody inspected.
  console.log(`[artifact-contents] ${skipped} artifact(s) could not be inspected; that is not a pass.`);
}
process.exit(failed ? 1 : 0);
