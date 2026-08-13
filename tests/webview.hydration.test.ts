import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, pushData } from "./webviewHarnessTestUtils";

describe("webview hydration and data message handling", () => {
  it("renders board after receiving a data message with items", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const cards = board?.querySelectorAll(".card") || [];
    expect(cards.length).toBe(1);
  });

  it("re-renders board when a new data message replaces items", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const newItem = {
      ...baseItem,
      id: "req_002_updated",
      title: "Updated item"
    };

    pushData(dom, {
      root: "/workspace/mock",
      items: [newItem]
    });

    const board = dom.window.document.getElementById("board");
    const cards = Array.from(board?.querySelectorAll(".card") || []);
    expect(cards.length).toBe(1);
    expect((cards[0] as HTMLElement).dataset.id).toBe("req_002_updated");
  });

  it("preserves selection when the selected item remains in the new payload", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    // Push again with the same item
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, { ...baseItem, id: "req_001_new", title: "New" }]
    });

    const board = dom.window.document.getElementById("board");
    expect(board?.querySelector('[data-id="req_000_kickoff"]')?.classList.contains("card--selected")).toBe(true);
  });

  it("drops selection when the selected item disappears from the payload", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    // Push without the selected item
    pushData(dom, {
      root: "/workspace/mock",
      items: [{ ...baseItem, id: "req_001_other", title: "Other" }]
    });

    const board = dom.window.document.getElementById("board");
    const selectedCards = board?.querySelectorAll(".card--selected") || [];
    expect(selectedCards.length).toBe(0);
  });

  it("applies canResetProjectRoot from payload to the reset button", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      canResetProjectRoot: true,
      items: [baseItem]
    });

    const resetButton = dom.window.document.querySelector('[data-action="reset-project-root"]') as HTMLButtonElement | null;
    expect(resetButton?.disabled).toBe(false);
  });

  it("applies canBootstrapLogics from payload to the bootstrap button", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      canBootstrapLogics: true,
      bootstrapLogicsTitle: "Bootstrap Logics in this project",
      items: [baseItem]
    });

    const bootstrapButton = dom.window.document.querySelector('[data-action="bootstrap-logics"]') as HTMLButtonElement | null;
    expect(bootstrapButton?.disabled).toBe(false);
    expect(bootstrapButton?.title).toBe("Bootstrap Logics in this project");
  });

  it("applies activeAgent from payload and makes it accessible in context", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      activeAgent: { name: "test-agent", profile: "default" },
      items: [baseItem]
    });

    // The active agent should be stored and not cause any rendering errors
    const board = dom.window.document.getElementById("board");
    expect(board).toBeTruthy();
  });

  it("processes changedPaths from payload without breaking render", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      changedPaths: ["logics/request/req_000_kickoff.md", "logics/backlog/item_100.md"],
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    expect(board?.querySelectorAll(".card").length).toBe(1);
  });

  it("renders details panel for the selected item with title and eyebrow", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const detailsTitle = dom.window.document.getElementById("details-title");
    const detailsEyebrow = dom.window.document.getElementById("details-eyebrow");

    expect(detailsTitle?.textContent).toContain("Kickoff");
    // item_721: the panel identified the document three times -- title, `File: <relPath>`,
    // and the Name row. relPath is the stage folder the eyebrow names plus the slug the
    // Name row carries, so it is stated once now and the slug is still reachable.
    expect(detailsTitle?.textContent).not.toContain("File:");
    expect(dom.window.document.getElementById("details")?.textContent).toContain("req_000_kickoff");
    expect(detailsEyebrow?.textContent).toBeTruthy();
  });

  it("leads the panel with the criteria and the summary the payload already carried", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          summaryPoints: [
            "**The demo board** was gated on `clients/shared-web/media`.",
            "A second point that is plain prose."
          ],
          acceptanceCriteria: ["AC1: First criterion.", "AC2: Second criterion.", "AC3: Third criterion."]
        }
      ]
    });

    const details = dom.window.document.getElementById("details");

    // item_721: the payload carried summaryPoints and acceptanceCriteria all along and the
    // panel showed neither, opening on a title and nine closed headings.
    expect(details?.querySelectorAll(".details__criterion").length).toBe(3);
    expect(details?.querySelectorAll(".details__summary-point").length).toBe(2);

    // The count is the point: criteria you have to measure by eye are read, not checked.
    expect(details?.querySelector('[data-section="acceptanceCriteria"]')?.textContent).toContain("(3)");

    // Both are expanded on open. Machine-facing sections are what fold.
    expect(details?.querySelector('[data-section="acceptanceCriteria"]')?.getAttribute("aria-expanded")).toBe("true");
    expect(details?.querySelector('[data-section="summary"]')?.getAttribute("aria-expanded")).toBe("true");
    expect(details?.querySelector('[data-section="indicators"]')?.getAttribute("aria-expanded")).toBe("false");

    // Corpus lines arrive with inline markers. They are rendered as the two forms they use,
    // as nodes -- never as HTML, which would hand document text an injection surface.
    const firstPoint = details?.querySelector(".details__summary-point");
    expect(firstPoint?.querySelector("strong")?.textContent).toBe("The demo board");
    expect(firstPoint?.querySelector("code")?.textContent).toBe("clients/shared-web/media");
    expect(firstPoint?.textContent).not.toContain("**");
  });

  it("draws a lifeline from the stage's declared sequence and admits it has no dates", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [{ ...baseItem, indicators: { Status: "In progress" } }]
    });

    const document = dom.window.document;
    const beats = Array.from(document.querySelectorAll(".details__beat")).map((node) => ({
      status: node.querySelector(".details__beat-label")?.textContent,
      state: (node as HTMLElement).dataset.state
    }));

    // item_722, bounded by item_716: the beats are the stage's declared sequence from
    // logics_manager/statuses.json, minus the exits. Reached is a position in that
    // sequence, not a recorded event -- which is the strongest claim Status alone supports.
    expect(beats.map((beat) => beat.status)).toEqual(["Draft", "Ready", "In progress", "Done", "Archived"]);
    expect(beats.map((beat) => beat.state)).toEqual(["reached", "reached", "current", "pending", "pending"]);

    // item_716 measured that no per-beat date exists anywhere in the payload. A lifeline
    // that stays silent about that reads as one that has the dates.
    expect(document.querySelector(".details__lifeline-note")?.textContent).toContain("No dates are recorded per beat");
  });

  it("treats a blocked document as an exit rather than claiming it passed the beats before it", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [{ ...baseItem, indicators: { Status: "Blocked" } }]
    });

    const document = dom.window.document;
    const beats = Array.from(document.querySelectorAll(".details__beat")).map((node) => ({
      status: node.querySelector(".details__beat-label")?.textContent,
      state: (node as HTMLElement).dataset.state
    }));

    // A document does not pass through Blocked on its way to Done. Marking the sequence
    // before it as reached would be the same invention the dates were rejected for.
    expect(beats.filter((beat) => beat.state === "reached")).toHaveLength(0);
    expect(beats.filter((beat) => beat.state === "unknown").length).toBeGreaterThan(0);
    expect(beats.at(-1)).toEqual({ status: "Blocked", state: "exit" });
    expect(document.querySelector(".details__lifeline-note")?.textContent).toContain("is an exit, not a later beat");
  });

  it("collapses and expands details panel via toggle button", () => {
    const { dom } = bootstrapWebview({ stacked: true });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const details = dom.window.document.getElementById("details");
    const detailsToggle = dom.window.document.getElementById("details-toggle");

    expect(details?.classList.contains("details--collapsed")).toBe(false);
    expect(detailsToggle?.getAttribute("aria-expanded")).toBe("true");

    detailsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(details?.classList.contains("details--collapsed")).toBe(true);
    expect(detailsToggle?.getAttribute("aria-expanded")).toBe("false");

    detailsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(details?.classList.contains("details--collapsed")).toBe(false);
    expect(detailsToggle?.getAttribute("aria-expanded")).toBe("true");
  });

  it("renders details body with indicators for the selected item", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          indicators: { Status: "Draft", Progress: "25%", Complexity: "Medium" }
        }
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Draft");
  });

  it("posts a ready message on initial bootstrap", () => {
    const { postedMessages } = bootstrapWebview();

    expect(postedMessages.some((m) => m.type === "ready")).toBe(true);
  });

  it("does not render the legacy refresh button anymore", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    expect(dom.window.document.querySelector('[data-action="refresh"]')).toBeNull();
  });

  it("handles empty payload gracefully without crashing", () => {
    const { dom } = bootstrapWebview();

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          type: "data",
          payload: {
            items: []
          }
        }
      })
    );

    const board = dom.window.document.getElementById("board");
    expect(board).toBeTruthy();
    const emptyMessage = board?.querySelector(".state-message");
    expect(emptyMessage).toBeTruthy();
  });

  it("ignores messages with unknown types", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    // Send an unknown message type
    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          type: "unknown-type",
          payload: {}
        }
      })
    );

    // Board should still show the original item
    const board = dom.window.document.getElementById("board");
    expect(board?.querySelectorAll(".card").length).toBe(1);
  });

  it("applies the selected item from the payload when provided", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    expect(board?.querySelector('[data-id="req_000_kickoff"]')?.classList.contains("card--selected")).toBe(true);
  });

  it("renders the layout in stacked mode when viewport is narrow", () => {
    const { dom } = bootstrapWebview({ stacked: true });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const layout = dom.window.document.getElementById("layout");
    expect(layout?.classList.contains("layout--stacked")).toBe(true);
    expect(layout?.classList.contains("layout--horizontal")).toBe(false);
  });

  it("renders the layout in horizontal mode when viewport is wide", () => {
    const { dom } = bootstrapWebview({ stacked: false });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const layout = dom.window.document.getElementById("layout");
    expect(layout?.classList.contains("layout--horizontal")).toBe(true);
    expect(layout?.classList.contains("layout--stacked")).toBe(false);
  });

  it("transitions layout mode when media query changes", () => {
    const { dom, setStacked } = bootstrapWebview({ stacked: false });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const layout = dom.window.document.getElementById("layout");
    expect(layout?.classList.contains("layout--horizontal")).toBe(true);

    setStacked(true);

    // Trigger a re-render
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    expect(layout?.classList.contains("layout--stacked")).toBe(true);
  });

  it("updates canPublishRelease from successive payloads", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      canPublishRelease: false,
      publishReleaseTitle: "Not available",
      items: [baseItem]
    });

    const publishButton = dom.window.document.querySelector('[data-action="assist-publish-release"]') as HTMLButtonElement | null;
    expect(publishButton?.disabled).toBe(true);

    pushData(dom, {
      root: "/workspace/mock",
      canPublishRelease: true,
      publishReleaseTitle: "Publish release",
      items: [baseItem]
    });

    expect(publishButton?.disabled).toBe(false);
    expect(publishButton?.title).toBe("Publish release");
  });
});
