#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
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
const child = spawn(py, ["-m", "logics_manager", "view", ...args], {
  cwd: repoRoot,
  stdio: "inherit",
});

const forward = (signal) => {
  try {
    child.kill(signal);
  } catch {
    // Child may already be gone.
  }
};
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));
child.on("close", (code, signal) => {
  if (typeof code === "number") {
    process.exit(code);
  }
  process.exit(signal === "SIGINT" ? 130 : (signal === "SIGTERM" ? 143 : 1));
});
child.on("error", (error) => {
  console.error(error?.message || error);
  process.exit(1);
});
