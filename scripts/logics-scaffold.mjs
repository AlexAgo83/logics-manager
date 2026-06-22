import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// Wrap the scaffold->validate(->commit) ritual for a logics request chain.
// Usage: node scripts/logics-scaffold.mjs <slug> [--commit "message"]
//   reads logics/scaffold/<slug>.json, writes the context pack to
//   logics/context-packs/<slug>.json, scaffolds, then validates the new request.

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const commitIdx = args.indexOf("--commit");
const commitMessage = commitIdx !== -1 ? args[commitIdx + 1] : null;

if (!slug) {
  console.error('Usage: node scripts/logics-scaffold.mjs <slug> [--commit "message"]');
  process.exit(2);
}

const input = path.join("logics", "scaffold", `${slug}.json`);
const contextPack = path.join("logics", "context-packs", `${slug}.json`);
if (!existsSync(path.join(repoRoot, input))) {
  console.error(`[logics-scaffold] missing input: ${input}`);
  process.exit(1);
}

const lm = (...lmArgs) =>
  spawnSync(process.execPath, ["scripts/run-python.mjs", "-m", "logics_manager", ...lmArgs], {
    cwd: repoRoot,
    encoding: "utf8"
  });

const scaffoldArgs = ["flow", "scaffold", "request-chain", "--input", input, "--context-pack", contextPack];

console.log("[logics-scaffold] dry-run");
const dry = lm(...scaffoldArgs, "--dry-run");
process.stdout.write(dry.stdout || "");
if (dry.status !== 0) {
  process.stderr.write(dry.stderr || "");
  process.exit(dry.status ?? 1);
}

console.log("[logics-scaffold] scaffolding");
const real = lm(...scaffoldArgs);
process.stdout.write(real.stdout || "");
if (real.status !== 0) {
  process.stderr.write(real.stderr || "");
  process.exit(real.status ?? 1);
}

// The scaffold prints "Scaffolded request chain: <req_ref>" — fail loud if that breaks.
const ref = (real.stdout.match(/Scaffolded request chain:\s*(\S+)/) || [])[1];
if (!ref) {
  console.error("[logics-scaffold] could not parse the scaffolded request ref from output");
  process.exit(1);
}

console.log(`[logics-scaffold] validating ${ref}`);
const validate = lm("flow", "validate", ref);
process.stdout.write(validate.stdout || "");
// Deferred task-closeout proofs are expected on a fresh request; only hard failures abort.
if (validate.status !== 0 && !/deferred/.test(validate.stdout || "")) {
  process.stderr.write(validate.stderr || "");
  process.exit(validate.status ?? 1);
}

if (commitMessage) {
  console.log("[logics-scaffold] committing");
  spawnSync("git", ["add", "logics"], { cwd: repoRoot, stdio: "inherit" });
  spawnSync("git", ["commit", "-m", commitMessage], { cwd: repoRoot, stdio: "inherit" });
} else {
  console.log(`[logics-scaffold] done. Review ${ref}, then: git add logics/ && git commit`);
}
