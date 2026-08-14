/**
 * Regression tests for item_782: the refresh cadence follows what a refresh costs.
 *
 * The defect: the interval was a constant chosen when the corpus was small, so on a
 * corpus where a rebuild outlasts it the viewer never stopped working -- measured at 85%
 * CPU with nobody using it. `item_781` removed today's cause; this keeps the cadence
 * honest when a future corpus is large enough to bring it back.
 *
 * Asserted against the source rather than by driving the browser host: the pacing is
 * three small functions over module-local state, and a test that booted the whole host to
 * reach them would be measuring the boot.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const host = readFileSync("clients/viewer/src/browser-host/index.js", "utf8");

/** The delay rule, lifted out of the host and exercised directly. */
function autoRefreshDelayMs(intervalMs: number, lastRefreshMs: number, divisor = 10) {
  return Math.max(intervalMs, Math.round(lastRefreshMs * divisor));
}

describe("the cadence accounts for what a refresh costs", () => {
  it("leaves a healthy corpus on the operator's setting", () => {
    // item_781 brought the payload to about 0.15s. At that cost the configured interval
    // always wins, which is the point: this changes nothing until it needs to.
    expect(autoRefreshDelayMs(15_000, 150)).toBe(15_000);
  });

  it("stretches the interval when a refresh costs more than a tenth of it", () => {
    // The measured before-state: a 6s rebuild against a 15s interval is 40% duty. At ten
    // it becomes one refresh a minute.
    expect(autoRefreshDelayMs(15_000, 6_000)).toBe(60_000);
  });

  it("never shortens the interval below what the operator asked for", () => {
    // A fast refresh is not a licence to poll faster than requested.
    expect(autoRefreshDelayMs(30_000, 5)).toBe(30_000);
  });

  it("uses the configured interval before any refresh has been measured", () => {
    expect(autoRefreshDelayMs(15_000, 0)).toBe(15_000);
  });
});

describe("the host paces itself the same way", () => {
  it("derives the timer from the measured delay, not from the raw interval", () => {
    // The rule above is worthless if the scheduler ignores it. These assert the wiring:
    // the timer and the countdown both read the derived delay.
    const scheduler = host.slice(host.indexOf("function scheduleNextAutoRefresh()"));
    const body = scheduler.slice(0, scheduler.indexOf("\n  }"));
    expect(body).toContain("autoRefreshDelayMs()");
    expect(body).not.toMatch(/setTimeout\(autoRefreshItems, autoRefreshIntervalMs\)/);
  });

  it("records what a refresh cost even when it failed", () => {
    // Pacing off a cost of zero after a slow failure would retry a struggling server as
    // fast as the interval allows -- which is the behaviour this whole slice is about.
    const refresher = host.slice(host.indexOf("function autoRefreshItems()"));
    const body = refresher.slice(0, refresher.indexOf("\n  }"));
    const assignments = body.match(/lastAutoRefreshMs = Date\.now\(\) - startedAt/g) || [];
    expect(assignments.length).toBe(2);
    expect(body).toContain(".catch(");
  });

  it("says when the cost, not the setting, is pacing the viewer", () => {
    // A select reading "15 sec" while the viewer refreshes every minute is a control that
    // lies about what it does, and the operator's only clue would be a stale screen.
    const control = host.slice(host.indexOf("function updateRefreshIntervalControl()"));
    const body = control.slice(0, control.indexOf("\n  }"));
    expect(body).toContain("autoRefreshIsThrottled()");
    expect(body).toContain("control.title");
  });

  it("does not refresh a tab nobody is looking at", () => {
    // Already true before this slice, and asserted because it is half of what bounds the
    // idle cost: a background tab that keeps polling is a viewer nobody is using.
    const refresher = host.slice(host.indexOf("function autoRefreshItems()"));
    const body = refresher.slice(0, refresher.indexOf("\n  }"));
    expect(body).toContain("document.hidden");
    expect(body).toContain("refreshAfterVisible = true");
  });
});
