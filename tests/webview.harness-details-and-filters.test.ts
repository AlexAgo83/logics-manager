import { describe, expect, it } from "vitest";
import {
  architectureItem,
  baseItem,
  bootstrapWebview,
  productItem,
  pushData,
  specItem
} from "./webviewHarnessTestUtils";

describe("webview harness filters, details, and docs", () => {
  it("hides SPEC by default and applies the toggle in board and list modes", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [specItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const hideSpecToggle = document.getElementById("hide-spec") as HTMLInputElement | null;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');

    expect(hideSpecToggle?.checked).toBe(true);
    expect(board?.textContent?.includes("No items match the current filters.")).toBe(true);
    expect(document.querySelector('[data-stage="spec"]')).toBeNull();

    if (hideSpecToggle) {
      hideSpecToggle.checked = false;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelectorAll('.column[data-stage="spec"]').length).toBe(1);
    expect(persistedStates.some((state) => state.hideSpec === false)).toBe(true);

    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(document.querySelectorAll('.list-view__section[data-stage="spec"]').length).toBe(1);

    if (hideSpecToggle) {
      hideSpecToggle.checked = true;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('[data-stage="spec"]')).toBeNull();
    expect(persistedStates.some((state) => state.hideSpec === true)).toBe(true);
  });

  it("hides processed requests by default and can reveal them when disabled", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_001_processed",
          title: "Processed request",
          relPath: "logics/request/req_001_processed.md",
          path: "/workspace/mock/logics/request/req_001_processed.md",
          references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_001_processed.md" }]
        },
        {
          ...baseItem,
          id: "req_002_draft_linked",
          title: "Linked draft request",
          relPath: "logics/request/req_002_draft_linked.md",
          path: "/workspace/mock/logics/request/req_002_draft_linked.md",
          references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_002_draft_linked.md" }]
        },
        {
          ...baseItem,
          id: "item_001_processed",
          title: "Processed backlog",
          stage: "backlog",
          relPath: "logics/backlog/item_001_processed.md",
          path: "/workspace/mock/logics/backlog/item_001_processed.md",
          indicators: { Status: "Ready" }
        },
        {
          ...baseItem,
          id: "item_002_draft_linked",
          title: "Draft backlog",
          stage: "backlog",
          relPath: "logics/backlog/item_002_draft_linked.md",
          path: "/workspace/mock/logics/backlog/item_002_draft_linked.md",
          indicators: { Status: "Draft" }
        }
      ]
    });

    const document = dom.window.document;
    const processedToggle = document.getElementById("hide-processed-requests") as HTMLInputElement | null;

    expect(processedToggle?.checked).toBe(true);
    expect(document.querySelector('[data-id="req_001_processed"]')).toBeNull();
    expect(document.querySelector('[data-id="req_002_draft_linked"]')).not.toBeNull();

    if (processedToggle) {
      processedToggle.checked = false;
      processedToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('[data-id="req_001_processed"]')).not.toBeNull();
    expect(document.querySelector('[data-id="req_002_draft_linked"]')).not.toBeNull();
    expect(persistedStates.some((state) => state.hideProcessedRequests === false)).toBe(true);
  });

  it("hides processed requests when the linked backlog reference is stored as an id", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_003_processed_by_id",
          title: "Processed request by id",
          relPath: "logics/request/req_003_processed_by_id.md",
          path: "/workspace/mock/logics/request/req_003_processed_by_id.md",
          indicators: { Status: "Done" },
          references: [{ kind: "backlog", label: "Backlog", path: "item_003_processed_by_id" }]
        },
        {
          ...baseItem,
          id: "item_003_processed_by_id",
          title: "Processed backlog by id",
          stage: "backlog",
          relPath: "logics/backlog/item_003_processed_by_id.md",
          path: "/workspace/mock/logics/backlog/item_003_processed_by_id.md",
          indicators: { Status: "Done" }
        }
      ]
    });

    const document = dom.window.document;
    const processedToggle = document.getElementById("hide-processed-requests") as HTMLInputElement | null;
    expect(processedToggle?.checked).toBe(true);

    expect(document.querySelector('[data-id="req_003_processed_by_id"]')).toBeNull();
  });

  it("hides processed requests when processing is inferred from usedBy links, Progress 100, or Archived status", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_004_processed_by_used_by",
          title: "Processed request by usedBy",
          relPath: "logics/request/req_004_processed_by_used_by.md",
          path: "/workspace/mock/logics/request/req_004_processed_by_used_by.md",
          usedBy: [{ id: "item_004_processed_by_used_by", relPath: "item_004_processed_by_used_by" }]
        },
        {
          ...baseItem,
          id: "req_005_processed_by_progress",
          title: "Processed request by progress",
          relPath: "logics/request/req_005_processed_by_progress.md",
          path: "/workspace/mock/logics/request/req_005_processed_by_progress.md",
          references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_005_processed_by_progress.md" }]
        },
        {
          ...baseItem,
          id: "req_006_processed_by_archived",
          title: "Processed request by archived backlog",
          relPath: "logics/request/req_006_processed_by_archived.md",
          path: "/workspace/mock/logics/request/req_006_processed_by_archived.md",
          references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_006_processed_by_archived.md" }]
        },
        {
          ...baseItem,
          id: "item_004_processed_by_used_by",
          title: "Processed backlog by usedBy",
          stage: "backlog",
          relPath: "logics/backlog/item_004_processed_by_used_by.md",
          path: "/workspace/mock/logics/backlog/item_004_processed_by_used_by.md",
          indicators: { Status: "Done" }
        },
        {
          ...baseItem,
          id: "item_005_processed_by_progress",
          title: "Processed backlog by progress",
          stage: "backlog",
          relPath: "logics/backlog/item_005_processed_by_progress.md",
          path: "/workspace/mock/logics/backlog/item_005_processed_by_progress.md",
          indicators: { Progress: "100%" }
        },
        {
          ...baseItem,
          id: "item_006_processed_by_archived",
          title: "Processed backlog by archived status",
          stage: "backlog",
          relPath: "logics/backlog/item_006_processed_by_archived.md",
          path: "/workspace/mock/logics/backlog/item_006_processed_by_archived.md",
          indicators: { Status: "Archived" }
        }
      ]
    });

    const document = dom.window.document;
    const processedToggle = document.getElementById("hide-processed-requests") as HTMLInputElement | null;
    expect(processedToggle?.checked).toBe(true);

    expect(document.querySelector('[data-id="req_004_processed_by_used_by"]')).toBeNull();
    expect(document.querySelector('[data-id="req_005_processed_by_progress"]')).toBeNull();
    expect(document.querySelector('[data-id="req_006_processed_by_archived"]')).toBeNull();
  });

  it("hides empty columns in board view by default and can be disabled", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const hideEmptyColumnsToggle = document.getElementById("hide-empty-columns") as HTMLInputElement | null;

    expect(hideEmptyColumnsToggle?.checked).toBe(true);
    expect(document.querySelector('.column[data-stage="request"]')).not.toBeNull();
    expect(document.querySelector('.column[data-stage="backlog"]')).toBeNull();
    expect(document.querySelector('.column[data-stage="task"]')).toBeNull();

    if (hideEmptyColumnsToggle) {
      hideEmptyColumnsToggle.checked = false;
      hideEmptyColumnsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('.column[data-stage="request"]')).not.toBeNull();
    expect(document.querySelector('.column[data-stage="backlog"]')).not.toBeNull();
    expect(document.querySelector('.column[data-stage="task"]')).not.toBeNull();
    expect(persistedStates.some((state) => state.hideEmptyColumns === false)).toBe(true);
  });

  it("hides empty stage groups in list mode by default and can be disabled", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const hideEmptyColumnsToggle = document.getElementById("hide-empty-columns") as HTMLInputElement | null;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');

    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(document.querySelector('.list-view__section[data-group="request"]')).not.toBeNull();
    expect(document.querySelector('.list-view__section[data-group="backlog"]')).toBeNull();
    expect(document.querySelector('.list-view__section[data-group="task"]')).toBeNull();

    if (hideEmptyColumnsToggle) {
      hideEmptyColumnsToggle.checked = false;
      hideEmptyColumnsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('.list-view__section[data-group="request"]')).not.toBeNull();
    expect(document.querySelector('.list-view__section[data-group="backlog"]')).not.toBeNull();
    expect(document.querySelector('.list-view__section[data-group="task"]')).not.toBeNull();
  });

  it("applies detail header hierarchy and action emphasis for the selected item", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const eyebrow = dom.window.document.getElementById("details-eyebrow");
    const title = dom.window.document.getElementById("details-title");
    const promoteButton = dom.window.document.querySelector('[data-action="promote"]');
    const openButton = dom.window.document.querySelector('[data-action="open"]');
    const readButton = dom.window.document.querySelector('[data-action="read"]');
    const obsoleteButton = dom.window.document.querySelector('[data-action="mark-obsolete"]');

    expect(eyebrow?.textContent).toContain("request");
    expect(title?.textContent).toContain("Kickoff");
    expect(openButton?.classList.contains("btn--primary")).toBe(true);
    expect(readButton?.classList.contains("btn--primary")).toBe(true);
    expect(promoteButton?.classList.contains("btn--contextual")).toBe(true);
    expect(promoteButton?.classList.contains("btn--contextual-active")).toBe(true);
    expect(obsoleteButton?.classList.contains("btn--caution")).toBe(true);
  });

  it("reads selected item on card double-click in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const card = dom.window.document.querySelector(".card");
    card?.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read")).toBe(true);
  });

  it("reads selected item on list row double-click in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');
    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const card = document.querySelector(".list-view__section .card");
    card?.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read" && message.id === "req_000_kickoff")).toBe(true);
  });

  it("shows companion docs in details and opens linked companion items", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [
            { kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" },
            { kind: "manual", label: "Reference", path: "logics/architecture/adr_000_plugin_model.md" }
          ]
        },
        productItem,
        architectureItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Companion docs");
    expect(detailsBody?.textContent).toContain("product brief • prod_000_plugin_ux");
    expect(detailsBody?.textContent).toContain("architecture decision • adr_000_plugin_model");

    const openButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const companionOpenButton = openButtons.find((button) => button.textContent?.trim() === "Open");
    companionOpenButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open" && message.id === "prod_000_plugin_ux")).toBe(true);
  });

  it("opens managed references from the details panel", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" }]
        },
        productItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const openButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const referenceOpenButton = openButtons.find((button) => button.textContent?.trim() === "Open");
    referenceOpenButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open" && message.id === "prod_000_plugin_ux")).toBe(true);
  });

  it("reads managed references from the details panel", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" }]
        },
        productItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const actionButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const readButton = actionButtons.find((button) => button.textContent?.trim() === "Read");
    readButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read" && message.id === "prod_000_plugin_ux")).toBe(true);
  });

  it("groups managed reference actions under the wrapped value container", () => {
    const { dom } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          usedBy: [
            {
              kind: "request",
              stage: "request",
              id: "req_054_reduce_remaining_oversized_files_after_the_first_modularization_pass",
              title: "Reduce remaining oversized files after the first modularization pass",
              relPath: "logics/request/req_054_reduce_remaining_oversized_files_after_the_first_modularization_pass.md"
            }
          ]
        },
        {
          ...baseItem,
          id: "req_054_reduce_remaining_oversized_files_after_the_first_modularization_pass",
          stage: "request",
          title: "Reduce remaining oversized files after the first modularization pass",
          relPath: "logics/request/req_054_reduce_remaining_oversized_files_after_the_first_modularization_pass.md",
          references: [],
          usedBy: []
        }
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const usedBySection = Array.from(detailsBody?.querySelectorAll(".details__section") || []).find((section) =>
      section.textContent?.includes("Used by")
    );
    const valueContainer = usedBySection?.querySelector(".details__indicator-value");
    const text = valueContainer?.querySelector(".details__indicator-text");
    const actions = valueContainer?.querySelector(".details__indicator-actions");
    const labels = Array.from(actions?.querySelectorAll(".details__inline-cta") || []).map((button) => button.textContent?.trim());

    expect(text?.textContent).toContain("Reduce remaining oversized files after the first modularization pass");
    expect(actions).not.toBeNull();
    expect(labels).toEqual(expect.arrayContaining(["Open", "Read"]));
  });

  it("shows companion badges on delivery cards when linked docs exist", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          references: [
            { kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" },
            { kind: "manual", label: "Reference", path: "logics/architecture/adr_000_plugin_model.md" },
            { kind: "manual", label: "Reference", path: "logics/specs/spec_001_reference_contract.md" }
          ]
        },
        productItem,
        architectureItem,
        specItem
      ]
    });

    const card = dom.window.document.querySelector(".card");
    expect(card?.textContent).toContain("PROD");
    expect(card?.textContent).toContain("ADR");
    expect(card?.textContent).toContain("SPEC");
    expect(card?.querySelector(".card__badge--product")).not.toBeNull();
    expect(card?.querySelector(".card__badge--architecture")).not.toBeNull();
    expect(card?.querySelector(".card__badge--spec")).not.toBeNull();
  });

  it("shows linked specs in a dedicated details section", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/specs/spec_001_reference_contract.md" }]
        },
        specItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Specs");
    expect(detailsBody?.textContent).toContain("spec • spec_001_reference_contract");

    const actionButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const readButton = actionButtons.find((button) => button.textContent?.trim() === "Read");
    readButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read" && message.id === "spec_001_reference_contract")).toBe(
      true
    );
  });

  it("posts companion doc creation from the details panel", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("No companion docs linked yet.");

    const createButton = dom.window.document.querySelector('[aria-label="Create companion doc"]');
    createButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some((message) => message.type === "create-companion-doc" && message.id === "req_000_kickoff")
    ).toBe(true);
  });

  it("keeps only indicators open by default in the details panel", () => {
    const { dom } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const document = dom.window.document;
    const indicatorsToggle = document.querySelector('[data-section="indicators"]');
    const companionToggle = document.querySelector('[data-section="companionDocs"]');
    const specsToggle = document.querySelector('[data-section="specs"]');
    const referencesToggle = document.querySelector('[data-section="references"]');
    const usedByToggle = document.querySelector('[data-section="usedBy"]');

    expect(indicatorsToggle?.getAttribute("aria-expanded")).toBe("true");
    expect(companionToggle?.getAttribute("aria-expanded")).toBe("false");
    expect(specsToggle?.getAttribute("aria-expanded")).toBe("false");
    expect(referencesToggle?.getAttribute("aria-expanded")).toBe("false");
    expect(usedByToggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("resets filter toggles back to their default state without changing unrelated UI state", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem, productItem]
    });

    const document = dom.window.document;
    const processedToggle = document.getElementById("hide-processed-requests") as HTMLInputElement | null;
    const completeToggle = document.getElementById("hide-complete") as HTMLInputElement | null;
    const companionToggle = document.getElementById("show-companion-docs") as HTMLInputElement | null;
    const resetButton = document.getElementById("filter-reset") as HTMLButtonElement | null;
    const detailsToggle = document.getElementById("details-toggle");

    detailsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(document.getElementById("details")?.classList.contains("details--collapsed")).toBe(true);

    if (processedToggle) {
      processedToggle.checked = false;
      processedToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    if (completeToggle) {
      completeToggle.checked = false;
      completeToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    if (companionToggle) {
      companionToggle.checked = false;
      companionToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    resetButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(processedToggle?.checked).toBe(true);
    expect(completeToggle?.checked).toBe(true);
    expect(companionToggle?.checked).toBe(true);
    expect(document.getElementById("details")?.classList.contains("details--collapsed")).toBe(true);
    expect(persistedStates.some((state) => state.hideProcessedRequests === true && state.hideCompleted === true)).toBe(true);
  });

  it("offers explicit product and architecture companion actions when framing docs are missing", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const buttons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const productButton = buttons.find((button) => button.textContent?.trim() === "+ Product brief");
    const architectureButton = buttons.find((button) => button.textContent?.trim() === "+ Architecture decision");

    expect(productButton).toBeTruthy();
    expect(architectureButton).toBeTruthy();

    productButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    architectureButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some(
        (message) =>
          message.type === "create-companion-doc" &&
          message.id === "req_000_kickoff" &&
          (message as { preferredKind?: string }).preferredKind === "product"
      )
    ).toBe(true);
    expect(
      postedMessages.some(
        (message) =>
          message.type === "create-companion-doc" &&
          message.id === "req_000_kickoff" &&
          (message as { preferredKind?: string }).preferredKind === "architecture"
      )
    ).toBe(true);
  });

  it("shows companion docs by default and can hide them with the toggle", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...productItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/request/req_000_kickoff.md" }]
        },
        architectureItem,
        specItem
      ]
    });

    const document = dom.window.document;
    const showCompanionDocsToggle = document.getElementById("show-companion-docs") as HTMLInputElement | null;
    const hideSpecToggle = document.getElementById("hide-spec") as HTMLInputElement | null;

    expect(showCompanionDocsToggle?.checked).toBe(true);
    expect(document.querySelectorAll('.column[data-stage="product"]').length).toBe(1);
    expect(document.querySelectorAll('.column[data-stage="architecture"]').length).toBe(1);

    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = false;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('.column[data-stage="product"]')).toBeNull();
    expect(document.querySelector('.column[data-stage="architecture"]')).toBeNull();

    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = true;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelectorAll('.column[data-stage="product"]').length).toBe(1);
    expect(document.querySelectorAll('.column[data-stage="architecture"]').length).toBe(1);
    expect(document.querySelector('.column[data-stage="product"] .column__title')?.textContent).toBe("Product briefs");
    expect(document.querySelector('.column[data-stage="architecture"] .column__title')?.textContent).toBe(
      "Architecture decisions"
    );
    expect(document.querySelector('.column[data-stage="product"] .column__add')).toBeNull();
    expect(document.querySelector('.column[data-stage="architecture"] .column__add')).toBeNull();
    expect(document.querySelector('.column[data-stage="product"] .card__meta')?.textContent).toContain(
      "product brief • prod_000_plugin_ux"
    );
    expect(document.querySelector('.column[data-stage="product"] .card__meta--linkage')?.textContent).toContain(
      "For request • req_000_kickoff"
    );
    expect(document.querySelector('.column[data-stage="architecture"] .card__meta--linkage')?.textContent).toContain(
      "Unlinked to primary flow"
    );
    expect(persistedStates.some((state) => state.showCompanionDocs === true)).toBe(true);

    if (hideSpecToggle) {
      hideSpecToggle.checked = false;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const stageSequence = Array.from(document.querySelectorAll(".column")).map((column) => column.getAttribute("data-stage"));
    expect(stageSequence).toEqual(["request", "product", "architecture", "spec"]);
  });

  it("shows primary flow links in details for supporting docs", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...productItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/request/req_000_kickoff.md" }]
        }
      ]
    });

    const showCompanionDocsToggle = dom.window.document.getElementById("show-companion-docs") as HTMLInputElement | null;
    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = true;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "prod_000_plugin_ux",
      items: [
        baseItem,
        {
          ...productItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/request/req_000_kickoff.md" }]
        }
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Primary flow");
    expect(detailsBody?.textContent).toContain("request • req_000_kickoff");

    const openButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const openButton = openButtons.find((button) => button.textContent?.trim() === "Open");
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open" && message.id === "req_000_kickoff")).toBe(true);
  });

  it("offers a direct link-to-primary-flow action for unlinked supporting docs", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [architectureItem]
    });

    const showCompanionDocsToggle = dom.window.document.getElementById("show-companion-docs") as HTMLInputElement | null;
    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = true;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "adr_000_plugin_model",
      items: [architectureItem]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Primary flow");
    expect(detailsBody?.textContent).toContain("No primary workflow item linked yet.");

    const linkButton = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []).find(
      (button) => button.textContent?.trim() === "+ Link to primary flow"
    );
    expect(linkButton).toBeTruthy();

    linkButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "add-reference" && message.id === "adr_000_plugin_model")).toBe(
      true
    );
  });

  it("posts lifecycle actions in non-harness mode", () => {
    const { dom, postedMessages, confirmMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const doneButton = dom.window.document.querySelector('[data-action="mark-done"]');
    const obsoleteButton = dom.window.document.querySelector('[data-action="mark-obsolete"]');
    doneButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    obsoleteButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "mark-done")).toBe(true);
    expect(postedMessages.some((message) => message.type === "mark-obsolete")).toBe(true);
    expect(confirmMessages[0]).toContain("Mark req_000_kickoff");
    expect(confirmMessages[1]).toContain("Mark req_000_kickoff");
    expect(confirmMessages[1]).toContain("obsolete");
  });

  it("does not post lifecycle actions when confirmation is cancelled", () => {
    const { dom, postedMessages } = bootstrapWebview({
      harness: false,
      confirmImpl: () => false
    });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const doneButton = dom.window.document.querySelector('[data-action="mark-done"]');
    const obsoleteButton = dom.window.document.querySelector('[data-action="mark-obsolete"]');
    doneButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    obsoleteButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "mark-done")).toBe(false);
    expect(postedMessages.some((message) => message.type === "mark-obsolete")).toBe(false);
  });

  it("adds discoverable labels/tooltips and keyboard-accessible card interactions", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const filterToggle = document.getElementById("filter-toggle");
    const toolsToggle = document.getElementById("tools-toggle");
    const launchCodexButton = document.querySelector('[data-action="launch-codex-overlay"]');
    const newRequestButton = document.querySelector('[data-action="new-request-guided"]');
    const createCompanionDocButton = document.querySelector('[data-action="create-companion-doc"]');
    const addButton = document.querySelector(".column__add") as HTMLButtonElement | null;
    const card = document.querySelector(".card") as HTMLDivElement | null;
    const detailsToggle = document.getElementById("details-toggle");

    expect(filterToggle?.getAttribute("title")).toBe("Show view controls");
    expect(toolsToggle?.getAttribute("title")).toBe("Tools");
    expect(launchCodexButton?.getAttribute("title")).toBe("Launch Codex with the globally published Logics kit");
    expect(newRequestButton?.getAttribute("title")).toBe("Start a guided new request in Codex");
    expect(createCompanionDocButton?.getAttribute("title")).toBe("Create a companion doc");
    expect(
      Array.from(document.querySelectorAll("#tools-panel [data-action]")).map((node) => node.getAttribute("data-action"))
    ).toEqual(
      expect.arrayContaining([
        "launch-codex-overlay",
        "check-hybrid-runtime",
        "open-hybrid-insights",
        "assist-commit-all",
        "assist-triage",
        "assist-diff-risk",
        "assist-validation-checklist",
        "assist-doc-consistency",
        "refresh"
      ])
    );
    expect(document.querySelector("#tools-panel [data-action]")?.getAttribute("data-action")).toBe("launch-codex-overlay");
    expect(addButton?.getAttribute("title")).toBe("Add Logics item");
    expect(card?.getAttribute("role")).toBe("button");
    expect(card?.tabIndex).toBe(0);
    expect(card?.getAttribute("aria-label")).toContain("request item");

    card?.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true
      })
    );
    expect(document.querySelectorAll(".card.card--selected").length).toBe(1);

    detailsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(detailsToggle?.getAttribute("title")).toBe("Expand details");
  });

  it("toggles and persists the secondary toolbar row and highlights hidden active controls", () => {
    const { dom, persistedStates } = bootstrapWebview({
      harness: true,
      initialState: {
        secondaryToolbarOpen: false
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const filterToggle = document.getElementById("filter-toggle") as HTMLButtonElement | null;
    const filterPanel = document.getElementById("filter-panel") as HTMLDivElement | null;
    const searchInput = document.getElementById("search-input") as HTMLInputElement | null;

    expect(filterPanel?.hidden).toBe(true);
    expect(filterToggle?.getAttribute("aria-expanded")).toBe("false");

    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(filterPanel?.hidden).toBe(false);
    expect(filterToggle?.getAttribute("aria-expanded")).toBe("true");
    expect(persistedStates.some((state) => state.secondaryToolbarOpen === true)).toBe(true);

    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(filterPanel?.hidden).toBe(true);

    if (searchInput) {
      searchInput.value = "kickoff";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    expect(filterToggle?.classList.contains("toolbar__filter--active")).toBe(true);
    expect(filterToggle?.getAttribute("title")).toContain("non-default controls active");
  });

  it("does not render the legacy eye toggle in board column headers", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    expect(dom.window.document.querySelector(".column__toggle")).toBeNull();
    expect(dom.window.document.querySelectorAll(".column__add").length).toBe(1);
  });

  it("renders markdown preview with Mermaid bootstrap in harness read mode", async () => {
    const mermaidItem = {
      ...baseItem,
      path: "/workspace/mock/logics/request/req_000_kickoff.md",
      relPath: "logics/request/req_000_kickoff.md"
    };
    const { dom, openedDocuments } = bootstrapWebview({
      harness: true,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () =>
          [
            "# Kickoff",
            "",
            "```mermaid",
            "flowchart TD",
            "A[Need] --> B[Result]",
            "```"
          ].join("\n")
      })
    });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [mermaidItem]
    });

    const readButton = dom.window.document.querySelector('[data-action="read"]');
    readButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const html = openedDocuments[0] || "";
    expect(html.includes('class="mermaid"')).toBe(true);
    expect(html.includes("/node_modules/mermaid/dist/mermaid.min.js")).toBe(true);
    expect(html.includes("Mermaid preview unavailable")).toBe(true);
  });

  it("renders attention explain, context pack preview, and dependency-map selection for a selected item", () => {
    const { dom, postedMessages } = bootstrapWebview({
      harness: false,
      initialState: { collapsedDetailSections: [] }
    });

    const request = {
      ...baseItem,
      id: "req_010_context_request",
      title: "Context request",
      relPath: "logics/request/req_010_context_request.md",
      path: "/workspace/mock/logics/request/req_010_context_request.md",
      indicators: { Status: "Draft" },
      references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_010_context_backlog.md" }]
    };
    const backlog = {
      ...baseItem,
      id: "item_010_context_backlog",
      title: "Context backlog",
      stage: "backlog",
      relPath: "logics/backlog/item_010_context_backlog.md",
      path: "/workspace/mock/logics/backlog/item_010_context_backlog.md",
      indicators: { Status: "Blocked", Progress: "45%" },
      references: [
        { kind: "request", label: "Request", path: "logics/request/req_010_context_request.md" },
        { kind: "task", label: "Task", path: "logics/tasks/task_010_context_task.md" },
        { kind: "manual", label: "Reference", path: "logics/product/prod_010_context_product.md" },
        { kind: "manual", label: "Reference", path: "logics/specs/spec_010_context_spec.md" }
      ]
    };
    const task = {
      ...baseItem,
      id: "task_010_context_task",
      title: "Context task",
      stage: "task",
      relPath: "logics/tasks/task_010_context_task.md",
      path: "/workspace/mock/logics/tasks/task_010_context_task.md",
      indicators: { Status: "Ready", Progress: "10%" },
      references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_010_context_backlog.md" }]
    };
    const product = {
      ...productItem,
      id: "prod_010_context_product",
      title: "Context product",
      relPath: "logics/product/prod_010_context_product.md",
      path: "/workspace/mock/logics/product/prod_010_context_product.md",
      usedBy: [{ id: "item_010_context_backlog", stage: "backlog", title: "Context backlog", relPath: "logics/backlog/item_010_context_backlog.md" }]
    };
    const spec = {
      ...specItem,
      id: "spec_010_context_spec",
      title: "Context spec",
      relPath: "logics/specs/spec_010_context_spec.md",
      path: "/workspace/mock/logics/specs/spec_010_context_spec.md",
      usedBy: [{ id: "item_010_context_backlog", stage: "backlog", title: "Context backlog", relPath: "logics/backlog/item_010_context_backlog.md" }]
    };

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "item_010_context_backlog",
      items: [request, backlog, task, product, spec]
    });

    const document = dom.window.document;
    const detailsBody = document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Attention explain");
    expect(detailsBody?.textContent).toContain("Blocked");
    expect(detailsBody?.textContent).toContain("Context pack for AI assistants");
    expect(detailsBody?.textContent).toContain("Dependency map");
    expect(detailsBody?.textContent).toContain("Mode standard");
    expect(detailsBody?.textContent).toContain("Characters");

    const previewButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Preview standard")
    );
    previewButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(detailsBody?.textContent).toContain("# Codex Context Pack");

    const injectButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Copy for Codex")
    );
    injectButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some(
        (message) => message.type === "inject-prompt" && String(message.prompt || "").includes("# Codex Context Pack")
      )
    ).toBe(true);

    const taskNode = Array.from(detailsBody?.querySelectorAll(".details__map-node") || []).find((button) =>
      button.textContent?.includes("task_010_context_task")
    );
    taskNode?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(document.getElementById("details-title")?.textContent).toContain("Context task");
  });

  it("supports summary-only and fresh-thread clipboard handoffs", () => {
    const { dom, postedMessages } = bootstrapWebview({
      harness: false,
      initialState: { collapsedDetailSections: [] }
    });

    const item = {
      ...baseItem,
      id: "task_011_summary_only",
      title: "Summary only task",
      stage: "task",
      relPath: "logics/tasks/task_011_summary_only.md",
      path: "/workspace/mock/logics/tasks/task_011_summary_only.md",
      indicators: { Status: "Ready" },
      summaryPoints: ["Keep the first handoff compact.", "Escalate only when extra context is needed."],
      acceptanceCriteria: ["A summary-only mode exists.", "A fresh-thread launch remains available."]
    };

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: item.id,
      changedPaths: ["src/logicsViewProvider.ts", "media/renderDetails.js"],
      items: [item]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const previewButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Preview summary-only")
    );
    previewButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(detailsBody?.textContent).toContain("Mode summary-only");
    expect(detailsBody?.textContent).toContain("Summary");

    const freshThreadButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Copy for new Codex thread")
    );
    freshThreadButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some(
        (message) =>
          message.type === "inject-prompt" &&
          message.options &&
          message.options.preferNewThread === true &&
          String(message.prompt || "").includes("# Codex Context Pack")
      )
    ).toBe(true);
  });

  it("shows a primary attention reason first and wires remediation actions when available", () => {
    const { dom, postedMessages } = bootstrapWebview({
      harness: false,
      initialState: { collapsedDetailSections: [] }
    });

    const request = {
      ...baseItem,
      id: "req_011_attention_reason",
      title: "Attention request",
      relPath: "logics/request/req_011_attention_reason.md",
      path: "/workspace/mock/logics/request/req_011_attention_reason.md",
      indicators: { Status: "Draft" }
    };

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_011_attention_reason",
      items: [request]
    });

    const document = dom.window.document;
    const primaryReason = document.querySelector(".details__reason-card--primary");
    expect(primaryReason?.textContent).toContain("Workflow inconsistent");

    const promoteButton = Array.from(document.querySelectorAll(".details__inline-cta")).find((button) =>
      button.textContent?.includes("Promote request")
    );
    promoteButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "promote" && message.id === "req_011_attention_reason")).toBe(
      true
    );
  });
});
