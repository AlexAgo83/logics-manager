(() => {
  window.createCdxLogicsWebviewPersistence = function createCdxLogicsWebviewPersistence(options) {
    const {
      vscode,
      board,
      detailsBody,
      defaultFilterState,
      getUiState,
      getSnapshot,
      applyResetState,
      applyPersistedState
    } = options;

    const scrollState = {
      boardLeft: 0,
      boardTop: 0,
      detailsTop: 0
    };
    let persistStateTimer = null;

    function captureScrollState() {
      if (board) {
        scrollState.boardLeft = board.scrollLeft;
        scrollState.boardTop = board.scrollTop;
      }
      if (detailsBody) {
        scrollState.detailsTop = detailsBody.scrollTop;
      }
    }

    function restoreScrollState() {
      if (board) {
        board.scrollLeft = scrollState.boardLeft;
        board.scrollTop = scrollState.boardTop;
      }
      if (detailsBody) {
        detailsBody.scrollTop = scrollState.detailsTop;
      }
    }

    function persistState() {
      captureScrollState();
      vscode.setState(getSnapshot({ ...scrollState }));
    }

    function schedulePersistState() {
      if (persistStateTimer) {
        clearTimeout(persistStateTimer);
      }
      persistStateTimer = setTimeout(() => {
        persistStateTimer = null;
        persistState();
      }, 80);
    }

    function resetPersistedUiState() {
      applyResetState({
        defaultFilterState,
        uiDefaults: {
          detailsCollapsed: false,
          viewMode: "board",
          splitRatio: 0.6
        },
        scrollState: {
          boardLeft: 0,
          boardTop: 0,
          detailsTop: 0
        }
      });
      Object.assign(scrollState, {
        boardLeft: 0,
        boardTop: 0,
        detailsTop: 0
      });
    }

    function hydrate(previousState) {
      applyPersistedState(previousState, scrollState, getUiState());
    }

    return {
      captureScrollState,
      restoreScrollState,
      schedulePersistState,
      resetPersistedUiState,
      persistState,
      hydrate,
      getScrollState() {
        return { ...scrollState };
      }
    };
  };
})();
