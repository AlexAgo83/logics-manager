/**
 * Regression tests for item_626: the size ledger is a ratchet, not a record of surrender.
 *
 * The ledger only ever went up — each delivery that made a file longer raised its ceiling,
 * and nothing lowered one when a file came back down.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  }
});

/** A throwaway repository holding the real guard and one oversized source file. */
function repoWith(lines: number, ceiling: number | null, ref = "req_311") {
  const root = mkdtempSync(join(tmpdir(), "line-budget-"));
  roots.push(root);
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "logics_manager"), { recursive: true });
  cpSync("scripts/check-source-line-budget.mjs", join(root, "scripts", "check-source-line-budget.mjs"));

  const script = join(root, "scripts", "check-source-line-budget.mjs");
  const entry = ceiling === null ? "" : `    "logics_manager/probe.py": { maxLines: ${ceiling}, ref: "${ref}" },\n`;
  writeFileSync(
    script,
    readFileSync(script, "utf8").replace("const allowedOversizedFiles = new Map(\n  Object.entries({\n", `const allowedOversizedFiles = new Map(\n  Object.entries({\n${entry}`)
  );
  writeFileSync(join(root, "logics_manager", "probe.py"), "x = 1\n".repeat(lines));
  return { root, script };
}

function run(root: string, args: string[] = []) {
  return spawnSync(process.execPath, ["scripts/check-source-line-budget.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000
  });
}

function ceilingIn(script: string): number {
  return Number(/"logics_manager\/probe\.py":\s*\{\s*maxLines:\s*(\d+)/.exec(readFileSync(script, "utf8"))![1]);
}

describe("source line budget ledger", () => {
  it("reports an entry whose file came back under its ceiling", () => {
    const { root } = repoWith(1100, 1500);

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Lowerable 1 ledger entr");
    expect(result.stdout).toContain("logics_manager/probe.py: 1100 lines, ceiling 1500");
  });

  it("writes the lower number back when asked", () => {
    const { root, script } = repoWith(1100, 1500);

    const result = run(root, ["--update"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Lowered 1 ledger entr");
    expect(ceilingIn(script)).toBe(1100);
  });

  it("does not raise a ceiling on its own when a file grows", () => {
    const { root, script } = repoWith(1600, 1500);

    const result = run(root, ["--update"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("1600 lines > 1500");
    expect(result.stderr).toContain("A raised ceiling needs a reason in the entry");
    expect(ceilingIn(script)).toBe(1500);
  });

  it("still refuses a new oversized file with no entry at all", () => {
    const { root } = repoWith(1200, null);

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("logics_manager/probe.py: 1200 lines > 1000 (new)");
  });

  it("leaves a file inside its ceiling alone", () => {
    const { root, script } = repoWith(1500, 1500);

    const result = run(root, ["--update"]);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("Lowerable");
    expect(ceilingIn(script)).toBe(1500);
  });
});
