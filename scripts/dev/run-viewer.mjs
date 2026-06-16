#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const sync = spawnSync(process.execPath, [resolve(repoRoot, "scripts/dev/sync-viewer-assets.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

const args = process.argv.slice(2);
if (!args.some((a) => a === "--port" || a.startsWith("--port="))) {
  args.push("--port", "2345");
}
const py = process.env.PYTHON || "python3";
const res = spawnSync(py, ["-m", "logics_manager", "view", ...args], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.exit(res.status ?? 1);
