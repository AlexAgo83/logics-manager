(() => {
  const vscode = acquireVsCodeApi();
  const board = document.getElementById("board");
  const details = document.getElementById("details");
  const newRequestButton = document.querySelector('[data-action="new-request"]');
  const refreshButton = document.querySelector('[data-action="refresh"]');
  const fixDocsButton = document.querySelector('[data-action="fix-docs"]');
  const promoteButton = document.querySelector('[data-action="promote"]');
  const openButton = document.querySelector('[data-action="open"]');
  const hideCompleteToggle = document.getElementById("hide-complete");
  const hideUsedRequestsToggle = document.getElementById("hide-used-requests");

  let items = [];
  let selectedId = null;
  let hideCompleted = false;
  let hideUsedRequests = false;

  const stageOrder = ["request", "backlog", "task"];

  function canPromote(item) {
    if (!item) {
      return false;
    }
    if (item.isPromoted) {
      return false;
    }
    if (isRequestUsed(item)) {
      return false;
    }
    return item.stage === "request" || item.stage === "backlog";
  }

  function setState(nextItems) {
    items = Array.isArray(nextItems) ? nextItems : [];
    if (!items.find((item) => item.id === selectedId)) {
      selectedId = null;
    }
    render();
  }

  function render() {
    const selectedItem = items.find((item) => item.id === selectedId);
    if (selectedItem && !isVisible(selectedItem)) {
      selectedId = null;
    }
    renderBoard();
    renderDetails();
    updateButtons();
    if (hideCompleteToggle) {
      hideCompleteToggle.checked = hideCompleted;
    }
    if (hideUsedRequestsToggle) {
      hideUsedRequestsToggle.checked = hideUsedRequests;
    }
  }

  function renderBoard() {
    board.innerHTML = "";
    const visibleItems = items.filter((item) => isVisible(item));
    if (!visibleItems.length) {
      const empty = document.createElement("div");
      empty.className = "state-message";
      if (hideCompleted || hideUsedRequests) {
        const filters = [];
        if (hideCompleted) {
          filters.push('"Hide completed"');
        }
        if (hideUsedRequests) {
          filters.push('"Hide used requests"');
        }
        empty.textContent = `No items match the current filters. Toggle off ${filters.join(" and ")} to see all items.`;
      } else {
        empty.textContent = "No Logics items found. Add files under logics/ to populate the board.";
      }
      board.appendChild(empty);
      return;
    }

    const grouped = groupByStage(visibleItems);
    stageOrder.forEach((stage) => {
      const column = document.createElement("div");
      column.className = "column";

      const title = document.createElement("div");
      title.className = "column__title";
      title.textContent = stage;
      column.appendChild(title);

      const body = document.createElement("div");
      body.className = "column__body";

      const stageItems = grouped[stage] || [];
      if (!stageItems.length) {
        const empty = document.createElement("div");
        empty.className = "column__empty";
        empty.textContent = "No items";
        body.appendChild(empty);
      } else {
        stageItems.forEach((item) => {
          const card = document.createElement("div");
          const doneClass = isComplete(item) ? " card--done" : "";
          const progressClass = progressState(item);
          const usedClass = isRequestUsed(item) ? " card--used" : "";
          card.className =
            "card" +
            (item.id === selectedId ? " card--selected" : "") +
            doneClass +
            (progressClass ? ` ${progressClass}` : "") +
            usedClass;
          card.dataset.id = item.id;

          const titleEl = document.createElement("div");
          titleEl.className = "card__title";
          titleEl.textContent = item.title;

          card.appendChild(titleEl);
          card.addEventListener("click", () => {
            selectedId = item.id;
            render();
          });
          card.addEventListener("dblclick", () => {
            selectedId = item.id;
            render();
            vscode.postMessage({ type: "open", id: item.id });
          });
          body.appendChild(card);
        });
      }

      column.appendChild(body);
      board.appendChild(column);
    });
  }

  function renderDetails() {
    details.innerHTML = "";
    const item = items.find((entry) => entry.id === selectedId);
    if (!item) {
      const empty = document.createElement("div");
      empty.className = "details__empty";
      empty.textContent = "Select a card to see details.";
      details.appendChild(empty);
      return;
    }

    const title = document.createElement("div");
    title.className = "details__title";
    title.textContent = item.title;

    const list = document.createElement("div");
    list.className = "details__list";
    list.innerHTML = `
      <div>ID: <span>${item.id}</span></div>
      <div>Stage: <span>${item.stage}</span></div>
      <div>Path: <span>${item.path}</span></div>
      <div>Updated: <span>${formatDate(item.updatedAt)}</span></div>
    `;

    details.appendChild(title);
    details.appendChild(list);

    if (item.references && item.references.length) {
      const refSection = document.createElement("div");
      refSection.className = "details__section";

      const refTitle = document.createElement("div");
      refTitle.className = "details__title";
      refTitle.textContent = "References";

      const refList = document.createElement("div");
      refList.className = "details__references";

      item.references.forEach((ref) => {
        const row = document.createElement("div");
        row.className = "details__reference";
        if (typeof ref === "string") {
          row.textContent = ref;
        } else {
          row.textContent = `${ref.label}: ${ref.path}`;
        }
        refList.appendChild(row);
      });

      refSection.appendChild(refTitle);
      refSection.appendChild(refList);
      details.appendChild(refSection);
    }

    if (item.usedBy && item.usedBy.length) {
      const usedSection = document.createElement("div");
      usedSection.className = "details__section";

      const usedTitle = document.createElement("div");
      usedTitle.className = "details__title";
      usedTitle.textContent = "Used by";

      const usedList = document.createElement("div");
      usedList.className = "details__references";

      item.usedBy.forEach((usage) => {
        const row = document.createElement("div");
        row.className = "details__reference";
        row.textContent = `${usage.stage} • ${usage.id} — ${usage.title}`;
        usedList.appendChild(row);
      });

      usedSection.appendChild(usedTitle);
      usedSection.appendChild(usedList);
      details.appendChild(usedSection);
    }

    const indicators = item.indicators || {};
    const indicatorKeys = Object.keys(indicators);
    if (indicatorKeys.length) {
      const section = document.createElement("div");
      section.className = "details__section";

      const sectionTitle = document.createElement("div");
      sectionTitle.className = "details__title";
      sectionTitle.textContent = "Indicators";

      const indicatorList = document.createElement("div");
      indicatorList.className = "details__indicators";

      indicatorKeys.forEach((key) => {
        const row = document.createElement("div");
        row.className = "details__indicator";
        row.innerHTML = `<div>${key}</div><span>${indicators[key]}</span>`;
        indicatorList.appendChild(row);
      });

      section.appendChild(sectionTitle);
      section.appendChild(indicatorList);
      details.appendChild(section);
    }
  }

  function updateButtons() {
    const item = items.find((entry) => entry.id === selectedId);
    openButton.disabled = !item;
    promoteButton.disabled = !canPromote(item);
  }

  function groupByStage(allItems) {
    return allItems.reduce((acc, item) => {
      acc[item.stage] = acc[item.stage] || [];
      acc[item.stage].push(item);
      return acc;
    }, {});
  }

  function isVisible(item) {
    if (hideCompleted && isComplete(item)) {
      return false;
    }
    if (hideUsedRequests && item.stage === "request" && isRequestUsed(item)) {
      return false;
    }
    return true;
  }

  function isComplete(item) {
    const value = getProgressValue(item);
    return value !== null && value >= 100;
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  function isRequestUsed(item) {
    if (!item || item.stage !== "request") {
      return false;
    }
    const hasBacklogRefs =
      Array.isArray(item.references) && item.references.some((ref) => ref && ref.kind === "backlog");
    return hasBacklogRefs || (Array.isArray(item.usedBy) && item.usedBy.length > 0);
  }

  function progressState(item) {
    const value = getProgressValue(item);
    if (value === null) {
      return "";
    }
    if (value <= 0) {
      return "card--progress-zero";
    }
    if (value >= 100) {
      return "card--progress-done";
    }
    return "card--progress-active";
  }

  function getProgressValue(item) {
    const indicators = item && item.indicators ? item.indicators : {};
    const progressKey = Object.keys(indicators).find((key) => key.toLowerCase().includes("progress"));
    if (!progressKey) {
      return null;
    }
    const progressRaw = indicators[progressKey];
    const match = String(progressRaw).match(/(\d+(?:\.\d+)?)/);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  refreshButton.addEventListener("click", () => vscode.postMessage({ type: "refresh" }));
  if (fixDocsButton) {
    fixDocsButton.addEventListener("click", () => vscode.postMessage({ type: "fix-docs" }));
  }
  newRequestButton.addEventListener("click", () => vscode.postMessage({ type: "new-request" }));
  function persistState() {
    vscode.setState({ hideCompleted, hideUsedRequests });
  }

  if (hideCompleteToggle) {
    hideCompleteToggle.addEventListener("change", (event) => {
      hideCompleted = Boolean(event.target && event.target.checked);
      persistState();
      render();
    });
  }
  if (hideUsedRequestsToggle) {
    hideUsedRequestsToggle.addEventListener("change", (event) => {
      hideUsedRequests = Boolean(event.target && event.target.checked);
      persistState();
      render();
    });
  }
  openButton.addEventListener("click", () => {
    if (!selectedId) return;
    vscode.postMessage({ type: "open", id: selectedId });
  });
  promoteButton.addEventListener("click", () => {
    if (!selectedId) return;
    vscode.postMessage({ type: "promote", id: selectedId });
  });

  window.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    if (type === "data") {
      if (payload && payload.error) {
        board.innerHTML = `<div class="state-message">${payload.error}</div>`;
        details.innerHTML = "";
        return;
      }
      setState(payload.items || []);
    }
  });

  const previousState = vscode.getState();
  if (previousState && typeof previousState.hideCompleted === "boolean") {
    hideCompleted = previousState.hideCompleted;
  }
  if (previousState && typeof previousState.hideUsedRequests === "boolean") {
    hideUsedRequests = previousState.hideUsedRequests;
  }

  vscode.postMessage({ type: "ready" });
})();
