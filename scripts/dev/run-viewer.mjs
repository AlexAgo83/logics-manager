#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// No asset sync needed: viewer.py resolves dev assets from clients/ directly
// (repo-first fallback, req_285); the generated viewer_assets is only the
// packaged payload. Build it explicitly with `npm run build:assets`.
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
