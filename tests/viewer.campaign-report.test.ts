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

afterAll(() => rmSync(out, { recursive: true, force: true }));

function runCampaign(env: Record<string, string>) {
  const result = spawnSync(process.execPath, ["tests/run_local_viewer_visual_smoke.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 180_000,
    env: { ...process.env, VIEWER_CAMPAIGN_OUT: out, VIEWER_CAMPAIGN_VIEWPORTS: "desktop", ...env }
  });
  const summary = JSON.parse(readFileSync(join(out, "summary.json"), "utf8"));
  return { result, summary, report: readFileSync(join(out, "report.txt"), "utf8") };
}

describe("viewer campaign", { timeout: 200_000 }, () => {
  it("keeps running after a failed check, reports every check, and still gates", () => {
    const { result, summary, report } = runCampaign({ VIEWER_CAMPAIGN_INJECT_FAILURE: "1" });

    if (summary.mode === "none") {
      // No viewer could start here; the run still owes a report, and that is all it can owe.
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
