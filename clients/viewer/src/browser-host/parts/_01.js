(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    const opts = init ? { ...init } : {};
    if (!opts.signal && primaryActionController) {
      opts.signal = primaryActionController.signal;
    }
    return nativeFetch(input, opts);
  };
  const stateKey = "logics.localViewer.state";
  const preferenceKey = "logics.localViewer.preferences.v1";
  const lanTokenKey = "logics.lan.token";
  const deviceTokenKey = "logics.lan.deviceToken";
  const deviceIdKey = "logics.lan.deviceId";
  const deviceLabelKey = "logics.lan.deviceLabel";

  function captureLanTokenFromUrl() {
    try {
      const url = new URL(window.location.href);
      const queryToken = url.searchParams.get("t");
      if (queryToken) {
        const previousToken = window.sessionStorage.getItem(lanTokenKey) || "";
        if (previousToken !== queryToken) {
          clearDeviceCredentials();
        }
        window.sessionStorage.setItem(lanTokenKey, queryToken);
        url.searchParams.delete("t");
        const cleaned = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(null, "", cleaned || "/");
      }
    } catch {
      // sessionStorage / history may be unavailable in some embed contexts.
    }
  }

  function getLanToken() {
    try {
      return window.sessionStorage.getItem(lanTokenKey) || "";
    } catch {
      return "";
    }
  }

  function getDeviceToken() {
    try {
      return window.localStorage.getItem(deviceTokenKey) || "";
    } catch {
      return "";
    }
  }

  function setDeviceCredentials({ token, deviceId, label }) {
    try {
      window.localStorage.setItem(deviceTokenKey, token || "");
      window.localStorage.setItem(deviceIdKey, deviceId || "");
      window.localStorage.setItem(deviceLabelKey, label || "");
    } catch { /* noop */ }
  }

  function clearDeviceCredentials() {
    try {
      window.localStorage.removeItem(deviceTokenKey);
      window.localStorage.removeItem(deviceIdKey);
      window.localStorage.removeItem(deviceLabelKey);
    } catch { /* noop */ }
  }

  // Prefer the persistent per-device token over the per-session share
  // token when both exist — mutations require the device token under
  // --lan-rw, and a paired device should not lose access if the share
  // URL is regenerated.
  function getActiveToken() {
    return getDeviceToken() || getLanToken();
  }

  captureLanTokenFromUrl();

  const originalFetch = window.fetch.bind(window);
  function withLanAuthorization(input, init) {
    const token = getActiveToken();
    if (!token) return init;
    const next = init ? { ...init } : {};
    const headers = new Headers(next.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    next.headers = headers;
    return next;
  }

  function viewerFetch(input, init) {
    return originalFetch(input, withLanAuthorization(input, init));
  }

  window.fetch = (input, init) => {
    return viewerFetch(input, init);
  };

  if (typeof window.EventSource === "function") {
    const NativeEventSource = window.EventSource;
    window.EventSource = function PatchedEventSource(url, init) {
      const token = getActiveToken();
      if (!token || typeof url !== "string") {
        return new NativeEventSource(url, init);
      }
      const separator = url.includes("?") ? "&" : "?";
      const tokenized = `${url}${separator}t=${encodeURIComponent(token)}`;
      return new NativeEventSource(tokenized, init);
    };
    window.EventSource.prototype = NativeEventSource.prototype;
  }

  function closeThemedModal(modal) {
    if (modal instanceof HTMLElement) {
      modal.remove();
    }
  }

  function createThemedModal({ title, message, submitLabel = "OK", cancelLabel = "Cancel" }) {
    const modal = document.createElement("div");
    modal.className = "viewer-themed-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="viewer-themed-modal__panel">
        <div class="viewer-themed-modal__header">
          <div>
            <h2 class="viewer-themed-modal__title"></h2>
            <p class="viewer-themed-modal__copy"></p>
          </div>
          <button class="viewer-themed-modal__close" type="button" aria-label="Close" title="Close">x</button>
        </div>
        <div class="viewer-themed-modal__body"></div>
        <div class="viewer-themed-modal__actions">
          <button class="btn viewer-themed-modal__cancel" type="button"></button>
          <button class="btn primary viewer-themed-modal__submit" type="button"></button>
        </div>
      </div>
    `;
    const titleTarget = modal.querySelector(".viewer-themed-modal__title");
    const copyTarget = modal.querySelector(".viewer-themed-modal__copy");
    const submit = modal.querySelector(".viewer-themed-modal__submit");
    const cancel = modal.querySelector(".viewer-themed-modal__cancel");
    if (titleTarget instanceof HTMLElement) titleTarget.textContent = title;
    if (copyTarget instanceof HTMLElement) copyTarget.textContent = message || "";
    if (submit instanceof HTMLButtonElement) submit.textContent = submitLabel;
    if (cancel instanceof HTMLButtonElement) cancel.textContent = cancelLabel;
    document.body.appendChild(modal);
    return modal;
  }

  function showThemedInputModal({ title, message, defaultValue = "", placeholder = "", submitLabel = "OK", inputMode = "text", maxLength = 0 }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const input = document.createElement("input");
      input.className = "viewer-themed-modal__input";
      input.type = "text";
      input.value = defaultValue;
      input.placeholder = placeholder;
      input.inputMode = inputMode;
      if (maxLength > 0) input.maxLength = maxLength;
      body?.appendChild(input);
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(input.value));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter") done(input.value);
      });
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  }

  function showRequestDraftModal() {
    return new Promise((resolve) => {
      const modal = createThemedModal({
        title: "New request",
        message: "",
        submitLabel: "Create request"
      });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const fields = [
        { id: "title", label: "Title", placeholder: "Short request title", type: "input", required: false },
        { id: "intent", label: "Need", placeholder: "What should change, and why?", type: "textarea", required: true },
        { id: "context", label: "Context", placeholder: "Constraints, links, scope notes, or acceptance hints", type: "textarea", required: false }
      ];
      const controls = new Map();
      fields.forEach((field) => {
        const wrapper = document.createElement("label");
        wrapper.className = "viewer-themed-modal__field";
        const label = document.createElement("span");
        label.className = "viewer-themed-modal__label";
        label.textContent = field.label;
        const control = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        control.className = "viewer-themed-modal__input";
        control.placeholder = field.placeholder;
        if (field.type === "textarea") {
          control.rows = field.id === "intent" ? 5 : 4;
        } else {
          control.type = "text";
        }
        if (field.required) {
          control.required = true;
        }
        wrapper.append(label, control);
        body?.appendChild(wrapper);
        controls.set(field.id, control);
      });
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      const submit = () => {
        const draft = {
          title: String(controls.get("title")?.value || "").trim(),
          intent: String(controls.get("intent")?.value || "").trim(),
          context: String(controls.get("context")?.value || "").trim()
        };
        if (!draft.intent) {
          const need = controls.get("intent");
          if (need instanceof HTMLElement) {
            need.focus();
          }
          return;
        }
        done(draft);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", submit);
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          done(null);
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          submit();
        }
      });
      window.setTimeout(() => {
        const titleInput = controls.get("title");
        if (titleInput instanceof HTMLElement) {
          titleInput.focus();
        }
      }, 0);
    });
  }

  function showThemedChoiceModal({ title, message, options, value, submitLabel = "Apply" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const select = document.createElement("select");
      select.className = "viewer-themed-modal__select";
      for (const option of options) {
        const element = document.createElement("option");
        element.value = option;
        element.textContent = option;
        select.appendChild(element);
      }
      select.value = value && options.includes(value) ? value : (options[0] || "");
      body?.appendChild(select);
      const done = (nextValue) => {
        closeThemedModal(modal);
        resolve(nextValue);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(select.value));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter") done(select.value);
      });
      window.setTimeout(() => {
        select.focus();
      }, 0);
    });
  }

  function showThemedMessageModal({ title, message, submitLabel = "OK" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel, cancelLabel: "Close" });
      const cancel = modal.querySelector(".viewer-themed-modal__cancel");
      if (cancel instanceof HTMLButtonElement) cancel.hidden = true;
      const done = () => {
        closeThemedModal(modal);
        resolve();
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", done);
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", done);
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape" || event.key === "Enter") done();
      });
      window.setTimeout(() => {
        const submit = modal.querySelector(".viewer-themed-modal__submit");
        if (submit instanceof HTMLButtonElement) submit.focus();
      }, 0);
    });
  }

  function showThemedConfirmModal({ title, message, submitLabel = "Confirm", cancelLabel = "Cancel" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel, cancelLabel });
      const done = (confirmed) => {
        closeThemedModal(modal);
        resolve(Boolean(confirmed));
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(true));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(false));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(false));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(false);
        if (event.key === "Enter") done(true);
      });
      window.setTimeout(() => {
        const submit = modal.querySelector(".viewer-themed-modal__submit");
        if (submit instanceof HTMLButtonElement) submit.focus();
      }, 0);
    });
  }

  window.logicsViewerModals = {
    prompt: showThemedInputModal,
    choice: showThemedChoiceModal,
    message: showThemedMessageModal,
    confirm: showThemedConfirmModal,
    requestDraft: showRequestDraftModal
  };

  async function startDevicePairing() {
    const defaultLabel = String(window.navigator?.platform || "").trim() || "LAN device";
    const label = String(await showThemedInputModal({
      title: "Pair device",
      message: "Name this browser so the host can identify it before granting write access.",
      defaultValue: defaultLabel,
      placeholder: "Windows test",
      submitLabel: "Request PIN"
    }) || "").trim();
    if (!label) return;
    let pairingId = "";
    try {
      const startResponse = await fetch("/api/lan/pair/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const startData = await startResponse.json();
      if (!startResponse.ok || !startData.ok) {
        await showThemedMessageModal({ title: "Pairing refused", message: String(startData.error || startResponse.status) });
        return;
      }
      pairingId = String(startData.payload?.pairingId || "");
    } catch (err) {
      await showThemedMessageModal({ title: "Pairing failed", message: String(err?.message || err) });
      return;
    }
    const pin = String(await showThemedInputModal({
      title: "Enter pairing PIN",
      message: "Enter the 6-digit PIN displayed on the host terminal.",
      placeholder: "000000",
      submitLabel: "Pair device",
      inputMode: "numeric",
      maxLength: 6
    }) || "").trim();
    if (!pin) return;
    try {
      const completeResponse = await fetch("/api/lan/pair/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingId, pin, label }),
      });
      const completeData = await completeResponse.json();
      if (!completeResponse.ok || !completeData.ok) {
        await showThemedMessageModal({ title: "Pairing failed", message: String(completeData.error || completeResponse.status) });
        return;
      }
      setDeviceCredentials({
        token: String(completeData.payload?.deviceToken || ""),
        deviceId: String(completeData.payload?.deviceId || ""),
        label: String(completeData.payload?.label || label),
      });
      refreshLanBannerPairingState();
      await showThemedMessageModal({
        title: "Device paired",
        message: `Paired as ${completeData.payload?.label || label}. Write access is enabled on this device.`
      });
    } catch (err) {
      await showThemedMessageModal({ title: "Pairing failed", message: String(err?.message || err) });
    }
  }

  function refreshLanBannerPairingState() {
    const banner = document.getElementById("viewer-lan-banner");
    const pairButton = document.getElementById("viewer-lan-banner-pair");
    const pairedLabel = document.getElementById("viewer-lan-banner-paired");
    const deviceLabel = (() => {
      try { return window.localStorage.getItem(deviceLabelKey) || ""; } catch { return ""; }
    })();
    const hasDeviceToken = Boolean(getDeviceToken());
    if (banner instanceof HTMLElement && hasDeviceToken) {
      banner.hidden = true;
    }
    if (pairButton instanceof HTMLButtonElement) {
      pairButton.hidden = !window.__logicsLanRwEnabled || hasDeviceToken;
    }
    if (pairedLabel instanceof HTMLElement) {
      if (hasDeviceToken && deviceLabel) {
        pairedLabel.hidden = false;
        pairedLabel.textContent = `Paired as ${deviceLabel}`;
      } else {
        pairedLabel.hidden = true;
        pairedLabel.textContent = "";
      }
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const pairButton = document.getElementById("viewer-lan-banner-pair");
    if (pairButton instanceof HTMLButtonElement) {
      pairButton.addEventListener("click", () => { startDevicePairing(); });
    }
    refreshLanBannerPairingState();
  });

  const preferenceVersion = 1;
  const meta = () => document.getElementById("viewer-meta");
  const documentPanel = () => document.getElementById("viewer-document");
  const documentTitle = () => document.getElementById("viewer-document-title");
  const documentContent = () => document.getElementById("viewer-document-content");
  const documentStatusButton = () => document.getElementById("viewer-document-status");
  const editDocumentButton = () => document.querySelector('[data-viewer-action="edit-document"]');
  const updateBanner = () => document.getElementById("viewer-update");
  const updateCopy = () => document.getElementById("viewer-update-copy");
  const updateCommand = () => document.getElementById("viewer-update-command");
  const connectionBanner = () => document.getElementById("viewer-connection");
  const connectionCopy = () => document.getElementById("viewer-connection-copy");
  const connectionDetail = () => document.getElementById("viewer-connection-detail");
  const filterCount = () => document.getElementById("viewer-filter-count");
  const repoPill = () => document.getElementById("viewer-repo-pill");
  const projectMenu = () => document.getElementById("viewer-project-menu");
  const repoGithubLink = () => document.getElementById("viewer-repo-github");
  const repoFolderButton = () => document.getElementById("viewer-repo-folder");
  const workshopButton = () => document.getElementById("viewer-workshop");
  const ciButton = () => document.getElementById("viewer-ci");
  const autoRefreshControl = () => document.getElementById("viewer-auto-refresh");
