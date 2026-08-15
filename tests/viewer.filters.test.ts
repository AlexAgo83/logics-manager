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
  it("counts a runbook like any other companion document", () => {
    // This asserted the opposite until item_817: runbooks were dropped here outright,
    // reasoned as "the board never renders them". The board renders them now -- they are
    // documents with their own heading, colour and prefix -- and a filter that silently
    // returned false was why they stayed invisible after the board had learned about them.
    const runbook = { stage: "runbook", indicators: { Status: "Active" } };

    expect(matchesFilterState(runbook, baseFilterState)).toBe(true);
    expect(matchesFilterState(runbook, { ...baseFilterState, status: "active" })).toBe(true);
    expect(matchesFilterState(runbook, { ...baseFilterState, type: "companion" })).toBe(true);
    // And it is a companion, not workflow: the flow columns stay requests, backlog, tasks.
    expect(matchesFilterState(runbook, { ...baseFilterState, type: "workflow" })).toBe(false);
  });

  it("still counts a board-eligible item with the same status", () => {
    const product = { stage: "product", indicators: { Status: "Active" } };

    expect(matchesFilterState(product, { ...baseFilterState, status: "active" })).toBe(true);
  });
});
