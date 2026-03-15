(() => {
  window.createCdxLogicsLayoutController = function createCdxLogicsLayoutController(options) {
    const {
      layout,
      board,
      details,
      splitter,
      stackedQuery,
      uiState,
      persistState,
      debugLog,
      isDetailsCollapsed
    } = options;

    const minBoardHeight = 120;
    const minDetailsHeight = 220;
    let isDraggingSplit = false;

    function detectLayoutMode() {
      return Boolean(stackedQuery && stackedQuery.matches) ? "stacked" : "horizontal";
    }

    function isStackedLayout() {
      return uiState.layoutMode === "stacked";
    }

    function isSplitInteractionDisabled() {
      return isStackedLayout() && isDetailsCollapsed();
    }

    function clearSplitSizing() {
      if (!board || !details) {
        return;
      }
      board.style.flex = "";
      board.style.height = "";
      board.style.paddingBottom = "";
      details.style.flex = "";
      details.style.height = "";
      details.style.maxHeight = "";
      if (splitter) {
        splitter.style.bottom = "";
      }
    }

    function syncStackedAnchoredLayout() {
      if (!layout || !board || !details || !isStackedLayout()) {
        return;
      }
      const splitterHeight = splitter ? splitter.getBoundingClientRect().height : 0;
      const detailsHeight = Math.ceil(details.getBoundingClientRect().height || details.offsetHeight || 0);
      const reservedBottom = detailsHeight + (isSplitInteractionDisabled() ? 0 : splitterHeight);
      board.style.paddingBottom = `${reservedBottom}px`;
      if (splitter) {
        splitter.style.bottom = isSplitInteractionDisabled() ? "" : `${detailsHeight}px`;
      }
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
        splitter.setAttribute("aria-valuenow", String(Math.round(uiState.splitRatio * 100)));
      } else {
        splitter.removeAttribute("aria-valuemin");
        splitter.removeAttribute("aria-valuemax");
        splitter.removeAttribute("aria-valuenow");
      }
    }

    function applySplitRatio(nextRatio, shouldPersist = false) {
      if (!layout || !board || !details || !isStackedLayout()) {
        return;
      }
      if (isSplitInteractionDisabled()) {
        board.style.flex = "1 1 auto";
        board.style.height = "";
        board.style.paddingBottom = "";
        details.style.flex = "0 0 auto";
        details.style.height = "";
        details.style.maxHeight = "";
        syncStackedAnchoredLayout();
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
      const targetBoardHeight = Math.round(available * clampedRatio);
      const boardContentHeight = Math.max(board.scrollHeight || 0, 0);
      const compactBoardFloor = boardContentHeight > 0 ? Math.min(minBoardHeight, boardContentHeight) : minBoardHeight;
      const boardHeight =
        boardContentHeight > 0
          ? Math.max(compactBoardFloor, Math.min(targetBoardHeight, boardContentHeight))
          : targetBoardHeight;
      const detailsHeight = Math.max(minDetails, available - boardHeight);
      board.style.flex = "1 1 auto";
      board.style.height = "";
      details.style.flex = "0 0 auto";
      details.style.height = `${detailsHeight}px`;
      details.style.maxHeight = `${available}px`;
      uiState.splitRatio = clampedRatio;
      debugLog("split-ratio:update", { splitRatio: uiState.splitRatio });
      syncStackedAnchoredLayout();
      updateSplitterA11y();
      if (shouldPersist) {
        persistState();
      }
    }

    function updateLayoutMode() {
      if (!layout) {
        return;
      }
      const previousLayoutMode = uiState.layoutMode;
      uiState.layoutMode = detectLayoutMode();
      const stacked = isStackedLayout();
      layout.classList.toggle("layout--stacked", stacked);
      layout.classList.toggle("layout--horizontal", !stacked);
      layout.classList.toggle("layout--split-disabled", stacked && isDetailsCollapsed());
      if (previousLayoutMode !== uiState.layoutMode) {
        debugLog("layout-mode:change", { from: previousLayoutMode, to: uiState.layoutMode });
      }
      if (!stacked && isDraggingSplit) {
        isDraggingSplit = false;
        if (splitter) {
          splitter.classList.remove("splitter--dragging");
        }
        document.body.classList.remove("is-resizing");
        debugLog("splitter:drag-reset", { reason: "layout-not-stacked" });
      }
      if (stacked) {
        if (splitter) {
          splitter.style.display = "";
        }
        applySplitRatio(uiState.splitRatio, false);
      } else {
        if (splitter) {
          splitter.style.display = "none";
        }
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
      if (typeof splitter.setPointerCapture === "function" && typeof event.pointerId === "number") {
        splitter.setPointerCapture(event.pointerId);
      }
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
        if (typeof splitter.releasePointerCapture === "function" && typeof event.pointerId === "number") {
          splitter.releasePointerCapture(event.pointerId);
        }
      }
      document.body.classList.remove("is-resizing");
      persistState();
    }

    function nudgeSplitFromKeyboard(delta) {
      if (!isStackedLayout() || isSplitInteractionDisabled()) {
        return;
      }
      applySplitRatio(uiState.splitRatio + delta, true);
    }

    return {
      updateSplitterA11y,
      nudgeSplitFromKeyboard,
      persistAndApplySplitRatio(nextRatio) {
        applySplitRatio(nextRatio, true);
      },
      applySplitRatio,
      syncStackedAnchoredLayout,
      updateLayoutMode,
      startSplitDrag,
      updateSplitDrag,
      endSplitDrag,
      isStackedLayout,
      isSplitInteractionDisabled,
      isDraggingSplit() {
        return isDraggingSplit;
      },
      resetDraggingState() {
        isDraggingSplit = false;
        if (splitter) {
          splitter.classList.remove("splitter--dragging");
        }
        document.body.classList.remove("is-resizing");
      }
    };
  };
})();
