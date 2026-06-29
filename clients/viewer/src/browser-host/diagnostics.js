function errorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message || error);
  return String(error || "Unknown viewer error");
}

export function createViewerDiagnostics(options) {
  const {
    getPanel,
    getTitle,
    getContent,
    getBoard,
    setMeta,
    updateDocumentHeaderNav,
    renderMermaidDiagrams
  } = options;
  const errorLogKey = "logics.localViewer.errors";
  let lastHealthyDocument = null;
  let documentCheckScheduled = false;
  let documentRecoveryInProgress = false;
  let boardCheckScheduled = false;

  function state() {
    const panel = getPanel();
    const content = getContent();
    return {
      screen: getTitle()?.textContent || "",
      panelHidden: panel instanceof HTMLElement ? panel.hidden : null,
      contentChildren: content?.childNodes.length ?? null,
      contentTextLength: content?.textContent?.length ?? null,
      boardChildren: getBoard()?.childNodes.length ?? null,
      url: window.location.href
    };
  }

  function lastErrors() {
    try {
      const entries = JSON.parse(window.localStorage.getItem(errorLogKey) || "[]");
      return Array.isArray(entries) ? entries : [];
    } catch {
      return [];
    }
  }

  function recordError(error, details = {}) {
    const entry = {
      at: new Date().toISOString(),
      kind: String(details.kind || "runtime-error"),
      message: errorMessage(error),
      stack: error instanceof Error && error.stack ? error.stack : "",
      ...state(),
      ...details
    };
    try {
      window.localStorage.setItem(errorLogKey, JSON.stringify(lastErrors().concat(entry).slice(-20)));
    } catch { /* noop */ }
    try { console.error("[logics-viewer]", entry.message, error); } catch { /* noop */ }
    setMeta(`Viewer error: ${entry.message}`);
  }

  function rememberHealthyDocument() {
    const panel = getPanel();
    const content = getContent();
    if (!(panel instanceof HTMLElement) || !(content instanceof HTMLElement) || panel.hidden || content.childNodes.length === 0) return;
    lastHealthyDocument = { title: getTitle()?.textContent || "Document", html: content.innerHTML };
  }

  function restoreDocument(snapshot, failureKind = "document-recovery") {
    const content = getContent();
    if (!snapshot || !(content instanceof HTMLElement)) return false;
    documentRecoveryInProgress = true;
    try {
      const title = getTitle();
      if (title) title.textContent = snapshot.title;
      content.innerHTML = snapshot.html;
      updateDocumentHeaderNav(content);
      renderMermaidDiagrams();
      lastHealthyDocument = snapshot;
      return true;
    } catch (error) {
      recordError(error, { kind: failureKind, screen: snapshot.title });
      return false;
    } finally {
      documentRecoveryInProgress = false;
    }
  }

  function recoverBlankDocument() {
    documentCheckScheduled = false;
    if (documentRecoveryInProgress) return;
    const panel = getPanel();
    const content = getContent();
    if (!(panel instanceof HTMLElement) || !(content instanceof HTMLElement) || panel.hidden || content.childNodes.length > 0) return;
    const screen = lastHealthyDocument?.title || getTitle()?.textContent || "Document";
    recordError(new Error("Viewer document became empty unexpectedly"), { kind: "blank-screen", screen });
    if (lastHealthyDocument) restoreDocument(lastHealthyDocument, "blank-screen-recovery");
  }

  const documentObserver = typeof MutationObserver === "function" && getContent()
    ? new MutationObserver(() => {
      if (documentCheckScheduled || documentRecoveryInProgress) return;
      documentCheckScheduled = true;
      queueMicrotask(recoverBlankDocument);
    })
    : null;
  documentObserver?.observe(getContent(), { childList: true });

  const boardObserver = typeof MutationObserver === "function" && getBoard()
    ? new MutationObserver(() => {
      if (boardCheckScheduled) return;
      boardCheckScheduled = true;
      queueMicrotask(() => {
        boardCheckScheduled = false;
        const board = getBoard();
        if (!(board instanceof HTMLElement) || board.childNodes.length > 0) return;
        recordError(new Error("Viewer board became empty unexpectedly"), { kind: "blank-board", screen: "Project" });
        const message = document.createElement("div");
        message.className = "state-message";
        message.textContent = "The project view became empty unexpectedly. Refresh to retry; diagnostics were saved.";
        board.appendChild(message);
      });
    })
    : null;
  boardObserver?.observe(getBoard(), { childList: true });

  window.logicsViewer = window.logicsViewer || {};
  window.logicsViewer.lastErrors = lastErrors;
  window.logicsViewer.diagnostics = () => ({ state: state(), errors: lastErrors() });
  window.logicsViewer.recordError = recordError;
  window.addEventListener("error", (event) => recordError(event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => recordError(event.reason));

  return {
    healthyDocument: () => lastHealthyDocument,
    recordError,
    recoverBlankDocument,
    rememberHealthyDocument,
    restoreDocument
  };
}
