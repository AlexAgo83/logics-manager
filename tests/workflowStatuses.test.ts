import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLOSED_STATUSES, OPEN_STATUSES, STATUS_STAGES, statusTransitionError } from "../clients/vscode/src/workflowStatuses.generated";

const canonical = JSON.parse(readFileSync(resolve(__dirname, "../logics_manager/statuses.json"), "utf-8"));

describe("workflow statuses (single source of truth)", () => {
  it("matches the canonical statuses.json (CI divergence guard)", () => {
    expect(STATUS_STAGES).toEqual(canonical.stages);
    expect([...CLOSED_STATUSES].sort()).toEqual([...canonical.closed].sort());
    expect([...OPEN_STATUSES].sort()).toEqual([...canonical.open].sort());
  });

  it("makes Obsolete selectable for workflow stages", () => {
    for (const stage of ["request", "backlog", "task"]) {
      expect(STATUS_STAGES[stage]).toContain("Obsolete");
    }
    expect(CLOSED_STATUSES.has("Obsolete")).toBe(true);
  });

  it("rejects illegal transitions via the state machine", () => {
    expect(statusTransitionError("task", "Ready", "In progress")).toBeNull();
    expect(statusTransitionError("task", "Ready", "Bogus")).not.toBeNull();
    expect(statusTransitionError("task", "Archived", "Ready")).not.toBeNull();
  });
});
