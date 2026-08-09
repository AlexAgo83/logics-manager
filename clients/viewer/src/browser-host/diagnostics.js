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
    postDiagnostic,
    recoverApplication,
    onCircuitOpen,
    getMetadata,
    updateDocumentHeaderNav,
    renderMermaidDiagrams
  } = options;
  const errorLogKey = "logics.localViewer.errors";
  const breadcrumbKeyPrefix = "logics.localViewer.breadcrumbs";
  let lastHealthyDocument = null;
  let documentCheckScheduled = false;
  let documentRecoveryInProgress = false;
  let boardCheckScheduled = false;
  const recentFailures = new Map();
  let openCircuitFingerprint = "";
  // item_677: no Math.random() fallback. This id only labels a breadcrumb trail, but a
  // weak-randomness alert on a permanently non-empty list is noise nobody reads, and
  // getRandomValues is present wherever randomUUID is missing.
  const sessionId = typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `viewer-${Date.now()}-${Array.from(window.crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  let heartbeatTimer = 0;

  // Synchronous breadcrumb trail persisted to localStorage so it survives a
  // renderer death or a main-thread hang (heartbeats can't: they need the
  // event loop). If the last entry before an unclean end is a ":start"
  // without its ":end", the crash happened inside that operation. One key per
  // session: sibling tabs on the same origin must not clobber each other's
  // trail, or the crashed tab's evidence is lost to the survivor's writes.
  const breadcrumbKey = `${breadcrumbKeyPrefix}.${sessionId}`;
  const breadcrumbs = [];
  function writeBreadcrumbBlob(clean) {
    try {
      window.localStorage.setItem(breadcrumbKey, JSON.stringify({ sessionId, clean, touchedAt: Date.now(), entries: breadcrumbs }));
    } catch { /* noop */ }
  }
  function breadcrumb(label) {
    breadcrumbs.push({ t: Date.now(), label: String(label) });
    if (breadcrumbs.length > 40) breadcrumbs.splice(0, breadcrumbs.length - 40);
    writeBreadcrumbBlob(false);
  }

  function reportStaleBreadcrumbTrails() {
    const foreignKeys = [];
    try {
      for (let index = 0; index < window.localStorage.length; index++) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(breadcrumbKeyPrefix) && key !== breadcrumbKey) foreignKeys.push(key);
      }
    } catch { /* noop */ }
    for (const key of foreignKeys) {
      let prior = null;
      try {
        prior = JSON.parse(window.localStorage.getItem(key) || "null");
      } catch { /* noop */ }
      const unclean = prior?.clean !== true && Array.isArray(prior?.entries) && prior.entries.length > 0;
      // A fresh unclean blob can belong to a live sibling tab (its heartbeat
      // re-touches it every 10s); leave it for a later sweep.
      if (unclean && Date.now() - Number(prior?.touchedAt || 0) < 30_000) continue;
      if (unclean) {
        const entry = {
          at: new Date().toISOString(),
          kind: "prior-session-breadcrumbs",
          message: `Previous session ${prior.sessionId || key} ended uncleanly; last operation: ${prior.entries.at(-1)?.label || "?"} (wasDiscarded=${document.wasDiscarded === true})`,
          sessionId: String(prior.sessionId || ""),
          browser: navigator.userAgent,
          // The server whitelists entry fields, so the trail rides in `stack`
          // (accepted up to 12k chars) instead of a custom field.
          stack: prior.entries.map((item) => `${new Date(item.t).toISOString()} ${item.label}`).join("\n"),
          ...state()
        };
        Promise.resolve(postDiagnostic?.("/api/viewer-diagnostics", { entry })).catch(() => {});
      }
      try { window.localStorage.removeItem(key); } catch { /* noop */ }
    }
  }

  // The leading hypothesis for the blank-screen crash is a synchronous
  // main-thread hang: long tasks growing near a hot spot are the pre-crash
  // evidence that names the culprit without waiting for the fatal one.
  try {
    new PerformanceObserver((list) => {
      for (const item of list.getEntries()) {
        if (item.duration >= 200) breadcrumb(`longtask ${Math.round(item.duration)}ms`);
      }
    }).observe({ entryTypes: ["longtask"] });
  } catch { /* noop */ }

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
    const browserMemory = window.performance?.memory;
    let metadata = {
      browser: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
      memory: browserMemory ? {
        usedJSHeapSize: browserMemory.usedJSHeapSize,
        totalJSHeapSize: browserMemory.totalJSHeapSize,
        jsHeapSizeLimit: browserMemory.jsHeapSizeLimit
      } : {}
    };
    try {
      metadata = { ...metadata, ...(getMetadata?.() || {}) };
    } catch { /* noop */ }
    const baseEntry = {
      at: new Date().toISOString(),
      kind: String(details.kind || "runtime-error"),
      message: errorMessage(error),
      stack: error instanceof Error && error.stack ? error.stack : "",
      ...state(),
      ...metadata,
      ...details
    };
    const fingerprintSource = `${baseEntry.kind}\n${baseEntry.message}\n${baseEntry.stack.split("\n", 1)[0] || ""}`;
    const fingerprint = details.fingerprint || Array.from(fingerprintSource).reduce(
      (hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0,
      2166136261
    ).toString(16).padStart(8, "0");
    const previousEntries = lastErrors();
    const previous = previousEntries.at(-1);
    const count = previous?.fingerprint === fingerprint ? Number(previous.count || 1) + 1 : 1;
    const entry = { ...baseEntry, fingerprint, count };
    try {
      const next = previous?.fingerprint === fingerprint
        ? previousEntries.slice(0, -1).concat({ ...previous, ...entry, at: previous.at, lastAt: entry.at })
        : previousEntries.concat(entry);
      window.localStorage.setItem(errorLogKey, JSON.stringify(next.slice(-20)));
    } catch { /* noop */ }
    Promise.resolve(postDiagnostic?.("/api/viewer-diagnostics", { entry })).catch(() => {});
    try { console.error("[logics-viewer]", entry.message, error); } catch { /* noop */ }
    setMeta(`Viewer error: ${entry.message}`);
    const now = Date.now();
    const failures = (recentFailures.get(fingerprint) || []).filter((timestamp) => now - timestamp <= 60_000);
    failures.push(now);
    recentFailures.set(fingerprint, failures);
    if (failures.length >= 3 && openCircuitFingerprint !== fingerprint) {
      openCircuitFingerprint = fingerprint;
      onCircuitOpen?.(entry);
    }
    return entry;
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

  async function recoverDocument(snapshot, failureKind) {
    documentRecoveryInProgress = true;
    try {
      if (typeof recoverApplication === "function") {
        await recoverApplication();
        if (getContent()?.childNodes.length > 0) {
          rememberHealthyDocument();
          return true;
        }
      }
    } catch (error) {
      recordError(error, { kind: failureKind, screen: snapshot?.title || getTitle()?.textContent || "Document" });
    } finally {
      documentRecoveryInProgress = false;
    }
    return restoreDocument(snapshot, `${failureKind}-fallback`);
  }

  function recoverBlankDocument() {
    documentCheckScheduled = false;
    if (documentRecoveryInProgress) return;
    const panel = getPanel();
    const content = getContent();
    if (!(panel instanceof HTMLElement) || !(content instanceof HTMLElement) || panel.hidden || content.childNodes.length > 0) return;
    const screen = lastHealthyDocument?.title || getTitle()?.textContent || "Document";
    recordError(new Error("Viewer document became empty unexpectedly"), { kind: "blank-screen", screen });
    void recoverDocument(lastHealthyDocument, "blank-screen-recovery");
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
        // The board keeps rendering behind whatever document panel is on top of it (a CDX
        // screen, Workshop, ...), and a resize can empty it mid-reflow while it does. That
        // is not a defect the operator is looking at: only report it when the board is
        // actually the visible screen, or its stale error outlives the screen it was never
        // about.
        const panel = getPanel();
        if (panel instanceof HTMLElement && !panel.hidden) return;
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

  function sessionPayload(event) {
    const current = state();
    const memory = window.performance?.memory;
    return {
      event,
      sessionId,
      screen: current.screen,
      url: current.url,
      // Vital signs persisted server-side with each heartbeat so an
      // unclean-session report can tell an OOM-killed tab (heap climbing)
      // from a healthy tab that simply stopped (sleep, tab discard).
      stats: {
        panelHidden: current.panelHidden,
        contentChildren: current.contentChildren,
        contentTextLength: current.contentTextLength,
        boardChildren: current.boardChildren,
        usedJSHeapSize: memory?.usedJSHeapSize ?? null,
        totalJSHeapSize: memory?.totalJSHeapSize ?? null,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit ?? null
      }
    };
  }

  // MutationObservers only fire on childList changes, so a "blank" UI reached
  // without mutating the watched nodes (e.g. the document panel hidden while
  // the board behind it is empty) is invisible to them. Check on each
  // heartbeat tick instead: two consecutive blank ticks (~20s) means the user
  // is looking at background only.
  let blankUiTicks = 0;
  function checkBlankUi() {
    const current = state();
    const main = document.getElementById("layout-main");
    const mainText = main instanceof HTMLElement ? (main.innerText ?? main.textContent ?? "").trim() : "";
    const documentBlank = current.panelHidden !== false || (current.contentChildren ?? 0) === 0;
    const blank = documentBlank && mainText.length === 0;
    blankUiTicks = blank ? blankUiTicks + 1 : 0;
    if (blankUiTicks === 2) {
      recordError(new Error("Viewer UI became blank: document panel not visible and main layout has no content"), { kind: "blank-ui", screen: current.screen });
    }
  }

  function postSession(event, keepalive = false) {
    return Promise.resolve(postDiagnostic?.("/api/viewer-diagnostics/session", sessionPayload(event), { keepalive })).catch(() => {});
  }

  function startSessionHeartbeat() {
    if (heartbeatTimer) return;
    postSession("start");
    heartbeatTimer = window.setInterval(() => {
      postSession("heartbeat");
      checkBlankUi();
      // Re-touch the breadcrumb blob so the sweep can tell a live sibling
      // tab (fresh touchedAt) from a dead one (stale).
      writeBreadcrumbBlob(false);
      // Sweep on every tick, not just at boot: a reload within 30s of a
      // crash finds the dead tab's blob still fresh and must leave it, so
      // without this the trail waits for the NEXT page load to surface.
      reportStaleBreadcrumbTrails();
    }, 10_000);
  }

  function stopSessionHeartbeat() {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    heartbeatTimer = 0;
    postSession("end", true);
    writeBreadcrumbBlob(true);
  }

  reportStaleBreadcrumbTrails();
  breadcrumb("session:start");
  startSessionHeartbeat();
  window.addEventListener("pagehide", stopSessionHeartbeat);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) startSessionHeartbeat();
  });

  window.logicsViewer = window.logicsViewer || {};
  window.logicsViewer.lastErrors = lastErrors;
  window.logicsViewer.diagnostics = () => ({ state: state(), errors: lastErrors() });
  window.logicsViewer.recordError = recordError;
  window.logicsViewer.sessionId = sessionId;
  window.logicsViewer.breadcrumb = breadcrumb;
  window.addEventListener("error", (event) => recordError(event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => recordError(event.reason));

  return {
    breadcrumb,
    healthyDocument: () => lastHealthyDocument,
    recordError,
    recoverBlankDocument,
    recoverDocument,
    rememberHealthyDocument,
    resetCircuit: () => {
      recentFailures.clear();
      openCircuitFingerprint = "";
    },
    restoreDocument
  };
}
