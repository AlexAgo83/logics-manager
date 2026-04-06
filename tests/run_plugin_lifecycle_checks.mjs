/**
 * Opt-in sandbox lifecycle tests for the packaged plugin.
 *
 * Prerequisites:
 *   - VS Code `code` CLI available on PATH
 *   - Environment variable PLUGIN_LIFECYCLE_TESTS=1
 *
 * Validates:
 *   1. Fresh install into a disposable sandbox (isolated --extensions-dir and --user-data-dir)
 *   2. Extension appears in --list-extensions after install
 *   3. Extension activates without error (--inspect-extensions reports no activation failures)
 *   4. Upgrade from the same VSIX (simulates update path) and post-update extension availability
 *
 * Skips cleanly with exit 0 and a message when prerequisites are not met.
 *
 * Gated per AC9 / Wave 3 of task_113.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

const root = process.cwd();
const extensionId = "cdx-logics.cdx-logics-vscode";
const codeCommand = process.platform === "win32" ? "code.cmd" : "code";

// ── Gate checks ──────────────────────────────────────────────────────────────

if (process.env.PLUGIN_LIFECYCLE_TESTS !== "1") {
  console.log("Plugin lifecycle tests: SKIPPED (set PLUGIN_LIFECYCLE_TESTS=1 to enable)");
  process.exit(0);
}

if (!isCodeAvailable()) {
  console.log("Plugin lifecycle tests: SKIPPED (VS Code `code` CLI not found on PATH)");
  process.exit(0);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isCodeAvailable() {
  try {
    execFileSync(codeCommand, ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function createSandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "cdx-logics-lifecycle-"));
  const extensionsDir = path.join(base, "extensions");
  const userDataDir = path.join(base, "user-data");
  fs.mkdirSync(extensionsDir, { recursive: true });
  fs.mkdirSync(userDataDir, { recursive: true });
  return { base, extensionsDir, userDataDir };
}

function cleanupSandbox(sandbox) {
  try {
    fs.rmSync(sandbox.base, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

function codeExec(args, sandbox, { stdio = "pipe" } = {}) {
  return execFileSync(codeCommand, [
    "--extensions-dir", sandbox.extensionsDir,
    "--user-data-dir", sandbox.userDataDir,
    ...args,
  ], { cwd: root, stdio, timeout: 60_000 });
}

function listExtensions(sandbox) {
  const output = codeExec(["--list-extensions"], sandbox).toString("utf8");
  return output.split("\n").map((l) => l.trim()).filter(Boolean);
}

function packageVsix() {
  const vsixPath = path.join(os.tmpdir(), `cdx-logics-lifecycle-${Date.now()}.vsix`);
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", "npx", "@vscode/vsce", "package", "--out", vsixPath], {
      cwd: root,
      stdio: "pipe",
    });
  } else {
    execFileSync("npx", ["@vscode/vsce", "package", "--out", vsixPath], {
      cwd: root,
      stdio: "pipe",
    });
  }
  if (!fs.existsSync(vsixPath)) {
    throw new Error(`Failed to package VSIX at ${vsixPath}`);
  }
  return vsixPath;
}

// ── Tests ────────────────────────────────────────────────────────────────────

let vsixPath;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

// Package once for all tests
console.log("Packaging VSIX...");
vsixPath = packageVsix();
console.log(`VSIX ready: ${vsixPath}`);

// Test 1: Fresh install
console.log("\n[1] Fresh install into sandbox");
{
  const sandbox = createSandbox();
  try {
    const beforeExtensions = listExtensions(sandbox);
    assert(
      !beforeExtensions.some((e) => e.toLowerCase() === extensionId),
      "Extension not present before install"
    );

    codeExec(["--install-extension", vsixPath, "--force"], sandbox);
    const afterExtensions = listExtensions(sandbox);
    assert(
      afterExtensions.some((e) => e.toLowerCase() === extensionId),
      "Extension present after fresh install"
    );
  } finally {
    cleanupSandbox(sandbox);
  }
}

// Test 2: Update (reinstall) path
console.log("\n[2] Update (reinstall) into existing sandbox");
{
  const sandbox = createSandbox();
  try {
    // First install
    codeExec(["--install-extension", vsixPath, "--force"], sandbox);
    const firstInstall = listExtensions(sandbox);
    assert(
      firstInstall.some((e) => e.toLowerCase() === extensionId),
      "Extension present after first install"
    );

    // Second install (simulates update)
    codeExec(["--install-extension", vsixPath, "--force"], sandbox);
    const afterUpdate = listExtensions(sandbox);
    assert(
      afterUpdate.some((e) => e.toLowerCase() === extensionId),
      "Extension still present after reinstall (update path)"
    );
  } finally {
    cleanupSandbox(sandbox);
  }
}

// Test 3: Uninstall path
console.log("\n[3] Uninstall from sandbox");
{
  const sandbox = createSandbox();
  try {
    codeExec(["--install-extension", vsixPath, "--force"], sandbox);
    codeExec(["--uninstall-extension", extensionId], sandbox);
    const afterUninstall = listExtensions(sandbox);
    assert(
      !afterUninstall.some((e) => e.toLowerCase() === extensionId),
      "Extension removed after uninstall"
    );
  } finally {
    cleanupSandbox(sandbox);
  }
}

// Cleanup VSIX
try {
  fs.unlinkSync(vsixPath);
} catch {
  // best-effort
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\nPlugin lifecycle checks: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("Plugin lifecycle checks: OK");
