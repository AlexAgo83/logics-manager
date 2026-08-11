/**
 * Regression for the viewer smoke campaign failure discovered in 2.21.6: a runbook document
 * counted by the generic status filter even though the board has no column to render it in
 * (runbooks live in the Workshop tab, per req_330/item_689). "announced 1 above an empty
 * board" is exactly what an unguarded predicate produces once a real Active runbook exists.
 */
import { describe, expect, it } from "vitest";
import { matchesFilterState } from "../clients/viewer/src/browser-host/filters.js";

const baseFilterState = { focus: "all", type: "all", status: "any", relation: "any", activity: "any" };

describe("matchesFilterState", () => {
  it("excludes runbooks from every filter, since the board never renders them", () => {
    const runbook = { stage: "runbook", indicators: { Status: "Active" } };

    expect(matchesFilterState(runbook, baseFilterState)).toBe(false);
    expect(matchesFilterState(runbook, { ...baseFilterState, status: "active" })).toBe(false);
  });

  it("still counts a board-eligible item with the same status", () => {
    const product = { stage: "product", indicators: { Status: "Active" } };

    expect(matchesFilterState(product, { ...baseFilterState, status: "active" })).toBe(true);
  });
});
