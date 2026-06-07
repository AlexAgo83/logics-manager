(() => {
  window.createCdxLogicsUiStatusApi = function createCdxLogicsUiStatusApi(options) {
    const { documentRef = document, layout, harnessBridge } = options;

    let statusBanner = null;
    let noticeTimeoutId = null;

    function ensureStatusBanner() {
      if (statusBanner && statusBanner.isConnected) {
        return statusBanner;
      }
      const anchor = layout && layout.parentElement ? layout.parentElement : documentRef.body;
      if (!anchor) {
        return null;
      }
      statusBanner = documentRef.createElement("div");
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

    return {
      ensureStatusBanner,
      showStatus
    };
  };
})();
