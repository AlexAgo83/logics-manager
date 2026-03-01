(() => {
  const vscode = acquireVsCodeApi();
  const board = document.getElementById("board");
  const layout = document.getElementById("layout");
  const splitter = document.getElementById("splitter");
  const details = document.getElementById("details");
  const detailsBody = document.getElementById("details-body");
  const detailsToggle = document.getElementById("details-toggle");
  const detailsTitle = document.getElementById("details-title");
  const filterToggle = document.getElementById("filter-toggle");
  const filterPanel = document.getElementById("filter-panel");
  const toolsToggle = document.getElementById("tools-toggle");
  const toolsPanel = document.getElementById("tools-panel");
  const refreshButton = document.querySelector('[data-action="refresh"]');
  const changeProjectRootButton = document.querySelector('[data-action="change-project-root"]');
  const resetProjectRootButton = document.querySelector('[data-action="reset-project-root"]');
  const fixDocsButton = document.querySelector('[data-action="fix-docs"]');
  const promoteButton = document.querySelector('[data-action="promote"]');
  const openButton = document.querySelector('[data-action="open"]');
  const readButton = document.querySelector('[data-action="read"]');
  const hideCompleteToggle = document.getElementById("hide-complete");
  const hideUsedRequestsToggle = document.getElementById("hide-used-requests");
  const harnessBridge = window.__CDX_LOGICS_HARNESS__;
  const isHarnessMode = Boolean(harnessBridge && harnessBridge.isHarness);

  let items = [];
  let selectedId = null;
  let hideCompleted = false;
  let hideUsedRequests = false;
  let collapsedStages = new Set();
  let detailsCollapsed = false;
  let collapsedDetailSections = new Set();
  let activeColumnMenu = null;
  let activeColumnMenuButton = null;
  let filterPanelOpen = false;
  let toolsPanelOpen = false;
  let splitRatio = 0.6;
  let isDraggingSplit = false;
  let currentRoot = null;
  let harnessRootHandle = null;
  let statusBanner = null;
  let noticeTimeoutId = null;

  const stageOrder = ["request", "backlog", "task", "spec"];
  const stackedQuery = window.matchMedia("(max-width: 900px)");
  const minBoardHeight = 160;
  const minDetailsHeight = 180;

  function eyeIcon(isHidden) {
    if (isHidden) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  function plusIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  function pencilIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path
          d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  function buildColumnMenu() {
    const menu = document.createElement("div");
    menu.className = "column__menu";
    menu.setAttribute("role", "menu");

    const options = [
      { label: "New Request", kind: "request" },
      { label: "New Backlog item", kind: "backlog" },
      { label: "New Task", kind: "task" }
    ];

    options.forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "column__menu-item";
      item.textContent = option.label;
      item.setAttribute("role", "menuitem");
      item.title = option.label;
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        closeColumnMenu();
        vscode.postMessage({ type: "create-item", kind: option.kind });
      });
      menu.appendChild(item);
    });

    return menu;
  }

  function closeColumnMenu() {
    if (activeColumnMenu) {
      activeColumnMenu.remove();
    }
    if (activeColumnMenuButton) {
      activeColumnMenuButton.setAttribute("aria-expanded", "false");
    }
    activeColumnMenu = null;
    activeColumnMenuButton = null;
  }

  function toggleColumnMenu(button) {
    if (activeColumnMenu && activeColumnMenuButton === button) {
      closeColumnMenu();
      return;
    }

    closeColumnMenu();
    const menu = buildColumnMenu();
    activeColumnMenu = menu;
    activeColumnMenuButton = button;
    button.setAttribute("aria-expanded", "true");

    const container = button.parentElement;
    if (container) {
      container.appendChild(menu);
    }
  }

  function createChevronIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("details__section-chevron");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 9l6 6 6-6");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    return svg;
  }

  function createSectionTitle(label, key) {
    const title = document.createElement("button");
    title.className = "details__section-title";
    title.type = "button";
    title.setAttribute("aria-expanded", "true");
    title.title = `Toggle ${label}`;
    if (key) {
      title.dataset.section = key;
    }

    const text = document.createElement("span");
    text.textContent = label;

    title.appendChild(text);
    title.appendChild(createChevronIcon());
    return title;
  }

  function createSectionHeader(label, key, addLabel, onAdd) {
    const header = document.createElement("div");
    header.className = "details__section-header";

    const title = createSectionTitle(label, key);
    header.appendChild(title);

    if (addLabel && typeof onAdd === "function") {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "details__section-add";
      addButton.textContent = "+";
      addButton.setAttribute("aria-label", addLabel);
      addButton.title = addLabel;
      addButton.addEventListener("click", (event) => {
        event.stopPropagation();
        onAdd();
      });
      header.appendChild(addButton);
    }

    return { header, title };
  }

  function createInlineCta(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "details__inline-cta";
    button.textContent = label;
    button.title = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function createIndicatorRow(label, value) {
    const row = document.createElement("div");
    row.className = "details__indicator";

    const left = document.createElement("div");
    left.textContent = label;

    const right = document.createElement("span");
    right.textContent = value ?? "";

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function applySectionCollapse(section, title, content, isCollapsed) {
    section.classList.toggle("details__section--collapsed", isCollapsed);
    title.setAttribute("aria-expanded", String(!isCollapsed));
    if (content) {
      content.setAttribute("aria-hidden", String(isCollapsed));
    }
  }

  function attachSectionToggle(section, title, content, key) {
    title.addEventListener("click", () => {
      const isCollapsed = !section.classList.contains("details__section--collapsed");
      applySectionCollapse(section, title, content, isCollapsed);
      if (key) {
        if (isCollapsed) {
          collapsedDetailSections.add(key);
        } else {
          collapsedDetailSections.delete(key);
        }
        persistState();
      }
    });
  }

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

  function setState(nextItems, nextSelectedId) {
    items = Array.isArray(nextItems) ? nextItems : [];
    if (typeof nextSelectedId === "string") {
      selectedId = nextSelectedId;
    } else if (!items.find((item) => item.id === selectedId)) {
      selectedId = null;
    }
    render();
  }

  function render() {
    updateLayoutMode();
    if (isSplitInteractionDisabled() && isDraggingSplit) {
      isDraggingSplit = false;
      if (splitter) {
        splitter.classList.remove("splitter--dragging");
      }
      document.body.classList.remove("is-resizing");
    }
    const selectedItem = items.find((item) => item.id === selectedId);
    if (selectedItem && !isVisible(selectedItem)) {
      selectedId = null;
    }
    if (details) {
      details.classList.toggle("details--collapsed", detailsCollapsed);
    }
    if (detailsToggle) {
      detailsToggle.setAttribute("aria-expanded", String(!detailsCollapsed));
      detailsToggle.setAttribute(
        "aria-label",
        detailsCollapsed ? "Expand details" : "Collapse details"
      );
      detailsToggle.title = detailsCollapsed ? "Expand details" : "Collapse details";
    }
    updateSplitterA11y();
    renderBoard();
    renderDetails();
    updateButtons();
    updateFilterState();
    if (hideCompleteToggle) {
      hideCompleteToggle.checked = hideCompleted;
    }
    if (hideUsedRequestsToggle) {
      hideUsedRequestsToggle.checked = hideUsedRequests;
    }
  }

  function captureBoardScroll() {
    if (!board) {
      return null;
    }
    const scrollLeft = board.scrollLeft;
    const columnScroll = new Map();
    board.querySelectorAll(".column").forEach((column) => {
      const stage = column.dataset.stage;
      const body = column.querySelector(".column__body");
      if (stage && body) {
        columnScroll.set(stage, body.scrollTop);
      }
    });
    return { scrollLeft, columnScroll };
  }

  function restoreBoardScroll(state) {
    if (!board || !state) {
      return;
    }
    board.scrollLeft = state.scrollLeft;
    board.querySelectorAll(".column").forEach((column) => {
      const stage = column.dataset.stage;
      const body = column.querySelector(".column__body");
      if (!stage || !body) {
        return;
      }
      const scrollTop = state.columnScroll.get(stage);
      if (typeof scrollTop === "number") {
        body.scrollTop = scrollTop;
      }
    });
  }

  function renderBoard() {
    const scrollState = captureBoardScroll();
    closeColumnMenu();
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
      const isCollapsed = collapsedStages.has(stage);
      column.className = isCollapsed ? "column column--collapsed" : "column";
      column.dataset.stage = stage;

      const header = document.createElement("div");
      header.className = "column__header";

      const title = document.createElement("div");
      title.className = "column__title";
      title.textContent = stage;
      header.appendChild(title);

      const actions = document.createElement("div");
      actions.className = "column__actions";

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "column__add";
      addButton.innerHTML = plusIcon();
      addButton.setAttribute("aria-label", "Add Logics item");
      addButton.title = "Add Logics item";
      addButton.setAttribute("aria-haspopup", "menu");
      addButton.setAttribute("aria-expanded", "false");
      addButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleColumnMenu(addButton);
      });

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "column__toggle";
      toggle.innerHTML = eyeIcon(isCollapsed);
      toggle.setAttribute(
        "aria-label",
        isCollapsed ? `Show ${stage} items` : `Hide ${stage} items`
      );
      toggle.title = isCollapsed ? `Show ${stage} items` : `Hide ${stage} items`;
      toggle.setAttribute("aria-pressed", String(isCollapsed));
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (collapsedStages.has(stage)) {
          collapsedStages.delete(stage);
        } else {
          collapsedStages.add(stage);
        }
        persistState();
        render();
      });

      actions.appendChild(addButton);
      actions.appendChild(toggle);
      header.appendChild(actions);

      column.appendChild(header);

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
          const progressValue = getProgressValue(item);
          const hasProgressBar =
            typeof progressValue === "number" && progressValue > 0 && progressValue < 100;
          card.className =
            "card" +
            (item.id === selectedId ? " card--selected" : "") +
            doneClass +
            (progressClass ? ` ${progressClass}` : "") +
            usedClass +
            (hasProgressBar ? " card--progress-bar" : "");
          if (hasProgressBar) {
            const clamped = Math.max(0, Math.min(100, progressValue));
            card.style.setProperty("--progress", `${clamped}%`);
          }
          card.dataset.id = item.id;
          card.setAttribute("role", "button");
          card.tabIndex = 0;
          card.setAttribute("aria-label", `${item.stage} item ${item.id}: ${item.title}`);
          card.title = item.title;

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
            openSelectedItem("open");
          });
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectedId = item.id;
              render();
            }
          });
          body.appendChild(card);
        });
      }

      column.appendChild(body);
      board.appendChild(column);
    });

    restoreBoardScroll(scrollState);
  }

  function renderDetails() {
    detailsBody.innerHTML = "";
    const item = items.find((entry) => entry.id === selectedId);
    if (!item) {
      if (detailsTitle) {
        detailsTitle.textContent = "Details";
      }
      const empty = document.createElement("div");
      empty.className = "details__empty";
      empty.textContent = "Select a card to see details.";
      detailsBody.appendChild(empty);
      return;
    }

    if (detailsTitle) {
      detailsTitle.textContent = item.title;
    }
    const list = document.createElement("div");
    list.className = "details__list";

    const nameRow = document.createElement("div");
    nameRow.className = "details__list-row details__list-row--name";

    const nameLabel = document.createElement("span");
    nameLabel.textContent = "Name:";
    nameRow.appendChild(nameLabel);

    const nameValueWrap = document.createElement("span");
    nameValueWrap.className = "details__name-value-wrap";

    const nameValue = document.createElement("span");
    nameValue.className = "details__name-value";
    nameValue.textContent = item.id;
    nameValueWrap.appendChild(nameValue);

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "details__rename";
    renameButton.setAttribute("aria-label", "Rename entry");
    renameButton.title = "Rename entry";
    renameButton.innerHTML = pencilIcon();
    renameButton.addEventListener("click", () => {
      vscode.postMessage({ type: "rename-entry", id: item.id });
    });
    nameValueWrap.appendChild(renameButton);
    nameRow.appendChild(nameValueWrap);
    list.appendChild(nameRow);

    const updatedRow = document.createElement("div");
    updatedRow.className = "details__list-row";

    const updatedLabel = document.createElement("span");
    updatedLabel.textContent = "Updated:";
    updatedRow.appendChild(updatedLabel);

    const updatedValue = document.createElement("span");
    updatedValue.className = "details__list-value";
    updatedValue.textContent = formatDate(item.updatedAt);
    updatedRow.appendChild(updatedValue);

    list.appendChild(updatedRow);

    detailsBody.appendChild(list);

    const indicators = item.indicators || {};
    const indicatorKeys = Object.keys(indicators).filter(
      (key) => key.toLowerCase() !== "reminder"
    );
    if (indicatorKeys.length) {
      const section = document.createElement("div");
      section.className = "details__section";

      const indicatorKey = "indicators";
      const sectionHeader = createSectionHeader("Indicators", indicatorKey);

      const indicatorList = document.createElement("div");
      indicatorList.className = "details__indicators";
      indicatorList.setAttribute("aria-hidden", "false");

      indicatorKeys.forEach((key) => {
        indicatorList.appendChild(createIndicatorRow(key, indicators[key]));
      });

      section.appendChild(sectionHeader.header);
      section.appendChild(indicatorList);
      applySectionCollapse(section, sectionHeader.title, indicatorList, collapsedDetailSections.has(indicatorKey));
      attachSectionToggle(section, sectionHeader.title, indicatorList, indicatorKey);
      detailsBody.appendChild(section);
    }

    const refSection = document.createElement("div");
    refSection.className = "details__section";

    const refKey = "references";
    const refHeader = createSectionHeader(
      "References",
      refKey,
      "Add reference",
      () => vscode.postMessage({ type: "add-reference", id: item.id })
    );

    const refList = document.createElement("div");
    refList.className = "details__indicators";
    refList.setAttribute("aria-hidden", "false");

    if (item.references && item.references.length) {
      item.references.forEach((ref) => {
        if (typeof ref === "string") {
          refList.appendChild(createIndicatorRow(ref, ""));
        } else {
          refList.appendChild(createIndicatorRow(ref.label, ref.path));
        }
      });
    } else {
      const cta = createInlineCta("+ Add reference", () =>
        vscode.postMessage({ type: "add-reference", id: item.id })
      );
      refList.appendChild(cta);
    }

    refSection.appendChild(refHeader.header);
    refSection.appendChild(refList);
    applySectionCollapse(refSection, refHeader.title, refList, collapsedDetailSections.has(refKey));
    attachSectionToggle(refSection, refHeader.title, refList, refKey);
    detailsBody.appendChild(refSection);

    const usedSection = document.createElement("div");
    usedSection.className = "details__section";

    const usedKey = "usedBy";
    const usedHeader = createSectionHeader(
      "Used by",
      usedKey,
      "Add used-by link",
      () => vscode.postMessage({ type: "add-used-by", id: item.id })
    );

    const usedList = document.createElement("div");
    usedList.className = "details__indicators";
    usedList.setAttribute("aria-hidden", "false");

    if (item.usedBy && item.usedBy.length) {
      item.usedBy.forEach((usage) => {
        usedList.appendChild(
          createIndicatorRow(`${usage.stage} • ${usage.id}`, usage.title)
        );
      });
    } else {
      const cta = createInlineCta("+ Add used by", () =>
        vscode.postMessage({ type: "add-used-by", id: item.id })
      );
      usedList.appendChild(cta);
    }

    usedSection.appendChild(usedHeader.header);
    usedSection.appendChild(usedList);
    applySectionCollapse(usedSection, usedHeader.title, usedList, collapsedDetailSections.has(usedKey));
    attachSectionToggle(usedSection, usedHeader.title, usedList, usedKey);
    detailsBody.appendChild(usedSection);
  }

  function updateButtons() {
    const item = items.find((entry) => entry.id === selectedId);
    openButton.disabled = !item;
    promoteButton.disabled = !canPromote(item);
    openButton.title = item ? "Edit selected item" : "Select an item to edit";
    promoteButton.title = canPromote(item)
      ? "Promote selected item"
      : "Select a request/backlog item that can be promoted";
    if (readButton) {
      readButton.disabled = !item;
      readButton.title = item ? "Read selected item" : "Select an item to read";
    }
  }

  function updateFilterState() {
    if (!filterToggle) {
      return;
    }
    filterToggle.classList.toggle("toolbar__filter--active", hideCompleted || hideUsedRequests);
  }

  function setFilterPanelOpen(isOpen) {
    filterPanelOpen = isOpen;
    if (filterPanel) {
      filterPanel.classList.toggle("filter-panel--open", isOpen);
      filterPanel.setAttribute("aria-hidden", String(!isOpen));
    }
    if (filterToggle) {
      filterToggle.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function setToolsPanelOpen(isOpen) {
    toolsPanelOpen = isOpen;
    if (toolsPanel) {
      toolsPanel.classList.toggle("tools-panel--open", isOpen);
      toolsPanel.setAttribute("aria-hidden", String(!isOpen));
    }
    if (toolsToggle) {
      toolsToggle.setAttribute("aria-expanded", String(isOpen));
    }
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

  function setControlDescription(element, label) {
    if (!element || !label) {
      return;
    }
    if (!element.getAttribute("aria-label")) {
      element.setAttribute("aria-label", label);
    }
    element.title = label;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureStatusBanner() {
    if (statusBanner && statusBanner.isConnected) {
      return statusBanner;
    }
    const anchor = layout && layout.parentElement ? layout.parentElement : document.body;
    if (!anchor) {
      return null;
    }
    statusBanner = document.createElement("div");
    statusBanner.className = "status-banner";
    statusBanner.hidden = true;
    statusBanner.setAttribute("role", "status");
    statusBanner.setAttribute("aria-live", "polite");
    anchor.insertBefore(statusBanner, layout || anchor.firstChild);
    return statusBanner;
  }

  function showStatus(message, tone = "info") {
    if (!message) {
      return;
    }
    const banner = ensureStatusBanner();
    if (banner) {
      banner.hidden = false;
      banner.textContent = message;
      banner.dataset.tone = tone;
      if (noticeTimeoutId) {
        window.clearTimeout(noticeTimeoutId);
      }
      noticeTimeoutId = window.setTimeout(() => {
        if (!statusBanner) {
          return;
        }
        statusBanner.hidden = true;
      }, 4500);
    }
    if (harnessBridge && typeof harnessBridge.notify === "function") {
      harnessBridge.notify(message, tone);
    }
  }

  function encodePathForUrl(relativePath) {
    return relativePath
      .split("/")
      .filter((part) => part.length > 0)
      .map((part) => encodeURIComponent(part))
      .join("/");
  }

  function getItemRelativePath(item) {
    if (!item) {
      return "";
    }
    if (typeof item.relPath === "string" && item.relPath.trim()) {
      return item.relPath.trim().replace(/\\/g, "/").replace(/^\.?\//, "");
    }
    if (typeof item.path === "string" && item.path.trim()) {
      const normalizedPath = item.path.replace(/\\/g, "/");
      if (currentRoot && normalizedPath.startsWith(currentRoot)) {
        const relative = normalizedPath.slice(currentRoot.length).replace(/^\/+/, "");
        if (relative) {
          return relative;
        }
      }
      if (!normalizedPath.startsWith("/") && !normalizedPath.includes(":")) {
        return normalizedPath.replace(/^\.?\//, "");
      }
    }
    return "";
  }

  function buildHarnessDocUrl(item) {
    const relativePath = getItemRelativePath(item);
    if (!relativePath) {
      return "";
    }
    return `/${encodePathForUrl(relativePath)}`;
  }

  async function readHarnessFileFromHandle(relativePath) {
    if (!harnessRootHandle || typeof harnessRootHandle.getDirectoryHandle !== "function") {
      return null;
    }
    const segments = relativePath
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== ".");
    if (!segments.length || segments.includes("..")) {
      return null;
    }
    const filename = segments[segments.length - 1];
    if (!filename) {
      return null;
    }

    let directoryHandle = harnessRootHandle;
    for (const segment of segments.slice(0, -1)) {
      directoryHandle = await directoryHandle.getDirectoryHandle(segment, { create: false });
    }
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: false });
    const file = await fileHandle.getFile();
    return file.text();
  }

  function openHarnessContentTab(item, mode, sourceLabel, content) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
      return false;
    }
    const safeTitle = escapeHtml(item && item.title ? item.title : "Logics item");
    const safeSourceLabel = escapeHtml(sourceLabel || "unknown");
    const safeContent = escapeHtml(content || "");
    const editMode = mode === "edit";
    const body = editMode
      ? `<textarea style="width:100%;height:70vh;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;">${safeContent}</textarea><p style="font-size:12px;opacity:0.8;">Harness edit mode is preview-only (saving is disabled).</p>`
      : `<pre style="white-space:pre-wrap;word-break:break-word;">${safeContent}</pre>`;
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${safeTitle}</title><style>body{font-family:system-ui,sans-serif;margin:20px;line-height:1.45;}code{background:#f4f4f4;padding:2px 4px;border-radius:4px;}</style></head><body><h1>${safeTitle}</h1><p>Source: <code>${safeSourceLabel}</code></p>${body}</body></html>`);
    popup.document.close();
    return true;
  }

  async function resolveHarnessItemContent(item) {
    const relativePath = getItemRelativePath(item);
    if (!relativePath) {
      return { relativePath: "", content: "", source: "", error: "missing-path" };
    }

    if (harnessRootHandle) {
      try {
        const content = await readHarnessFileFromHandle(relativePath);
        if (typeof content === "string") {
          return { relativePath, content, source: `filesystem:${currentRoot || "selected-root"}`, error: "" };
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        showStatus(`Could not read from selected root (${reason}). Falling back to server path.`, "warn");
      }
    }

    const target = `/${encodePathForUrl(relativePath)}`;
    try {
      const response = await fetch(target);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const content = await response.text();
      return { relativePath, content, source: target, error: "" };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { relativePath, content: "", source: target, error: reason };
    }
  }

  function openHarnessInfoTab(item, heading, message) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
      return;
    }
    const safeTitle = escapeHtml(item && item.title ? item.title : "Logics item");
    const safeHeading = escapeHtml(heading);
    const safeMessage = escapeHtml(message);
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${safeTitle}</title><style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.5;}code{background:#f4f4f4;padding:2px 4px;border-radius:4px;}</style></head><body><h1>${safeHeading}</h1><p>${safeMessage}</p></body></html>`);
    popup.document.close();
  }

  async function openHarnessEditTab(item) {
    const target = buildHarnessDocUrl(item);
    if (!target) {
      openHarnessInfoTab(item, "Edit view unavailable", "No file path is available for this mocked item in harness mode.");
      showStatus("No file path available for this item in harness mode.", "warn");
      return;
    }

    const resolved = await resolveHarnessItemContent(item);
    if (!resolved.error) {
      const opened = openHarnessContentTab(item, "edit", resolved.source, resolved.content);
      if (opened) {
        showStatus(`Opened edit tab for ${resolved.relativePath} (${resolved.source}).`, "info");
      }
      return;
    }

    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (!opened) {
      showStatus("Popup blocked by the browser. Enable popups to open files from harness mode.", "warn");
      return;
    }
    showStatus(`Opened ${target} in a new tab.`, "info");
  }

  async function openHarnessReadTab(item) {
    const target = buildHarnessDocUrl(item);
    if (!target) {
      openHarnessInfoTab(item, "Read view unavailable", "No file path is available for this mocked item in harness mode.");
      showStatus("No file path available for this item in harness mode.", "warn");
      return;
    }

    const resolved = await resolveHarnessItemContent(item);
    if (!resolved.error) {
      const opened = openHarnessContentTab(item, "read", resolved.source, resolved.content);
      if (opened) {
        showStatus(`Opened read preview for ${resolved.relativePath} (${resolved.source}).`, "info");
      }
      return;
    }

    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (!opened) {
      showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
      return;
    }
    const reason = resolved.error || "preview unavailable";
    showStatus(`Preview unavailable (${reason}). Opened raw file instead.`, "warn");
  }

  function openSelectedItem(mode) {
    if (!selectedId) {
      return;
    }
    const item = items.find((entry) => entry.id === selectedId);
    if (!item) {
      return;
    }
    if (isHarnessMode) {
      if (mode === "read") {
        void openHarnessReadTab(item);
      } else {
        void openHarnessEditTab(item);
      }
      return;
    }
    vscode.postMessage({ type: mode, id: selectedId });
  }

  function pickDirectoryFromInput() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      let settled = false;
      const finalize = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        window.removeEventListener("focus", onWindowFocus, true);
        input.remove();
        resolve(value);
      };
      const onWindowFocus = () => {
        window.setTimeout(() => {
          if (settled) {
            return;
          }
          const files = input.files;
          if (!files || files.length === 0) {
            finalize(null);
          }
        }, 0);
      };

      input.type = "file";
      input.multiple = true;
      input.webkitdirectory = true;
      input.style.display = "none";
      input.addEventListener("change", () => {
        const files = input.files;
        if (!files || files.length === 0) {
          finalize(null);
          return;
        }
        const first = files[0];
        const relative = typeof first.webkitRelativePath === "string" ? first.webkitRelativePath : "";
        const rootName = relative.split("/")[0] || first.name;
        finalize(rootName || null);
      });
      document.body.appendChild(input);
      window.addEventListener("focus", onWindowFocus, true);
      input.click();
    });
  }

  function applyHarnessRoot(rootLabel, nextHandle = null) {
    currentRoot = rootLabel || null;
    harnessRootHandle = nextHandle || null;
    if (harnessBridge && typeof harnessBridge.setProjectRootLabel === "function") {
      harnessBridge.setProjectRootLabel(rootLabel || null);
    }
  }

  async function handleHarnessChangeProjectRoot() {
    try {
      if (typeof window.showDirectoryPicker === "function") {
        const directoryHandle = await window.showDirectoryPicker({ mode: "read" });
        const label = directoryHandle && directoryHandle.name ? directoryHandle.name : "selected-folder";
        applyHarnessRoot(label, directoryHandle);
        showStatus(`Harness project root set to "${label}".`, "info");
        return;
      }
    } catch (error) {
      if (!(error && error.name === "AbortError")) {
        const reason = error instanceof Error ? error.message : String(error);
        showStatus(`Directory picker unavailable (${reason}). Trying fallback.`, "warn");
      } else {
        showStatus("Project root selection canceled.", "warn");
        return;
      }
    }

    const fallbackRoot = await pickDirectoryFromInput();
    if (fallbackRoot) {
      applyHarnessRoot(fallbackRoot, null);
      showStatus(`Harness project root set to "${fallbackRoot}" (directory selection fallback).`, "info");
      return;
    }

    const manual = window.prompt(
      "Directory picker unavailable. Enter a root hint/path for harness mode:",
      currentRoot || ""
    );
    if (manual && manual.trim()) {
      applyHarnessRoot(manual.trim(), null);
      showStatus(`Harness project root set to "${manual.trim()}".`, "info");
      return;
    }
    showStatus("Project root selection canceled.", "warn");
  }

  async function handleChangeProjectRoot() {
    if (isHarnessMode) {
      await handleHarnessChangeProjectRoot();
      return;
    }
    vscode.postMessage({ type: "change-project-root" });
  }

  function handleResetProjectRoot() {
    if (isHarnessMode) {
      applyHarnessRoot(null);
      if (harnessBridge && typeof harnessBridge.resetProjectRoot === "function") {
        harnessBridge.resetProjectRoot();
      }
      showStatus("Harness project root reset to default mock workspace.", "info");
      return;
    }
    vscode.postMessage({ type: "reset-project-root" });
  }

  function updateSplitterA11y() {
    if (!splitter) {
      return;
    }
    const splitDisabled = isSplitInteractionDisabled();
    splitter.setAttribute("aria-disabled", String(splitDisabled));
    splitter.tabIndex = splitDisabled ? -1 : 0;
    if (isStackedLayout() && !splitDisabled) {
      splitter.setAttribute("aria-valuemin", "0");
      splitter.setAttribute("aria-valuemax", "100");
      splitter.setAttribute("aria-valuenow", String(Math.round(splitRatio * 100)));
    } else {
      splitter.removeAttribute("aria-valuemin");
      splitter.removeAttribute("aria-valuemax");
      splitter.removeAttribute("aria-valuenow");
    }
  }

  function nudgeSplitFromKeyboard(delta) {
    if (!isStackedLayout() || isSplitInteractionDisabled()) {
      return;
    }
    applySplitRatio(splitRatio + delta, true);
    render();
  }

  refreshButton.addEventListener("click", () => vscode.postMessage({ type: "refresh" }));
  if (changeProjectRootButton) {
    changeProjectRootButton.addEventListener("click", async () => {
      await handleChangeProjectRoot();
      setToolsPanelOpen(false);
    });
  }
  if (resetProjectRootButton) {
    resetProjectRootButton.addEventListener("click", () => {
      handleResetProjectRoot();
      setToolsPanelOpen(false);
    });
  }
  if (fixDocsButton) {
    fixDocsButton.addEventListener("click", () => {
      vscode.postMessage({ type: "fix-docs" });
      if (isHarnessMode) {
        showStatus("Fix Logics requires the VS Code extension host. Action forwarded to harness mock.", "warn");
      }
      setToolsPanelOpen(false);
    });
  }
  if (filterToggle) {
    filterToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (toolsPanelOpen) {
        setToolsPanelOpen(false);
      }
      setFilterPanelOpen(!filterPanelOpen);
    });
  }
  if (toolsToggle) {
    toolsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (filterPanelOpen) {
        setFilterPanelOpen(false);
      }
      setToolsPanelOpen(!toolsPanelOpen);
    });
  }
  function persistState() {
    vscode.setState({
      hideCompleted,
      hideUsedRequests,
      collapsedStages: Array.from(collapsedStages),
      detailsCollapsed,
      collapsedDetailSections: Array.from(collapsedDetailSections),
      splitRatio
    });
  }

  function isStackedLayout() {
    return Boolean(stackedQuery && stackedQuery.matches);
  }

  function isSplitInteractionDisabled() {
    return isStackedLayout() && detailsCollapsed;
  }

  function clearSplitSizing() {
    if (!board || !details) {
      return;
    }
    board.style.flex = "";
    board.style.height = "";
    details.style.flex = "";
    details.style.height = "";
  }

  function applySplitRatio(nextRatio, shouldPersist = false) {
    if (!layout || !board || !details || !isStackedLayout()) {
      return;
    }
    if (isSplitInteractionDisabled()) {
      board.style.flex = "1 1 auto";
      board.style.height = "";
      details.style.flex = "0 0 auto";
      details.style.height = "auto";
      updateSplitterA11y();
      if (shouldPersist) {
        persistState();
      }
      return;
    }
    const splitterHeight = splitter ? splitter.getBoundingClientRect().height : 0;
    const available = layout.clientHeight - splitterHeight;
    if (!Number.isFinite(available) || available <= 0) {
      return;
    }
    const minBoard = Math.min(minBoardHeight, available);
    const minDetails = Math.min(minDetailsHeight, Math.max(0, available - minBoard));
    const minRatio = minBoard / available;
    const maxRatio = (available - minDetails) / available;
    const clampedRatio = Math.min(Math.max(nextRatio, minRatio), maxRatio);
    const boardHeight = Math.round(available * clampedRatio);
    board.style.flex = `0 0 ${boardHeight}px`;
    board.style.height = `${boardHeight}px`;
    details.style.flex = "1 1 auto";
    details.style.height = "";
    splitRatio = clampedRatio;
    updateSplitterA11y();
    if (shouldPersist) {
      persistState();
    }
  }

  function updateLayoutMode() {
    if (!layout) {
      return;
    }
    const stacked = isStackedLayout();
    layout.classList.toggle("layout--stacked", stacked);
    layout.classList.toggle("layout--split-disabled", stacked && detailsCollapsed);
    if (stacked) {
      applySplitRatio(splitRatio, false);
    } else {
      clearSplitSizing();
    }
  }

  function startSplitDrag(event) {
    if (!splitter || !layout || !isStackedLayout() || isSplitInteractionDisabled()) {
      return;
    }
    event.preventDefault();
    isDraggingSplit = true;
    splitter.classList.add("splitter--dragging");
    document.body.classList.add("is-resizing");
    splitter.setPointerCapture(event.pointerId);
  }

  function updateSplitDrag(event) {
    if (!isDraggingSplit || !layout || !isStackedLayout() || isSplitInteractionDisabled()) {
      return;
    }
    const rect = layout.getBoundingClientRect();
    const splitterHeight = splitter ? splitter.getBoundingClientRect().height : 0;
    const available = rect.height - splitterHeight;
    if (available <= 0) {
      return;
    }
    const offsetY = event.clientY - rect.top - splitterHeight / 2;
    const minBoard = Math.min(minBoardHeight, available);
    const minDetails = Math.min(minDetailsHeight, Math.max(0, available - minBoard));
    const boardHeight = Math.min(Math.max(offsetY, minBoard), available - minDetails);
    const ratio = boardHeight / available;
    applySplitRatio(ratio, false);
  }

  function endSplitDrag(event) {
    if (!isDraggingSplit) {
      return;
    }
    isDraggingSplit = false;
    if (splitter) {
      splitter.classList.remove("splitter--dragging");
      splitter.releasePointerCapture(event.pointerId);
    }
    document.body.classList.remove("is-resizing");
    persistState();
  }

  if (hideCompleteToggle) {
    hideCompleteToggle.addEventListener("change", (event) => {
      hideCompleted = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (hideUsedRequestsToggle) {
    hideUsedRequestsToggle.addEventListener("change", (event) => {
      hideUsedRequests = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (detailsToggle) {
    detailsToggle.addEventListener("click", () => {
      detailsCollapsed = !detailsCollapsed;
      persistState();
      render();
    });
  }
  openButton.addEventListener("click", () => {
    openSelectedItem("open");
  });
  if (readButton) {
    readButton.addEventListener("click", () => {
      openSelectedItem("read");
    });
  }
  promoteButton.addEventListener("click", () => {
    if (!selectedId) return;
    vscode.postMessage({ type: "promote", id: selectedId });
    if (isHarnessMode) {
      showStatus("Promote requires the VS Code extension host. Action forwarded to harness mock.", "warn");
    }
  });

  window.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    if (type === "data") {
      if (payload && typeof payload.root === "string") {
        currentRoot = payload.root;
      }
      if (payload && payload.error) {
        board.innerHTML = `<div class="state-message">${payload.error}</div>`;
        detailsBody.innerHTML = "";
        if (detailsTitle) {
          detailsTitle.textContent = "Details";
        }
        return;
      }
      const nextItems = payload && payload.items ? payload.items : [];
      const nextSelected = payload ? payload.selectedId : undefined;
      setState(nextItems, nextSelected);
    }
  });

  const previousState = vscode.getState();
  if (previousState && typeof previousState.hideCompleted === "boolean") {
    hideCompleted = previousState.hideCompleted;
  }
  if (previousState && typeof previousState.hideUsedRequests === "boolean") {
    hideUsedRequests = previousState.hideUsedRequests;
  }
  if (previousState && Array.isArray(previousState.collapsedStages)) {
    collapsedStages = new Set(previousState.collapsedStages);
  }
  if (previousState && typeof previousState.detailsCollapsed === "boolean") {
    detailsCollapsed = previousState.detailsCollapsed;
  }
  if (previousState && Array.isArray(previousState.collapsedDetailSections)) {
    collapsedDetailSections = new Set(previousState.collapsedDetailSections);
  }
  if (previousState && typeof previousState.splitRatio === "number") {
    splitRatio = previousState.splitRatio;
  }

  document.addEventListener("click", (event) => {
    if (filterPanelOpen && filterPanel && filterToggle) {
      const target = event.target;
      if (!filterPanel.contains(target) && !filterToggle.contains(target)) {
        setFilterPanelOpen(false);
      }
    }
    if (toolsPanelOpen && toolsPanel && toolsToggle) {
      const target = event.target;
      if (!toolsPanel.contains(target) && !toolsToggle.contains(target)) {
        setToolsPanelOpen(false);
      }
    }
    if (!activeColumnMenu) {
      return;
    }
    const target = event.target;
    if (activeColumnMenu.contains(target)) {
      return;
    }
    if (activeColumnMenuButton && activeColumnMenuButton.contains(target)) {
      return;
    }
    closeColumnMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && filterPanelOpen) {
      setFilterPanelOpen(false);
    }
    if (event.key === "Escape" && toolsPanelOpen) {
      setToolsPanelOpen(false);
    }
    if (event.key === "Escape" && activeColumnMenu) {
      closeColumnMenu();
    }
  });

  if (splitter) {
    splitter.addEventListener("pointerdown", (event) => startSplitDrag(event));
    splitter.addEventListener("pointermove", (event) => updateSplitDrag(event));
    splitter.addEventListener("pointerup", (event) => endSplitDrag(event));
    splitter.addEventListener("pointercancel", (event) => endSplitDrag(event));
    splitter.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSplitFromKeyboard(0.03);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSplitFromKeyboard(-0.03);
      } else if (event.key === "Home") {
        event.preventDefault();
        applySplitRatio(0.9, true);
        render();
      } else if (event.key === "End") {
        event.preventDefault();
        applySplitRatio(0.1, true);
        render();
      }
    });
  }

  if (stackedQuery && typeof stackedQuery.addEventListener === "function") {
    stackedQuery.addEventListener("change", updateLayoutMode);
  } else if (stackedQuery && typeof stackedQuery.addListener === "function") {
    stackedQuery.addListener(updateLayoutMode);
  }
  window.addEventListener("resize", () => {
    if (isStackedLayout()) {
      applySplitRatio(splitRatio, false);
    }
  });

  setControlDescription(filterToggle, "Filter options");
  setControlDescription(toolsToggle, "Tools");
  setControlDescription(refreshButton, "Refresh");
  setControlDescription(changeProjectRootButton, "Change project root");
  setControlDescription(resetProjectRootButton, "Use workspace root");
  setControlDescription(fixDocsButton, "Fix Logics");
  setControlDescription(detailsToggle, detailsCollapsed ? "Expand details" : "Collapse details");
  setControlDescription(openButton, "Edit selected item");
  setControlDescription(readButton, "Read selected item");
  setControlDescription(promoteButton, "Promote selected item");
  if (toolsPanel) {
    toolsPanel.setAttribute("role", "menu");
  }
  if (filterPanel) {
    filterPanel.setAttribute("role", "group");
    filterPanel.setAttribute("aria-label", "Filter options");
  }
  if (filterToggle && filterPanel && filterPanel.id) {
    filterToggle.setAttribute("aria-controls", filterPanel.id);
  }
  if (toolsToggle && toolsPanel && toolsPanel.id) {
    toolsToggle.setAttribute("aria-controls", toolsPanel.id);
  }

  updateLayoutMode();
  vscode.postMessage({ type: "ready" });
})();
