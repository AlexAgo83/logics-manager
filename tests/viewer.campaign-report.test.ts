/**
 * Regression test for item_615: the campaign reports, and a failed check does not end the run.
 *
 * It drives the real script, because the property under test is what the script does after
 * a check fails -- which is exactly what a unit test of the pieces would not observe.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const out = mkdtempSync(join(tmpdir(), "viewer-campaign-"));

afterAll(() => rmSync(out, { recursive: true, force: true, maxRetries: 3 }));

function runCampaign(env: Record<string, string>) {
  const result = spawnSync(process.execPath, ["tests/run_local_viewer_visual_smoke.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    // Measured 2026-08-14 on this corpus (1 614 workflow docs): a desktop-only run with the
    // slow screens skipped takes about 190s, over the 180s this budget was set to when the
    // campaign visited four screens. It now visits those four plus the board, the selection,
    // the details panel, the activity feed, Git, its History domain, CI, Release and
    // Settings. The budget follows the coverage rather than the coverage being trimmed to
    // fit a number chosen before it.
    timeout: 300_000,
    env: {
      ...process.env,
      VIEWER_CAMPAIGN_OUT: out,
      VIEWER_CAMPAIGN_VIEWPORTS: "desktop",
      VIEWER_CAMPAIGN_SKIP_SLOW_CHECKS: "1",
      ...env
    }
  });
  // The campaign writes summary.json and report.txt together, at the end. If it was killed
  // by the budget above, neither exists and the reader throws ENOENT -- which names a
  // missing file rather than the timeout that caused it, and sent me looking for a write
  // bug that was not there. Say what actually happened.
  if (result.error || result.signal) {
    throw new Error(
      `the campaign did not finish: ${result.error?.message ?? `killed by ${result.signal}`}. `
      + `It writes its summary at the end, so nothing was produced to assert on.`
    );
  }
  const summary = JSON.parse(readFileSync(join(out, "summary.json"), "utf8"));
  return { result, summary, report: readFileSync(join(out, "report.txt"), "utf8") };
}

describe("viewer campaign", { timeout: 660_000 }, () => {
  it("keeps running after a failed check, reports every check, and still gates", () => {
    const { result, summary, report } = runCampaign({ VIEWER_CAMPAIGN_INJECT_FAILURE: "1" });

    if (summary.mode === "none" || summary.mode === "server") {
      // No viewer could start, or (Windows CI) no browser is available to drive the
      // injected failure through -- server mode only fetches the shell and payload, by
      // design. Either way the run still owes a report, and that is all it can owe.
      expect(report).toContain("Viewer UI campaign");
      return;
    }

    const injected = summary.checks.findIndex((check: { name: string }) => check.name.includes("injected failure"));
    expect(injected).toBeGreaterThanOrEqual(0);
    expect(summary.checks[injected].verdict).toBe("failed");

    const after = summary.checks.slice(injected + 1);
    expect(after.filter((check: { verdict: string }) => check.verdict === "ok").length).toBeGreaterThan(3);

    // Every check carries a verdict and the value it measured, not just a pass or fail.
    for (const check of summary.checks) {
      expect(["ok", "failed", "skipped"]).toContain(check.verdict);
      expect(check).toHaveProperty("measured");
    }

    expect(report).toContain("KO  ");
    expect(report).toContain("Findings:");
    expect(result.status).toBe(1);
    // The captures are what a reviewer opens to tell a defect from a stale expectation,
    // so a failing run writes them too.
    expect(existsSync(join(out, "desktop.png")) || summary.mode !== "chrome").toBe(true);
  });

  it("reports viewports it did not sweep rather than silently covering less", () => {
    const { summary } = runCampaign({});

    const skipped = summary.checks.filter((check: { verdict: string }) => check.verdict === "skipped");
    expect(skipped.map((check: { name: string }) => check.name)).toEqual(
      expect.arrayContaining([expect.stringContaining("tablet"), expect.stringContaining("mobile")])
    );
  });
});
