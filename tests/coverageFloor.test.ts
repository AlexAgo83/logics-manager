// req_323/item_670: the Python coverage floor used to be a hardcoded
// --fail-under=75 that a comment admitted was set below the measured value
// "so the build does not start red." These tests prove the replacement
// ratchet actually fails below the floor and reports (never silently
// accepts) a run above it, mirroring the line-budget ledger's own pattern.
import { describe, expect, it } from "vitest";
import { evaluateCoverageFloor } from "../scripts/coverage-floor.mjs";

describe("evaluateCoverageFloor", () => {
  it("fails when measured coverage is below the recorded floor", () => {
    const result = evaluateCoverageFloor(70, 75);
    expect(result.status).toBe("fail");
  });

  it("passes when measured coverage exactly meets the recorded floor", () => {
    const result = evaluateCoverageFloor(75, 75);
    expect(result.status).toBe("ok");
  });

  it("reports raisable, not silently ok, when measured coverage exceeds the floor", () => {
    const result = evaluateCoverageFloor(77, 75);
    expect(result.status).toBe("raisable");
    expect(result.message).toContain("77%");
    expect(result.message).toContain("75%");
  });
});
