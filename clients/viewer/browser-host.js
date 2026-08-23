(() => {
  // clients/viewer/src/browser-host/util.js
  function activeCdxInteractionMenu() {
    return document.querySelector(".viewer-cdx__menu[open], .viewer-workshop__command-run-menu[open]");
  }
  function activityMinuteBucket(value) {
    const timestamp = Date.parse(String(value || ""));
    if (!Number.isFinite(timestamp)) {
      return "";
    }
    return new Date(Math.floor(timestamp / 6e4) * 6e4).toISOString();
  }
  function activityPanelIsOpen() {
    const panel = document.getElementById("activity-panel");
    return panel instanceof HTMLElement && !panel.hidden;
  }
  function activityRootKey(root = "") {
    return String(root || "default").trim() || "default";
  }
  function applyCdxBadge(host, selector, desiredLabel, makeHtml) {
    if (!(host instanceof HTMLElement)) return;
    const existing = host.querySelector(selector);
    const currentLabel = existing ? (existing.textContent || "").trim() : null;
    if (desiredLabel === null) {
      existing?.remove();
      return;
    }
    if (currentLabel === desiredLabel) return;
    existing?.remove();
    host.insertAdjacentHTML("beforeend", makeHtml(desiredLabel));
  }
  function applyGitDomain(domain) {
    const selected = domain || "changes";
    const diffDomains = /* @__PURE__ */ new Set(["changes", "staged", "worktree", "untracked", "history"]);
    const showDiffDetail = diffDomains.has(selected);
    document.querySelectorAll(".viewer-git__domain[data-viewer-git-domain]").forEach((node) => {
      if (node instanceof HTMLElement) {
        const active = node.getAttribute("data-viewer-git-domain") === selected;
        node.classList.toggle("is-active", active);
        node.setAttribute("aria-pressed", active ? "true" : "false");
      }
    });
    document.querySelectorAll("[data-viewer-git-panel]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.hidden = node.getAttribute("data-viewer-git-panel") !== selected;
      }
    });
    document.querySelectorAll(".viewer-git__workspace").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("has-diff-detail", showDiffDetail);
      }
    });
    document.querySelectorAll("[data-viewer-git-detail]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.hidden = !showDiffDetail;
      }
    });
  }
  function asArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.entries(value).map(([key, entry]) => ({ name: key, ...entry && typeof entry === "object" ? entry : { value: entry } }));
    }
    return [];
  }
  function cdxBadgeLabel(count) {
    if (!Number.isFinite(count) || count <= 0) return null;
    return count === 1 ? "!" : String(count);
  }
  function cdxField(item, keys, fallback = "-") {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== void 0 && value !== null && value !== "") {
        return value;
      }
    }
    return fallback;
  }
  function cdxHistoryList(payload) {
    return payload && payload.state === "ok" && Array.isArray(payload.history) ? payload.history : [];
  }
  function cdxLabel(value) {
    return String(value || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  function cdxMenuKey(menu) {
    if (!(menu instanceof HTMLElement)) {
      return "";
    }
    if (menu.id) {
      return `id:${menu.id}`;
    }
    const summaryLabel = menu.querySelector("summary")?.getAttribute("aria-label") || menu.querySelector("summary")?.getAttribute("title") || "";
    const panelLabel = menu.querySelector(".viewer-cdx__menu-panel, .viewer-workshop__command-run-menu-panel")?.getAttribute("aria-label") || "";
    const label = panelLabel || summaryLabel;
    return label ? `label:${label}` : "";
  }
  function cdxMissionActionControls() {
    return Array.from(document.querySelectorAll([
      "[data-viewer-cdx-plan]",
      "[data-viewer-cdx-run]",
      "[data-viewer-cdx-apply-plan]",
      "[data-viewer-cdx-mission-select]"
    ].join(","))).filter((node) => node instanceof HTMLElement);
  }
  function cdxMissionCatalog(payload = {}) {
    return payload.catalog || {
      missions: [
        { id: "full-audit", title: "Full audit", description: "Audit the repository, always draft a Logics request, and optionally apply fixes with a full request\u2192item\u2192task chain.", scope: "repository", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
        { id: "release-review", title: "Review since latest release", description: "Review changes since the latest release, always draft a Logics request, and optionally apply fixes with a full request\u2192item\u2192task chain.", scope: "latest-release", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
        { id: "corpus-ready", title: "Prepare dev-ready corpus", description: "Produce a corpus plan for explicit deterministic application.", scope: "open-logics-workflow", requiresPlanConfirmation: true, supportsFileWrites: false },
        { id: "wish-to-request", title: "Wish to request", description: "Create or draft a structured Logics request from a free-form wish.", scope: "request-draft", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "wishText", label: "Wish or intent", type: "textarea", required: true }] },
        { id: "pre-release", title: "Guarded pre-release", description: "Prepare release metadata, changelog, validation, and fixes without tagging or publishing.", scope: "pre-release-report", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "releaseVersion", label: "Version", type: "text", placeholder: "vX.X.X", required: true }, { id: "runFullValidation", label: "Run full validation and report fixes before pre-release", type: "checkbox" }] }
      ],
      strengths: [
        { id: "standard", label: "Standard" },
        { id: "deep", label: "Deep" },
        { id: "max", label: "Max" }
      ],
      defaultMissionId: "full-audit",
      defaultStrengthId: "standard"
    };
  }
  function cdxMissionTerminalProgressScript() {
    return [
      'mission_id="$1"',
      'session_id="$2"',
      'report_hint="$3"',
      "shift 3",
      'mode="${CDX_MISSION_PROGRESS_MODE:-compact}"',
      'start_ts="$(date +%s)"',
      'last_activity="$start_ts"',
      "last_total=0",
      'stdout_file="${TMPDIR:-/tmp}/cdx-mission-stdout-$$.log"',
      'stderr_file="${TMPDIR:-/tmp}/cdx-mission-stderr-$$.log"',
      'command_label="$1"',
      'if [ $# -ge 2 ]; then command_label="$1 $2"; fi',
      'printf "%s\\n" "[cdx mission] start mission=${mission_id:-unknown} session=${session_id:-unknown}"',
      'printf "%s\\n" "[cdx mission] report/transcript: ${report_hint:-Reports tab after completion}"',
      'printf "%s\\n" "[cdx mission] command: ${command_label:-cdx run}"',
      'printf "%s\\n" "[cdx mission] progress mode: $mode (set CDX_MISSION_PROGRESS_MODE=verbose or watch for more detail)"',
      'printf "\\n"',
      '"$@" >"$stdout_file" 2>"$stderr_file" &',
      'pid="$!"',
      'printf "%s\\n" "[cdx mission] event: process-started pid=$pid"',
      'while kill -0 "$pid" 2>/dev/null; do',
      "  sleep 5",
      '  now="$(date +%s)"',
      "  elapsed=$((now - start_ts))",
      '  stdout_bytes="$(wc -c < "$stdout_file" | tr -d " ")"',
      '  stderr_bytes="$(wc -c < "$stderr_file" | tr -d " ")"',
      "  total_bytes=$((stdout_bytes + stderr_bytes))",
      '  if [ "$total_bytes" -gt "$last_total" ]; then',
      '    last_activity="$now"',
      '    last_total="$total_bytes"',
      '    activity="output activity"',
      "  elif [ $((now - last_activity)) -ge 60 ]; then",
      '    activity="no recent activity"',
      "  else",
      '    activity="waiting on command output"',
      "  fi",
      "  idle=$((now - last_activity))",
      '  if [ "$mode" = "watch" ]; then printf "\\033[H\\033[2J"; fi',
      '  printf "%s\\n" "[cdx mission] heartbeat elapsed=${elapsed}s idle=${idle}s phase=running command=${command_label:-cdx run} active=${elapsed}s state=$activity"',
      '  if [ "$mode" = "verbose" ]; then',
      '    if [ "$stdout_bytes" -gt 0 ]; then printf "%s\\n" "[cdx mission] stdout tail:"; tail -n 5 "$stdout_file"; fi',
      '    if [ "$stderr_bytes" -gt 0 ]; then printf "%s\\n" "[cdx mission] stderr tail:"; tail -n 5 "$stderr_file"; fi',
      "  fi",
      "done",
      'wait "$pid"',
      'rc="$?"',
      'end_ts="$(date +%s)"',
      "elapsed=$((end_ts - start_ts))",
      'stdout_bytes="$(wc -c < "$stdout_file" | tr -d " ")"',
      'stderr_bytes="$(wc -c < "$stderr_file" | tr -d " ")"',
      'if [ "$rc" -eq 0 ]; then status="success"; else status="failure"; fi',
      'printf "\\n%s\\n" "[cdx mission] final status=$status exit=$rc elapsed=${elapsed}s stdout_bytes=$stdout_bytes stderr_bytes=$stderr_bytes report/transcript=${report_hint:-Reports tab after completion}"',
      'if [ "$stdout_bytes" -gt 0 ]; then',
      '  printf "%s\\n" "[cdx mission] stdout:"',
      '  cat "$stdout_file"',
      "fi",
      'if [ "$stderr_bytes" -gt 0 ]; then',
      '  printf "%s\\n" "[cdx mission] stderr tail:"',
      '  tail -n 40 "$stderr_file"',
      "fi",
      'if [ "$rc" -ne 0 ]; then printf "%s\\n" "[cdx mission] next action: inspect the terminal output and the Reports tab for the failed run."; fi',
      'rm -f "$stdout_file" "$stderr_file"',
      'exit "$rc"'
    ].join("\n");
  }
  function cdxPct(value) {
    const percent = Number(value);
    return Number.isFinite(percent) ? `${Math.max(0, Math.min(100, Math.round(percent)))}%` : "-";
  }
  function cdxPermissionValues() {
    return ["review", "default", "auto", "full"];
  }
  function cdxRemainingClass(percent) {
    if (percent === null) {
      return "neutral";
    }
    if (percent <= 10) {
      return "bad";
    }
    if (percent <= 30) {
      return "warn";
    }
    return "ok";
  }
  function cdxRemainingPct(item) {
    const value = item?.remaining_pct ?? item?.remainingPct ?? item?.available_pct ?? item?.availablePct ?? item?.lowest_available_pct ?? item?.lowestAvailablePct;
    const percent = Number(value);
    return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : null;
  }
  function cdxReportMissionOutput(report, run, taskReport) {
    const parsed = report?.parsed && typeof report.parsed === "object" ? report.parsed : {};
    const candidates = [
      report?.missionOutput,
      report?.mission_output,
      parsed.missionOutput,
      parsed.mission_output,
      run?.missionOutput,
      run?.mission_output,
      taskReport?.missionOutput,
      taskReport?.mission_output
    ];
    return candidates.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate)) || null;
  }
  function cdxReportSummary(report, taskReport, missionOutput, runError, permissionDenials) {
    const direct = taskReport?.summary || missionOutput?.summary || report?.summary || "";
    if (direct) {
      return String(direct);
    }
    if (permissionDenials.length) {
      return "Run stopped on permission checks.";
    }
    if (runError?.message) {
      return String(runError.message);
    }
    return "No summary was reported for this run.";
  }
  function cdxRunStatusDetail(run) {
    return "";
  }
  function cdxRunsList(payload) {
    return payload && payload.state === "ok" && Array.isArray(payload.runs) ? payload.runs : [];
  }
  function cdxSectionBadgeTitle(section, count) {
    if (section === "missions") {
      return count === 1 ? "1 mission run in progress" : `${count} mission runs in progress`;
    }
    if (section === "runs") {
      return count === 1 ? "1 new report" : `${count} new reports`;
    }
    return count === 1 ? "1 new history entry" : `${count} new history entries`;
  }
  function cdxStateClass(value) {
    const state = String(value || "").toLowerCase();
    if (["ready", "ok", "active", "enabled", "authenticated"].some((entry) => state.includes(entry))) {
      return "ok";
    }
    if (["starting", "pending", "running", "warning", "low", "limited", "stale"].some((entry) => state.includes(entry))) {
      return "warn";
    }
    if (["error", "failed", "disabled", "unavailable", "unauthenticated"].some((entry) => state.includes(entry))) {
      return "bad";
    }
    return "neutral";
  }
  function cdxUsageNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function ciStateFromStatus(status, conclusion) {
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const normalizedConclusion = String(conclusion || "").trim().toLowerCase();
    if (["queued", "in_progress", "waiting", "requested", "pending"].includes(normalizedStatus)) {
      return normalizedStatus === "in_progress" ? "running" : "queued";
    }
    if (normalizedConclusion === "success") return "passing";
    if (["failure", "timed_out", "action_required"].includes(normalizedConclusion)) return "failing";
    if (normalizedConclusion === "cancelled") return "cancelled";
    return "unknown";
  }
  function ciBadgeTone(value) {
    const state = String(value || "").toLowerCase();
    if (state === "passing") {
      return "passing";
    }
    if (state === "failing") {
      return "failing";
    }
    if (state === "running" || state === "queued") {
      return "running";
    }
    if (state === "cancelled") {
      return "cancelled";
    }
    if (state === "unavailable") {
      return "unavailable";
    }
    return "unknown";
  }
  function closeCdxMenus(exceptMenu = null) {
    document.querySelectorAll(".viewer-cdx__menu[open], .viewer-workshop__command-run-menu[open]").forEach((menu) => {
      if (exceptMenu && menu === exceptMenu) {
        return;
      }
      menu.removeAttribute("open");
    });
  }
  function closeThemedModal(modal) {
    if (!(modal instanceof HTMLElement)) return;
    const opener = modal.__logicsOpener;
    modal.remove();
    if (opener instanceof HTMLElement && opener.isConnected && typeof opener.focus === "function") {
      opener.focus();
    }
  }
  function collectHealthFindings(lintData, auditData) {
    const findings = [];
    const append = (source, payload) => {
      const canonicalEntries = Array.isArray(payload?.findings) ? payload.findings : [
        ...Array.isArray(payload?.issues) ? payload.issues : [],
        ...Array.isArray(payload?.warnings) ? payload.warnings : []
      ];
      const seen = /* @__PURE__ */ new Set();
      canonicalEntries.forEach((entry) => {
        const key = `${entry?.path || ""}
${entry?.code || ""}
${entry?.message || ""}`;
        seen.add(key);
        findings.push({ source, ...entry });
      });
      const strictEntries = Array.isArray(payload?.strict) ? payload.strict : [];
      strictEntries.forEach((entry) => {
        const key = `${entry?.path || ""}
${entry?.code || ""}
${entry?.message || ""}`;
        if (!seen.has(key)) {
          findings.push({ source, ...entry });
        }
      });
    };
    append("lint", lintData.payload || {});
    append("audit", auditData.payload || {});
    return findings;
  }
  async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
  function countBy(items, selector) {
    return items.reduce((acc, item) => {
      const key = selector(item) || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
  function countPayloadEntries(payload, keys) {
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) {
        return payload[key].length;
      }
      if (typeof payload?.[key] === "number") {
        return payload[key];
      }
    }
    return 0;
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
          <button class="viewer-themed-modal__close" type="button" aria-label="Close" title="Close">&#215;</button>
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
    modal.__logicsOpener = document.activeElement;
    document.body.appendChild(modal);
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(modal.querySelectorAll(
        "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )).filter((node) => !node.disabled && node.getAttribute("tabindex") !== "-1");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    });
    return modal;
  }
  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value ?? "").replace(/["\\]/g, "\\$&");
  }
  function currentGitViewState() {
    const activeDomain = document.querySelector(".viewer-git__domain.is-active[data-viewer-git-domain]");
    const activeFile = document.querySelector(".viewer-git__file.is-active[data-viewer-git-file]");
    return {
      domain: activeDomain instanceof HTMLElement ? activeDomain.getAttribute("data-viewer-git-domain") || "changes" : "changes",
      path: activeFile instanceof HTMLElement ? activeFile.getAttribute("data-viewer-git-file") || "" : "",
      cached: activeFile instanceof HTMLElement && activeFile.getAttribute("data-viewer-git-cached") === "1"
    };
  }
  function describeDocumentScreen(titleText) {
    const title = String(titleText || "").trim();
    if (!title) return "";
    const exact = {
      "Getting Started": "Logics workflow guide",
      "Remote": "Git status, CI runs, and release gates",
      // item_757: this named three of the screen's four tabs, and the one it left out --
      // Runbooks -- is the one the review found unfinished.
      "Workshop": "Terminals, commands, runbooks, and file explorer",
      "Validation health": "Lint and audit summary",
      "Corpus insights": "Workflow corpus dashboard",
      "CDX status": "Configured agents and runtime checks",
      "CDX missions": "Guided missions and plans",
      "CDX reports": "Recent CDX session reports",
      "CDX run report": "Run summary and logs",
      "CDX log": "Streaming log output"
    };
    if (exact[title]) return exact[title];
    if (title.startsWith("CDX log")) return "Streaming log output";
    if (title.startsWith("logics/request/")) return "Logics request";
    if (title.startsWith("logics/task/")) return "Logics task";
    if (title.startsWith("logics/backlog")) return "Logics backlog";
    if (title.endsWith(".md")) return "Logics document";
    return "";
  }
  function downloadBase64File(base64, filename) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  async function fetchProjectPickerTree(path = "") {
    const response = await fetch(`/api/project-picker-tree?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to browse folders.");
    }
    return data.payload || {};
  }
  async function fetchWorkspacePreview(path = "", { full = false } = {}) {
    const query = `path=${encodeURIComponent(path)}${full ? "&full=1" : ""}`;
    const response = await fetch(`/api/workspace-preview?${query}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load workspace preview.");
    }
    return data.payload;
  }
  async function fetchWorkspaceTree(path = "") {
    const response = await fetch(`/api/workspace-tree?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load workspace tree.");
    }
    return data.payload;
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === "string" ? result.split(",")[1] || "" : "";
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  }
  function findGitFileButton(path, cached) {
    return Array.from(document.querySelectorAll("[data-viewer-git-file]")).find((node) => node instanceof HTMLElement && node.getAttribute("data-viewer-git-file") === path && node.getAttribute("data-viewer-git-cached") === "1" === Boolean(cached)) || null;
  }
  function formatCdxCredits(value) {
    const text = String(value ?? "").trim();
    if (!text || text === "-") {
      return "-";
    }
    const number = Number(text);
    return Number.isFinite(number) ? number.toFixed(2) : text;
  }
  function formatCdxDuration(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) {
      return "-";
    }
    const totalSeconds = Math.round(value / 1e3);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
  function formatCdxTokenUsage(usage) {
    if (!usage) {
      return "";
    }
    const total = usage.totalTokens ?? "-";
    const input = usage.inputTokens ?? "-";
    const output = usage.outputTokens ?? "-";
    return `${total} total \xB7 ${input} in \xB7 ${output} out`;
  }
  function formatCiDate(value) {
    const timestamp = Date.parse(String(value || ""));
    if (!Number.isFinite(timestamp)) {
      return "";
    }
    return new Date(timestamp).toLocaleString();
  }
  function formatConnectionTime(timestamp) {
    if (!timestamp) {
      return "No successful sync yet";
    }
    return `Last successful sync ${new Date(timestamp).toLocaleTimeString()}`;
  }
  function formatGitHistoryCount(payload) {
    const count = Array.isArray(payload?.recentCommits) ? payload.recentCommits.length : payload?.latestCommit ? 1 : 0;
    return `${count}${payload?.recentCommitsHasMore ? "+" : ""}`;
  }
  function formatCiDuration(startIso, endIso) {
    const start = Date.parse(startIso || "");
    const end = Date.parse(endIso || "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "";
    const seconds = Math.round((end - start) / 1e3);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  function formatCiAgo(iso) {
    const stamp = Date.parse(iso || "");
    if (!Number.isFinite(stamp)) return "";
    return formatRelativeTime(stamp);
  }
  function formatRelativeTime(timestamp) {
    const diffMs = timestamp - Date.now();
    const absMs = Math.abs(diffMs);
    const minutes = Math.round(absMs / 6e4);
    if (minutes < 1) {
      return diffMs >= 0 ? "now" : "just now";
    }
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    let body = "";
    if (days > 0) {
      body = `${days}d${remainingHours > 0 ? ` ${remainingHours}h` : ""}`;
    } else if (hours > 0) {
      body = `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    } else {
      body = `${minutes}m`;
    }
    return diffMs >= 0 ? `in ${body}` : `${body} ago`;
  }
  function gitCommitModalEntries(payload) {
    const labels = {
      staged: "Staged",
      modified: "Modified",
      deleted: "Deleted",
      renamed: "Renamed",
      untracked: "Untracked"
    };
    const entries = [];
    const seen = /* @__PURE__ */ new Set();
    for (const key of ["staged", "modified", "deleted", "renamed", "untracked"]) {
      const group = Array.isArray(payload?.groups?.[key]) ? payload.groups[key] : [];
      for (const entry of group) {
        const path = String(entry?.path || "").trim();
        if (!path || seen.has(path)) continue;
        seen.add(path);
        entries.push({
          path,
          from: String(entry?.from || "").trim(),
          group: labels[key] || key
        });
      }
    }
    return entries;
  }
  function hasLinks(item) {
    return (item.references || []).length > 0 || (item.usedBy || []).length > 0;
  }
  function hasMissingOrAmbiguousStatus(item) {
    const rawStatus = String(item?.indicators?.Status || "").trim();
    if (!rawStatus) {
      return true;
    }
    const normalized = rawStatus.toLowerCase();
    return ![
      "draft",
      "ready",
      "in progress",
      "blocked",
      "done",
      "active",
      "proposed",
      "accepted",
      "validated",
      "rejected",
      "superseded",
      "settled",
      "archived",
      "obsolete"
    ].includes(normalized);
  }
  function isAbortError(error) {
    return Boolean(error) && (error.name === "AbortError" || error.code === 20);
  }
  function isSafeLogicsDocPath(value) {
    const path = String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").trim();
    if (!path || path.startsWith("/") || path.startsWith("~") || /^[A-Za-z]:/.test(path)) {
      return false;
    }
    if (path.split("/").includes("..") || !path.endsWith(".md")) {
      return false;
    }
    return [
      "logics/request/",
      "logics/backlog/",
      "logics/tasks/",
      "logics/product/",
      "logics/roadmap/",
      "logics/architecture/",
      "logics/specs/"
    ].some((prefix) => path.startsWith(prefix));
  }
  function markdownApi() {
    if (typeof window.createCdxLogicsMarkdownApi === "function") {
      return window.createCdxLogicsMarkdownApi();
    }
    return null;
  }
  function navMenuItem(target) {
    return Array.from(document.querySelectorAll("[data-viewer-nav-target]")).find((item) => item.getAttribute("data-viewer-nav-target") === target) || null;
  }
  function normalizeCapabilities(payload) {
    const capabilities = payload?.capabilities && typeof payload.capabilities === "object" ? payload.capabilities : {};
    return {
      logics: capabilities.logics || { state: "ready", available: true, message: "" },
      workspace: capabilities.workspace || { state: "ready", available: true, message: "" },
      workshop: capabilities.workshop || { state: "missing", available: false, message: "" },
      git: capabilities.git || { state: "ready", available: true, message: "" },
      ci: capabilities.ci || { state: "ready", available: true, message: "" },
      cdx: capabilities.cdx || { state: "ready", available: true, message: "" },
      cdxRuns: capabilities.cdxRuns || { state: "unsupported", available: false, message: "" },
      i18n: capabilities.i18n || { state: "hidden", available: false, message: "" },
      theme: capabilities.theme || { state: "hidden", available: false, message: "" }
    };
  }
  function normalizeFocusTarget(value) {
    const normalized = String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").replace(/^\//, "").trim();
    if (!normalized || normalized.startsWith("~") || /^[A-Za-z]:/.test(normalized)) {
      return "";
    }
    if (normalized.split("/").includes("..")) {
      return "";
    }
    return normalized;
  }
  function normalizeGitBadgeCounts(payload) {
    const counts = payload && typeof payload === "object" ? payload.badgeCounts || {} : {};
    return {
      unpushedCommits: Math.max(0, Number(counts.unpushedCommits || payload?.ahead || 0)),
      unpulledCommits: Math.max(0, Number(counts.unpulledCommits || payload?.behind || 0)),
      uncommittedFiles: Math.max(0, Number(counts.uncommittedFiles || 0))
    };
  }
  function numericValues(values) {
    return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }
  function objectEntries(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : [];
  }
  function parseCdxDate(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return null;
    }
    const shortDate = raw.match(/^([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{1,2}:\d{2})$/);
    if (shortDate) {
      const year = (/* @__PURE__ */ new Date()).getFullYear();
      const timestamp2 = Date.parse(`${shortDate[1]} ${shortDate[2]} ${year} ${shortDate[3]}`);
      return Number.isFinite(timestamp2) ? timestamp2 : null;
    }
    const timestamp = Date.parse(raw);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
    return null;
  }
  function parseCdxLogJson(content) {
    const raw = String(content || "").trim();
    if (!raw) {
      return null;
    }
    try {
      return { kind: "json", value: JSON.parse(raw) };
    } catch {
    }
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      return null;
    }
    const values = [];
    for (const line of lines) {
      try {
        values.push(JSON.parse(line));
      } catch {
        return null;
      }
    }
    return { kind: "jsonl", value: values };
  }
  function pickFirstObject(status, keys) {
    for (const key of keys) {
      if (status?.[key] && typeof status[key] === "object" && !Array.isArray(status[key])) {
        return status[key];
      }
    }
    return {};
  }
  function primaryActionControls() {
    return Array.from(document.querySelectorAll([
      "#viewer-bootstrap-logics",
      "#viewer-restart-server",
      "#viewer-repo-folder",
      "#viewer-document-status",
      "#viewer-release-reset",
      '[data-action="getting-started"]',
      '[data-action="refresh"]',
      '[data-viewer-action="edit-document"]',
      "[data-viewer-project-id]",
      // item_795 follow-up, reported as "Runbooks takes a long time": navigation used to be
      // disabled while a screen loaded, so clicking another screen did nothing at all -- a
      // disabled button does not even fire, so there was no click to refuse and no message
      // to read. The operator was left on the screen they were leaving, which then announced
      // that *it* had loaded. Opening another screen supersedes the load in flight, so these
      // stay live; the busy state still disables the actions that mutate something.
      "[data-viewer-cdx-session-action]",
      "[data-viewer-cdx-report]",
      "[data-viewer-cdx-artifact-path]"
    ].join(","))).filter((node) => node instanceof HTMLElement);
  }
  function projectPreferenceId(project) {
    return String(project?.id || project?.root || project?.name || "");
  }
  function projectStateLabel(project, state = null) {
    if (project?.available === false) {
      return "missing";
    }
    if (project?.hasLogics === false) {
      return "no Logics";
    }
    if (state && state.ok === false) {
      return project?.active ? "current" : "unreadable";
    }
    if (state && state.hasLogics !== false) {
      const parts = [`${state.openCount ?? 0} open`];
      if (state.issueCount) {
        parts.push(`${state.issueCount} issue${state.issueCount === 1 ? "" : "s"}`);
      }
      if (state.staleCount) {
        parts.push(`${state.staleCount} stale`);
      }
      return project?.active ? `current \xB7 ${parts.join(" \xB7 ")}` : parts.join(" \xB7 ");
    }
    if (project?.active) {
      return "current";
    }
    return "available";
  }
  function releaseBadgeTone(value) {
    const state = String(value || "").toLowerCase();
    if (["ready", "passed"].includes(state)) {
      return "passing";
    }
    if (["blocked", "failed", "stale"].includes(state)) {
      return "failing";
    }
    if (["pending", "planning", "preparing", "local_validation", "commit_ready", "pushed", "ci_verification", "github_release", "external_publication"].includes(state)) {
      return "running";
    }
    return "unknown";
  }
  function releaseWorkshopTerminalObserver(entry) {
    if (entry?.resizeObserver) {
      try {
        entry.resizeObserver.disconnect();
      } catch {
      }
      entry.resizeObserver = null;
    }
    if (entry?.resizeRaf) {
      cancelAnimationFrame(entry.resizeRaf);
      entry.resizeRaf = 0;
    }
  }
  function renderCdxModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes" role="tablist" aria-label="CDX views">
        <button class="viewer-cdx__mode${active === "status" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="status" aria-selected="${active === "status" ? "true" : "false"}">Sessions</button>
        <button class="viewer-cdx__mode${active === "missions" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="missions" aria-selected="${active === "missions" ? "true" : "false"}">Missions</button>
        <button class="viewer-cdx__mode${active === "runs" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="runs" aria-selected="${active === "runs" ? "true" : "false"}">Reports</button>
        <button class="viewer-cdx__mode${active === "history" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="history" aria-selected="${active === "history" ? "true" : "false"}">History</button>
        <button class="viewer-cdx__mode${active === "memory" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="memory" aria-selected="${active === "memory" ? "true" : "false"}">Memory</button>
        <button class="viewer-cdx__mode${active === "disk" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="disk" aria-selected="${active === "disk" ? "true" : "false"}">Disk</button>
      </div>
    `;
  }
  function renderCiModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes viewer-ci__modes" role="tablist" aria-label="Git and CI views">
        <button class="viewer-cdx__mode${active === "git" ? " is-active" : ""}" type="button" data-viewer-ci-mode="git" aria-selected="${active === "git" ? "true" : "false"}">Git</button>
        <button class="viewer-cdx__mode${active === "runs" ? " is-active" : ""}" type="button" data-viewer-ci-mode="runs" aria-selected="${active === "runs" ? "true" : "false"}">CI</button>
        <button class="viewer-cdx__mode${active === "release" ? " is-active" : ""}" type="button" data-viewer-ci-mode="release" aria-selected="${active === "release" ? "true" : "false"}">Release</button>
      </div>
    `;
  }
  function renderCorpusModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes viewer-corpus__modes" role="tablist" aria-label="Corpus views">
        <button class="viewer-cdx__mode${active === "getting-started" ? " is-active" : ""}" type="button" data-viewer-corpus-mode="getting-started" aria-selected="${active === "getting-started" ? "true" : "false"}">Getting Started</button>
        <button class="viewer-cdx__mode${active === "insights" ? " is-active" : ""}" type="button" data-viewer-corpus-mode="insights" aria-selected="${active === "insights" ? "true" : "false"}">Insights</button>
        <button class="viewer-cdx__mode${active === "health" ? " is-active" : ""}" type="button" data-viewer-corpus-mode="health" aria-selected="${active === "health" ? "true" : "false"}">Health</button>
      </div>
    `;
  }
  var ENVIRONMENT_WARNING_DISMISS_KEY = "logics.viewer.environmentWarningDismissed";
  function environmentWarningSignature(warning) {
    return `${warning.title || ""}::${warning.message || ""}`;
  }
  function dismissEnvironmentWarning(warning) {
    try {
      window.sessionStorage.setItem(ENVIRONMENT_WARNING_DISMISS_KEY, environmentWarningSignature(warning));
    } catch {
    }
    const banner = document.getElementById("viewer-environment-warning");
    if (banner instanceof HTMLElement) banner.hidden = true;
  }
  function environmentWarningIsDismissed(warning) {
    try {
      return window.sessionStorage.getItem(ENVIRONMENT_WARNING_DISMISS_KEY) === environmentWarningSignature(warning);
    } catch {
      return false;
    }
  }
  var UPDATE_WARNING_DISMISS_KEY = "logics.viewer.updateWarningDismissed";
  function updateWarningSignature(duplicates) {
    return (duplicates || []).join(",");
  }
  function dismissUpdateWarning(duplicates) {
    try {
      window.sessionStorage.setItem(UPDATE_WARNING_DISMISS_KEY, updateWarningSignature(duplicates));
    } catch {
    }
    const banner = document.getElementById("viewer-update");
    if (banner instanceof HTMLElement) banner.hidden = true;
  }
  function renderEnvironmentWarning(warning) {
    const banner = document.getElementById("viewer-environment-warning");
    if (!(banner instanceof HTMLElement)) return;
    if (!warning || typeof warning !== "object" || !warning.message) {
      banner.hidden = true;
      return;
    }
    if (environmentWarningIsDismissed(warning)) {
      banner.hidden = true;
      return;
    }
    const titleEl = document.getElementById("viewer-environment-warning-title");
    const copyEl = document.getElementById("viewer-environment-warning-copy");
    const actionEl = document.getElementById("viewer-environment-warning-action");
    if (titleEl) titleEl.textContent = warning.title || "Environment warning";
    if (copyEl) copyEl.textContent = warning.message;
    if (actionEl) actionEl.hidden = warning.action !== "bootstrap-logics";
    banner.hidden = false;
  }
  function restoreDocumentViewState(content, state) {
    if (!state) return;
    if (state.openDetails.length) {
      const wanted = new Set(state.openDetails);
      content.querySelectorAll("details").forEach((node) => {
        const summary = (node.querySelector("summary")?.textContent || "").trim();
        if (summary && wanted.has(summary)) node.open = true;
      });
    }
    if (state.focusKey) {
      const target = content.querySelector(state.focusKey);
      if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
    }
    if (state.scroller) state.scroller.scrollTop = state.scrollTop;
  }
  function scrollableAncestor(el) {
    let node = el;
    while (node && node !== document.body && node.parentElement) {
      const overflowY = window.getComputedStyle(node).overflowY || "";
      if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement || el;
  }
  function setActiveGitFile(button) {
    document.querySelectorAll("[data-viewer-git-file]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("is-active", node === button);
      }
    });
  }
  function setButtonAvailable(button, title) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.title = title;
  }
  function setButtonUnavailable(button, message) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.title = message;
  }
  function setControlValue(id, value, eventName) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      element.checked = Boolean(value);
    } else if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
      element.value = String(value ?? "");
    }
    element.dispatchEvent(new Event(eventName, { bubbles: true }));
  }
  function setDocumentChromeOpen(open) {
    document.body?.classList.toggle("viewer-screen-document", Boolean(open));
  }
  function setNavMenuOpen(wrapper, open) {
    document.querySelectorAll(".viewer-nav-menu.is-open").forEach((el) => {
      if (el === wrapper && open) return;
      el.classList.remove("is-open");
      el.querySelector(".btn")?.setAttribute("aria-expanded", "false");
    });
    if (!(wrapper instanceof HTMLElement) || !open) {
      return;
    }
    wrapper.classList.add("is-open");
    wrapper.querySelector(".btn")?.setAttribute("aria-expanded", "true");
  }
  function showCdxFormStatus(el, type, message) {
    if (!el) return;
    el.hidden = false;
    el.className = `viewer-cdx__form-status viewer-cdx__form-status--${type}`;
    el.textContent = message;
  }
  function showMermaidFallback(message) {
    document.querySelectorAll(".markdown-preview__mermaid-fallback").forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      node.hidden = false;
      if (message) {
        node.textContent = message;
      }
    });
  }
  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }
  function statusValue(item) {
    return String(item?.indicators?.Status || "").toLowerCase();
  }
  function updateDocumentHeaderNav(content) {
    const nav = document.getElementById("viewer-document-nav");
    if (!(nav instanceof HTMLElement)) {
      return;
    }
    nav.replaceChildren();
    const tablist = content?.querySelector(".viewer-workshop__tabs, .viewer-cdx__modes");
    if (!(tablist instanceof HTMLElement)) {
      nav.hidden = true;
      return;
    }
    tablist.closest(".viewer-workshop, .viewer-cdx")?.classList.add("viewer-screen-tabs-external");
    nav.appendChild(tablist);
    nav.hidden = false;
  }
  function updatedWithin(item, days) {
    const timestamp = Date.parse(item.updatedAt || "") || 0;
    return timestamp > 0 && timestamp >= Date.now() - days * 24 * 60 * 60 * 1e3;
  }
  function workshopTerminalListNode() {
    return document.querySelector("[data-viewer-workshop-terminal-list]");
  }
  function workshopTerminalPreferredFontSize() {
    const width = window.innerWidth || document.documentElement?.clientWidth || 0;
    if (width <= 360) return 6;
    if (width <= 420) return 7;
    if (width <= 560) return 8;
    if (width <= 700) return 9;
    if (width <= 900) return 10;
    return 12;
  }
  function workshopTerminalStageNode() {
    return document.querySelector("[data-viewer-workshop-terminal-stage]");
  }
  function workspaceEntryIcon(kind, ignored) {
    if (kind === "directory") {
      return ignored ? '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 4h4l1 1h7v8H2V4Zm9.5 3.2L9.7 9l1.8 1.8-.7.7L9 9.7l-1.8 1.8-.7-.7L8.3 9 6.5 7.2l.7-.7L9 8.3l1.8-1.8.7.7Z"/></svg>' : '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 4h4l1 1h7v8H2V4Z"/></svg>';
    }
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 2h6l3 3v9H4V2Zm6 0v3h3"/></svg>';
  }
  function workspaceParentPath(path) {
    const parts = String(path || "").split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
  }
  function applyReadingLayout(content) {
    if (!(content instanceof HTMLElement)) return null;
    const headings = Array.from(content.querySelectorAll(":scope > h1, :scope > h2"));
    const listed = headings.length >= 3 ? headings : [];
    const prose = document.createElement("div");
    prose.className = "markdown-preview__prose";
    prose.append(...Array.from(content.childNodes));
    content.replaceChildren(prose);
    content.classList.add("markdown-preview--reading");
    if (!listed.length) {
      content.classList.remove("markdown-preview--with-contents");
      return null;
    }
    const nav = document.createElement("nav");
    nav.className = "markdown-preview__contents";
    nav.setAttribute("aria-label", "Document sections");
    const heading = document.createElement("div");
    heading.className = "markdown-preview__contents-title";
    heading.textContent = `${listed.length} sections`;
    nav.appendChild(heading);
    const list = document.createElement("ol");
    list.className = "markdown-preview__contents-list";
    listed.forEach((section, index) => {
      if (!section.id) section.id = `doc-section-${index + 1}`;
      const entry = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${section.id}`;
      link.textContent = (section.textContent || "").trim() || `Section ${index + 1}`;
      link.dataset.section = section.id;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        section.scrollIntoView({ block: "start", behavior: "smooth" });
      });
      entry.appendChild(link);
      list.appendChild(entry);
    });
    nav.appendChild(list);
    content.appendChild(nav);
    content.classList.add("markdown-preview--with-contents");
    return trackReadingPosition(content, listed);
  }
  function trackReadingPosition(content, sections) {
    const links = new Map(Array.from(content.querySelectorAll(".markdown-preview__contents-list a")).map((link) => [link.dataset.section, link]));
    const mark = () => {
      const top = content.getBoundingClientRect().top;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top - top <= 8) current = section;
      }
      for (const [id, link] of links) {
        const active = Boolean(current) && id === current.id;
        link.classList.toggle("is-current", active);
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      }
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(mark);
    else mark();
    content.addEventListener("scroll", mark, { passive: true });
    return () => content.removeEventListener("scroll", mark);
  }
  function slugifyViewerDoc(text) {
    const slug = String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return slug.slice(0, 80) || "cdx_code_review_findings";
  }
  function previewRequestPath({ title, intent, nextNumber }) {
    const effectiveTitle = String(title || "").trim() || String(intent || "").split("\n")[0].trim().slice(0, 80) || "New request";
    const number = Number.isInteger(nextNumber) && nextNumber >= 0 ? String(nextNumber).padStart(3, "0") : "";
    const ref = number ? `req_${number}_${slugifyViewerDoc(effectiveTitle)}` : `req_<next>_${slugifyViewerDoc(effectiveTitle)}`;
    return `logics/request/${ref}.md`;
  }
  function installViewerHints(root = document) {
    let bubble = null;
    const GAP = 6;
    const hide = () => bubble?.classList.remove("is-visible");
    const show = (trigger) => {
      const text = trigger.getAttribute("data-viewer-hint") || "";
      if (!text) return;
      if (!bubble) {
        bubble = document.createElement("div");
        bubble.className = "viewer-hint";
        bubble.setAttribute("aria-hidden", "true");
        document.body.appendChild(bubble);
      }
      bubble.textContent = text;
      bubble.classList.add("is-visible");
      bubble.style.left = "0px";
      bubble.style.top = "0px";
      const anchor = trigger.getBoundingClientRect();
      const box = bubble.getBoundingClientRect();
      const below = anchor.bottom + GAP;
      const top = below + box.height > window.innerHeight - GAP ? anchor.top - box.height - GAP : below;
      const left = Math.min(Math.max(GAP, anchor.left), window.innerWidth - box.width - GAP);
      bubble.style.left = `${Math.round(left)}px`;
      bubble.style.top = `${Math.round(Math.max(GAP, top))}px`;
    };
    const triggerFrom = (target) => target instanceof Element ? target.closest("[data-viewer-hint]") : null;
    root.addEventListener("pointerover", (event) => {
      const trigger = triggerFrom(event.target);
      if (trigger) show(trigger);
      else hide();
    });
    root.addEventListener("pointerdown", hide);
    root.addEventListener("focusin", (event) => {
      const trigger = triggerFrom(event.target);
      if (trigger) show(trigger);
      else hide();
    });
    root.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, true);
  }
  function shortDocumentRef(id, stage) {
    const prefixByStage = {
      request: "R",
      backlog: "I",
      task: "T",
      product: "P",
      roadmap: "M",
      architecture: "A",
      spec: "S",
      // item_817: runbooks are on the board now, and `run_002` fell through to its own
      // first letter -- the same "R" a request already uses, so R002 and R365 read as the
      // same kind. Roadmap solved this the same way when it could not have "R" either.
      runbook: "N"
    };
    const key = String(stage || "").trim();
    const prefix = prefixByStage[key] || (key ? key.slice(0, 1).toUpperCase() : "");
    const raw = String(id || "");
    const match = raw.match(/^[a-z]+_(\d+)/i) || raw.match(/(\d+)/);
    if (!prefix || !match) return "";
    return `${prefix}${String(match[1] || "").padStart(3, "0")}`;
  }

  // clients/viewer/src/browser-host/diagnostics.js
  function errorMessage(error) {
    if (error instanceof Error && error.message) return error.message;
    if (error && typeof error === "object" && "message" in error) return String(error.message || error);
    return String(error || "Unknown viewer error");
  }
  function createViewerDiagnostics(options) {
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
      updateDocumentHeaderNav: updateDocumentHeaderNav2,
      renderMermaidDiagrams
    } = options;
    const errorLogKey = "logics.localViewer.errors";
    const breadcrumbKeyPrefix = "logics.localViewer.breadcrumbs";
    let lastHealthyDocument = null;
    let documentCheckScheduled = false;
    let documentRecoveryInProgress = false;
    let boardCheckScheduled = false;
    const recentFailures = /* @__PURE__ */ new Map();
    let openCircuitFingerprint = "";
    const sessionId = typeof window.crypto?.randomUUID === "function" ? window.crypto.randomUUID() : `viewer-${Date.now()}-${Array.from(window.crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    let heartbeatTimer = 0;
    const breadcrumbKey = `${breadcrumbKeyPrefix}.${sessionId}`;
    const breadcrumbs = [];
    function writeBreadcrumbBlob(clean) {
      try {
        window.localStorage.setItem(breadcrumbKey, JSON.stringify({ sessionId, clean, touchedAt: Date.now(), entries: breadcrumbs }));
      } catch {
      }
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
      } catch {
      }
      for (const key of foreignKeys) {
        let prior = null;
        try {
          prior = JSON.parse(window.localStorage.getItem(key) || "null");
        } catch {
        }
        const unclean = prior?.clean !== true && Array.isArray(prior?.entries) && prior.entries.length > 0;
        if (unclean && Date.now() - Number(prior?.touchedAt || 0) < 3e4) continue;
        if (unclean) {
          const entry = {
            at: (/* @__PURE__ */ new Date()).toISOString(),
            kind: "prior-session-breadcrumbs",
            message: `Previous session ${prior.sessionId || key} ended uncleanly; last operation: ${prior.entries.at(-1)?.label || "?"} (wasDiscarded=${document.wasDiscarded === true})`,
            sessionId: String(prior.sessionId || ""),
            browser: navigator.userAgent,
            // The server whitelists entry fields, so the trail rides in `stack`
            // (accepted up to 12k chars) instead of a custom field.
            stack: prior.entries.map((item) => `${new Date(item.t).toISOString()} ${item.label}`).join("\n"),
            ...state()
          };
          Promise.resolve(postDiagnostic?.("/api/viewer-diagnostics", { entry })).catch(() => {
          });
        }
        try {
          window.localStorage.removeItem(key);
        } catch {
        }
      }
    }
    try {
      new PerformanceObserver((list) => {
        for (const item of list.getEntries()) {
          if (item.duration >= 200) breadcrumb(`longtask ${Math.round(item.duration)}ms`);
        }
      }).observe({ entryTypes: ["longtask"] });
    } catch {
    }
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
        metadata = { ...metadata, ...getMetadata?.() || {} };
      } catch {
      }
      const baseEntry = {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        kind: String(details.kind || "runtime-error"),
        message: errorMessage(error),
        stack: error instanceof Error && error.stack ? error.stack : "",
        ...state(),
        ...metadata,
        ...details
      };
      const fingerprintSource = `${baseEntry.kind}
${baseEntry.message}
${baseEntry.stack.split("\n", 1)[0] || ""}`;
      const fingerprint = details.fingerprint || Array.from(fingerprintSource).reduce(
        (hash, char) => hash * 31 + char.charCodeAt(0) >>> 0,
        2166136261
      ).toString(16).padStart(8, "0");
      const previousEntries = lastErrors();
      const previous = previousEntries.at(-1);
      const count = previous?.fingerprint === fingerprint ? Number(previous.count || 1) + 1 : 1;
      const entry = { ...baseEntry, fingerprint, count };
      try {
        const next = previous?.fingerprint === fingerprint ? previousEntries.slice(0, -1).concat({ ...previous, ...entry, at: previous.at, lastAt: entry.at }) : previousEntries.concat(entry);
        window.localStorage.setItem(errorLogKey, JSON.stringify(next.slice(-20)));
      } catch {
      }
      Promise.resolve(postDiagnostic?.("/api/viewer-diagnostics", { entry })).catch(() => {
      });
      try {
        console.error("[logics-viewer]", entry.message, error);
      } catch {
      }
      setMeta(`Viewer error: ${entry.message}`);
      const now = Date.now();
      const failures = (recentFailures.get(fingerprint) || []).filter((timestamp) => now - timestamp <= 6e4);
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
        updateDocumentHeaderNav2(content);
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
    const documentObserver = typeof MutationObserver === "function" && getContent() ? new MutationObserver(() => {
      if (documentCheckScheduled || documentRecoveryInProgress) return;
      documentCheckScheduled = true;
      queueMicrotask(recoverBlankDocument);
    }) : null;
    documentObserver?.observe(getContent(), { childList: true });
    const boardObserver = typeof MutationObserver === "function" && getBoard() ? new MutationObserver(() => {
      if (boardCheckScheduled) return;
      boardCheckScheduled = true;
      queueMicrotask(() => {
        boardCheckScheduled = false;
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
    }) : null;
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
      return Promise.resolve(postDiagnostic?.("/api/viewer-diagnostics/session", sessionPayload(event), { keepalive })).catch(() => {
      });
    }
    function startSessionHeartbeat() {
      if (heartbeatTimer) return;
      postSession("start");
      heartbeatTimer = window.setInterval(() => {
        postSession("heartbeat");
        checkBlankUi();
        writeBreadcrumbBlob(false);
        reportStaleBreadcrumbTrails();
      }, 1e4);
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

  // clients/viewer/src/browser-host/constants.js
  var stateKey = "logics.localViewer.state";
  var preferenceKey = "logics.localViewer.preferences.v1";
  var lanTokenKey = "logics.lan.token";
  var deviceTokenKey = "logics.lan.deviceToken";
  var deviceIdKey = "logics.lan.deviceId";
  var deviceLabelKey = "logics.lan.deviceLabel";
  var preferenceVersion = 1;
  var activityStorageLimit = 80;
  var gitHistoryPageSize = 10;
  var minAutoRefreshIntervalSeconds = 5;
  var maxAutoRefreshIntervalSeconds = 60;
  var defaultAutoRefreshIntervalMs = 15 * 1e3;
  var defaultFilterState = {
    focus: "all",
    type: "all",
    status: "any",
    relation: "any",
    activity: "any"
  };
  var cdxStatusColumns = [
    { id: "session", label: "SESSION" },
    { id: "provider", label: "PROV." },
    { id: "status", label: "STATUS" },
    { id: "auth", label: "AUTH" },
    { id: "permission", label: "PERM." },
    { id: "ok", label: "OK" },
    { id: "remaining5h", label: "5H" },
    { id: "remainingWeek", label: "WEEK" },
    { id: "banked", label: "BANKED" },
    { id: "block", label: "BLOCK", defaultVisible: false },
    { id: "credits", label: "CR", defaultVisible: false },
    { id: "reset5h", label: "RESET 5H" },
    { id: "resetWeek", label: "RESET WEEK" },
    { id: "updated", label: "UPDATED" }
  ];
  var cdxRunColumns = [
    { id: "run", label: "RUN" },
    { id: "status", label: "STATUS" },
    { id: "kind", label: "KIND", defaultVisible: false },
    { id: "session", label: "SESSION" },
    { id: "tokens", label: "TOKENS" },
    { id: "cwd", label: "CWD", defaultVisible: false },
    { id: "report", label: "REPORT" }
  ];
  var cdxHistoryColumns = [
    { id: "session", label: "SESSION" },
    { id: "status", label: "STATUS" },
    { id: "action", label: "ACTION" },
    { id: "started", label: "STARTED" },
    { id: "duration", label: "DURATION" },
    { id: "tokens", label: "TOKENS" },
    { id: "artifacts", label: "ARTIFACTS" }
  ];
  var statusOptionsByStage = {
    request: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    backlog: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    task: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    product: ["Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    roadmap: ["Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    architecture: ["Draft", "Proposed", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    spec: ["Draft", "Ready", "In progress", "Done", "Validated", "Settled", "Archived"],
    runbook: ["Draft", "Active", "Archived"]
  };
  var onboardingStages = [
    {
      label: "Workflow Intake",
      tagline: "Capture the reason before the work",
      description: "Start with a request when the need is still a problem, question, or goal. Use product briefs for product framing and roadmaps when the answer needs staged delivery instead of one task.",
      prompts: [
        "Draft a request for this need and ask only the questions required to make it actionable.",
        "Create or update the product brief, then propose a roadmap with 0.1, 0.2, and 1.0 slices."
      ],
      mapping: "Maps to logics/request/, logics/product/, and logics/roadmap/.",
      corpusStages: ["request", "product", "roadmap"],
      // item_819: the nav counted these and named the stage, so the number covered more
      // than its label did. This is what the count is over.
      covers: "requests, product briefs and roadmaps",
      actions: [{ label: "New Request", action: "new-request" }, { label: "Open the board", action: "board" }]
    },
    {
      label: "Delivery Slices",
      tagline: "Turn intent into scoped work",
      description: "Promote framed work into backlog items, then create orchestration tasks when a slice is ready to execute. Keep each task small enough to validate and commit cleanly.",
      prompts: [
        "Split this request or roadmap slice into backlog items with acceptance criteria.",
        "Create orchestration tasks for the next useful delivery slice."
      ],
      mapping: "Maps to logics/backlog/ and logics/tasks/.",
      corpusStages: ["backlog"],
      // item_819: the nav counted these and named the stage, so the number covered more
      // than its label did. This is what the count is over.
      covers: "backlog items",
      // item_752: this stage ended in nothing while the others ended in an action, so the
      // guide stopped being a sequence at its second step. The board is where the slices it
      // describes actually appear.
      actions: [{ label: "Open the board", action: "board" }, { label: "Open Insights", action: "open-logics-insights" }]
    },
    {
      label: "Execution",
      tagline: "Work from the task, commit by wave",
      description: "Use the active task as the execution contract. Commit after each coherent wave or task, keep validation evidence close, and avoid leaving unrelated changes mixed in.",
      prompts: [
        "Execute task <task id>. Commit after each useful wave and keep going until it is done.",
        "Validate the changed surface, update docs if needed, then close the task with evidence."
      ],
      mapping: "Maps to task execution, commits, checks, and activity in the viewer.",
      corpusStages: ["task"],
      // item_819: the nav counted these and named the stage, so the number covered more
      // than its label did. This is what the count is over.
      covers: "tasks",
      actions: [{ label: "CDX Missions", action: "cdx-missions" }, { label: "Open the board", action: "board" }]
    },
    {
      label: "Closeout",
      tagline: "Settle the documents that are no longer open",
      description: "When a subject is finished, update linked requests, product briefs, specs, ADRs, and roadmaps instead of leaving stale open context. Use Settled or Superseded for planning docs that are done or replaced.",
      prompts: [
        "Close out the linked Logics chain for this task and mark replaced planning docs as superseded.",
        "Audit the viewer for open docs that should be Done, Settled, or Superseded after this work."
      ],
      mapping: "Maps to statuses across request, backlog, task, product, roadmap, ADR, and spec docs.",
      corpusStages: ["architecture", "spec"],
      // item_819: the nav counted these and named the stage, so the number covered more
      // than its label did. This is what the count is over.
      covers: "architecture decisions and specs",
      actions: [{ label: "Open Health", action: "health" }, { label: "Open Insights", action: "open-logics-insights" }]
    }
  ];
  var onboardingDocGuide = [
    ["Problem, goal, or user request", "-> request"],
    ["Product intent, constraints, and positioning", "-> product brief"],
    ["Longer staged plan such as MVP, 0.1, 0.2, V1", "-> roadmap"],
    ["Scoped delivery slice with acceptance criteria", "-> backlog item"],
    ["Decision that should survive implementation", "-> ADR"],
    ["Behavior, contract, or UX requirement", "-> spec"],
    ["Executable work package for an agent or human", "-> task"],
    ["Project-owned copy/locales", "-> i18n contract"],
    ["Design tokens and editable project theme", "-> theme"]
  ];
  var stageBadgeLabels = {
    request: "Request",
    backlog: "Backlog",
    task: "Task",
    product: "Product",
    roadmap: "Roadmap",
    architecture: "Architecture",
    spec: "Spec",
    runbook: "Runbook"
  };
  var HLJS_EXT_LANGUAGE = {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    toml: "ini",
    ini: "ini",
    xml: "xml",
    html: "xml",
    htm: "xml",
    svg: "xml",
    css: "css",
    scss: "scss",
    less: "less",
    md: "markdown",
    markdown: "markdown",
    sql: "sql",
    dockerfile: "dockerfile",
    makefile: "makefile",
    diff: "diff",
    patch: "diff"
  };
  var workshopTabs = [
    { id: "terminals", label: "Terminals", title: "In-app PTY terminals" },
    { id: "commands", label: "Commands", title: "Discovered package and project scripts" },
    { id: "explorer", label: "Explorer", title: "Browse repository files" }
  ];
  var WORKSHOP_TERMINAL_MIN_COLS = 80;
  var WORKSHOP_TERMINAL_MIN_ROWS = 24;
  var WORKSHOP_TERMINAL_RESIZE_COL_STEP = 10;
  var WORKSHOP_TERMINAL_RESIZE_ROW_STEP = 5;

  // clients/viewer/src/browser-host/render.js
  function activityHistoryKey(entry) {
    if (!entry || typeof entry !== "object") {
      return "";
    }
    const minute = activityMinuteBucket(entry.at || entry.updatedAt || "");
    return [
      entry.path || entry.id || "",
      entry.type || "",
      entry.status || "",
      entry.previousStatus || "",
      minute
    ].map((part) => String(part || "")).join("|");
  }
  function activityStateForRoot(state = readStoredState(), root = "") {
    const baseState = state && typeof state === "object" ? state : {};
    const byRoot = baseState.activityByRoot && typeof baseState.activityByRoot === "object" ? baseState.activityByRoot : {};
    const scoped = byRoot[activityRootKey(root)];
    if (scoped && typeof scoped === "object") {
      return {
        activitySnapshot: scoped.activitySnapshot && typeof scoped.activitySnapshot === "object" ? scoped.activitySnapshot : {},
        activityHistory: Array.isArray(scoped.activityHistory) ? scoped.activityHistory : []
      };
    }
    return {
      activitySnapshot: baseState.activitySnapshot && typeof baseState.activitySnapshot === "object" ? baseState.activitySnapshot : {},
      activityHistory: Array.isArray(baseState.activityHistory) ? baseState.activityHistory : []
    };
  }
  function captureDocumentViewState(content) {
    const scroller = scrollableAncestor(content);
    const openDetails = Array.from(content.querySelectorAll("details[open]")).map((node) => (node.querySelector("summary")?.textContent || "").trim()).filter(Boolean);
    const active = document.activeElement;
    let focusKey = null;
    if (active && content.contains(active) && active !== content) {
      if (active.id) {
        focusKey = `#${window.CSS && CSS.escape ? CSS.escape(active.id) : active.id}`;
      } else {
        const key = active.getAttribute("data-viewer-focus-key");
        if (key) focusKey = `[data-viewer-focus-key="${key}"]`;
      }
    }
    return { scroller, scrollTop: scroller ? scroller.scrollTop : 0, openDetails, focusKey };
  }
  function cdxHistorySessionName(entry) {
    return cdxField(entry, ["session_name", "sessionName", "session", "name"], "-");
  }
  function cdxKnownProviders(status, providers, sessions) {
    const names = /* @__PURE__ */ new Set();
    providers.forEach((provider) => {
      const name = cdxProviderName(provider);
      if (name) {
        names.add(name);
      }
    });
    sessions.forEach((session) => {
      const name = cdxProviderName(session);
      if (name) {
        names.add(name);
      }
    });
    pickFirstArray(status, ["providers", "providerStatus", "provider_status"]).forEach((provider) => {
      const name = cdxProviderName(provider);
      if (name) {
        names.add(name);
      }
    });
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }
  function cdxProviderName(item) {
    return String(cdxField(item, ["provider", "name"], "unknown") || "unknown");
  }
  function cdxProviders(status) {
    const rows = cdxRows(status);
    if (!rows.length) {
      return pickFirstArray(status, ["providers", "providerStatus", "provider_status"]);
    }
    const grouped = /* @__PURE__ */ new Map();
    rows.forEach((row) => {
      const provider = String(row.provider || "unknown");
      const current = grouped.get(provider) || {
        name: provider,
        enabled: 0,
        active: 0,
        authenticated: 0,
        sessions: 0,
        remaining_5h: "not reported",
        remaining_week: "not reported",
        credits: "",
        _remaining5hValues: [],
        _remainingWeekValues: [],
        _creditsValues: []
      };
      current.sessions += 1;
      if (row.enabled) {
        current.enabled += 1;
      }
      if (row.active) {
        current.active += 1;
      }
      if (String(row.auth_status || "").toLowerCase() === "authenticated") {
        current.authenticated += 1;
      }
      const fiveHour = Number(row.remaining_5h_pct ?? row.remaining5hPct);
      if (Number.isFinite(fiveHour)) {
        current._remaining5hValues.push(fiveHour);
      }
      const week = Number(row.remaining_week_pct ?? row.remainingWeekPct);
      if (Number.isFinite(week)) {
        current._remainingWeekValues.push(week);
      }
      if (row.credits !== void 0 && row.credits !== null && row.credits !== "") {
        current._creditsValues.push(row.credits);
      }
      current.state = current.active > 0 ? "active" : current.enabled > 0 ? "enabled" : "disabled";
      grouped.set(provider, current);
    });
    return Array.from(grouped.values()).map((provider) => {
      const creditsNumbers = numericValues(provider._creditsValues);
      const creditsTotal = creditsNumbers.length ? creditsNumbers.reduce((total, value) => total + value, 0) : null;
      const { _remaining5hValues, _remainingWeekValues, _creditsValues, ...publicProvider } = provider;
      return {
        ...publicProvider,
        remaining_5h: formatPercentRange(_remaining5hValues),
        remaining_week: formatPercentRange(_remainingWeekValues),
        credits: creditsTotal === null ? "" : creditsTotal.toFixed(2)
      };
    });
  }
  function cdxRows(status) {
    return asArray(status?.rows);
  }
  function cdxRunSessionName(run) {
    return cdxField(run, ["session", "session_id", "sessionId", "session_name", "sessionName"], "-");
  }
  function cdxSessions(status) {
    const explicitSessions = pickFirstArray(status, ["sessions", "activeSessions", "active_sessions"]);
    return sortCdxSessionsByRemaining(explicitSessions.length ? explicitSessions : cdxRows(status));
  }
  function ciBadgeLabel(value) {
    const state = ciBadgeTone(value);
    if (state === "passing") {
      return "pass";
    }
    if (state === "failing") {
      return "fail";
    }
    if (state === "running") {
      return String(value || "").toLowerCase() === "queued" ? "queue" : "run";
    }
    if (state === "cancelled") {
      return "cancel";
    }
    if (state === "unavailable") {
      return "auth";
    }
    return "n/a";
  }
  function clearNavMenuBadges(targets) {
    targets.forEach((target) => {
      navMenuItem(target)?.querySelector("[data-viewer-menu-badges]")?.remove();
    });
  }
  function closeNavMenus() {
    setNavMenuOpen(null, false);
  }
  function ensureWorkshopTerminalHostFor(sessionId) {
    const stage = workshopTerminalStageNode();
    if (!(stage instanceof HTMLElement)) return null;
    const placeholder = stage.querySelector("[data-viewer-workshop-terminal-empty]");
    if (placeholder) placeholder.remove();
    let host = stage.querySelector(`[data-viewer-workshop-terminal-host="${sessionId}"]`);
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.className = "viewer-workshop__terminal-host";
      host.setAttribute("data-viewer-workshop-terminal-host", sessionId);
      stage.appendChild(host);
    }
    return host;
  }
  function escapeHtml(value) {
    const api = markdownApi();
    if (api && typeof api.escapeHtml === "function") {
      return api.escapeHtml(value);
    }
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function focusRequest() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const focus = normalizeFocusTarget(params.get("focus") || "");
      return {
        focus,
        read: params.get("read") === "1" || params.get("read") === "true"
      };
    } catch {
      return { focus: "", read: false };
    }
  }
  function formatPercentRange(values) {
    const numbers = numericValues(values).map((value) => Math.max(0, Math.min(100, Math.round(value))));
    if (!numbers.length) {
      return "not reported";
    }
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return min === max ? `${min}%` : `${min}-${max}%`;
  }
  function gitStatusSignature(payload) {
    return stableStringify({
      state: payload?.state || "",
      branch: payload?.branch || "",
      tracking: payload?.tracking || "",
      ahead: Number(payload?.ahead || 0),
      behind: Number(payload?.behind || 0),
      clean: Boolean(payload?.clean),
      counts: payload?.counts || {},
      badgeCounts: payload?.badgeCounts || {},
      latestCommit: payload?.latestCommit || "",
      recentCommitsHasMore: Boolean(payload?.recentCommitsHasMore)
    });
  }
  function highlightCode(content, language) {
    const text = String(content || "");
    try {
      const hljs = typeof window !== "undefined" ? window.hljs : null;
      if (hljs && language && typeof hljs.getLanguage === "function" && hljs.getLanguage(language)) {
        return hljs.highlight(text, { language, ignoreIllegals: true }).value;
      }
    } catch {
    }
    return escapeHtml(text);
  }
  function isClosed(item) {
    const status = statusValue(item);
    return status.includes("done") || status.includes("archived") || status.includes("obsolete") || status.includes("superseded") || status.includes("settled");
  }
  function isRecent(item, days = 7) {
    return updatedWithin(item, days);
  }
  function isStale(item) {
    const timestamp = Date.parse(item.updatedAt || "") || 0;
    return timestamp > 0 && timestamp < Date.now() - 30 * 24 * 60 * 60 * 1e3 && !isClosed(item);
  }
  function knownCdxHistorySessions(history) {
    return Array.from(new Set(history.map((entry) => cdxHistorySessionName(entry)).filter((session) => session && session !== "-"))).sort((left, right) => left.localeCompare(right));
  }
  function knownCdxRunSessions(runs) {
    return Array.from(new Set(runs.map((run) => cdxRunSessionName(run)).filter((session) => session && session !== "-"))).sort((left, right) => left.localeCompare(right));
  }
  function needsPromotion(item) {
    return ["request", "backlog"].includes(item.stage) && !item.isPromoted && !isClosed(item);
  }
  function pickFirstArray(status, keys) {
    for (const key of keys) {
      const entries = asArray(status?.[key]);
      if (entries.length) {
        return entries;
      }
    }
    return [];
  }
  function prependUniqueActivity(history, entry) {
    const key = activityHistoryKey(entry);
    if (key && history.some((candidate) => activityHistoryKey(candidate) === key)) {
      return history;
    }
    history.unshift(entry);
    return history;
  }
  function preserveActiveCdxMenu(render) {
    const key = cdxMenuKey(activeCdxInteractionMenu());
    render();
    if (!key) {
      return;
    }
    const nextMenu = Array.from(document.querySelectorAll(".viewer-cdx__menu, .viewer-workshop__command-run-menu")).find((menu) => cdxMenuKey(menu) === key);
    if (nextMenu instanceof HTMLElement) {
      nextMenu.setAttribute("open", "");
    }
  }
  function releaseEvidenceRows(evidence) {
    if (!evidence || typeof evidence !== "object") {
      return '<li class="viewer-ci__empty">No evidence recorded.</li>';
    }
    const rows = [
      ["Kind", evidence.kind || "unknown"],
      ["Status", evidence.status || "unknown"],
      ["Observed", formatCiDate(evidence.observed_at) || evidence.observed_at || "unknown"],
      ["Version", evidence.target_version || "unknown"],
      ["Commit", evidence.commit ? String(evidence.commit).slice(0, 12) : ""],
      ["Tag", evidence.tag || ""],
      ["Summary", evidence.summary || ""]
    ].filter(([, value]) => String(value || "").trim());
    if (evidence.url) {
      rows.push(["Link", evidence.url]);
    }
    return rows.map(([label, value]) => {
      const renderedValue = label === "Link" ? `<a class="viewer-ci__link viewer-release__inline-link" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>` : `<strong>${escapeHtml(value)}</strong>`;
      return `<li class="viewer-ci__row"><span>${escapeHtml(label)}</span>${renderedValue}</li>`;
    }).join("");
  }
  function renderActionRows(actions) {
    return actions.map((action) => {
      if (action.filter) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-filter-group="${escapeHtml(action.filter.group)}" data-viewer-filter-value="${escapeHtml(action.filter.value)}">${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      if (action.health) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-open-health>${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      if (action.path && isSafeLogicsDocPath(action.path)) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-doc-path="${escapeHtml(action.path)}">${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      return `<li class="viewer-insights__row"><span>${escapeHtml(action.label)}</span><strong>${escapeHtml(action.value)}</strong></li>`;
    }).join("");
  }
  function renderCdxUsageGauge(usage, sessionName) {
    if (!sessionName) return "";
    const part = (label, value) => {
      const raw = Number(value?.percent), hasPct = value?.percent !== null && value?.percent !== void 0 && Number.isFinite(raw);
      const pct = hasPct ? Math.max(0, Math.min(100, raw)) : 0;
      const resetText = value?.reset && value.reset !== "-" ? ` \xB7 resets ${value.reset}` : "";
      return { hasPct, pct, tone: hasPct ? cdxRemainingClass(pct) : "neutral", title: `${label} remaining: ${hasPct ? `${pct}%` : "unknown"}${resetText}` };
    };
    const fiveHour = part("5h", usage?.fiveHour || usage), week = part("week", usage?.week);
    const parts = [
      fiveHour.hasPct ? `<span class="viewer-workshop__usage-segment viewer-workshop__usage--${fiveHour.tone}" title="${escapeHtml(fiveHour.title)}" aria-label="${escapeHtml(fiveHour.title)}"><span class="viewer-workshop__usage-fill" style="height:${fiveHour.pct}%"></span></span>` : "",
      `<span class="viewer-workshop__usage-segment viewer-workshop__usage-segment--week viewer-workshop__usage--${week.tone}" title="${escapeHtml(week.title)}" aria-label="${escapeHtml(week.title)}"><span class="viewer-workshop__usage-fill" style="height:${week.pct}%"></span></span>`
    ].filter(Boolean);
    const title = `CDX usage remaining: ${[fiveHour.hasPct ? fiveHour.title : "", week.title].filter(Boolean).join("; ")} \xB7 click to refresh`;
    return `<span class="viewer-workshop__usage${fiveHour.hasPct ? "" : " viewer-workshop__usage--single"}" data-viewer-cdx-usage-refresh="${escapeHtml(sessionName)}" role="button" tabindex="0" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${parts.join("")}</span>`;
  }
  function renderCiBadge(value) {
    const tone = ciBadgeTone(value);
    return `<span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(tone)}">${escapeHtml(ciBadgeLabel(value))}</span>`;
  }
  function renderCiButtonBadge(payload) {
    const state = payload?.badgeState || payload?.state || "unknown";
    const label = ciBadgeLabel(state);
    const tone = ciBadgeTone(state);
    return `<span class="viewer-ci-badge viewer-ci-badge--${escapeHtml(tone)}" data-viewer-ci-badge title="${escapeHtml(payload?.message || `CI ${label}`)}">${escapeHtml(label)}</span>`;
  }
  function renderCiStatus(payload) {
    const providerLabel = payload?.provider === "gitlab" ? "GitLab CI" : "GitHub Actions";
    if (!payload || !payload.visible) {
      return `
        <div class="viewer-ci">
          ${renderCiModeSwitcher("runs")}
          <div class="viewer-ci__state">${escapeHtml(payload?.message || `${providerLabel} is not configured for this repository.`)}</div>
        </div>
      `;
    }
    const run = payload.run && typeof payload.run === "object" ? payload.run : null;
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    const state = payload.badgeState || run?.badgeState || payload.state || "unknown";
    const matchLabel = run?.matchSource === "head-active" ? "Current HEAD running" : run?.matchSource === "head-failing" ? "Current HEAD failing" : run?.matchSource === "head-cancelled" ? "Current HEAD cancelled" : run?.matchSource === "head-unknown" ? "Current HEAD unknown" : run?.matchSource === "head" ? "Current HEAD" : run?.matchSource === "branch-active" ? "Branch running" : run?.matchSource === "branch-failing" ? "Branch failing" : "Latest branch run";
    const runUrl = run?.htmlUrl ? `<a class="viewer-ci__link" href="${escapeHtml(run.htmlUrl)}" target="_blank" rel="noreferrer">Open in ${escapeHtml(payload?.provider === "gitlab" ? "GitLab" : "GitHub")}</a>` : "";
    const runDuration = run ? formatCiDuration(run.runStartedAt || run.createdAt, run.updatedAt) : "";
    const runAgo = run ? formatCiAgo(run.updatedAt || run.runStartedAt || run.createdAt) : "";
    const ciVerdict = (() => {
      if (!run) return null;
      const tone = run.badgeState || ciStateFromStatus(run.status, run.conclusion);
      const verb = tone === "passing" ? "Passed" : tone === "failing" ? "Failed" : tone === "running" ? "Running" : tone === "queued" ? "Queued" : tone === "cancelled" ? "Cancelled" : "Finished";
      const parts = [verb];
      if (runDuration) parts.push(`in ${runDuration}`);
      const sentence = `${parts.join(" ")}${runAgo ? `, ${runAgo}` : ""}.`;
      return { tone, sentence };
    })();
    const verdictHtml = ciVerdict ? `<section class="viewer-ci__verdict viewer-ci__verdict--${escapeHtml(ciVerdict.tone)}" role="status">
          <p class="viewer-ci__verdict-text">${escapeHtml(ciVerdict.sentence)}</p>
          ${runUrl}
        </section>` : "";
    const runRows = run ? [
      ["Workflow", run.workflowName || run.name || providerLabel],
      ["Branch", run.branch || payload.branch || "Unknown"],
      ["Match", matchLabel],
      ["Event", run.event || "Unknown"],
      ["Commit", run.commitMessage || payload.subject || "Unknown"],
      ["Author", run.author || payload.author || "Unknown"],
      ["Duration", runDuration || "Not reported"]
    ].map(([label, value]) => `
      <li class="viewer-ci__row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("") : `<li class="viewer-ci__empty">${escapeHtml(payload.message || `No ${providerLabel} run found for this branch.`)}</li>`;
    const jobRows = renderCiJobRows(jobs);
    return `
      <div class="viewer-ci">
        ${renderCiModeSwitcher("runs")}
        ${verdictHtml}
        <div class="viewer-ci__workspace">
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Latest run</h2>${renderCiBadge(state)}</div>
            <ul class="viewer-ci__list">${runRows}</ul>
          </section>
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Jobs</h2><span>${escapeHtml(jobs.length)} reported</span></div>
            <ul class="viewer-ci__jobs">${jobRows}</ul>
          </section>
        </div>
      </div>
    `;
  }
  function renderCodeViewer(content, options = {}) {
    const text = String(content || "");
    const language = options.language || "";
    const lineCount = Number.isFinite(options.lineCount) ? options.lineCount : text ? text.split("\n").length - (text.endsWith("\n") ? 1 : 0) : 0;
    const visibleLines = text ? text.split("\n").slice(0, text.endsWith("\n") ? -1 : void 0) : [];
    const lineNumbers = Array.isArray(options.lineNumbers) ? options.lineNumbers : [];
    const maxLineNumber = Math.max(
      lineCount,
      visibleLines.length,
      ...lineNumbers.map((value) => Number(value) || 0),
      1
    );
    const lineNumberDigits = Math.max(2, String(maxLineNumber).length);
    const rows = visibleLines.map((line, index) => {
      const body = typeof options.renderLineHtml === "function" ? options.renderLineHtml(line, index) : highlightCode(line || " ", language);
      const extraLineClass = typeof options.lineClassName === "function" ? options.lineClassName(line, index) : options.lineClassName || "";
      const extraRowClass = typeof options.rowClassName === "function" ? options.rowClassName(line, index) : options.rowClassName || "";
      const rowClass = ["viewer-code__row", extraRowClass].filter(Boolean).map(escapeHtml).join(" ");
      const lineClass = ["viewer-code__line", extraLineClass].filter(Boolean).map(escapeHtml).join(" ");
      const lineNumber = lineNumbers[index] === "" || lineNumbers[index] === null || lineNumbers[index] === void 0 ? lineNumbers.length ? "" : index + 1 : lineNumbers[index];
      return `<div class="${rowClass}">
        <span class="viewer-code__line-number" aria-hidden="true">${escapeHtml(String(lineNumber))}</span>
        <span class="${lineClass}"><code>${body}</code></span>
      </div>`;
    }).join("");
    const bar = [
      `<span class="viewer-code__lines">${lineCount} line${lineCount === 1 ? "" : "s"}</span>`,
      options.truncated ? `<span class="viewer-code__flag">truncated</span>` : "",
      options.hardCapHit ? `<span class="viewer-code__flag">hard cap reached</span>` : "",
      options.forceButtonHtml || ""
    ].filter(Boolean).join("");
    return `<div class="viewer-code" style="--viewer-code-line-number-width: ${lineNumberDigits}ch;">
      <div class="viewer-code__bar">${bar}</div>
      <div class="viewer-code__scroll"><div class="viewer-code__rows">${rows}</div></div>
    </div>`;
  }
  function renderDocRows(items, emptyText = "None", limit = 6, signal = "") {
    if (!items.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = items.map((item, index) => {
      const path = item.relPath || item.path || "";
      const control = path && isSafeLogicsDocPath(path) ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(item.id || path)}</button>` : `<span class="viewer-insights__doc">${escapeHtml(item.id || path || item.title)}</span>`;
      const signalTag = signal ? `<span class="viewer-insights__row-signal" data-viewer-insights-signal="${escapeHtml(signal)}">${escapeHtml(signal)}</span>` : "";
      return `
        <li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>
          ${control}
          ${signalTag}
          <span>${escapeHtml(item.indicators?.Status || item.stage || "No status")}</span>
        </li>
      `;
    });
    const hiddenCount = Math.max(0, items.length - limit);
    if (hiddenCount > 0) {
      rows.push(`<li class="viewer-insights__row"><button class="viewer-insights__reveal" type="button" data-viewer-reveal>Show ${hiddenCount} more</button></li>`);
    }
    return rows.join("");
  }
  function renderGitBadge(kind, count) {
    const value = Number(count || 0);
    if (value <= 0) {
      return "";
    }
    const labels = {
      commits: `${value} commits locaux non push\xE9s`,
      "commits-behind": `${value} commits distants non r\xE9cup\xE9r\xE9s`,
      files: `${value} fichiers modifi\xE9s non commit\xE9s`
    };
    const label = labels[kind] || "";
    return `<span class="viewer-git-badge viewer-git-badge--${kind}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(value)}</span>`;
  }
  function renderGitSummaryCard(label, value) {
    return `
      <div class="viewer-insights__card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `;
  }
  function renderGitSummarySegments(label, segments) {
    return `
      <div class="viewer-insights__card viewer-git__summary-card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-git__summary-segments">
          ${segments.map(([segmentLabel, value]) => `
            <span class="viewer-git__summary-segment">
              <span>${escapeHtml(segmentLabel)}</span>
              <strong>${escapeHtml(value)}</strong>
            </span>
          `).join("")}
        </div>
      </div>
    `;
  }
  function renderDocEditorScreen({ content }) {
    return `
      <div class="viewer-doc-editor">
        <textarea class="viewer-doc-editor__textarea" spellcheck="false">${escapeHtml(content)}</textarea>
        <div class="viewer-doc-editor__actions">
          <button class="btn" type="button" data-viewer-editor-action="cancel">Cancel</button>
          <button class="btn primary" type="button" data-viewer-editor-action="save">Save</button>
        </div>
      </div>
    `;
  }
  function renderHealthSummary(lintData, auditData, healthData = null, knownPaths = null) {
    const lintPayload = lintData.payload || {};
    const auditPayload = auditData.payload || {};
    const blocking = countPayloadEntries(lintPayload, ["issue_count", "issues"]) + countPayloadEntries(auditPayload, ["issue_count", "issues"]);
    const warnings = countPayloadEntries(lintPayload, ["warning_count", "warnings"]) + countPayloadEntries(auditPayload, ["warning_count", "warnings"]);
    const findings = collectHealthFindings(lintData, auditData);
    const autofixCodes = new Set(Array.isArray(auditData?.payload?.autofix_codes) ? auditData.payload.autofix_codes : []);
    const fixable = autofixCodes.size ? findings.filter((finding) => autofixCodes.has(finding?.code)) : [];
    const fixableCount = fixable.length;
    const fixableCodes = [...new Set(fixable.map((finding) => String(finding?.code || "")))].filter(Boolean).sort();
    const healthPayload = healthData && healthData.ok !== false ? healthData.payload || {} : null;
    const workflowIssues = healthPayload?.issues || {};
    const staleDocs = Array.isArray(healthPayload?.stale_docs) ? healthPayload.stale_docs : [];
    const workflowSignalCount = healthPayload ? Number(healthPayload.issue_count ?? 0) : null;
    const healthVerdict = (() => {
      if (blocking > 0) {
        return { tone: "fail", sentence: `${blocking} blocking finding${blocking === 1 ? "" : "s"} to clear before this corpus validates.` };
      }
      if (warnings > 0 || (workflowSignalCount || 0) > 0) {
        const parts = [];
        if (warnings > 0) parts.push(`${warnings} warning${warnings === 1 ? "" : "s"}`);
        if (workflowSignalCount) parts.push(`${workflowSignalCount} workflow signal${workflowSignalCount === 1 ? "" : "s"}`);
        return { tone: "warn", sentence: `Nothing blocks. ${parts.join(" and ")} to look at.` };
      }
      return { tone: "pass", sentence: "Nothing blocks and nothing is flagged." };
    })();
    const verdictHtml = `
      <section class="viewer-health__verdict viewer-health__verdict--${escapeHtml(healthVerdict.tone)}" role="status">
        <p class="viewer-health__verdict-text">${escapeHtml(healthVerdict.sentence)}</p>
        <p class="viewer-health__verdict-defer">Whether a release can proceed is answered on the Release screen, which owns that gate.</p>
      </section>
    `;
    const cards = [
      ["Blocking", blocking],
      ["Warnings", warnings],
      ["Workflow signals", healthPayload ? healthPayload.issue_count ?? 0 : "Unavailable"],
      ["Stale docs", healthPayload ? healthPayload.stale_doc_count ?? 0 : "Unavailable"]
    ].map(([label, value]) => `
        <div class="viewer-health__card">
          <div class="viewer-health__label">${escapeHtml(label)}</div>
          <div class="viewer-health__value">${escapeHtml(value)}</div>
        </div>
      `).join("");
    const knownPathSet = knownPaths instanceof Set ? knownPaths : new Set(Array.isArray(knownPaths) ? knownPaths : []);
    const contradicted = (finding) => {
      const message = String(finding?.message || "");
      if (!/\b(missing|not found|does not exist|absent)\b/i.test(message)) return "";
      const referenced = (message.match(/`([^`]+\.md)`/) || message.match(/([\w./-]+\.md)/) || [])[1] || "";
      if (!referenced || !knownPathSet.has(referenced)) return "";
      return `${referenced} is present in this corpus`;
    };
    const findingGroups = /* @__PURE__ */ new Map();
    findings.slice(0, 200).forEach((finding) => {
      const key = finding.path || "";
      if (!findingGroups.has(key)) findingGroups.set(key, []);
      findingGroups.get(key).push(finding);
    });
    const list = findingGroups.size ? Array.from(findingGroups.entries()).slice(0, 50).map(([path, entries]) => {
      const pathControl = path && isSafeLogicsDocPath(path) ? `<button class="viewer-health__path" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(path)}</button>` : `<span class="viewer-health__meta">${escapeHtml(path ? `Repository-level or unsafe path: ${path}` : "Repository-level finding")}</span>`;
      const rows = entries.map((finding) => {
        const severity = finding.severity || finding.code || finding.source || "finding";
        const doubt = contradicted(finding);
        return `
              <li class="viewer-health__finding${doubt ? " viewer-health__finding--suspect" : ""}"${doubt ? " data-viewer-health-suspect" : ""}>
                <div class="viewer-health__finding-message">${escapeHtml(finding.message || finding.code || "Validation finding")}</div>
                <div class="viewer-health__meta">${escapeHtml(finding.source)} \xB7 ${escapeHtml(severity)}</div>
                ${doubt ? `<div class="viewer-health__suspect-note">Suspect: ${escapeHtml(doubt)}.</div>` : ""}
              </li>
            `;
      }).join("");
      return `
            <li class="viewer-health__issue viewer-health__issue--group">
              <div class="viewer-health__group-header">
                ${pathControl}
                <span class="viewer-health__group-count">${escapeHtml(entries.length)} finding${entries.length === 1 ? "" : "s"}</span>
              </div>
              <ul class="viewer-health__findings">${rows}</ul>
            </li>
          `;
    }).join("") : '<li class="viewer-health__empty">No lint or audit findings were reported.</li>';
    const workflowGroups = Object.entries(workflowIssues).filter(([, entries]) => Array.isArray(entries) && entries.length > 0).map(([key, entries]) => {
      const label = key.replace(/_/g, " ");
      const rows = entries.map((entry) => {
        const path = entry?.path || "";
        const control = path && isSafeLogicsDocPath(path) ? `<button class="viewer-health__path" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(entry?.ref || path)}</button>` : `<span class="viewer-health__meta">${escapeHtml(entry?.ref || "Unknown document")}</span>`;
        return `<li class="viewer-health__issue">${control}<span class="viewer-health__row-signal" data-viewer-health-signal="${escapeHtml(label)}">${escapeHtml(label)}</span><div class="viewer-health__meta">${escapeHtml(entry?.status || "")}</div></li>`;
      }).join("");
      return `<section class="viewer-health__section"><h2 class="viewer-health__heading">${escapeHtml(label)}</h2><ul class="viewer-health__list">${rows}</ul></section>`;
    }).join("");
    const staleSection = staleDocs.length ? `<section class="viewer-health__section">
          <h2 class="viewer-health__heading">Stale documents (untouched ${escapeHtml(healthPayload?.stale_after_days ?? "?")}+ days)</h2>
          <ul class="viewer-health__list">${staleDocs.map((entry) => {
      const path = entry?.path || "";
      const control = path && isSafeLogicsDocPath(path) ? `<button class="viewer-health__path" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(entry?.ref || path)}</button>` : `<span class="viewer-health__meta">${escapeHtml(entry?.ref || "Unknown document")}</span>`;
      return `<li class="viewer-health__issue">${control}<div class="viewer-health__meta">${escapeHtml(entry?.age_days ?? "?")} days \xB7 ${escapeHtml(entry?.status || "")}</div></li>`;
    }).join("")}</ul>
        </section>` : "";
    const unavailable = healthData && healthData.ok === false ? `<section class="viewer-health__section"><div class="viewer-health__meta">Workflow health is unavailable: ${escapeHtml(healthData.error || "unknown error")}</div></section>` : "";
    return `
      <div class="viewer-health">
        ${renderCorpusModeSwitcher("health")}
        ${verdictHtml}
        <div class="viewer-health__summary viewer-health__summary--strip">${cards}</div>
        <section class="viewer-health__section">
          <div class="viewer-health__section-header">
            <h2 class="viewer-health__heading">Validation findings</h2>
            <button class="viewer-health__apply-fixes" type="button" data-viewer-apply-fixes${fixableCount ? "" : " disabled"} title="${fixableCount ? `Repairs ${fixableCount} finding${fixableCount === 1 ? "" : "s"}: ${escapeHtml(fixableCodes.join(", "))}. Shows which documents would be edited before applying anything` : "No finding on this screen can be repaired automatically"}">Apply fixes\u2026${fixableCount ? ` (${fixableCount})` : ""}</button>
          </div>
          <ul class="viewer-health__list">${list}</ul>
        </section>
        ${workflowGroups}
        ${staleSection}
        ${unavailable}
      </div>
    `;
  }
  function renderMetricCards(entries) {
    return entries.map(([label, value, tone]) => `
      <div class="viewer-insights__card${tone ? ` viewer-insights__card--${escapeHtml(tone)}` : ""}">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
  }
  function renderPathRows(paths, emptyText = "None", limit = 6) {
    if (!paths.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = paths.map((path, index) => {
      const control = isSafeLogicsDocPath(path) ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(path)}</button>` : `<span class="viewer-insights__doc">${escapeHtml(path)}</span>`;
      return `<li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>${control}</li>`;
    });
    const hiddenCount = Math.max(0, paths.length - limit);
    if (hiddenCount > 0) {
      rows.push(`<li class="viewer-insights__row"><button class="viewer-insights__reveal" type="button" data-viewer-reveal>Show ${hiddenCount} more</button></li>`);
    }
    return rows.join("");
  }
  function renderProjectPickerModalBody(body, payload) {
    if (!(body instanceof HTMLElement)) return;
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const path = String(payload.path || "");
    const rows = entries.map((entry) => `
      <button class="viewer-project-picker__row" type="button" data-viewer-project-picker-open="${escapeHtml(entry.path || "")}">
        <span>${escapeHtml(entry.name || entry.path || "folder")}</span>
        <em>${entry.hasLogics ? "Logics" : "folder"}</em>
      </button>
    `).join("");
    body.innerHTML = `
      <div class="viewer-project-picker">
        <div class="viewer-project-picker__meta">
          <strong>${escapeHtml(payload.selectedPath || payload.root || "/")}</strong>
          <span>${path ? "Browse a child folder or select this folder." : "Browse from the local project area."}</span>
        </div>
        <div class="viewer-project-picker__actions">
          <button class="btn" type="button" data-viewer-project-picker-open="${escapeHtml(payload.parentPath || "")}"${path ? "" : " disabled"}>Parent</button>
          <button class="btn primary" type="button" data-viewer-project-picker-select="${escapeHtml(path)}">Select this folder</button>
        </div>
        <div class="viewer-project-picker__list">${rows || '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span>No child folders.</span></div>'}</div>
      </div>
    `;
  }
  function renderCiJobRows(jobs) {
    const list = Array.isArray(jobs) ? jobs : [];
    if (!list.length) return `<li class="viewer-ci__empty">No job details reported.</li>`;
    const tone = (job) => ciStateFromStatus(job.status, job.conclusion);
    const durationMs = (job) => {
      const start = Date.parse(job?.startedAt || "");
      const end = Date.parse(job?.completedAt || "");
      return Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : 0;
    };
    const slowestMs = list.reduce((max, job) => Math.max(max, durationMs(job)), 0);
    const slowestFirst = (jobs2) => [...jobs2].sort((left, right) => durationMs(right) - durationMs(left));
    const renderJob = (job) => {
      const jobState = tone(job);
      const duration = formatCiDuration(job.startedAt, job.completedAt);
      const ago = formatCiAgo(job.completedAt || job.startedAt);
      const absolute = formatCiDate(job.completedAt || job.startedAt) || "";
      const time = [duration, ago].filter(Boolean).join(" \xB7 ");
      const ratio = slowestMs > 0 && list.length > 1 ? durationMs(job) / slowestMs : 0;
      const bar = ratio > 0 ? `<span class="viewer-ci__job-bar" style="--job-ratio: ${ratio.toFixed(3)}" aria-hidden="true"></span>` : "";
      const content = `
        <span class="viewer-ci__job-name">${escapeHtml(job.name || "Job")}</span>
        <span class="viewer-ci__job-time"${absolute ? ` title="${escapeHtml(absolute)}"` : ""}>${escapeHtml(time)}</span>
        ${bar}
      `;
      return `<li class="viewer-ci__job viewer-ci__job--${escapeHtml(jobState)}" data-viewer-ci-job-state="${escapeHtml(jobState)}">${job.htmlUrl ? `<a href="${escapeHtml(job.htmlUrl)}" target="_blank" rel="noreferrer">${content}</a>` : content}</li>`;
    };
    const failed = slowestFirst(list.filter((job) => tone(job) === "failing"));
    const rest = list.filter((job) => tone(job) !== "failing");
    const passed = slowestFirst(rest.filter((job) => tone(job) === "passing"));
    const unresolved = slowestFirst(rest.filter((job) => tone(job) !== "passing"));
    return `${failed.map(renderJob).join("")}${unresolved.map(renderJob).join("")}${passed.length ? `<li class="viewer-ci__job-fold"><details${failed.length ? "" : " open"}>
             <summary>${escapeHtml(passed.length)} job${passed.length === 1 ? "" : "s"} passed</summary>
             <ul class="viewer-ci__jobs">${passed.map(renderJob).join("")}</ul>
           </details></li>` : ""}`;
  }
  function renderReleaseGate(gate, options = {}) {
    const status = String(gate?.status || "pending");
    const tone = releaseBadgeTone(status);
    const reason = gate?.blocking_reason ? `<div class="viewer-release__reason">${escapeHtml(gate.blocking_reason)}</div>` : "";
    const id = String(gate?.id || "gate");
    const rawState = String(gate?.state || "").trim();
    const substate = rawState && !id.toLowerCase().includes(rawState.toLowerCase()) && rawState.toLowerCase() !== status.toLowerCase() ? rawState : "";
    const optionalMark = gate?.required === false ? `<span class="viewer-release__gate-optional">optional</span>` : "";
    const blocking = Boolean(options.blocking);
    return `
      <details class="viewer-release__gate viewer-release__gate--${escapeHtml(tone)}${blocking ? " viewer-release__gate--blocking" : ""}"${blocking ? " open" : ""} data-viewer-release-gate="${escapeHtml(id)}" data-viewer-release-gate-tone="${escapeHtml(tone)}">
        <summary>
          <span class="viewer-release__gate-name">
            <strong>${escapeHtml(id)}</strong>
            ${substate ? `<em>${escapeHtml(substate)}</em>` : ""}
            ${optionalMark}
          </span>
          <span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(tone)}">${escapeHtml(status)}</span>
        </summary>
        ${reason}
        <ul class="viewer-ci__list">${releaseEvidenceRows(gate?.evidence)}</ul>
      </details>
    `;
  }
  function renderReleaseRunSection(runsPayload) {
    if (!runsPayload || !runsPayload.visible) {
      const message = runsPayload?.message || "Release workflow runs are not available for this repository.";
      return `
        <section class="viewer-ci__section">
          <div class="viewer-ci__heading"><h2>Latest release run</h2></div>
          <ul class="viewer-ci__list"><li class="viewer-ci__empty">${escapeHtml(message)}</li></ul>
        </section>
      `;
    }
    const run = runsPayload.run && typeof runsPayload.run === "object" ? runsPayload.run : null;
    const jobs = Array.isArray(runsPayload.jobs) ? runsPayload.jobs : [];
    const state = runsPayload.badgeState || run?.badgeState || runsPayload.state || "unknown";
    const runUrl = run?.htmlUrl ? `<a class="viewer-ci__link" href="${escapeHtml(run.htmlUrl)}" target="_blank" rel="noreferrer">Open in GitHub</a>` : "";
    const runRows = run ? [
      ["Workflow", run.workflowName || run.name || "Release"],
      ["Tag / ref", run.branch || "Unknown"],
      ["Event", run.event || "Unknown"],
      ["Commit", run.commitMessage || "Unknown"],
      ["Duration", formatCiDuration(run.runStartedAt || run.createdAt, run.updatedAt) || "Not reported"]
    ].map(([label, value]) => `
      <li class="viewer-ci__row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("") : `<li class="viewer-ci__empty">${escapeHtml(runsPayload.message || "No release workflow run found.")}</li>`;
    const jobRows = renderCiJobRows(jobs);
    const activeNote = Number(runsPayload.activeCount) > 0 ? `<span>${escapeHtml(String(runsPayload.activeCount))} active</span>` : "";
    return `
      <section class="viewer-ci__section">
        <div class="viewer-ci__heading"><h2>Latest release run</h2>${renderCiBadge(state)}</div>
        <ul class="viewer-ci__list">${runRows}</ul>
        ${runUrl}
      </section>
      <section class="viewer-ci__section">
        <div class="viewer-ci__heading"><h2>Release jobs</h2>${activeNote || `<span>${escapeHtml(String(jobs.length))} reported</span>`}</div>
        <ul class="viewer-ci__jobs">${jobRows}</ul>
      </section>
    `;
  }
  function renderReleaseRunsButtonBadge(payload) {
    const state = payload?.badgeState || payload?.state || "unknown";
    const tone = ciBadgeTone(state);
    const stateLabel = ciBadgeLabel(state);
    const version = String(payload?.version || payload?.run?.version || "").trim();
    const label = version || stateLabel;
    const title = payload?.message || (version ? `Release ${version} (${stateLabel})` : `Release ${stateLabel}`);
    return `<span class="viewer-ci-badge viewer-ci-badge--${escapeHtml(tone)}" data-viewer-release-badge title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
  }
  function renderReleaseStatus(payload, runsPayload) {
    const state = payload?.state || "not_configured";
    const gates = Array.isArray(payload?.gates) ? payload.gates : [];
    const blockedGate = gates.find((gate) => gate && gate.required !== false && gate.blocking_reason);
    const orderedGates = blockedGate ? [blockedGate, ...gates.filter((gate) => gate !== blockedGate)] : gates;
    const gateRows = gates.length ? orderedGates.map((gate) => renderReleaseGate(gate, { blocking: gate === blockedGate })).join("") : `
      <div class="viewer-ci__empty">${escapeHtml(payload?.next_action || "Add logics/release/contract.json to configure release workflow state.")}</div>
    `;
    const evidenceCount = gates.filter((gate) => gate?.evidence).length;
    const releaseVerdict = (() => {
      if (!payload?.configured) {
        return { tone: "unknown", sentence: "No release contract is configured, so nothing can be checked." };
      }
      if (blockedGate) {
        const counts = gates.length ? ` ${evidenceCount} of ${gates.length} gates have evidence.` : "";
        return { tone: "fail", sentence: `Blocked by ${blockedGate.id}.${counts}` };
      }
      if (String(state).toLowerCase() === "ready" || String(state).toLowerCase() === "pass") {
        return { tone: "passing", sentence: `Ready to release ${payload?.target_version || "this version"}. All ${gates.length} gates pass.` };
      }
      return { tone: releaseBadgeTone(state), sentence: `Release state is ${state}. ${evidenceCount} of ${gates.length} gates have evidence.` };
    })();
    const rawNextAction = String(payload?.next_action || "").trim();
    const blockingReason = String(blockedGate?.blocking_reason || "").trim();
    const nextAction = blockingReason && rawNextAction.includes(blockingReason) ? "" : rawNextAction;
    const verdictHtml = `
      <section class="viewer-release__verdict viewer-release__verdict--${escapeHtml(releaseVerdict.tone)}" role="status">
        <p class="viewer-release__verdict-text">${escapeHtml(releaseVerdict.sentence)}</p>
        ${nextAction ? `<p class="viewer-release__verdict-action">${escapeHtml(nextAction)}</p>` : ""}
      </section>
    `;
    return `
      <div class="viewer-release">
        ${renderCiModeSwitcher("release")}
        ${verdictHtml}
        <div class="viewer-ci__workspace viewer-release__workspace">
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Release state</h2><span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(releaseBadgeTone(state))}">${escapeHtml(state)}</span></div>
            <ul class="viewer-ci__list">
              <li class="viewer-ci__row"><span>Version</span><strong>${escapeHtml(payload?.target_version || "Unknown")}</strong></li>
              <li class="viewer-ci__row"><span>Contract</span><strong>${escapeHtml(payload?.configured ? payload.contract_path || "configured" : "not configured")}</strong></li>
              <li class="viewer-ci__row"><span>Commit</span><strong>${escapeHtml(payload?.commit ? String(payload.commit).slice(0, 12) : "unknown")}</strong></li>
            </ul>
          </section>
          ${renderReleaseRunSection(runsPayload)}
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Gates</h2><span>${escapeHtml(String(gates.length))} configured</span></div>
            <div class="viewer-release__gates">${gateRows}</div>
          </section>
        </div>
      </div>
    `;
  }
  function renderSignalRows(items, emptyText = "No signals") {
    if (!items.length) {
      return `<li class="viewer-insights__signal viewer-insights__signal--empty">${escapeHtml(emptyText)}</li>`;
    }
    return items.map(([label, value, tone]) => `
      <li class="viewer-insights__signal${tone ? ` viewer-insights__signal--${escapeHtml(tone)}` : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </li>
    `).join("");
  }
  function renderWorkspaceBreadcrumb(currentPath) {
    const segments = String(currentPath || "").split("/").filter(Boolean);
    const crumbs = [
      `<button class="viewer-workspace__crumb" type="button" data-viewer-workspace-tree="" title="Workspace root">/</button>`
    ];
    let accum = "";
    segments.forEach((segment, idx) => {
      accum = accum ? `${accum}/${segment}` : segment;
      const isLast = idx === segments.length - 1;
      crumbs.push(`<span class="viewer-workspace__crumb-sep" aria-hidden="true">/</span>`);
      crumbs.push(
        `<button class="viewer-workspace__crumb${isLast ? " is-current" : ""}" type="button" data-viewer-workspace-tree="${escapeHtml(accum)}" title="${escapeHtml(accum)}"${isLast ? ' aria-current="location"' : ""}>${escapeHtml(segment)}</button>`
      );
    });
    return `<nav class="viewer-workspace__breadcrumb" aria-label="Workspace breadcrumb">${crumbs.join("")}</nav>`;
  }
  function renderWorkspaceTree(treePayload, selectedPath = "") {
    if (!treePayload || treePayload.state !== "ok") {
      const message = treePayload?.message || "Workspace tree is unavailable.";
      const state = treePayload?.state === "unavailable" ? "unavailable" : "empty";
      return `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--${state}"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">${state === "unavailable" ? "!" : "\xB7"}</span><span>${escapeHtml(message)}</span></div>`;
    }
    const currentPath = String(treePayload.path || "");
    const parentPath = workspaceParentPath(currentPath);
    const upButton = currentPath ? `<button class="viewer-workspace__item viewer-workspace__item--up" type="button" data-viewer-workspace-tree="${escapeHtml(parentPath)}" title="Parent directory"><span class="viewer-workspace__item-icon" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path fill="currentColor" d="M8 3 3 8h3v5h4V8h3L8 3Z"/></svg></span><span class="viewer-workspace__item-name">..</span></button>` : "";
    const rows = (Array.isArray(treePayload.entries) ? treePayload.entries : []).map((entry) => {
      const path = String(entry.path || "");
      const kind = String(entry.kind || "file");
      const ignored = Boolean(entry.ignored);
      const selected = path === selectedPath;
      const actionAttr = kind === "directory" && !ignored ? `data-viewer-workspace-tree="${escapeHtml(path)}"` : `data-viewer-workspace-preview="${escapeHtml(path)}"`;
      const classes = [
        "viewer-workspace__item",
        `viewer-workspace__item--${kind === "directory" ? "directory" : "file"}`
      ];
      if (selected) classes.push("is-selected");
      if (ignored) classes.push("is-muted");
      return `
        <button class="${classes.join(" ")}" type="button" ${actionAttr} title="${escapeHtml(path)}"${selected ? ' aria-current="true"' : ""}>
          <span class="viewer-workspace__item-icon" aria-hidden="true">${workspaceEntryIcon(kind, ignored)}</span>
          <span class="viewer-workspace__item-name">${escapeHtml(entry.name || path || "/")}</span>
        </button>
      `;
    }).join("");
    return `
      <div class="viewer-workspace__tree-header">
        ${renderWorkspaceBreadcrumb(currentPath)}
      </div>
      <div class="viewer-workspace__tree-list" role="list">
        ${upButton}
        ${rows || '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span><span>Directory is empty.</span></div>'}
      </div>
      ${treePayload.truncated ? '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--warn"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span><span>Directory listing truncated.</span></div>' : ""}
    `;
  }
  function returnToProjectSurface() {
    const activityPanel = document.getElementById("activity-panel");
    if (activityPanel instanceof HTMLElement) {
      activityPanel.hidden = true;
    }
    if (document.body) {
      document.body.dataset.viewerSurface = "project";
    }
    document.body?.classList.remove("viewer-screen-activity");
    document.body?.classList.remove("viewer-screen-review");
    document.body?.classList.add("viewer-screen-project");
  }
  function runtimeStatusSignature(payload) {
    return stableStringify(payload || {});
  }
  function setNavMenuBadges(target, html) {
    const item = navMenuItem(target);
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.querySelector("[data-viewer-menu-badges]")?.remove();
    if (html) {
      item.insertAdjacentHTML("beforeend", `<span class="viewer-nav-menu__badges" data-viewer-menu-badges>${html}</span>`);
    }
  }
  function showRequestDraftModal({ nextNumber } = {}) {
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
      const controls = /* @__PURE__ */ new Map();
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
      const destination = document.createElement("p");
      destination.className = "viewer-themed-modal__destination";
      const destinationLabel = document.createElement("span");
      destinationLabel.textContent = "Will be created at ";
      const destinationPath = document.createElement("code");
      destination.append(destinationLabel, destinationPath);
      body?.appendChild(destination);
      const submitButton = modal.querySelector(".viewer-themed-modal__submit");
      const refresh = () => {
        const intent = String(controls.get("intent")?.value || "").trim();
        destinationPath.textContent = previewRequestPath({
          title: String(controls.get("title")?.value || ""),
          intent: String(controls.get("intent")?.value || ""),
          nextNumber
        });
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = !intent;
          submitButton.title = intent ? "" : "Fill in Need first.";
        }
      };
      controls.forEach((control) => control.addEventListener("input", refresh));
      refresh();
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
      select.value = value && options.includes(value) ? value : options[0] || "";
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
  function showStatusChangeModal({ title, message, options, value, submitLabel = "Apply", previewLabel, defaultCommitMessage }) {
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
      select.value = value && options.includes(value) ? value : options[0] || "";
      const preview = document.createElement("p");
      preview.className = "viewer-status-confirm__preview";
      const commitRow = document.createElement("label");
      commitRow.className = "viewer-status-confirm__commit-row";
      const commitCheckbox = document.createElement("input");
      commitCheckbox.type = "checkbox";
      commitCheckbox.checked = true;
      const commitText = document.createElement("span");
      commitText.textContent = "Commit this change";
      commitRow.append(commitCheckbox, commitText);
      const commitMessage = document.createElement("textarea");
      commitMessage.className = "viewer-themed-modal__input viewer-status-confirm__message";
      commitMessage.rows = 2;
      let messageDirty = false;
      commitMessage.addEventListener("input", () => {
        messageDirty = true;
      });
      const refresh = () => {
        preview.textContent = `${previewLabel ? `${previewLabel}: ` : ""}${value || "(none)"} \u2192 ${select.value}`;
        if (!messageDirty && typeof defaultCommitMessage === "function") {
          commitMessage.value = defaultCommitMessage(select.value);
        }
        commitMessage.hidden = !commitCheckbox.checked;
      };
      select.addEventListener("change", refresh);
      commitCheckbox.addEventListener("change", refresh);
      refresh();
      body?.append(select, preview, commitRow, commitMessage);
      const done = (result) => {
        closeThemedModal(modal);
        resolve(result);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done({
        status: select.value,
        commit: commitCheckbox.checked,
        message: commitMessage.value.trim()
      }));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
      });
      window.setTimeout(() => {
        select.focus();
      }, 0);
    });
  }
  function showCommitOfferModal({ title = "Commit this change?", message, defaultMessage }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel: "Commit", cancelLabel: "Not now" });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const commitMessage = document.createElement("textarea");
      commitMessage.className = "viewer-themed-modal__input viewer-status-confirm__message";
      commitMessage.rows = 2;
      commitMessage.value = defaultMessage || "";
      body?.appendChild(commitMessage);
      const done = (result) => {
        closeThemedModal(modal);
        resolve(result);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done({ commit: true, message: commitMessage.value.trim() }));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done({ commit: false, message: "" }));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done({ commit: false, message: "" }));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done({ commit: false, message: "" });
      });
      window.setTimeout(() => commitMessage.focus(), 0);
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
  function sortCdxSessionsByRemaining(entries) {
    return [...entries].sort((left, right) => {
      const leftRemaining = cdxRemainingPct(left);
      const rightRemaining = cdxRemainingPct(right);
      if (leftRemaining === null && rightRemaining === null) {
        return 0;
      }
      if (leftRemaining === null) {
        return 1;
      }
      if (rightRemaining === null) {
        return -1;
      }
      return rightRemaining - leftRemaining;
    });
  }
  function viewerStateSignature(payload) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const projects = Array.isArray(payload?.projects) ? payload.projects : [];
    return stableStringify({
      root: payload?.root || "",
      repository: payload?.repository || {},
      capabilities: normalizeCapabilities(payload),
      bootstrapWarning: payload?.bootstrapWarning || null,
      environmentWarning: payload?.environmentWarning || null,
      projects: projects.map((project) => ({
        id: project?.id || "",
        active: Boolean(project?.active),
        available: project?.available !== false,
        hasLogics: project?.hasLogics !== false,
        root: project?.root || ""
      })),
      items: items.map((item) => ({
        id: item?.id || "",
        relPath: item?.relPath || "",
        stage: item?.stage || "",
        status: item?.indicators?.Status || item?.status || "",
        updatedAt: item?.updatedAt || ""
      }))
    });
  }
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
    }
  }
  function clearDeviceCredentials() {
    try {
      window.localStorage.removeItem(deviceTokenKey);
      window.localStorage.removeItem(deviceIdKey);
      window.localStorage.removeItem(deviceLabelKey);
    } catch {
    }
  }
  function detectHljsLanguage(path) {
    const file = String(path || "").split(/[\\/]/).pop() || "";
    const lower = file.toLowerCase();
    if (lower === "dockerfile") return "dockerfile";
    if (lower === "makefile") return "makefile";
    const ext = lower.includes(".") ? lower.split(".").pop() : "";
    return HLJS_EXT_LANGUAGE[ext] || "";
  }
  function getActiveToken() {
    return getDeviceToken() || getLanToken();
  }
  function getDeviceToken() {
    try {
      return window.localStorage.getItem(deviceTokenKey) || "";
    } catch {
      return "";
    }
  }
  function getLanToken() {
    try {
      return window.sessionStorage.getItem(lanTokenKey) || "";
    } catch {
      return "";
    }
  }
  function normalizeAutoRefreshIntervalSeconds(value) {
    const seconds = Math.round(Number(value));
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return defaultAutoRefreshIntervalMs / 1e3;
    }
    return Math.min(maxAutoRefreshIntervalSeconds, Math.max(minAutoRefreshIntervalSeconds, seconds));
  }
  function nudgeWorkshopTerminalRedraw(entry) {
    if (!entry || !entry.terminal || !entry.fitAddon) return;
    let dim;
    try {
      entry.fitAddon.fit();
      dim = entry.fitAddon.proposeDimensions();
    } catch {
      return;
    }
    if (!dim || dim.rows <= 0 || dim.cols <= 0) return;
    const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
    const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
    const nudgeRows = rows > WORKSHOP_TERMINAL_MIN_ROWS ? rows - 1 : rows + 1;
    resizeWorkshopTerminal(entry.id, nudgeRows, cols);
    setTimeout(() => resizeWorkshopTerminal(entry.id, rows, cols), 60);
  }
  function readStoredState() {
    try {
      return JSON.parse(window.localStorage.getItem(stateKey) || "null");
    } catch {
      return null;
    }
  }
  function readViewerPreferences() {
    try {
      const value = JSON.parse(window.localStorage.getItem(preferenceKey) || "null");
      if (!value || typeof value !== "object" || value.version !== preferenceVersion) {
        return { version: preferenceVersion };
      }
      return { ...value, version: preferenceVersion };
    } catch {
      return { version: preferenceVersion };
    }
  }
  function refreshLanBannerPairingState() {
    const banner = document.getElementById("viewer-lan-banner");
    const pairButton = document.getElementById("viewer-lan-banner-pair");
    const pairedLabel = document.getElementById("viewer-lan-banner-paired");
    const deviceLabel = (() => {
      try {
        return window.localStorage.getItem(deviceLabelKey) || "";
      } catch {
        return "";
      }
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
  function renderViewerOnboarding(items = []) {
    const corpusDocs = Array.isArray(items) ? items : [];
    const perStage = corpusDocs.reduce((acc, item) => {
      const key = String(item && item.stage || "");
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const stageHolding = (stage) => {
      const keys = Array.isArray(stage.corpusStages) ? stage.corpusStages : [];
      if (!keys.length) return null;
      const parts = keys.map((key) => [key, perStage[key] || 0]);
      const total = parts.reduce((sum, [, count]) => sum + count, 0);
      return { total, parts };
    };
    const stages = onboardingStages.map((stage, index) => {
      const prompts = stage.prompts.map((prompt) => `
        <div class="viewer-onboarding__prompt">
          <div class="viewer-onboarding__prompt-label">Example prompt</div>
          <div class="viewer-onboarding__prompt-text">${escapeHtml(prompt)}</div>
        </div>
      `).join("");
      const actions = stage.actions.map((action) => `
        <button class="btn viewer-onboarding__action" type="button" data-viewer-onboarding-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>
      `).join("");
      const holding = stageHolding(stage);
      const holdingHtml = holding ? `<p class="viewer-onboarding__holding${holding.total ? "" : " viewer-onboarding__holding--empty"}">${holding.total ? `This project has ${escapeHtml(holding.parts.filter(([, count]) => count > 0).map(([key, count]) => `${count} ${key}`).join(", "))}.` : "This project has nothing here yet."}</p>` : "";
      return `
        <section class="viewer-onboarding__stage" id="onboarding-stage-${index + 1}" data-viewer-onboarding-stage="${index + 1}">
          <div class="viewer-onboarding__stage-number" aria-hidden="true">${index + 1} of ${onboardingStages.length}</div>
          <div class="viewer-onboarding__stage-body">
            <h2>${escapeHtml(stage.label)}</h2>
            ${holdingHtml}
            <p class="viewer-onboarding__tagline">${escapeHtml(stage.tagline)}</p>
            <p>${escapeHtml(stage.description)}</p>
            <div class="viewer-onboarding__prompts">${prompts}</div>
            <p class="viewer-onboarding__mapping">${escapeHtml(stage.mapping)}</p>
            ${actions ? `<div class="viewer-onboarding__actions">${actions}</div>` : ""}
          </div>
        </section>
      `;
    }).join("");
    const docs = onboardingDocGuide.map(([cue, destination]) => `
      <div class="viewer-onboarding__doc-card">
        <div>${escapeHtml(cue)}</div>
        <strong>${escapeHtml(destination)}</strong>
      </div>
    `).join("");
    return `
      <div class="viewer-onboarding">
        ${renderCorpusModeSwitcher("getting-started")}
        <header class="viewer-onboarding__header">
          <h1>Logics workflow map</h1>
          <p>Four stages, from the reason for the work to settling the documents it leaves behind. Read the one where this project has nothing yet.</p>
        </header>
        <div class="viewer-onboarding__layout">
          <nav class="viewer-onboarding__nav" aria-label="Workflow stages">
            <p class="viewer-onboarding__nav-title">The ${escapeHtml(onboardingStages.length)} stages, in order</p>
            <p class="viewer-onboarding__nav-legend">Each count is what this project already holds at that stage. A stage holding nothing is the one worth reading.</p>
            <ol class="viewer-onboarding__nav-list">
              ${onboardingStages.map((stage, index) => {
      const holding = stageHolding(stage);
      const covers = stage.covers ? escapeHtml(stage.covers) : "";
      if (!holding) {
        return `<li><a href="#onboarding-stage-${index + 1}">${escapeHtml(stage.label)}</a></li>`;
      }
      const count = holding.total ? `${escapeHtml(holding.total)} document${holding.total === 1 ? "" : "s"}: ${covers || "any kind"}` : `no ${covers || "documents"} yet \u2014 start here`;
      return `<li><a href="#onboarding-stage-${index + 1}">${escapeHtml(stage.label)}</a><span class="viewer-onboarding__nav-count${holding.total ? "" : " viewer-onboarding__nav-count--empty"}">${count}</span></li>`;
    }).join("")}
            </ol>
          </nav>
          <div class="viewer-onboarding__stages">${stages}</div>
        </div>
        <section class="viewer-onboarding__doc-guide">
          <h2>What each document is for</h2>
          <p>A quick rule of thumb for choosing the right artifact before writing or asking an assistant to act.</p>
          <div class="viewer-onboarding__doc-grid">${docs}</div>
        </section>
        <footer class="viewer-onboarding__footer">
          <!-- item_752: Open Health sat here and in the Closeout stage. An action offered
               twice reads as two different actions until you try both. It stays where the
               stage that needs it is. -->
          <button class="btn primary" type="button" data-viewer-onboarding-action="open-logics-insights">Open Insights</button>
          <button class="btn" type="button" data-viewer-onboarding-action="workshop-explorer">Open Explorer</button>
        </footer>
      </div>
    `;
  }
  function renderWorkshopMenuItems() {
    return workshopTabs.map(
      (tab) => `<button class="viewer-nav-menu__item" type="button" role="menuitem" data-viewer-nav-target="workshop:${escapeHtml(tab.id)}" title="${escapeHtml(tab.title)}">${escapeHtml(tab.label)}</button>`
    ).join("");
  }
  function renderWorkshopTabs(activeTab) {
    const buttons = workshopTabs.map((tab) => {
      const isActive = tab.id === activeTab;
      return `<button class="viewer-cdx__mode${isActive ? " is-active" : ""}" type="button" role="tab" aria-selected="${isActive ? "true" : "false"}" data-viewer-workshop-tab="${escapeHtml(tab.id)}" title="${escapeHtml(tab.title)}">${escapeHtml(tab.label)}</button>`;
    }).join("");
    return `<div class="viewer-cdx__modes" role="tablist" aria-label="Workshop sub-screens">${buttons}</div>`;
  }
  function renderWorkspace(treePayload, previewPayload) {
    const selectedPath = previewPayload?.path || "";
    return `
      <div class="viewer-workspace viewer-split">
        <aside class="viewer-workspace__tree viewer-split__list" aria-label="Workspace files">
          ${renderWorkspaceTree(treePayload, selectedPath)}
        </aside>
        <section class="viewer-workspace__preview viewer-split__detail" aria-label="Workspace preview">
          ${renderWorkspacePreview(previewPayload)}
        </section>
      </div>
    `;
  }
  function formatByteSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  function renderWorkspacePreview(previewPayload) {
    if (!previewPayload) {
      return '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span><span>Select a file or directory.</span></div>';
    }
    const path = previewPayload.path || "/";
    const name = previewPayload.name || path || "/";
    const state = previewPayload.state || "unknown";
    if (state === "ok") {
      const isMarkdown = String(previewPayload.contentType || "").includes("markdown") || /\.(?:md|mdown|markdown)$/i.test(path);
      const storedMode = String(window.__logicsWorkspaceMarkdownMode || "");
      const defaultMode = Number(previewPayload.size || 0) >= 100 * 1024 ? "raw" : "preview";
      const markdownMode = storedMode === "raw" || storedMode === "preview" ? storedMode : defaultMode;
      const forceButtonHtml = previewPayload.canForce ? `<button class="btn viewer-code__force" type="button" data-viewer-workspace-preview-full="${escapeHtml(path)}">Load anyway</button>` : "";
      const modeButtons = isMarkdown ? `<div class="viewer-workspace__preview-modes" role="group" aria-label="Markdown view">
            ${["preview", "raw"].map((mode) => `<button class="viewer-cdx__mode${markdownMode === mode ? " is-active" : ""}" type="button" data-viewer-workspace-markdown-mode="${mode}" aria-pressed="${markdownMode === mode ? "true" : "false"}">${mode === "preview" ? "Preview" : "Raw"}</button>`).join("")}
          </div>` : "";
      const api = markdownApi();
      const codeBody = () => renderCodeViewer(previewPayload.content || "", {
        language: detectHljsLanguage(path),
        lineCount: previewPayload.lineCount,
        truncated: Boolean(previewPayload.truncated),
        hardCapHit: Boolean(previewPayload.hardCapHit),
        forceButtonHtml
      });
      const truncatedNotice = previewPayload.truncated ? `<div class="viewer-workspace__preview-notice viewer-workspace__preview-notice--warn"><span>Preview is truncated.</span>${forceButtonHtml}</div>` : "";
      const body = isMarkdown && markdownMode === "preview" && api && typeof api.renderMarkdownToHtml === "function" ? `<div class="viewer-workspace__markdown markdown-preview">${api.renderMarkdownToHtml(previewPayload.content || "")}${truncatedNotice}</div>` : codeBody();
      return `
        <div class="viewer-workspace__preview-header" data-viewer-workspace-preview-path="${escapeHtml(path)}">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
          <div class="viewer-workspace__preview-actions">${modeButtons}<em>${escapeHtml(previewPayload.truncated ? "truncated" : `${previewPayload.size || 0} bytes`)}</em></div>
        </div>
        <div class="viewer-workspace__preview-body">${body}</div>
      `;
    }
    if (state === "oversized") {
      const forceButtonHtml = previewPayload.canForce ? `<button class="btn viewer-code__force" type="button" data-viewer-workspace-preview-full="${escapeHtml(path)}">Load anyway</button>` : "";
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
          <em>${escapeHtml(`${previewPayload.size || 0} bytes`)}</em>
        </div>
        <div class="viewer-workspace__preview-notice viewer-workspace__preview-notice--warn"><span>${escapeHtml(previewPayload.message || "File too large to preview.")}</span>${forceButtonHtml}</div>
      `;
    }
    if (state === "image") {
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
          <em>${escapeHtml(previewPayload.contentType || "image")}</em>
        </div>
        <img class="viewer-workspace__image" src="/api/workspace-file?path=${encodeURIComponent(path)}" alt="${escapeHtml(name)}">
      `;
    }
    if (state === "directory") {
      const entries = Array.isArray(previewPayload.entries) ? previewPayload.entries : [];
      const rows = entries.map((entry) => `
        <li class="viewer-workspace__dir-row${entry.ignored ? " viewer-workspace__dir-row--ignored" : ""}">
          <button type="button" class="viewer-workspace__dir-entry" data-viewer-workspace-select="${escapeHtml(entry.path)}" data-viewer-workspace-select-kind="${escapeHtml(entry.kind || "file")}">
            <span class="viewer-workspace__dir-kind" aria-hidden="true">${entry.kind === "directory" ? "\u25B8" : "\xB7"}</span>
            <span class="viewer-workspace__dir-name">${escapeHtml(entry.name)}</span>
            <span class="viewer-workspace__dir-size">${entry.kind === "directory" ? "" : formatByteSize(entry.size)}</span>
          </button>
        </li>
      `).join("");
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path || "/")}</span></div>
          <em>${escapeHtml(previewPayload.message || "directory")}</em>
        </div>
        ${rows ? `<ul class="viewer-workspace__dir-list">${rows}</ul>${previewPayload.entriesTruncated ? '<p class="viewer-workspace__preview-notice">Only the first 200 entries are listed.</p>' : ""}` : `<div class="viewer-workspace__preview-notice">${escapeHtml(previewPayload.message || "This folder is empty.")}</div>`}
      `;
    }
    const placeholderState = state === "unavailable" ? "unavailable" : "empty";
    const noticeClass = placeholderState === "unavailable" ? " viewer-workspace__preview-notice--unavailable" : "";
    return `
      <div class="viewer-workspace__preview-header">
        <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
        <em>${escapeHtml(state)}</em>
      </div>
      <div class="viewer-workspace__preview-notice${noticeClass}">${escapeHtml(previewPayload.message || "No preview is available.")}</div>
    `;
  }
  function resizeWorkshopTerminal(sessionId, rows, cols) {
    if (!sessionId || rows <= 0 || cols <= 0) return;
    const safeRows = Math.max(rows, WORKSHOP_TERMINAL_MIN_ROWS);
    const safeCols = Math.max(cols, WORKSHOP_TERMINAL_MIN_COLS);
    fetch("/api/workshop-terminal-resize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, rows: safeRows, cols: safeCols })
    }).catch(() => {
    });
  }
  function sanitizeViewerFilterState(value) {
    const nextState = { ...defaultFilterState };
    if (!value || typeof value !== "object") {
      return nextState;
    }
    Object.keys(defaultFilterState).forEach((key) => {
      if (typeof value[key] === "string" && value[key]) {
        nextState[key] = value[key];
      }
    });
    return nextState;
  }
  function setDeviceCredentials({ token, deviceId, label }) {
    try {
      window.localStorage.setItem(deviceTokenKey, token || "");
      window.localStorage.setItem(deviceIdKey, deviceId || "");
      window.localStorage.setItem(deviceLabelKey, label || "");
    } catch {
    }
  }
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
        body: JSON.stringify({ label })
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
        body: JSON.stringify({ pairingId, pin, label })
      });
      const completeData = await completeResponse.json();
      if (!completeResponse.ok || !completeData.ok) {
        await showThemedMessageModal({ title: "Pairing failed", message: String(completeData.error || completeResponse.status) });
        return;
      }
      setDeviceCredentials({
        token: String(completeData.payload?.deviceToken || ""),
        deviceId: String(completeData.payload?.deviceId || ""),
        label: String(completeData.payload?.label || label)
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
  function syncWorkshopTerminalSize(entry, { useHysteresis = false } = {}) {
    if (!entry || !entry.terminal || !entry.fitAddon) return;
    try {
      const dim = entry.fitAddon.proposeDimensions();
      if (!dim || !(dim.rows > 0) || !(dim.cols > 0)) return;
      const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
      const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
      if (useHysteresis && typeof entry.lastSyncedCols === "number" && typeof entry.lastSyncedRows === "number" && Math.abs(cols - entry.lastSyncedCols) < WORKSHOP_TERMINAL_RESIZE_COL_STEP && Math.abs(rows - entry.lastSyncedRows) < WORKSHOP_TERMINAL_RESIZE_ROW_STEP) {
        return;
      }
      entry.lastSyncedCols = cols;
      entry.lastSyncedRows = rows;
      if (entry.terminal.cols !== cols || entry.terminal.rows !== rows) {
        try {
          entry.terminal.resize(cols, rows);
        } catch {
        }
      }
      resizeWorkshopTerminal(entry.id, rows, cols);
    } catch {
    }
  }
  function updateDocumentBadge(stage) {
    const badge = document.getElementById("viewer-document-badge");
    if (!(badge instanceof HTMLElement)) {
      return;
    }
    const normalized = String(stage || "").trim().toLowerCase();
    const label = stageBadgeLabels[normalized];
    if (!label) {
      badge.hidden = true;
      badge.textContent = "";
      badge.removeAttribute("data-stage");
      return;
    }
    badge.textContent = label;
    badge.dataset.stage = normalized;
    badge.title = `${label} document`;
    badge.hidden = false;
  }
  function withLanAuthorization(input, init) {
    const token = getActiveToken();
    if (!token) return init;
    const next = init ? { ...init } : {};
    const headers = new Headers(next.headers || (input instanceof Request ? input.headers : void 0));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    next.headers = headers;
    return next;
  }
  function writeActivityStateForRoot(baseState, root, activityState) {
    const key = activityRootKey(root);
    const previousByRoot = baseState.activityByRoot && typeof baseState.activityByRoot === "object" ? baseState.activityByRoot : {};
    return {
      ...baseState,
      activityByRoot: {
        ...previousByRoot,
        [key]: {
          activitySnapshot: activityState.activitySnapshot && typeof activityState.activitySnapshot === "object" ? activityState.activitySnapshot : {},
          activityHistory: Array.isArray(activityState.activityHistory) ? activityState.activityHistory.slice(0, activityStorageLimit) : []
        }
      }
    };
  }
  function writeStoredState(value) {
    window.localStorage.setItem(stateKey, JSON.stringify(value || null));
  }

  // clients/viewer/src/browser-host/cdx.js
  function activeCdxAssistantCountFromPayload(payload) {
    if (!payload || payload.state !== "ok") {
      return 0;
    }
    const status = payload.status || {};
    const sessions = cdxSessions(status);
    const sessionActive = sessions.filter((session) => {
      const state = String(session.state || session.status || session.availability || "").toLowerCase();
      return session.active === true || state.includes("active") || state.includes("running") || state.includes("busy");
    }).length;
    if (sessionActive > 0) {
      return sessionActive;
    }
    const rowsActive = cdxRows(status).filter((row) => row.active === true).length;
    if (rowsActive > 0) {
      return rowsActive;
    }
    return cdxProviders(status).reduce((total, provider) => total + Math.max(0, Number(provider.active || 0)), 0);
  }
  function activeCdxRunCountFromPayload(payload) {
    if (!payload || payload.state !== "ok" || !Array.isArray(payload.runs)) {
      return 0;
    }
    return payload.runs.filter((run) => ["running", "starting", "pending"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
  }
  function cdxHistoryIdentity(entry) {
    return [
      cdxField(entry, ["started_at", "startedAt", "created_at", "createdAt"], ""),
      cdxHistorySessionName(entry),
      cdxField(entry, ["action"], ""),
      cdxField(entry, ["provider"], ""),
      cdxField(entry, ["label"], "")
    ].map((part) => String(part || "")).join("|");
  }
  function cdxReadiness(status) {
    const explicitReadiness = pickFirstObject(status, ["readiness", "quota", "quotas", "limits"]);
    if (objectEntries(explicitReadiness).length) {
      return explicitReadiness;
    }
    const rows = cdxRows(status);
    if (!rows.length) {
      return {};
    }
    const enabled = rows.filter((row) => row.enabled).length;
    const active = rows.filter((row) => row.active).length;
    const authenticated = rows.filter((row) => String(row.auth_status || "").toLowerCase() === "authenticated").length;
    const availableValues = rows.map((row) => row.available_pct).filter((value) => typeof value === "number");
    const lowestAvailable = availableValues.length ? Math.min(...availableValues) : null;
    return {
      enabled_sessions: enabled,
      active_sessions: active,
      authenticated_sessions: authenticated,
      lowest_remaining: lowestAvailable === null ? "not reported" : `${lowestAvailable}%`
    };
  }
  function cdxRunIdentity(run) {
    return String(cdxField(run, ["run_id", "runId", "id"], "")).trim();
  }
  function cdxSessionBlock(item) {
    const explicit = cdxField(item, ["block", "blocked", "blocking"], "");
    if (explicit && explicit !== true) {
      return explicit;
    }
    const fiveHour = Number(cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN));
    const week = Number(cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN));
    if (Number.isFinite(fiveHour) && fiveHour <= 0) {
      return "5H";
    }
    if (Number.isFinite(week) && week <= 1) {
      return "WEEK";
    }
    return explicit === true ? "YES" : "-";
  }
  function cdxSessionPermission(item) {
    return String(cdxField(item, ["permission", "permission_mode", "permissionMode"], "-") || "-");
  }
  function filterCdxEntriesByProvider(entries, providerFilter) {
    if (providerFilter.mode !== "subset" || !providerFilter.selected.length) {
      return entries;
    }
    const selected = new Set(providerFilter.selected);
    return entries.filter((entry) => selected.has(cdxProviderName(entry)));
  }
  function filterCdxHistoryBySession(history, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return history;
    }
    const selected = new Set(sessionFilter.selected);
    return history.filter((entry) => selected.has(cdxHistorySessionName(entry)));
  }
  function filterCdxRunsBySession(runs, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return runs;
    }
    const selected = new Set(sessionFilter.selected);
    return runs.filter((run) => selected.has(cdxRunSessionName(run)));
  }
  function formatCustomTerminalCdxSessionOption(session, name) {
    const parts = [name];
    const title = String(cdxField(session, ["title", "label", "description"], "")).trim();
    if (title && title !== name) parts.push(title);
    const provider = String(cdxField(session, ["provider", "backend"], "")).trim();
    const model = String(cdxField(session, ["model", "model_name", "modelName"], "")).trim();
    const runtime = [provider, model].filter(Boolean).join("/");
    if (runtime) parts.push(runtime);
    const state = String(cdxField(session, ["status", "state", "auth_status", "authStatus"], "")).trim();
    if (state) parts.push(state);
    const remaining = cdxRemainingPct(session);
    if (remaining !== null) parts.push(`${remaining}% left`);
    return parts.join(" \xB7 ");
  }
  function latestCdxSessionName(sessions) {
    let latest = null;
    sessions.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const name = cdxField(entry, ["session_name", "name", "id", "value"]);
      const timestamp = Date.parse(String(cdxField(entry, ["last_launched_at", "lastLaunchedAt"], "")));
      if (!name || name === "-" || !Number.isFinite(timestamp)) {
        return;
      }
      if (!latest || timestamp > latest.timestamp) {
        latest = { name, timestamp };
      }
    });
    return latest?.name || "";
  }
  function renderCdxActionButton(label, attrs, title = "") {
    return `<button class="viewer-cdx__action-button" type="button"${title ? ` title="${escapeHtml(title)}"` : ""} ${attrs}>${escapeHtml(label)}</button>`;
  }
  function renderCdxEntityRows(entries, emptyText, options = {}) {
    const titleKeys = options.titleKeys || ["name", "session_name", "id", "provider", "model", "value"];
    const stateKeys = options.stateKeys || ["state", "status", "readiness", "available", "auth_status"];
    const excludedKeys = [...titleKeys, ...stateKeys, "available_pct", "availablePct", "remaining_pct", "remainingPct", "lowest_available_pct", "lowestAvailablePct"];
    const rows = entries.slice(0, 16).map((entry) => {
      const item = entry && typeof entry === "object" ? entry : { value: entry };
      const name = titleKeys.map((key) => item[key]).find(Boolean) || "entry";
      const state = stateKeys.map((key) => item[key]).find((value) => value !== void 0 && value !== null && value !== "") || "";
      const subtitle = options.subtitleKeys ? options.subtitleKeys.map((key) => item[key]).filter(Boolean).join(" \xB7 ") : "";
      return `
        <li class="viewer-cdx__entity">
          <div class="viewer-cdx__entity-main">
            <div>
              <strong>${escapeHtml(name)}</strong>
              ${subtitle ? `<div class="viewer-cdx__meta">${escapeHtml(subtitle)}</div>` : ""}
            </div>
            <div class="viewer-cdx__entity-status">
              ${renderCdxRemainingPill(item)}
              ${renderCdxBadge(state)}
            </div>
          </div>
          ${renderCdxDetailPills(item, excludedKeys)}
        </li>
      `;
    }).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }
  function renderCdxReport(payload) {
    if (!payload || payload.state !== "ok" || !payload.report) {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("runs")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX run report is unavailable.")}</div>
        </div>
      `;
    }
    const report = payload.report || {};
    const run = report.run || {};
    const taskReport = report.task_report || {};
    const runError = report.error || run.error || {};
    const artifacts = report.artifacts || run.artifacts || {};
    const permissionDenials = Array.isArray(report.permissionDenials) ? report.permissionDenials : Array.isArray(report.permission_denials) ? report.permission_denials : [];
    const findings = Array.isArray(taskReport.findings) ? taskReport.findings : [];
    const missionOutput = cdxReportMissionOutput(report, run, taskReport);
    const summary = cdxReportSummary(report, taskReport, missionOutput, runError, permissionDenials);
    const nextAction = cdxReportNextAction(taskReport, missionOutput, runError, permissionDenials, findings);
    const tokenUsage = formatCdxTokenUsage(cdxTokenUsage(report) || cdxTokenUsage(run) || cdxTokenUsage(taskReport));
    const findingRows = findings.map((finding, index) => {
      const location = [finding.path || finding.file || "", finding.line || ""].filter(Boolean).join(":") || "-";
      return `<li class="viewer-cdx__entity"><div class="viewer-cdx__entity-main"><div><strong>${escapeHtml(finding.message || finding.title || `Finding ${index + 1}`)}</strong><div class="viewer-cdx__meta">${escapeHtml(location)}</div></div>${renderCdxBadge(finding.severity || "unknown")}</div></li>`;
    }).join("");
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("runs")}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading viewer-ci__heading--actions">
            <!-- item_759: this read "Run report" under a document header already titled
                 "CDX run report" -- the screen naming itself twice, in the two most
                 prominent places on it. The section names the run it is showing. -->
            <div><h2>${escapeHtml(report.missionTitle || report.missionId || run.id || "This run")}</h2><span>${escapeHtml(run.status || "unknown")}</span></div>
            <button class="viewer-cdx__mode" type="button" data-viewer-cdx-back-runs>Back to reports</button>
          </div>
          <ul class="viewer-cdx__list">
            <li class="viewer-cdx__row viewer-cdx__row--block"><span>Summary</span><div class="viewer-cdx__detail-value"><strong>${escapeHtml(summary)}</strong></div></li>
            <li class="viewer-cdx__row viewer-cdx__row--block"><span>Next</span><div class="viewer-cdx__detail-value"><strong>${escapeHtml(nextAction)}</strong></div></li>
          </ul>
          <ul class="viewer-cdx__list">
            ${renderCdxReportKeyList([
      ["Status", run.status || "unknown"],
      ["Run", run.run_id || taskReport.run_id || "-"],
      ["Session", run.session || taskReport.session || ""],
      ["Tokens", tokenUsage],
      ["Findings", String(findings.length)],
      ["Artifacts", String(objectEntries(artifacts).length)]
    ])}
          </ul>
        </section>
        ${renderCdxMissionOutput(missionOutput)}
        ${permissionDenials.length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Permission denials</h2><span>${escapeHtml(permissionDenials.length)} reported</span></div>
            <ul class="viewer-cdx__list">
              ${permissionDenials.map((denial, index) => renderCdxDetailRow(`Denial ${index + 1}`, denial)).join("")}
            </ul>
          </section>
        ` : ""}
        ${objectEntries(runError).length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Signal</h2><span>${escapeHtml(runError.code || "reported")}</span></div>
            <ul class="viewer-cdx__list">${renderCdxObjectRows(runError, "No run signal reported.")}</ul>
          </section>
        ` : ""}
        ${objectEntries(artifacts).length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Artifacts</h2><span>${escapeHtml(objectEntries(artifacts).length)} paths</span></div>
            <ul class="viewer-cdx__list">${renderCdxArtifactRows(artifacts, "No artifact paths reported.")}</ul>
          </section>
        ` : ""}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Findings</h2><span>${escapeHtml(findings.length)} reported</span></div>
          <ul class="viewer-cdx__list">${findingRows || '<li class="viewer-cdx__empty">No structured findings reported.</li>'}</ul>
        </section>
      </div>
    `;
  }
  function renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal) {
    if (!name || name === "-") {
      return escapeHtml(label);
    }
    const enabled = isCdxSessionEnabled(item);
    const resumeAvailable = item.resume_available === true || item.resumeAvailable === true || item.resumable === true;
    const canHandoff = Boolean(enabled && canLaunchTerminal);
    return `
      <details class="viewer-cdx__menu viewer-cdx__session-menu">
        <summary class="viewer-cdx__path-link viewer-cdx__session-summary" title="CDX session actions for ${escapeHtml(name)}">${escapeHtml(label)}</summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__session-menu-panel" role="menu" aria-label="CDX session actions for ${escapeHtml(name)}">
          ${enabled && canLaunchTerminal ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="new" data-viewer-cdx-session="${escapeHtml(name)}">New</button>` : ""}
          ${enabled && canLaunchTerminal && resumeAvailable ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="resume" data-viewer-cdx-session="${escapeHtml(name)}">Resume</button>` : ""}
          ${canHandoff ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="handoff" data-viewer-cdx-session="${escapeHtml(name)}">Handoff...</button>` : ""}
          <button class="viewer-cdx__menu-action viewer-cdx__menu-action--config" type="button" role="menuitem" data-viewer-cdx-session-action="config" data-viewer-cdx-session="${escapeHtml(name)}">Config</button>
          <button class="viewer-cdx__menu-action viewer-cdx__menu-action--danger" type="button" role="menuitem" data-viewer-cdx-session-action="remove" data-viewer-cdx-session="${escapeHtml(name)}">Remove</button>
        </div>
      </details>
    `;
  }
  function renderCdxTokenUsage(usage) {
    if (!usage) {
      return '<span class="viewer-cdx__token-empty">-</span>';
    }
    const total = usage.totalTokens ?? "-";
    const input = usage.inputTokens ?? "-";
    const output = usage.outputTokens ?? "-";
    return `
      <div class="viewer-cdx__token-cell" title="${escapeHtml(formatCdxTokenUsage(usage))}">
        <strong>${escapeHtml(total)} total</strong>
        <span><em>${escapeHtml(input)}</em> in <em>${escapeHtml(output)}</em> out</span>
      </div>
    `;
  }
  function renderCdxUnreadBadge(section, label, count) {
    const title = cdxSectionBadgeTitle(section, count);
    return `<span class="viewer-cdx-button-badge viewer-cdx-button-badge--unread" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
  }
  function renderTextRemaining(item) {
    const percent = cdxRemainingPct(item);
    return percent === null ? "" : `${percent}% remaining`;
  }
  function setupCdxImportExportHandlers() {
    const importBtn = document.getElementById("viewer-cdx-import-btn");
    if (importBtn) {
      importBtn.addEventListener("click", async () => {
        const fileInput = document.getElementById("viewer-cdx-import-file");
        const passInput = document.getElementById("viewer-cdx-import-pass");
        const mergeCheck = document.getElementById("viewer-cdx-import-merge");
        const forceCheck = document.getElementById("viewer-cdx-import-force");
        const statusEl = document.getElementById("viewer-cdx-import-status");
        const file = fileInput?.files?.[0];
        if (!file) {
          showCdxFormStatus(statusEl, "error", "Please select a file.");
          return;
        }
        importBtn.disabled = true;
        showCdxFormStatus(statusEl, "info", "Importing\u2026");
        try {
          const fileBase64 = await fileToBase64(file);
          const response = await fetch("/api/cdx-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileBase64,
              passphrase: passInput?.value || "",
              merge: mergeCheck?.checked ?? true,
              force: forceCheck?.checked ?? false
            })
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok) {
            showCdxFormStatus(statusEl, "ok", data.payload?.message || "Import complete.");
            if (fileInput) fileInput.value = "";
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || `Import failed (HTTP ${response.status}).`);
          }
        } catch (err) {
          showCdxFormStatus(statusEl, "error", err?.message || "Import failed.");
        } finally {
          importBtn.disabled = false;
        }
      });
    }
    const exportBtn = document.getElementById("viewer-cdx-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const passInput = document.getElementById("viewer-cdx-export-pass");
        const authCheck = document.getElementById("viewer-cdx-export-auth");
        const allCheck = document.getElementById("viewer-cdx-export-all");
        const statusEl = document.getElementById("viewer-cdx-export-status");
        exportBtn.disabled = true;
        showCdxFormStatus(statusEl, "info", "Exporting\u2026");
        const sessions = allCheck?.checked ? [] : Array.from(document.querySelectorAll(".viewer-cdx__export-session:checked")).map((el) => el.value);
        try {
          const response = await fetch("/api/cdx-export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessions, passphrase: passInput?.value || "", includeAuth: authCheck?.checked ?? true })
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok) {
            downloadBase64File(data.payload?.fileBase64 || "", data.payload?.filename || "cdx-accounts.cdx");
            showCdxFormStatus(statusEl, "ok", "Export ready \u2014 file downloaded.");
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || `Export failed (HTTP ${response.status}).`);
          }
        } catch (err) {
          showCdxFormStatus(statusEl, "error", err?.message || "Export failed.");
        } finally {
          exportBtn.disabled = false;
        }
      });
    }
    const exportAllCheck = document.getElementById("viewer-cdx-export-all");
    if (exportAllCheck) {
      exportAllCheck.addEventListener("change", () => {
        const sessionBoxes = document.querySelectorAll(".viewer-cdx__export-session");
        sessionBoxes.forEach((cb) => {
          cb.disabled = exportAllCheck.checked;
        });
      });
    }
  }
  function updateCdxSessionEntry(item, sessionName, enable) {
    if (!item || typeof item !== "object" || cdxSessionName(item) !== sessionName) {
      return false;
    }
    item.enabled = enable;
    item.status = enable ? "enabled" : "disabled";
    if ("state" in item) {
      item.state = enable ? "enabled" : "disabled";
    }
    if (!enable && "active" in item) {
      item.active = false;
    }
    return true;
  }
  function updateCdxSessionPermissionEntry(item, sessionName, permission) {
    if (!item || typeof item !== "object" || cdxSessionName(item) !== sessionName) {
      return false;
    }
    item.permission = permission;
    item.permission_mode = permission;
    item.permissionMode = permission;
    return true;
  }
  function renderCdxHistoryControls(visibleColumns, knownSessions, sessionFilter) {
    const columnRows = cdxHistoryColumns.map((column) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-history-column="${escapeHtml(column.id)}"${visibleColumns[column.id] ? " checked" : ""}>
        <span>${escapeHtml(column.label)}</span>
      </label>
    `).join("");
    const selected = new Set(sessionFilter.mode === "subset" ? sessionFilter.selected : knownSessions);
    const sessionRows = knownSessions.map((session) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-history-session="${escapeHtml(session)}"${selected.has(session) ? " checked" : ""}>
        <span>${escapeHtml(session)}</span>
      </label>
    `).join("");
    const sessionSummary = sessionFilter.mode === "subset" && sessionFilter.selected.length ? `${sessionFilter.selected.length}/${knownSessions.length || sessionFilter.selected.length}` : "All";
    return `
      <div class="viewer-cdx__controls" aria-label="CDX history table controls">
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Configure history columns" aria-label="Configure history columns">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX history columns">${columnRows}</div>
        </details>
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Filter history sessions" aria-label="Filter history sessions">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
            <span class="viewer-cdx__icon-count">${escapeHtml(sessionSummary)}</span>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX history session filter">
            <button class="viewer-cdx__menu-action" type="button" data-viewer-cdx-history-session-all>All sessions</button>
            ${sessionRows || '<div class="viewer-cdx__empty">No sessions reported.</div>'}
          </div>
        </details>
      </div>
    `;
  }
  function renderCdxLogPreview(payload) {
    const path = payload?.path || "";
    const content = payload?.content || "";
    const truncated = Boolean(payload?.truncated);
    const parsed = parseCdxLogJson(content);
    return `
      <div class="viewer-cdx">
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Log preview</h2><span>${truncated ? "latest output" : "complete file"}</span></div>
          <div class="viewer-cdx__log-preview">
            <div class="viewer-cdx__meta">${escapeHtml(path)}</div>
            ${truncated ? '<div class="viewer-cdx__state viewer-cdx__state--warn">Preview truncated to the end of the file. Open the file externally for the full log.</div>' : ""}
            ${renderCdxStructuredLog(parsed)}
            <details class="viewer-cdx__log-raw"${parsed ? "" : " open"}>
              <summary>Raw log</summary>
              ${content ? renderCodeViewer(content, { language: detectHljsLanguage(path), truncated }) : '<pre class="viewer-cdx__log-content">Log is empty.</pre>'}
            </details>
          </div>
        </section>
      </div>
    `;
  }
  function renderCdxRunControls(visibleColumns, knownSessions, sessionFilter) {
    const columnRows = cdxRunColumns.map((column) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-run-column="${escapeHtml(column.id)}"${visibleColumns[column.id] ? " checked" : ""}>
        <span>${escapeHtml(column.label)}</span>
      </label>
    `).join("");
    const selected = new Set(sessionFilter.mode === "subset" ? sessionFilter.selected : knownSessions);
    const sessionRows = knownSessions.map((session) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-run-session="${escapeHtml(session)}"${selected.has(session) ? " checked" : ""}>
        <span>${escapeHtml(session)}</span>
      </label>
    `).join("");
    const sessionSummary = sessionFilter.mode === "subset" && sessionFilter.selected.length ? `${sessionFilter.selected.length}/${knownSessions.length || sessionFilter.selected.length}` : "All";
    return `
      <div class="viewer-cdx__controls" aria-label="CDX reports table controls">
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Configure run columns" aria-label="Configure run columns">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX run columns">${columnRows}</div>
        </details>
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Filter report sessions" aria-label="Filter report sessions">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
            <span class="viewer-cdx__icon-count">${escapeHtml(sessionSummary)}</span>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX report session filter">
            <button class="viewer-cdx__menu-action" type="button" data-viewer-cdx-run-session-all>All sessions</button>
            ${sessionRows || '<div class="viewer-cdx__empty">No sessions reported.</div>'}
          </div>
        </details>
      </div>
    `;
  }
  function renderCdxStatusControls(knownProviders, knownSessions, visibleColumns, providerFilter) {
    const columnRows = cdxStatusColumns.map((column) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-column="${escapeHtml(column.id)}"${visibleColumns[column.id] ? " checked" : ""}>
        <span>${escapeHtml(column.label)}</span>
      </label>
    `).join("");
    const selected = new Set(providerFilter.mode === "subset" ? providerFilter.selected : knownProviders);
    const providerRows = knownProviders.map((provider) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-provider="${escapeHtml(provider)}"${selected.has(provider) ? " checked" : ""}>
        <span>${escapeHtml(provider)}</span>
      </label>
    `).join("");
    const providerSummary = providerFilter.mode === "subset" && providerFilter.selected.length ? `${providerFilter.selected.length}/${knownProviders.length || providerFilter.selected.length}` : "All";
    return `
      <div class="viewer-cdx__controls" aria-label="CDX status table controls">
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Configure status columns" aria-label="Configure status columns">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX status columns">${columnRows}</div>
        </details>
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Filter status providers" aria-label="Filter status providers">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
            <span class="viewer-cdx__icon-count">${escapeHtml(providerSummary)}</span>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX provider filter">
            <button class="viewer-cdx__menu-action" type="button" data-viewer-cdx-provider-all>All providers</button>
            ${providerRows || '<div class="viewer-cdx__empty">No providers reported.</div>'}
          </div>
        </details>
        ${renderCdxImportExportControls(knownSessions)}
      </div>
    `;
  }
  function cdxReportNextAction(taskReport, missionOutput, runError, permissionDenials, findings) {
    if (permissionDenials.length) {
      return "Review denied operations before rerunning or applying work.";
    }
    if (findings.length) {
      return "Review findings and create a Logics request if follow-up is needed.";
    }
    if (cdxCount(missionOutput?.recommendations)) {
      return "Review recommendations in the details below.";
    }
    if (runError?.message) {
      return "Inspect the run signal and logs.";
    }
    if (taskReport?.summary || missionOutput?.summary) {
      return "Inspect the artifacts if you need the full transcript.";
    }
    return "Open the transcript or stdout artifact for raw output.";
  }
  function cdxSessionName(item) {
    return cdxField(item, ["session_name", "name", "id", "value"], "");
  }
  function cdxTokenUsage(item) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const candidates = [
      item.usage,
      item.tokenUsage,
      item.tokens,
      item.run && typeof item.run === "object" ? item.run.usage : null,
      item.result && typeof item.result === "object" ? item.result.usage : null
    ];
    const usage = candidates.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate));
    if (!usage || usage.available === false) {
      return null;
    }
    const inputTokens = cdxUsageNumber(usage.inputTokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens);
    const outputTokens = cdxUsageNumber(usage.outputTokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens);
    const explicitTotal = cdxUsageNumber(usage.totalTokens ?? usage.total_tokens);
    const totalTokens = explicitTotal ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
    if (inputTokens === null && outputTokens === null && totalTokens === null) {
      return null;
    }
    return { inputTokens, outputTokens, totalTokens };
  }
  function isCdxSessionEnabled(item) {
    if (item.enabled === false) {
      return false;
    }
    const state = String(cdxField(item, ["status", "state"], "")).toLowerCase();
    return state !== "disabled";
  }
  function renderCdxArtifactRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => {
      const path = typeof entry === "string" ? entry : "";
      const filename = path ? path.split(/[\\/]/).filter(Boolean).pop() || path : "";
      return `
        <li class="viewer-cdx__row">
          <span>${escapeHtml(cdxLabel(key))}</span>
          <strong>${path ? `<button class="viewer-cdx__path-link" type="button" data-viewer-cdx-artifact-path="${escapeHtml(path)}" title="${escapeHtml(path)}">${escapeHtml(filename)}</button>` : escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}
          </strong>
        </li>
      `;
    }).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }
  function renderCdxBadge(value, fallback = "reported") {
    const label = String(value || fallback || "reported");
    return `<span class="viewer-cdx__badge viewer-cdx__badge--${cdxStateClass(label)}">${escapeHtml(cdxLabel(label))}</span>`;
  }
  function renderCdxDetailPills(item, excludedKeys) {
    const details = cdxDetailEntries(item, excludedKeys).map(([key, value]) => `
      <span class="viewer-cdx__pill"><span>${escapeHtml(cdxLabel(key))}</span><strong>${escapeHtml(formatCdxValue(key, value))}</strong></span>
    `).join("");
    return details ? `<div class="viewer-cdx__pills">${details}</div>` : "";
  }
  function renderCdxImportExportControls(knownSessions) {
    const sessionRows = knownSessions.map((name) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" class="viewer-cdx__export-session" value="${escapeHtml(name)}" checked>
        <span>${escapeHtml(name)}</span>
      </label>
    `).join("");
    return `
      <details class="viewer-cdx__menu" id="viewer-cdx-import-menu">
        <summary class="viewer-cdx__icon-button" title="Import CDX accounts" aria-label="Import CDX accounts">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide" role="dialog" aria-label="Import CDX accounts">
          <div class="viewer-cdx__import-form">
            <label class="viewer-cdx__form-label">
              <span>File (.cdx)</span>
              <input type="file" class="viewer-cdx__file-input" id="viewer-cdx-import-file" accept=".cdx,.json">
            </label>
            <label class="viewer-cdx__form-label">
              <span>Passphrase</span>
              <input type="password" class="viewer-cdx__pass-input" id="viewer-cdx-import-pass" placeholder="Leave empty if unencrypted" autocomplete="off">
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-import-merge" checked>
              <span>Merge (keep existing accounts)</span>
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-import-force">
              <span>Force overwrite when needed</span>
            </label>
            <button class="viewer-cdx__menu-action viewer-cdx__menu-action--primary" type="button" id="viewer-cdx-import-btn">Import</button>
            <div class="viewer-cdx__form-status" id="viewer-cdx-import-status" hidden></div>
          </div>
        </div>
      </details>
      <details class="viewer-cdx__menu" id="viewer-cdx-export-menu">
        <summary class="viewer-cdx__icon-button" title="Export CDX accounts" aria-label="Export CDX accounts">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide" role="dialog" aria-label="Export CDX accounts">
          <div class="viewer-cdx__import-form">
            <div class="viewer-cdx__form-section-label">Sessions to export</div>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-export-all" checked>
              <span>All sessions</span>
            </label>
            <div id="viewer-cdx-export-sessions">${sessionRows || '<div class="viewer-cdx__empty">No sessions available.</div>'}</div>
            <label class="viewer-cdx__form-label">
              <span>Passphrase</span>
              <input type="password" class="viewer-cdx__pass-input" id="viewer-cdx-export-pass" placeholder="Recommended \u2014 encrypts credentials" autocomplete="off">
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-export-auth" checked>
              <span>Include credentials (--include-auth)</span>
            </label>
            <button class="viewer-cdx__menu-action viewer-cdx__menu-action--primary" type="button" id="viewer-cdx-export-btn">Export</button>
            <div class="viewer-cdx__form-status" id="viewer-cdx-export-status" hidden></div>
          </div>
        </div>
      </details>
    `;
  }
  function renderCdxMissionOutput(output) {
    if (!output) {
      return "";
    }
    const rows = [
      ["Summary", output.summary],
      ["Version", output.version],
      ["Validation", output.validationMode],
      ["Blocked", typeof output.blocked === "boolean" ? output.blocked ? "Yes" : "No" : ""],
      ["Actions", cdxCount(output.actions)],
      ["Findings", cdxCount(output.findings)],
      ["Recommendations", cdxCount(output.recommendations)],
      ["Changed files", cdxCount(output.changedFiles)],
      ["Corpus files", cdxCount(output.corpusFiles)],
      ["Generated files", cdxCount(output.generatedFiles)],
      ["Validation evidence", cdxCount(output.validationEvidence)]
    ].filter(([_label, value]) => value !== void 0 && value !== null && value !== "" && value !== 0);
    const detailKeys = [
      "actions",
      "findings",
      "recommendations",
      "directFixes",
      "requestFiles",
      "actionableFixes",
      "changedFiles",
      "corpusFiles",
      "generatedFiles",
      "validationEvidence",
      "releasePlan"
    ];
    const details = detailKeys.filter((key) => cdxCount(output[key])).map((key) => renderCdxDetailRow(cdxLabel(key), output[key])).join("");
    return `
      <section class="viewer-cdx__section">
        <div class="viewer-ci__heading"><h2>Details</h2><span>${escapeHtml(rows.length)} signals</span></div>
        <ul class="viewer-cdx__list">
          ${rows.map(([label, value]) => renderCdxDetailRow(label, value)).join("") || '<li class="viewer-cdx__empty">No structured mission output was reported.</li>'}
        </ul>
        ${details ? `<ul class="viewer-cdx__list">${details}</ul>` : ""}
      </section>
    `;
  }
  function renderCdxObjectRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => `
      <li class="viewer-cdx__row">
        <span>${escapeHtml(cdxLabel(key))}</span>
        <strong>${escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}</strong>
      </li>
    `).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }
  function renderCdxRemainingPill(item) {
    const percent = cdxRemainingPct(item);
    if (percent === null) {
      return "";
    }
    return `
      <span class="viewer-cdx__remaining viewer-cdx__remaining--${cdxRemainingClass(percent)}" title="${escapeHtml(percent)}% usage remaining">
        <span>Remaining</span>
        <strong>${escapeHtml(percent)}%</strong>
      </span>
    `;
  }
  function renderCdxReportKeyList(rows, emptyText = "No details reported.") {
    const content = rows.filter(([_label, value]) => value !== void 0 && value !== null && value !== "" && value !== 0).map(([label, value]) => `
        <li class="viewer-cdx__row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </li>
      `).join("");
    return content || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }
  function renderCdxStructuredLog(parsed) {
    if (!parsed) {
      return "";
    }
    const label = parsed.kind === "jsonl" ? `${parsed.value.length} JSONL event(s)` : "JSON document";
    return `
      <details class="viewer-cdx__log-structured" open>
        <summary>Structured preview \xB7 ${escapeHtml(label)}</summary>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(parsed.value)}</div>
      </details>
    `;
  }
  function cdxCount(value) {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (value && typeof value === "object") {
      return objectEntries(value).length;
    }
    return value ? 1 : 0;
  }
  function cdxDetailEntries(item, excludedKeys) {
    return objectEntries(item).filter(([key, value]) => !excludedKeys.includes(key) && value !== void 0 && value !== null && value !== "").slice(0, 6);
  }
  function formatCdxValue(key, value) {
    if (["reset_at", "resetAt", "resets_at", "resetsAt", "reset_5h_at", "reset5hAt", "reset_week_at", "resetWeekAt", "updated_at", "updatedAt"].includes(key)) {
      return formatCdxResetAt(value);
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return value;
  }
  function renderCdxDetailRow(label, value) {
    return `
      <li class="viewer-cdx__row viewer-cdx__row--block">
        <span>${escapeHtml(label)}</span>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(value)}</div>
      </li>
    `;
  }
  function formatCdxResetAt(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "-";
    }
    const timestamp = parseCdxDate(raw);
    return timestamp === null ? raw : formatRelativeTime(timestamp);
  }
  function renderCdxDetailValue(value) {
    if (Array.isArray(value)) {
      return `
        <ol class="viewer-cdx__detail-list">
          ${value.map((item) => `
            <li>${typeof item === "object" && item !== null ? `<pre class="viewer-cdx__detail-code">${escapeHtml(JSON.stringify(item, null, 2))}</pre>` : escapeHtml(String(item))}
            </li>
          `).join("")}
        </ol>
      `;
    }
    if (value && typeof value === "object") {
      return `<pre class="viewer-cdx__detail-code">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }
    return `<strong>${escapeHtml(String(value))}</strong>`;
  }
  function createCdxScreen(host) {
    let latestCdxMissionState = {
      missionId: "full-audit",
      sessionId: "",
      strengthId: "standard",
      missionInputs: {},
      runMode: "terminal",
      outputMode: "plan",
      promptOverride: "",
      catalog: null,
      statusPayload: null,
      planPayload: null,
      runPayload: null,
      applyPayload: null
    };
    let latestCdxStatusSignature = "";
    let latestCdxStatusPayload = null;
    let latestCdxRunsPayload = null;
    let latestCdxHistoryPayload = null;
    let latestCdxMemoryPayload = null;
    let latestCdxMemoryScope = "current";
    let latestCdxMemoryView = "cleaned";
    const pendingCdxSessionToggles = /* @__PURE__ */ new Map();
    const pendingCdxSessionPermissions = /* @__PURE__ */ new Map();
    const pendingCdxSessionResets = /* @__PURE__ */ new Set();
    const cdxUnreadState = {
      missions: { count: 0 },
      runs: { seen: null, count: 0 },
      history: { seen: null, count: 0 }
    };
    let cdxMissionBusyKey = "";
    let cdxCloseTarget = null;
    function cdxColumnVisibilityPreference() {
      const stored = host.shared.viewerPreferences.cdxStatusColumns;
      const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
      const visibility = {};
      cdxStatusColumns.forEach((column) => {
        visibility[column.id] = column.defaultVisible !== false;
        if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
          visibility[column.id] = storedVisibility[column.id];
        }
      });
      return visibility;
    }
    function persistCdxColumnVisibility(columnId, visible) {
      const current = cdxColumnVisibilityPreference();
      if (!cdxStatusColumns.some((column) => column.id === columnId)) {
        return;
      }
      host.updateViewerPreferences({
        cdxStatusColumns: {
          visibility: { ...current, [columnId]: Boolean(visible) }
        }
      });
    }
    function cdxRunColumnVisibilityPreference() {
      const stored = host.shared.viewerPreferences.cdxRunColumns;
      const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
      const visibility = {};
      cdxRunColumns.forEach((column) => {
        visibility[column.id] = column.defaultVisible !== false;
        if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
          visibility[column.id] = storedVisibility[column.id];
        }
      });
      return visibility;
    }
    function persistCdxRunColumnVisibility(columnId, visible) {
      const current = cdxRunColumnVisibilityPreference();
      if (!cdxRunColumns.some((column) => column.id === columnId)) {
        return;
      }
      host.updateViewerPreferences({
        cdxRunColumns: {
          visibility: { ...current, [columnId]: Boolean(visible) }
        }
      });
    }
    function cdxRunSessionFilterPreference() {
      const stored = host.shared.viewerPreferences.cdxRunSessions;
      if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
        return { mode: "all", selected: [] };
      }
      const selected = Array.isArray(stored.selected) ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
      return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
    }
    function persistCdxRunSessionFilter(nextFilter) {
      const selected = Array.isArray(nextFilter?.selected) ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
      host.updateViewerPreferences({
        cdxRunSessions: selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] }
      });
    }
    function cdxHistoryColumnVisibilityPreference() {
      const stored = host.shared.viewerPreferences.cdxHistoryColumns;
      const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
      const visibility = {};
      cdxHistoryColumns.forEach((column) => {
        visibility[column.id] = column.defaultVisible !== false;
        if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
          visibility[column.id] = storedVisibility[column.id];
        }
      });
      return visibility;
    }
    function persistCdxHistoryColumnVisibility(columnId, visible) {
      const current = cdxHistoryColumnVisibilityPreference();
      if (!cdxHistoryColumns.some((column) => column.id === columnId)) {
        return;
      }
      host.updateViewerPreferences({
        cdxHistoryColumns: {
          visibility: { ...current, [columnId]: Boolean(visible) }
        }
      });
    }
    function cdxHistorySessionFilterPreference() {
      const stored = host.shared.viewerPreferences.cdxHistorySessions;
      if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
        return { mode: "all", selected: [] };
      }
      const selected = Array.isArray(stored.selected) ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
      return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
    }
    function persistCdxHistorySessionFilter(nextFilter) {
      const selected = Array.isArray(nextFilter?.selected) ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
      host.updateViewerPreferences({
        cdxHistorySessions: selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] }
      });
    }
    function cdxProviderFilterPreference() {
      const stored = host.shared.viewerPreferences.cdxStatusProviders;
      if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
        return { mode: "all", selected: [] };
      }
      const selected = Array.isArray(stored.selected) ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
      return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
    }
    function persistCdxProviderFilter(nextFilter) {
      const selected = Array.isArray(nextFilter?.selected) ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
      host.updateViewerPreferences({
        cdxStatusProviders: selected.length ? { mode: "subset", selected: Array.from(new Set(selected)).sort() } : { mode: "all", selected: [] }
      });
    }
    function setCdxMissionBusy(actionKey, label = "") {
      cdxMissionBusyKey = actionKey || "";
      document.body?.toggleAttribute("data-viewer-cdx-mission-busy", Boolean(cdxMissionBusyKey));
      if (cdxMissionBusyKey) {
        document.body?.setAttribute("data-viewer-cdx-mission-busy-action", cdxMissionBusyKey);
      } else {
        document.body?.removeAttribute("data-viewer-cdx-mission-busy-action");
      }
      cdxMissionActionControls().forEach((control) => {
        if (!("disabled" in control)) {
          return;
        }
        control.disabled = Boolean(cdxMissionBusyKey);
        control.setAttribute("aria-busy", cdxMissionBusyKey ? "true" : "false");
        if (cdxMissionBusyKey) {
          control.setAttribute("data-viewer-action-busy", control.getAttribute("data-viewer-action-key") === actionKey ? "active" : "blocked");
        } else {
          control.removeAttribute("data-viewer-action-busy");
        }
      });
      if (!cdxMissionBusyKey) {
        host.updateCapabilityControls();
        host.applyLocalViewerChrome();
      }
      if (cdxMissionBusyKey && label) {
        host.setMeta(`${label}...`);
      }
    }
    function withCdxMissionAction(actionKey, label, action) {
      if (cdxMissionBusyKey) {
        host.setMeta("Another CDX mission action is still running.");
        return Promise.resolve(false);
      }
      setCdxMissionBusy(actionKey, label);
      return Promise.resolve().then(action).then(() => true).catch((error) => {
        host.setMeta(error.message || "CDX mission action failed.");
        return false;
      }).finally(() => {
        setCdxMissionBusy("", "");
      });
    }
    function updateCdxUnreadBadges() {
      const counts = {
        missions: Math.max(0, cdxUnreadState.missions?.count || 0),
        runs: Math.max(0, cdxUnreadState.runs?.count || 0),
        history: Math.max(0, cdxUnreadState.history?.count || 0)
      };
      const total = counts.missions + counts.runs + counts.history;
      const aggregateLabel = cdxBadgeLabel(total);
      const button = document.getElementById("viewer-cdx");
      if (button instanceof HTMLElement) {
        const parts = [];
        if (counts.missions) parts.push(cdxSectionBadgeTitle("missions", counts.missions));
        if (counts.runs) parts.push(cdxSectionBadgeTitle("runs", counts.runs));
        if (counts.history) parts.push(cdxSectionBadgeTitle("history", counts.history));
        const summary = parts.join(", ");
        button.title = (button.title || "Show CDX status").replace(/\s·\sCDX activity:.*$/, "");
        if (aggregateLabel) {
          button.title = `${button.title || "Show CDX status"} \xB7 CDX activity: ${summary}`;
        }
        applyCdxBadge(button, "[data-viewer-cdx-unread-badge]", aggregateLabel, (label) => `<span class="viewer-cdx-button-badge viewer-cdx-button-badge--unread" data-viewer-cdx-unread-badge title="${escapeHtml(`CDX activity: ${summary}`)}" aria-label="${escapeHtml(`CDX activity: ${summary}`)}">${escapeHtml(label)}</span>`);
      }
      ["missions", "runs", "history"].forEach((section) => {
        const item = navMenuItem(`cdx:${section}`);
        if (!(item instanceof HTMLElement)) return;
        const label = cdxBadgeLabel(counts[section]);
        const existing = item.querySelector("[data-viewer-cdx-unread-menu-badge]");
        const currentLabel = existing ? (existing.textContent || "").trim() : null;
        if (label === null) {
          existing?.remove();
          return;
        }
        if (currentLabel === label) return;
        existing?.remove();
        const badge = renderCdxUnreadBadge(section, label, counts[section]);
        const container = item.querySelector("[data-viewer-menu-badges]");
        if (container) {
          container.insertAdjacentHTML("beforeend", `<span data-viewer-cdx-unread-menu-badge>${badge}</span>`);
        } else {
          item.insertAdjacentHTML("beforeend", `<span class="viewer-nav-menu__badges" data-viewer-menu-badges><span data-viewer-cdx-unread-menu-badge>${badge}</span></span>`);
        }
      });
    }
    function updateCdxMissionsCount(runsPayload) {
      const payload = runsPayload && runsPayload.state === "ok" ? runsPayload : latestCdxRunsPayload;
      cdxUnreadState.missions.count = activeCdxRunCountFromPayload(payload);
      updateCdxUnreadBadges();
    }
    function recordCdxDelta(section, ids, { isOpen, markSeen } = {}) {
      const state2 = cdxUnreadState[section];
      if (!state2) return;
      const current = new Set(ids.filter(Boolean));
      if (state2.seen === null || isOpen || markSeen) {
        state2.seen = current;
        state2.count = 0;
      } else {
        let count = 0;
        current.forEach((id) => {
          if (!state2.seen.has(id)) count += 1;
        });
        state2.count = count;
      }
      updateCdxUnreadBadges();
    }
    function recordCdxUnreadSnapshot(section, payload, options = {}) {
      if (section === "missions") {
        updateCdxMissionsCount();
        return;
      }
      if (section === "runs") {
        recordCdxDelta("runs", cdxRunsList(payload).map(cdxRunIdentity), {
          isOpen: isCdxRunsOpen(),
          markSeen: options.markSeen
        });
        return;
      }
      recordCdxDelta("history", cdxHistoryList(payload).map(cdxHistoryIdentity), {
        isOpen: isCdxHistoryOpen(),
        markSeen: options.markSeen
      });
    }
    function markCdxSectionSeen(section, payload = null) {
      if (section === "missions") {
        updateCdxMissionsCount();
        return;
      }
      if (section === "runs") {
        recordCdxDelta("runs", cdxRunsList(payload || latestCdxRunsPayload).map(cdxRunIdentity), { markSeen: true });
        return;
      }
      recordCdxDelta("history", cdxHistoryList(payload || latestCdxHistoryPayload).map(cdxHistoryIdentity), { markSeen: true });
    }
    function updateMainCdxBadge(payload) {
      const button = document.getElementById("viewer-cdx");
      if (!(button instanceof HTMLElement)) {
        return;
      }
      button.querySelector("[data-viewer-cdx-badge]")?.remove();
      clearNavMenuBadges(["cdx:status"]);
      const activeSessions = activeCdxAssistantCountFromPayload(payload);
      if (activeSessions <= 0) {
        button.title = host.isCapabilityAvailable("cdx") ? "Show CDX status" : host.capabilityMessage("cdx", "CDX is not available for this project.");
        updateCdxUnreadBadges();
        return;
      }
      const label = activeSessions > 9 ? "9+" : String(activeSessions);
      const title = activeSessions === 1 ? "1 active session" : `${activeSessions} active sessions`;
      button.title = `Show CDX status \xB7 ${title}`;
      const badge = `<span class="viewer-cdx-button-badge" data-viewer-cdx-badge title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
      button.insertAdjacentHTML("beforeend", badge);
      setNavMenuBadges("cdx:status", `<span class="viewer-cdx-button-badge" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`);
      updateCdxUnreadBadges();
    }
    async function refreshCdxBadgeCounters() {
      if (!host.isCapabilityAvailable("cdx")) {
        updateMainCdxBadge(null);
        return;
      }
      try {
        const [statusResponse, runsResponse] = await Promise.all([
          fetch("/api/cdx-status", { cache: "no-store" }),
          fetch("/api/cdx-runs").catch(() => null)
        ]);
        if (statusResponse.status === 404) {
          updateMainCdxBadge(null);
          return;
        }
        const data = await statusResponse.json();
        let runsPayload = null;
        if (runsResponse && runsResponse.ok) {
          const runsData = await runsResponse.json();
          runsPayload = runsData?.ok ? runsData.payload : null;
        }
        if (statusResponse.ok && data.ok) {
          latestCdxStatusSignature = runtimeStatusSignature({ status: data.payload, runs: runsPayload });
          updateMainCdxBadge(data.payload, runsPayload);
        }
      } catch {
        updateMainCdxBadge(null);
      }
    }
    function isCdxStatusOpen() {
      const panel = host.documentPanel();
      const title = host.documentTitle();
      return Boolean(panel && !panel.hidden && title && title.textContent === "CDX status");
    }
    function isCdxRunsOpen() {
      const panel = host.documentPanel();
      const title = host.documentTitle();
      return Boolean(panel && !panel.hidden && title && title.textContent === "CDX reports");
    }
    function isCdxHistoryOpen() {
      const panel = host.documentPanel();
      const title = host.documentTitle();
      return Boolean(panel && !panel.hidden && title && title.textContent === "CDX history");
    }
    function isCdxMissionsOpen() {
      const panel = host.documentPanel();
      const title = host.documentTitle();
      return Boolean(panel && !panel.hidden && title && title.textContent === "CDX missions");
    }
    function cdxSessionForTerminal(entry) {
      const serverSession = String(entry?.cdxSession || "").trim();
      if (serverSession) return serverSession;
      const label = String(entry?.label || "").trim();
      if (!label) return "";
      const tokens = label.split(/\s+/).filter(Boolean);
      if (tokens.length < 2 || tokens[0].toLowerCase() !== "cdx") return "";
      if (tokens[1].toLowerCase() === "mission") return "";
      if (tokens[1].toLowerCase() === "handoff") {
        const positional = tokens.slice(2).filter((token) => token && !token.startsWith("-"));
        return positional.length ? positional[positional.length - 1] : "";
      }
      const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
      const names = new Set(
        sessions.map((session) => String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim()).filter(Boolean)
      );
      for (let i = 1; i < tokens.length; i += 1) {
        if (names.has(tokens[i])) return tokens[i];
      }
      const candidate = tokens.slice(2).find((token) => token && !token.startsWith("-"));
      return candidate || "";
    }
    function cdxUsageFromStatus(item) {
      const fiveHourReset = formatCdxResetAt(cdxField(item, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], ""));
      const fiveHour = { percent: cdxRemainingPct({ available_pct: cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN) }), reset: fiveHourReset };
      const week = { percent: cdxRemainingPct({ available_pct: cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN) }), reset: formatCdxResetAt(cdxField(item, ["reset_week_at", "resetWeekAt", "reset_at", "resetAt"], "")) };
      return { percent: cdxRemainingPct(item), reset: fiveHourReset, fiveHour, week };
    }
    function cdxSessionUsage(sessionName) {
      if (!sessionName) return null;
      const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
      const match = sessions.find(
        (session) => String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim() === sessionName
      );
      if (!match) return null;
      return cdxUsageFromStatus(match);
    }
    async function refreshCdxSessionUsage(sessionName) {
      try {
        host.setMeta(sessionName ? `Refreshing CDX usage for ${sessionName}...` : "Refreshing CDX usage...");
        const response = await fetch("/api/cdx-status", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.ok) return;
        latestCdxStatusPayload = data.payload;
        latestCdxStatusSignature = runtimeStatusSignature({ status: data.payload });
        host.renderWorkshopTerminalList();
        rerenderCdxStatusFromPreferences();
        const usage = cdxSessionUsage(sessionName);
        if (usage && usage.percent !== null && usage.percent !== void 0) {
          const resetText = usage.reset && usage.reset !== "-" ? ` \xB7 resets ${usage.reset}` : "";
          host.setMeta(`CDX usage ${sessionName}: ${usage.percent}% remaining${resetText}.`);
        } else {
          host.setMeta(`Refreshed CDX usage${sessionName ? ` for ${sessionName}` : ""}.`);
        }
      } catch (error) {
        host.setMeta(`CDX usage: ${error?.message || error}`);
      }
    }
    async function loadCdxSessionsForCustomTerminal() {
      if (!host.isCapabilityAvailable("cdx")) return [];
      try {
        const response = await fetch("/api/cdx-status", { cache: "no-store" });
        const data = await response.json();
        if (response.ok && data.ok) {
          latestCdxStatusPayload = data.payload;
        }
      } catch {
      }
      const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
      return sessions.filter((session) => session && typeof session === "object" && session.enabled !== false).map((session) => {
        const name = String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim();
        return name ? { name, label: formatCustomTerminalCdxSessionOption(session, name) } : null;
      }).filter(Boolean);
    }
    function renderCdxSessionTable(sessions, emptyText, latestSessionNameOverride = "") {
      if (!sessions.length) {
        return `<div class="viewer-cdx__empty">${escapeHtml(emptyText)}</div>`;
      }
      const visibleColumns = cdxColumnVisibilityPreference();
      const workshopCap = host.capability("workshop");
      const canLaunchTerminal = workshopCap.available === true && Boolean(workshopCap.detail?.terminalsAvailable);
      const latestSessionName = latestSessionNameOverride || latestCdxSessionName(sessions);
      const cellRenderers = {
        session: (item) => {
          const name = cdxSessionName(item);
          const label = `${name}${item.active ? "*" : ""}`;
          return `<td class="viewer-cdx__session-name">${renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal)}</td>`;
        },
        provider: (item) => `<td>${escapeHtml(cdxField(item, ["provider"], "-"))}</td>`,
        status: (item) => {
          const name = cdxSessionName(item);
          const isEnabled = isCdxSessionEnabled(item);
          const badge = renderCdxBadge(cdxField(item, ["status", "state"]));
          if (!name || name === "-") return `<td>${badge}</td>`;
          const pending = pendingCdxSessionToggles.has(name);
          return `<td><button class="viewer-cdx__status-toggle${isEnabled ? " is-on" : " is-off"}${pending ? " is-updating" : ""}" type="button" data-viewer-cdx-toggle="${escapeHtml(name)}" data-viewer-cdx-toggle-state="${isEnabled ? "on" : "off"}" title="${pending ? "Updating" : isEnabled ? "Disable" : "Enable"} ${escapeHtml(name)}"${pending ? " disabled" : ""}>${badge}</button></td>`;
        },
        auth: (item) => {
          const rawAuth = String(cdxField(item, ["auth_status", "authStatus"], "-"));
          const displayAuth = rawAuth.replace("authenticated", "logged");
          const isLoggedOut = rawAuth.toLowerCase() === "logged_out";
          const name = cdxField(item, ["session_name", "name", "id", "value"]);
          if (isLoggedOut && canLaunchTerminal && name && name !== "-") {
            return `<td><button class="viewer-cdx__auth-login" type="button" data-viewer-cdx-login="${escapeHtml(name)}" title="Open Workshop terminal: cdx login ${escapeHtml(name)}">${escapeHtml(displayAuth)}</button></td>`;
          }
          return `<td>${escapeHtml(displayAuth)}</td>`;
        },
        permission: (item) => {
          const name = cdxSessionName(item);
          const pending = name && pendingCdxSessionPermissions.has(name) ? pendingCdxSessionPermissions.get(name) : "";
          const permission = pending || cdxSessionPermission(item);
          const updating = pending ? " is-updating" : "";
          const title = pending ? ` title="Updating ${escapeHtml(name)}"` : "";
          return `<td><span class="viewer-cdx__permission-label${updating}"${title}>${escapeHtml(permission || "-")}</span></td>`;
        },
        ok: (item) => {
          const name = String(cdxField(item, ["session_name", "name", "id", "value"], "")).trim();
          const pct = cdxRemainingPct(item);
          const hasUsage = pct !== null && pct !== void 0 && !Number.isNaN(Number(pct));
          if (name && name !== "-" && hasUsage) {
            return `<td class="viewer-cdx__ok-cell">${renderCdxUsageGauge(cdxUsageFromStatus(item), name)}</td>`;
          }
          return `<td>${renderCdxRemainingPill(item) || escapeHtml(cdxPct(cdxField(item, ["available_pct", "availablePct"], NaN)))}</td>`;
        },
        remaining5h: (item) => {
          const pct = cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN);
          return `<td>${Number.isFinite(Number(pct)) ? escapeHtml(cdxPct(pct)) : ""}</td>`;
        },
        remainingWeek: (item) => `<td>${escapeHtml(cdxPct(cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN)))}</td>`,
        banked: (item) => {
          const count = Number(cdxField(item, ["reset_credits_available", "resetCreditsAvailable"], NaN));
          const name = String(cdxField(item, ["session_name", "name", "id", "value"], "")).trim();
          if (!Number.isFinite(count) || count <= 0) {
            return `<td>${Number.isFinite(count) ? escapeHtml(String(count)) : "-"}</td>`;
          }
          const credits = cdxField(item, ["reset_credits", "resetCredits"], []);
          const expirations = (Array.isArray(credits) ? credits : []).map((credit) => credit && (credit.expires_at || credit.expiresAt)).filter(Boolean).sort();
          const expiresHint = expirations.length ? `, next expires ${formatCdxResetAt(expirations[0])}` : "";
          if (!name || name === "-") return `<td>${escapeHtml(String(count))}</td>`;
          const pending = pendingCdxSessionResets.has(name);
          return `<td><button class="viewer-cdx__banked-reset${pending ? " is-updating" : ""}" type="button" data-viewer-cdx-reset="${escapeHtml(name)}" title="Activate one banked reset for ${escapeHtml(name)}${escapeHtml(expiresHint)}"${pending ? " disabled" : ""}>${escapeHtml(String(count))}</button></td>`;
        },
        block: (item) => `<td>${escapeHtml(cdxSessionBlock(item))}</td>`,
        credits: (item) => `<td>${escapeHtml(formatCdxCredits(cdxField(item, ["credits", "cr"], "-")))}</td>`,
        reset5h: (item) => {
          const pct = cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN);
          return `<td>${Number.isFinite(Number(pct)) ? escapeHtml(formatCdxResetAt(cdxField(item, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], ""))) : ""}</td>`;
        },
        resetWeek: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["reset_week_at", "resetWeekAt", "reset_at", "resetAt"], "")))}</td>`,
        updated: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["updated_at", "updatedAt"], "")))}</td>`
      };
      const hasFiveHourQuota = sessions.some((entry) => {
        const item = entry && typeof entry === "object" ? entry : { value: entry };
        return Number.isFinite(Number(cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN)));
      });
      const activeColumns = cdxStatusColumns.filter((column) => visibleColumns[column.id] && (column.id !== "remaining5h" || hasFiveHourQuota));
      const rows = sessions.slice(0, 24).map((entry) => {
        const item = entry && typeof entry === "object" ? entry : { value: entry };
        return `
        <tr>
          ${activeColumns.map((column) => cellRenderers[column.id](item)).join("")}
        </tr>
      `;
      }).join("");
      return `
      <div class="viewer-cdx__table-wrap">
        <table class="viewer-cdx__table">
          <thead>
            <tr>
              ${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    }
    function cdxSessionLastUsedMs(item) {
      return Date.parse(String(cdxField(item, [
        "last_launched_at",
        "lastLaunchedAt",
        "last_used_at",
        "lastUsedAt",
        "updated_at",
        "updatedAt"
      ], ""))) || 0;
    }
    async function chooseCdxHandoffSource(destinationName) {
      const options = cdxSessions(latestCdxStatusPayload?.status || {}).filter((entry) => entry && typeof entry === "object" && isCdxSessionEnabled(entry)).map((entry) => ({ name: cdxSessionName(entry), lastUsed: cdxSessionLastUsedMs(entry) })).filter((entry) => entry.name && entry.name !== "-" && entry.name !== destinationName).sort((left, right) => right.lastUsed - left.lastUsed || left.name.localeCompare(right.name)).map((entry) => entry.name);
      if (!options.length) {
        await showThemedMessageModal({ title: "Handoff", message: "No other enabled CDX session is available." });
        return "";
      }
      return await showThemedChoiceModal({
        title: "Handoff source",
        message: `Choose the session to hand off into ${destinationName}.`,
        options,
        value: options[0],
        submitLabel: "Handoff"
      });
    }
    function selectedCdxMissionRequest() {
      const catalog = latestCdxMissionState.catalog || cdxMissionCatalog();
      const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
      const missionId = latestCdxMissionState.missionId || "full-audit";
      const mission = missions.find((entry) => entry.id === missionId) || {};
      const status = latestCdxMissionState.statusPayload?.status || {};
      const sessions = cdxSessions(status);
      const selectedSession = sessions.find((session) => cdxField(session && typeof session === "object" ? session : { value: session }, ["id", "name", "session_name", "value"], "") === latestCdxMissionState.sessionId);
      const selectedModel = cdxField(selectedSession && typeof selectedSession === "object" ? selectedSession : {}, ["model", "model_name", "modelName"], "");
      const allowFileWrites = mission.supportsFileWrites === false ? "false" : latestCdxMissionState.missionInputs.allowFileWrites === "false" ? "false" : "true";
      const request = {
        missionId,
        sessionId: latestCdxMissionState.sessionId || "",
        strengthId: latestCdxMissionState.strengthId || "standard",
        ...latestCdxMissionState.missionInputs,
        model: Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model") ? latestCdxMissionState.missionInputs.model : selectedModel,
        allowFileWrites,
        commitAtEnd: latestCdxMissionState.missionInputs.commitAtEnd === "true" ? "true" : "false"
      };
      if (latestCdxMissionState.promptOverride) {
        request.promptOverride = latestCdxMissionState.promptOverride;
      }
      return request;
    }
    function renderCdxMissionConfigMenu(session, strength) {
      const model = Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model") ? latestCdxMissionState.missionInputs.model : cdxField(session && typeof session === "object" ? session : {}, ["model", "model_name", "modelName"], "");
      const levels = ["minimal", "low", "medium", "high", "xhigh"];
      const defaultReasoning = strength?.reasoningEffort || "medium";
      const defaultPower = strength?.power || "medium";
      const reasoningEffort = latestCdxMissionState.missionInputs.reasoningEffort || defaultReasoning;
      const power = latestCdxMissionState.missionInputs.power || defaultPower;
      const optionRows = (selected) => levels.map((level) => `<option value="${escapeHtml(level)}"${level === selected ? " selected" : ""}>${escapeHtml(cdxLabel(level))}</option>`).join("");
      return `
      <details class="viewer-cdx__menu viewer-cdx__mission-config">
        <summary class="viewer-cdx__icon-button" title="Configure CDX model and reasoning" aria-label="Configure CDX model and reasoning">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide viewer-cdx__mission-config-panel" role="menu" aria-label="CDX mission configuration">
          <label class="viewer-cdx__field">
            <span>Model</span>
            <input data-viewer-cdx-input="model" type="text" value="${escapeHtml(model)}" placeholder="Default session model">
          </label>
          <label class="viewer-cdx__field">
            <span>Reasoning</span>
            <select data-viewer-cdx-input="reasoningEffort">${optionRows(reasoningEffort)}</select>
          </label>
          <label class="viewer-cdx__field">
            <span>Power</span>
            <select data-viewer-cdx-input="power">${optionRows(power)}</select>
          </label>
        </div>
      </details>
    `;
    }
    function renderCdxMissionInputs(mission) {
      const fields = Array.isArray(mission?.inputFields) ? mission.inputFields : [];
      if (!fields.length) {
        return "";
      }
      const rows = fields.map((field) => {
        const id = field.id || "";
        const value = latestCdxMissionState.missionInputs[id] || "";
        if (field.type === "checkbox") {
          return `
          <label class="viewer-cdx__field viewer-cdx__field--check">
            <input data-viewer-cdx-input="${escapeHtml(id)}" type="checkbox"${value === "true" ? " checked" : ""}>
            <span>${escapeHtml(field.label || cdxLabel(id))}</span>
          </label>
        `;
        }
        if (field.type === "textarea") {
          return `
          <label class="viewer-cdx__field">
            <span>${escapeHtml(field.label || cdxLabel(id))}</span>
            <textarea data-viewer-cdx-input="${escapeHtml(id)}" placeholder="${escapeHtml(field.placeholder || "")}" rows="5">${escapeHtml(value)}</textarea>
          </label>
        `;
        }
        return `
        <label class="viewer-cdx__field">
          <span>${escapeHtml(field.label || cdxLabel(id))}</span>
          <input data-viewer-cdx-input="${escapeHtml(id)}" type="${escapeHtml(field.type || "text")}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || "")}"${field.pattern ? ` pattern="${escapeHtml(field.pattern)}"` : ""}>
        </label>
      `;
      }).join("");
      return `<div class="viewer-cdx__inputs">${rows}</div>`;
    }
    async function selectCdxMissionFromModal() {
      const catalog = latestCdxMissionState.catalog || cdxMissionCatalog();
      const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
      if (!missions.length) {
        return;
      }
      const currentId = latestCdxMissionState.missionId || catalog.defaultMissionId || missions[0].id;
      const labels = missions.map((mission) => mission.title || mission.id);
      const currentMission = missions.find((mission) => mission.id === currentId) || missions[0];
      const selectedLabel = await showThemedChoiceModal({
        title: "Select mission",
        message: "Choose the CDX mission to configure.",
        options: labels,
        value: currentMission.title || currentMission.id,
        submitLabel: "Select"
      });
      if (!selectedLabel) {
        return;
      }
      const selectedMission = missions.find((mission) => (mission.title || mission.id) === selectedLabel);
      if (!selectedMission || selectedMission.id === currentId) {
        return;
      }
      latestCdxMissionState.missionId = selectedMission.id || "full-audit";
      latestCdxMissionState.planPayload = null;
      latestCdxMissionState.runPayload = null;
      latestCdxMissionState.applyPayload = null;
      latestCdxMissionState.missionInputs = {};
      latestCdxMissionState.outputMode = "plan";
      latestCdxMissionState.promptOverride = "";
      host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
    }
    function showCdxSessionConfigModal(sessionName) {
      const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
      const session = sessions.find((entry) => cdxSessionName(entry && typeof entry === "object" ? entry : { value: entry }) === sessionName) || {};
      const levels = ["minimal", "low", "medium", "high", "xhigh"];
      const model = Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model") && latestCdxMissionState.sessionId === sessionName ? latestCdxMissionState.missionInputs.model : cdxField(session && typeof session === "object" ? session : {}, ["model", "model_name", "modelName"], "");
      const reasoningEffort = latestCdxMissionState.sessionId === sessionName ? latestCdxMissionState.missionInputs.reasoningEffort || "medium" : "medium";
      const power = latestCdxMissionState.sessionId === sessionName ? latestCdxMissionState.missionInputs.power || "medium" : cdxField(session && typeof session === "object" ? session : {}, ["power", "power_level", "powerLevel"], "medium");
      const permission = pendingCdxSessionPermissions.has(sessionName) ? pendingCdxSessionPermissions.get(sessionName) : cdxSessionPermission(session && typeof session === "object" ? session : {});
      const optionRows = (selected) => levels.map((level) => `<option value="${escapeHtml(level)}"${level === selected ? " selected" : ""}>${escapeHtml(cdxLabel(level))}</option>`).join("");
      const permissionRows = (selected) => cdxPermissionValues().map((opt) => `<option value="${escapeHtml(opt)}"${opt === selected ? " selected" : ""}>${escapeHtml(cdxLabel(opt))}</option>`).join("");
      const modal = createThemedModal({
        title: "Session config",
        message: `CDX session: ${sessionName}`,
        submitLabel: "Apply"
      });
      modal.setAttribute("data-viewer-cdx-session-config-modal", sessionName);
      modal.querySelector(".viewer-themed-modal__submit")?.setAttribute("data-viewer-cdx-session-config-submit", "");
      modal.querySelector(".viewer-themed-modal__cancel")?.setAttribute("data-viewer-cdx-session-config-cancel", "");
      modal.querySelector(".viewer-themed-modal__close")?.setAttribute("data-viewer-cdx-session-config-cancel", "");
      const body = modal.querySelector(".viewer-themed-modal__body");
      if (body instanceof HTMLElement) {
        body.innerHTML = `
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Model</span>
          <input class="viewer-themed-modal__input" data-viewer-cdx-session-config-input="model" type="text" value="${escapeHtml(model)}" placeholder="Default session model">
        </label>
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Reasoning</span>
          <select class="viewer-themed-modal__select" data-viewer-cdx-session-config-input="reasoningEffort">${optionRows(reasoningEffort)}</select>
        </label>
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Power</span>
          <select class="viewer-themed-modal__select" data-viewer-cdx-session-config-input="power">${optionRows(power)}</select>
        </label>
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Permission</span>
          <select class="viewer-themed-modal__select" data-viewer-cdx-session-config-input="permission">${permissionRows(permission)}</select>
        </label>
      `;
      }
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeThemedModal(modal);
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) applyCdxSessionConfigModal(modal);
      });
      window.setTimeout(() => {
        const firstInput = modal.querySelector("[data-viewer-cdx-session-config-input]");
        if (firstInput instanceof HTMLElement) {
          firstInput.focus();
        }
      }, 0);
    }
    function applyCdxSessionConfigModal(modal) {
      if (!(modal instanceof HTMLElement)) {
        return;
      }
      const sessionName = modal.getAttribute("data-viewer-cdx-session-config-modal") || "";
      const valueFor = (key) => {
        const control = modal.querySelector(`[data-viewer-cdx-session-config-input="${key}"]`);
        return typeof control?.value === "string" ? control.value || "" : "";
      };
      const model = valueFor("model").trim();
      const power = valueFor("power") || "medium";
      const permission = valueFor("permission");
      updateCdxSessionConfigFromModal(modal);
      closeThemedModal(modal);
      if (sessionName) {
        persistCdxSessionConfig(sessionName, { power, model }).catch((error) => host.setMeta(`CDX config: ${error?.message || error}`));
        if (permission && cdxPermissionValues().includes(permission)) {
          const current = pendingCdxSessionPermissions.has(sessionName) ? pendingCdxSessionPermissions.get(sessionName) : cdxSessionPermission(cdxSessions(latestCdxStatusPayload?.status || {}).find((entry) => cdxSessionName(entry && typeof entry === "object" ? entry : { value: entry }) === sessionName) || {});
          if (permission !== current) {
            applyCdxSessionPermission(sessionName, permission).catch((error) => host.setMeta(`CDX permission: ${error?.message || error}`));
          }
        }
      }
    }
    async function persistCdxSessionConfig(sessionName, { power, model }) {
      const body = { session: sessionName, model: model || "" };
      if (power) {
        body.power = power;
      }
      const response = await fetch("/api/cdx-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Config update failed.");
      }
      host.setMeta(data.payload?.message || `Config saved for ${sessionName}.`);
      await showCdxStatus({ silent: true, force: true }).catch(() => {
      });
    }
    function updateCdxSessionConfigFromModal(modal) {
      if (!(modal instanceof HTMLElement)) {
        return;
      }
      const sessionName = modal.getAttribute("data-viewer-cdx-session-config-modal") || "";
      if (!sessionName) {
        return;
      }
      const valueFor = (key) => {
        const control = modal.querySelector(`[data-viewer-cdx-session-config-input="${key}"]`);
        return typeof control?.value === "string" ? control.value || "" : "";
      };
      latestCdxMissionState.sessionId = sessionName;
      latestCdxMissionState.missionInputs.model = valueFor("model");
      latestCdxMissionState.missionInputs.reasoningEffort = valueFor("reasoningEffort") || "medium";
      latestCdxMissionState.missionInputs.power = valueFor("power") || "medium";
      latestCdxMissionState.planPayload = null;
      latestCdxMissionState.runPayload = null;
      latestCdxMissionState.applyPayload = null;
      latestCdxMissionState.outputMode = "plan";
      latestCdxMissionState.promptOverride = "";
      host.setMeta(`CDX config updated for ${sessionName}.`);
    }
    function cdxRunBlockedReason(planPayload, plan) {
      if (!planPayload) return "Preview the mission first: a run is launched from a plan, never from the form.";
      if (planPayload.state !== "ok") return String(planPayload.message || "The plan could not be built, so there is nothing to launch.");
      if (plan && !plan.canRun) return String(plan.reason || "This plan reports it cannot be run as configured.");
      return "Preview the mission first.";
    }
    function renderCdxMissionSetup(statusPayload, planPayload, runPayload, applyPayload) {
      const catalog = cdxMissionCatalog(planPayload || {});
      latestCdxMissionState.catalog = catalog;
      const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
      const strengths = Array.isArray(catalog.strengths) ? catalog.strengths : [];
      const status = statusPayload?.status || {};
      const sessions = cdxSessions(status);
      const selectedSession = latestCdxMissionState.sessionId || cdxField(sessions[0] || {}, ["id", "name", "session_name", "value"], "");
      const selectedSessionItem = sessions.find((session) => cdxField(session && typeof session === "object" ? session : { value: session }, ["id", "name", "session_name", "value"], "") === selectedSession) || {};
      const missionId = latestCdxMissionState.missionId || catalog.defaultMissionId || "full-audit";
      const selectedMission = missions.find((mission) => mission.id === missionId) || {};
      const strengthId = latestCdxMissionState.strengthId || catalog.defaultStrengthId || "standard";
      const selectedStrength = strengths.find((strength) => strength.id === strengthId) || strengths.find((strength) => strength.id === catalog.defaultStrengthId) || {};
      const runMode = latestCdxMissionState.runMode === "terminal" ? "terminal" : "background";
      const supportsFileWrites = selectedMission.supportsFileWrites !== false;
      const requiresFileWrites = selectedMission.requiresFileWrites === true;
      const allowFileWrites = supportsFileWrites && latestCdxMissionState.missionInputs.allowFileWrites !== "false";
      const commitControl = `
            <label class="viewer-cdx__field viewer-cdx__field--check">
              <input data-viewer-cdx-input="commitAtEnd" type="checkbox"${latestCdxMissionState.missionInputs.commitAtEnd === "true" ? " checked" : ""}>
              <span>Commit changes at end</span>
            </label>`;
      const fileWriteControl = requiresFileWrites ? `
            <div class="viewer-cdx__meta viewer-cdx__mission-note">This mission always drafts a Logics request. Enabling "Fix directly" also promotes it into a backlog item and task as proof.</div>
            ${commitControl}
        ` : supportsFileWrites ? `
            <label class="viewer-cdx__field viewer-cdx__field--check">
              <input data-viewer-cdx-input="allowFileWrites" type="checkbox"${allowFileWrites ? " checked" : ""}>
              <span>Allow CDX to modify files</span>
            </label>
            ${commitControl}
        ` : `
            <div class="viewer-cdx__meta viewer-cdx__mission-note">Corpus updates are applied after CDX returns allowed actions.</div>
        `;
      latestCdxMissionState.sessionId = selectedSession;
      const missionSummary = `
      <div class="viewer-cdx__mission-summary">
        <div>
          <strong>${escapeHtml(selectedMission.title || selectedMission.id || "Mission")}</strong>
          <span>${escapeHtml(selectedMission.description || "")}</span>
          <em>${escapeHtml(cdxLabel(selectedMission.scope || ""))}</em>
        </div>
        <button class="viewer-cdx__action-button" type="button" data-viewer-cdx-mission-select>Choose mission</button>
      </div>
    `;
      const sessionOptions = sessions.map((session) => {
        const item = session && typeof session === "object" ? session : { value: session };
        const id = cdxField(item, ["id", "name", "session_name", "value"], "");
        const label = [id, cdxField(item, ["provider"], ""), renderTextRemaining(item)].filter(Boolean).join(" \xB7 ");
        return `<option value="${escapeHtml(id)}"${id === selectedSession ? " selected" : ""}>${escapeHtml(label || id)}</option>`;
      }).join("");
      const plan = planPayload?.plan;
      const warnings = Array.isArray(plan?.warnings) ? plan.warnings : [];
      const command = Array.isArray(plan?.command) ? plan.command.join(" ") : "";
      const promptValue = latestCdxMissionState.promptOverride || (plan && typeof plan.prompt === "string" ? plan.prompt : "");
      const promptEdited = Boolean(plan?.promptEdited || latestCdxMissionState.promptOverride);
      const warningRows = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
      const canRun = planPayload?.state === "ok" && plan?.canRun;
      const usage = runPayload?.run?.usage || {};
      const run = runPayload?.run;
      const usageText = usage.available ? `${usage.totalTokens ?? "-"} total \xB7 ${usage.inputTokens ?? "-"} in \xB7 ${usage.outputTokens ?? "-"} out` : usage.message || "Token usage not reported yet.";
      const parsedActions = Array.isArray(run?.parsed?.actions) ? run.parsed.actions : [];
      const applyResults = Array.isArray(applyPayload?.results) ? applyPayload.results : [];
      const actionRows = parsedActions.map((action) => `
      <li class="viewer-cdx__row"><span>${escapeHtml(cdxLabel(action.type || "action"))}</span><strong>${escapeHtml(action.target || "-")}</strong></li>
    `).join("");
      const applyRows = applyResults.map((result) => `
      <li class="viewer-cdx__row"><span>${escapeHtml(cdxLabel(result.type || "action"))}</span><strong>${escapeHtml(result.returnCode === 0 ? "applied" : "failed")}</strong></li>
    `).join("");
      const planState = planPayload ? canRun ? "Ready" : cdxLabel(planPayload.state || "Previewed") : "Not previewed";
      const runState = runPayload ? run ? Number(run.returnCode) === 0 ? "Succeeded" : `Failed (${run.returnCode ?? "unknown"})` : cdxLabel(runPayload.state || "Reported") : "Not launched";
      const outputMode = latestCdxMissionState.outputMode === "run" ? "run" : "plan";
      const outputSwitch = `
      <div class="viewer-cdx__panel-switch" role="tablist" aria-label="Mission output view">
        <button class="viewer-cdx__mode${outputMode === "plan" ? " is-active" : ""}" type="button" data-viewer-cdx-mission-output="plan" aria-selected="${outputMode === "plan" ? "true" : "false"}">Plan preview</button>
        <button class="viewer-cdx__mode${outputMode === "run" ? " is-active" : ""}" type="button" data-viewer-cdx-mission-output="run" aria-selected="${outputMode === "run" ? "true" : "false"}">Run output</button>
      </div>
    `;
      const planPanel = `
      ${planPayload && planPayload.state !== "ok" ? `<div class="viewer-cdx__state">${escapeHtml(planPayload.message || "Unable to build mission plan.")}</div>` : ""}
      ${command ? `<pre class="viewer-cdx__code">${escapeHtml(command)}</pre>` : '<div class="viewer-cdx__empty">Preview a mission to inspect the exact command before launch.</div>'}
      ${plan && typeof plan.prompt === "string" ? `
        <label class="viewer-cdx__field">
          <span>Prompt${promptEdited ? " (edited)" : " (editable)"}</span>
          <textarea data-viewer-cdx-prompt rows="10" spellcheck="false" placeholder="Generated mission prompt">${escapeHtml(promptValue)}</textarea>
        </label>
        <div class="viewer-cdx__meta">Edits apply on the next Preview or Launch run. Session, permission, and timeout stay enforced by the server and release contract.</div>
      ` : ""}
      ${plan?.releaseTag ? `<div class="viewer-cdx__meta">Base tag: ${escapeHtml(plan.releaseTag)}</div>` : ""}
      ${plan?.commitAtEnd ? '<div class="viewer-cdx__meta">Commit at end: enabled when mission changes files.</div>' : ""}
      ${plan?.requiresConfirmation ? '<div class="viewer-cdx__meta">Plan-first mission: Logics changes need explicit apply after CDX returns allowed actions.</div>' : ""}
      ${warningRows ? `<ul class="viewer-cdx__warnings">${warningRows}</ul>` : ""}
    `;
      const runPanel = `
      ${runPayload ? `<div class="viewer-cdx__state viewer-cdx__state--${escapeHtml(cdxStateClass(runPayload.state))}">${escapeHtml(runPayload.message || cdxLabel(runPayload.state))}</div>` : '<div class="viewer-cdx__empty">No mission run launched yet.</div>'}
      ${run ? `<ul class="viewer-cdx__list">
        <li class="viewer-cdx__row"><span>Run</span><strong>${escapeHtml(run.runId || "-")}</strong></li>
        <li class="viewer-cdx__row"><span>Usage</span><strong>${escapeHtml(usageText)}</strong></li>
        <li class="viewer-cdx__row"><span>Return code</span><strong>${escapeHtml(run.returnCode ?? "-")}</strong></li>
      </ul>` : ""}
      ${run?.stdout ? `<pre class="viewer-cdx__code">${escapeHtml(run.stdout)}</pre>` : ""}
      ${run?.stderr ? `<pre class="viewer-cdx__code viewer-cdx__code--error">${escapeHtml(run.stderr)}</pre>` : ""}
    `;
      const selectedMissionLabel = selectedMission ? String(selectedMission.title || selectedMission.id || "Mission") : "None yet";
      const sessionRemaining = renderTextRemaining(selectedSessionItem);
      const selectedSessionLabel = selectedSession ? [selectedSession, sessionRemaining].filter(Boolean).join(" \xB7 ") : "None yet";
      const cards = [
        ["Missions", String(missions.length)],
        ["Sessions", String(sessions.length)],
        ["Selected", selectedMissionLabel],
        ["Session", selectedSessionLabel]
      ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
      return `
      <div class="viewer-cdx__summary">${cards}</div>
      <div class="viewer-cdx__workspace viewer-cdx__workspace--missions">
        <div class="viewer-cdx__stack">
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Mission</h2>
            ${missionSummary}
          </section>
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Execution</h2>
            <div class="viewer-cdx__field-row viewer-cdx__field-row--session">
              <label class="viewer-cdx__field">
                <span>Session</span>
                <select data-viewer-cdx-session>${sessionOptions || '<option value="">No session reported</option>'}</select>
              </label>
              ${renderCdxMissionConfigMenu(selectedSessionItem, selectedStrength)}
            </div>
            ${fileWriteControl}
            ${renderCdxMissionInputs(selectedMission)}
            <label class="viewer-cdx__field">
              <span>Run in</span>
              <select data-viewer-cdx-run-mode>
                <option value="terminal"${runMode === "terminal" ? " selected" : ""}>New terminal</option>
                <option value="background"${runMode === "terminal" ? "" : " selected"}>Background runner (Experimental)</option>
              </select>
            </label>
            <!-- item_794: what will run, beside the button that runs it. It was readable
                 only by switching the output panel to "Plan preview", so the control that
                 launches a command and the statement of that command were never on screen
                 together. Dimmed, because it is there to be checked rather than read. -->
            <div class="viewer-cdx__command-preview" data-viewer-cdx-command-preview>
              <span class="viewer-cdx__command-preview-label">Will run</span>
              ${command ? `<code>${escapeHtml(command)}</code>` : '<span class="viewer-cdx__command-preview-empty">Preview to see the exact command.</span>'}
            </div>
            <div class="viewer-cdx__actions">
              <button class="btn" type="button" data-viewer-cdx-plan>Preview</button>
              <button class="btn" type="button" data-viewer-cdx-run${canRun ? "" : " disabled"} title="${escapeHtml(canRun ? "Launch this mission" : cdxRunBlockedReason(planPayload, plan))}">${runMode === "terminal" ? "Launch in terminal" : "Launch run"}</button>
            </div>
            ${canRun ? "" : `<p class="viewer-cdx__blocked-reason">${escapeHtml(cdxRunBlockedReason(planPayload, plan))}</p>`}
          </section>
        </div>
        <div class="viewer-cdx__stack">
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading viewer-ci__heading--actions">
              <!-- AC12, second instance, named by the mockup and missed on the first
                   pass: the heading read "Plan preview" while the selected toggle beside
                   it read "Plan preview" too. The toggle already says which of the two
                   panels is showing, so the heading names the pair rather than repeating
                   the selection. The state moved here from the metric tiles. -->
              <h2>Mission output <span class="viewer-cdx__panel-state">${escapeHtml(outputMode === "run" ? runState : planState)}</span></h2>
              ${outputSwitch}
            </div>
            <div class="viewer-cdx__output-panel">
              ${outputMode === "run" ? runPanel : planPanel}
            </div>
          </section>
          ${plan?.missionId === "corpus-ready" || latestCdxMissionState.missionId === "corpus-ready" ? `
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Corpus apply</h2>
              <ul class="viewer-cdx__list">${actionRows || '<li class="viewer-cdx__empty">CDX has not returned allowed corpus actions yet.</li>'}</ul>
              <div class="viewer-cdx__actions">
                <button class="btn" type="button" data-viewer-cdx-apply-plan${parsedActions.length ? "" : " disabled"}>Apply allowed actions</button>
              </div>
              ${applyPayload ? `<div class="viewer-cdx__state viewer-cdx__state--${escapeHtml(cdxStateClass(applyPayload.state))}">${escapeHtml(applyPayload.message || cdxLabel(applyPayload.state))}</div>` : ""}
              ${applyRows ? `<ul class="viewer-cdx__list">${applyRows}</ul>` : ""}
            </section>
          ` : ""}
        </div>
      </div>
    `;
    }
    function renderCdxMissions(statusPayload, planPayload = null, runPayload = null, applyPayload = null) {
      if (!statusPayload || statusPayload.state !== "ok") {
        return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("missions")}
          <div class="viewer-cdx__state">${escapeHtml(statusPayload?.message || "CDX missions are unavailable.")}</div>
        </div>
      `;
      }
      return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("missions")}
        ${renderCdxMissionSetup(statusPayload, planPayload, runPayload, applyPayload)}
      </div>
    `;
    }
    function renderCdxStatus(payload) {
      if (!payload || payload.state !== "ok") {
        return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("status")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX status is unavailable.")}</div>
        </div>
      `;
      }
      const status = payload.status || {};
      const allProviders = cdxProviders(status);
      const allSessions = cdxSessions(status);
      const providerFilter = cdxProviderFilterPreference();
      const knownProviders = cdxKnownProviders(status, allProviders, allSessions);
      const providers = filterCdxEntriesByProvider(allProviders, providerFilter);
      const sessions = filterCdxEntriesByProvider(allSessions, providerFilter);
      const readiness = cdxReadiness(status);
      const commands = pickFirstArray(status, ["nextCommands", "next_commands", "safeCommands", "safe_commands", "commands"]).map((entry) => typeof entry === "string" ? entry : entry.command || entry.value || entry.name || "").filter(Boolean);
      if (!commands.length) {
        commands.push("cdx status --json");
      }
      const runtimeState = status.state || status.status || status.availability || "ok";
      const readinessCount = objectEntries(readiness).length;
      const cards = [
        ["Runtime", runtimeState],
        ["Providers", providers.length],
        ["Sessions", sessions.length],
        ["Readiness", readinessCount ? `${readinessCount} signals` : "Not reported"]
      ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${label === "Runtime" ? renderCdxBadge(value) : escapeHtml(value)}</div>
      </div>
    `).join("");
      const commandRows = commands.slice(0, 10).map((command, index) => `
      <li>
        <span>${escapeHtml(index + 1)}</span>
        <code>${escapeHtml(command)}</code>
      </li>
    `).join("");
      return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("status")}
        <div class="viewer-cdx__summary">${cards}</div>
        ${renderCdxStatusControls(knownProviders, sessions.filter((s) => s.enabled !== false).map((s) => cdxField(s, ["session_name", "name", "id", "value"]) || "").filter(Boolean), cdxColumnVisibilityPreference(), providerFilter)}
        <div class="viewer-cdx__workspace">
          <div class="viewer-cdx__stack">
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Sessions</h2>
              ${renderCdxSessionTable(sessions, "No sessions reported.", latestCdxSessionName(allSessions))}
            </section>
          </div>
          <div class="viewer-cdx__stack">
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Readiness and quota</h2>
              <ul class="viewer-cdx__list">${renderCdxObjectRows(readiness, "No readiness or quota details reported.")}</ul>
            </section>
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Safe next commands</h2>
              <ul class="viewer-cdx__commands">${commandRows || '<li class="viewer-cdx__empty">No suggested commands reported.</li>'}</ul>
            </section>
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Providers</h2>
              <ul class="viewer-cdx__list">${renderCdxEntityRows(providers, "No provider status reported.", { subtitleKeys: ["model"] })}</ul>
            </section>
          </div>
        </div>
      </div>
    `;
    }
    function rerenderCdxStatusFromPreferences() {
      if (isCdxStatusOpen() && latestCdxStatusPayload) {
        preserveActiveCdxMenu(() => {
          host.setDocument("CDX status", renderCdxStatus(latestCdxStatusPayload));
          setupCdxImportExportHandlers();
        });
      }
    }
    function applyOptimisticCdxSessionToggle(sessionName, enable) {
      if (!latestCdxStatusPayload?.status || !sessionName) {
        return () => {
        };
      }
      const previousPayload = JSON.parse(JSON.stringify(latestCdxStatusPayload));
      const status = latestCdxStatusPayload.status;
      let changed = false;
      ["rows", "sessions", "activeSessions", "active_sessions"].forEach((key) => {
        asArray(status[key]).forEach((entry) => {
          changed = updateCdxSessionEntry(entry, sessionName, enable) || changed;
        });
      });
      if (!changed) {
        return () => {
        };
      }
      latestCdxStatusSignature = runtimeStatusSignature(latestCdxStatusPayload);
      updateMainCdxBadge(latestCdxStatusPayload);
      rerenderCdxStatusFromPreferences();
      return () => {
        latestCdxStatusPayload = previousPayload;
        latestCdxStatusSignature = runtimeStatusSignature(previousPayload);
        updateMainCdxBadge(previousPayload);
        rerenderCdxStatusFromPreferences();
      };
    }
    function applyOptimisticCdxSessionPermission(sessionName, permission) {
      if (!latestCdxStatusPayload?.status || !sessionName) {
        return () => {
        };
      }
      const previousPayload = JSON.parse(JSON.stringify(latestCdxStatusPayload));
      const status = latestCdxStatusPayload.status;
      let changed = false;
      ["rows", "sessions", "activeSessions", "active_sessions"].forEach((key) => {
        asArray(status[key]).forEach((entry) => {
          changed = updateCdxSessionPermissionEntry(entry, sessionName, permission) || changed;
        });
      });
      if (!changed) {
        return () => {
        };
      }
      latestCdxStatusSignature = runtimeStatusSignature(latestCdxStatusPayload);
      updateMainCdxBadge(latestCdxStatusPayload);
      rerenderCdxStatusFromPreferences();
      return () => {
        latestCdxStatusPayload = previousPayload;
        latestCdxStatusSignature = runtimeStatusSignature(previousPayload);
        updateMainCdxBadge(previousPayload);
        rerenderCdxStatusFromPreferences();
      };
    }
    async function applyCdxSessionPermission(sessionName, selected) {
      const options = cdxPermissionValues();
      if (!sessionName || !options.includes(selected)) {
        return;
      }
      pendingCdxSessionPermissions.set(sessionName, selected);
      const rollbackCdxPermission = applyOptimisticCdxSessionPermission(sessionName, selected);
      try {
        const response = await fetch("/api/cdx-permission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: sessionName, permission: selected })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Permission update failed.");
        }
        host.setMeta(data.payload?.message || `Permission updated for ${sessionName}.`);
        await showCdxStatus({ silent: true, force: true }).catch(() => {
        });
      } catch (error) {
        rollbackCdxPermission();
        host.setMeta(`CDX permission: ${error?.message || error}`);
      } finally {
        pendingCdxSessionPermissions.delete(sessionName);
        rerenderCdxStatusFromPreferences();
      }
    }
    function renderCdxRuns(payload) {
      if (!payload || payload.state !== "ok") {
        return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("runs")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX reports are unavailable.")}</div>
        </div>
      `;
      }
      const allRuns = Array.isArray(payload.runs) ? payload.runs : [];
      const sessionFilter = cdxRunSessionFilterPreference();
      const knownSessions = knownCdxRunSessions(allRuns);
      const runs = filterCdxRunsBySession(allRuns, sessionFilter);
      const staleCount = allRuns.filter((run) => String(cdxField(run, ["status", "state"], "")).toLowerCase() === "stale").length;
      const runningCount = allRuns.filter((run) => ["running", "starting", "pending"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
      const failedCount = allRuns.filter((run) => ["failed", "error", "blocked"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
      const tokenTotal = allRuns.reduce((total, run) => total + (cdxTokenUsage(run)?.totalTokens ?? 0), 0);
      const runsSummary = staleCount ? `${allRuns.length} reported \xB7 ${staleCount} incomplete${runningCount ? ` \xB7 ${runningCount} running` : ""}` : runningCount ? `${allRuns.length} reported \xB7 ${runningCount} running` : `${allRuns.length} reported`;
      const cards = [
        ["Reports", String(allRuns.length)],
        ["Running", String(runningCount)],
        ["Attention", String(staleCount + failedCount)],
        ["Tokens", tokenTotal ? String(tokenTotal) : "Not reported"]
      ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
      const visibleColumns = cdxRunColumnVisibilityPreference();
      const activeColumns = cdxRunColumns.filter((column) => visibleColumns[column.id]);
      const cellRenderers = {
        run: (run) => {
          const runId = cdxField(run, ["run_id", "runId", "id"], "");
          const detail = cdxRunStatusDetail(run);
          return `<td><code>${escapeHtml(runId || "-")}</code>${detail ? `<div class="viewer-cdx__meta">${escapeHtml(detail)}</div>` : ""}</td>`;
        },
        status: (run) => `<td>${renderCdxBadge(cdxField(run, ["status", "state"], "unknown"))}</td>`,
        kind: (run) => `<td>${escapeHtml(cdxField(run, ["kind"], "assistant"))}</td>`,
        session: (run) => `<td>${escapeHtml(cdxRunSessionName(run))}</td>`,
        tokens: (run) => `<td>${renderCdxTokenUsage(cdxTokenUsage(run))}</td>`,
        cwd: (run) => `<td>${escapeHtml(cdxField(run, ["cwd", "workspace", "repo"], "-"))}</td>`,
        report: (run) => {
          const runId = cdxField(run, ["run_id", "runId", "id"], "");
          return `<td>${runId ? renderCdxActionButton("Open report", `data-viewer-cdx-report="${escapeHtml(runId)}"`, `Open report for ${runId}`) : ""}</td>`;
        }
      };
      const rows = runs.map((run) => {
        return `
        <tr>
          ${activeColumns.map((column) => cellRenderers[column.id](run)).join("")}
        </tr>
      `;
      }).join("");
      return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("runs")}
        <div class="viewer-cdx__summary">${cards}</div>
        ${renderCdxRunControls(visibleColumns, knownSessions, sessionFilter)}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Reports</h2><span>${escapeHtml(sessionFilter.mode === "subset" ? `${runs.length} shown \xB7 ${runsSummary}` : runsSummary)}</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr>${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
              <tbody>${rows || `<tr><td colspan="${Math.max(activeColumns.length, 1)}" class="viewer-cdx__empty">No assistant runs reported.</td></tr>`}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
    }
    function renderCdxHistory(payload) {
      if (!payload || payload.state !== "ok") {
        return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("history")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX history is unavailable.")}</div>
        </div>
      `;
      }
      const allHistory = Array.isArray(payload.history) ? payload.history : [];
      const sessionFilter = cdxHistorySessionFilterPreference();
      const knownSessions = knownCdxHistorySessions(allHistory);
      const history = filterCdxHistoryBySession(allHistory, sessionFilter);
      const visibleColumns = cdxHistoryColumnVisibilityPreference();
      const activeColumns = cdxHistoryColumns.filter((column) => visibleColumns[column.id]);
      const failedCount = allHistory.filter((entry) => ["failed", "error", "blocked"].includes(String(cdxField(entry, ["status", "state"], "")).toLowerCase())).length;
      const tokenTotal = allHistory.reduce((total, entry) => total + (cdxTokenUsage(entry)?.totalTokens ?? 0), 0);
      const cards = [
        ["Entries", String(allHistory.length)],
        ["Sessions", String(knownSessions.length)],
        ["Attention", String(failedCount)],
        ["Tokens", tokenTotal ? String(tokenTotal) : "Not reported"]
      ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
      const cellRenderers = {
        session: (entry) => {
          const session = cdxHistorySessionName(entry);
          const provider = cdxField(entry, ["provider"], "-");
          return `<td><strong>${escapeHtml(session)}</strong><div class="viewer-cdx__meta">${escapeHtml(provider)}</div></td>`;
        },
        status: (entry) => `<td>${renderCdxBadge(cdxField(entry, ["status", "state"], "unknown"))}</td>`,
        action: (entry) => {
          const action = cdxField(entry, ["action"], "-");
          const label = cdxField(entry, ["label", "command"], action);
          return `<td>${escapeHtml(label)}</td>`;
        },
        started: (entry) => `<td>${escapeHtml(formatCdxResetAt(cdxField(entry, ["started_at", "startedAt"], "")) || "-")}</td>`,
        duration: (entry) => `<td>${escapeHtml(formatCdxDuration(cdxField(entry, ["duration_ms", "durationMs"], NaN)))}</td>`,
        tokens: (entry) => `<td>${renderCdxTokenUsage(cdxTokenUsage(entry))}</td>`,
        artifacts: (entry) => {
          const transcript = cdxField(entry, ["transcript_path", "transcriptPath"], "");
          const stdout = cdxField(entry, ["stdout_path", "stdoutPath"], "");
          const artifactButtons = [
            transcript ? renderCdxActionButton("Transcript", `data-viewer-cdx-artifact-path="${escapeHtml(transcript)}"`, "Open transcript") : "",
            stdout ? renderCdxActionButton("Stdout", `data-viewer-cdx-artifact-path="${escapeHtml(stdout)}"`, "Open stdout") : ""
          ].filter(Boolean).join("");
          return `<td><div class="viewer-cdx__action-stack">${artifactButtons || '<span class="viewer-cdx__token-empty">-</span>'}</div></td>`;
        }
      };
      const rows = history.slice(0, 50).map((entry) => `
      <tr>
        ${activeColumns.map((column) => cellRenderers[column.id](entry)).join("")}
      </tr>
    `).join("");
      return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("history")}
        <div class="viewer-cdx__summary">${cards}</div>
        ${renderCdxHistoryControls(visibleColumns, knownSessions, sessionFilter)}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>History</h2><span>${escapeHtml(sessionFilter.mode === "subset" ? `${history.length} shown \xB7 ${allHistory.length} entries` : `${allHistory.length} entries`)}</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr>${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
              <tbody>${rows || `<tr><td colspan="${Math.max(activeColumns.length, 1)}" class="viewer-cdx__empty">No CDX history entries reported.</td></tr>`}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
    }
    async function showCdxStatus(options = {}) {
      if (!host.isCapabilityAvailable("cdx")) {
        const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
        host.setDocument("CDX status", renderCdxStatus({ state: host.capability("cdx").state, message }));
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("Checking CDX status...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch("/api/cdx-status", { signal: view.signal, cache: "no-store" });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (response.status === 404) {
        host.setDocument("CDX status", renderCdxStatus({
          state: "unavailable",
          message: "CDX status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
        }));
        host.setMeta("Restart the local viewer to enable CDX status.");
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX status.");
      }
      const nextCdxSignature = runtimeStatusSignature(data.payload);
      if (options.skipUnchanged && !options.force && latestCdxStatusSignature && nextCdxSignature === latestCdxStatusSignature) {
        updateMainCdxBadge(data.payload);
        if (!options.silent) {
          host.setMeta(`Checked CDX status just now \xB7 no changes (${(/* @__PURE__ */ new Date()).toLocaleTimeString()})`);
        }
        return;
      }
      latestCdxStatusSignature = nextCdxSignature;
      latestCdxStatusPayload = data.payload;
      recordCdxUnreadSnapshot("missions", data.payload, { markSeen: isCdxMissionsOpen() });
      updateMainCdxBadge(data.payload);
      if (options.silent && activeCdxInteractionMenu()) {
        return;
      }
      host.setDocument("CDX status", renderCdxStatus(data.payload));
      setupCdxImportExportHandlers();
      host.setMeta(options.silent ? "CDX status refreshed." : "CDX status loaded.");
    }
    async function showCdxMissions(options = {}) {
      if (!host.isCapabilityAvailable("cdx")) {
        const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
        host.setDocument("CDX missions", renderCdxMissions({ state: host.capability("cdx").state, message }));
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("Loading CDX missions...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch("/api/cdx-status", { signal: view.signal });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX mission status.");
      }
      latestCdxMissionState.statusPayload = data.payload;
      const sessions = cdxSessions(data.payload?.status || {});
      if (!latestCdxMissionState.sessionId && sessions.length) {
        latestCdxMissionState.sessionId = cdxField(sessions[0], ["id", "name", "session_name", "value"], "");
      }
      updateMainCdxBadge(data.payload);
      host.setDocument("CDX missions", renderCdxMissions(data.payload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, latestCdxMissionState.applyPayload));
      markCdxSectionSeen("missions", data.payload);
      host.setMeta(options.silent ? "CDX missions refreshed." : "CDX missions loaded.");
    }
    async function previewCdxMission() {
      host.setMeta("Preparing CDX mission preview...");
      const response = await fetch("/api/cdx-mission-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedCdxMissionRequest())
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to preview CDX mission.");
      }
      latestCdxMissionState.planPayload = data.payload;
      latestCdxMissionState.runPayload = null;
      latestCdxMissionState.applyPayload = null;
      latestCdxMissionState.outputMode = "plan";
      if (data.payload?.plan?.sessionId) {
        latestCdxMissionState.sessionId = data.payload.plan.sessionId;
      }
      host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload || data.payload?.status, data.payload, null, null));
      host.setMeta(data.payload?.state === "ok" ? "CDX mission preview ready." : data.payload?.message || "CDX mission preview failed.");
    }
    async function launchCdxMissionInTerminal() {
      host.setMeta("Preparing CDX mission for a new terminal...");
      const response = await fetch("/api/cdx-mission-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedCdxMissionRequest())
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to prepare CDX mission.");
      }
      latestCdxMissionState.planPayload = data.payload;
      const plan = data.payload?.plan || null;
      if (data.payload?.state !== "ok" || !plan || !Array.isArray(plan.command) || !plan.command.length) {
        latestCdxMissionState.runPayload = null;
        latestCdxMissionState.applyPayload = null;
        latestCdxMissionState.outputMode = "plan";
        host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, data.payload, null, null));
        host.setMeta(data.payload?.message || "CDX mission could not be prepared for a terminal.");
        return;
      }
      if (plan.sessionId) {
        latestCdxMissionState.sessionId = plan.sessionId;
      }
      const terminalCommand = [
        "/bin/sh",
        "-c",
        cdxMissionTerminalProgressScript(),
        "cdx-mission",
        String(plan.missionId || latestCdxMissionState.missionId || ""),
        String(plan.sessionId || latestCdxMissionState.sessionId || ""),
        "Reports tab after completion",
        ...plan.command
      ];
      const terminalId = await host.spawnWorkshopTerminal({
        command: terminalCommand,
        label: `cdx mission ${plan.missionId || latestCdxMissionState.missionId}`
      });
      const launched = Boolean(terminalId);
      latestCdxMissionState.runPayload = {
        state: launched ? "terminal" : "error",
        message: launched ? "Mission launched in a Workshop terminal. Track its result and run id from the Reports tab once it completes." : "Unable to start a Workshop terminal for this mission.",
        plan,
        run: null
      };
      latestCdxMissionState.applyPayload = null;
      latestCdxMissionState.outputMode = "run";
      if (isCdxMissionsOpen()) {
        host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, null));
      }
      host.setMeta(launched ? "CDX mission launched in a new terminal." : "CDX mission terminal launch failed.");
    }
    async function launchCdxMission() {
      if (latestCdxMissionState.runMode === "terminal") {
        return launchCdxMissionInTerminal();
      }
      host.setMeta("Launching CDX mission...");
      const request = selectedCdxMissionRequest();
      const plan = latestCdxMissionState.planPayload?.plan || null;
      const pendingPayload = {
        state: "running",
        message: "CDX mission is running. You can keep using the viewer; this panel will update when it completes.",
        plan,
        run: {
          runId: "pending",
          returnCode: "pending",
          pending: true,
          usage: { available: false, message: "Still running." },
          stdout: "",
          stderr: ""
        }
      };
      latestCdxMissionState.runPayload = pendingPayload;
      latestCdxMissionState.applyPayload = null;
      latestCdxMissionState.outputMode = "run";
      host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, pendingPayload, null));
      const response = await fetch("/api/cdx-mission-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to launch CDX mission.");
      }
      latestCdxMissionState.planPayload = { state: data.payload?.state === "ok" ? "ok" : data.payload?.state, message: data.payload?.message || "", plan: data.payload?.plan };
      latestCdxMissionState.runPayload = data.payload;
      latestCdxMissionState.applyPayload = null;
      latestCdxMissionState.outputMode = "run";
      if (isCdxMissionsOpen()) {
        host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, data.payload, null));
      }
      host.setMeta(data.payload?.state === "ok" ? "CDX mission launched." : data.payload?.message || "CDX mission failed.");
    }
    async function applyCdxMissionPlan() {
      const actions = latestCdxMissionState.runPayload?.run?.parsed?.actions;
      if (!Array.isArray(actions) || !actions.length) {
        host.setMeta("No corpus actions to apply.");
        return;
      }
      host.setMeta("Applying allowed corpus actions...");
      const response = await fetch("/api/cdx-mission-apply-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to apply corpus plan.");
      }
      latestCdxMissionState.applyPayload = data.payload;
      host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, data.payload));
      host.setMeta(data.payload?.state === "ok" ? "Corpus actions applied." : data.payload?.message || "Corpus apply failed.");
    }
    async function showCdxRuns(options = {}) {
      if (!host.isCapabilityAvailable("cdx")) {
        const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
        latestCdxRunsPayload = { state: host.capability("cdx").state, message };
        host.setDocument("CDX reports", renderCdxRuns({ state: host.capability("cdx").state, message }));
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("Checking CDX reports...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch("/api/cdx-runs", { signal: view.signal });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX reports.");
      }
      latestCdxRunsPayload = data.payload;
      const wasOpen = isCdxRunsOpen();
      if (options.silent && activeCdxInteractionMenu()) {
        recordCdxUnreadSnapshot("runs", data.payload, { markSeen: wasOpen });
        return;
      }
      host.setDocument("CDX reports", renderCdxRuns(data.payload));
      if (options.silent && !wasOpen) {
        recordCdxUnreadSnapshot("runs", data.payload);
      } else {
        markCdxSectionSeen("runs", data.payload);
      }
      host.setMeta(options.silent ? "CDX reports refreshed." : "CDX reports loaded.");
    }
    async function showCdxHistory(options = {}) {
      if (!host.isCapabilityAvailable("cdx")) {
        const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
        latestCdxHistoryPayload = { state: host.capability("cdx").state, message };
        host.setDocument("CDX history", renderCdxHistory({ state: host.capability("cdx").state, message }));
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("Loading CDX history...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch("/api/cdx-history", { signal: view.signal });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX history.");
      }
      latestCdxHistoryPayload = data.payload;
      const wasOpen = isCdxHistoryOpen();
      if (options.silent && activeCdxInteractionMenu()) {
        recordCdxUnreadSnapshot("history", data.payload, { markSeen: wasOpen });
        return;
      }
      host.setDocument("CDX history", renderCdxHistory(data.payload));
      if (options.silent && !wasOpen) {
        recordCdxUnreadSnapshot("history", data.payload);
      } else {
        markCdxSectionSeen("history", data.payload);
      }
      host.setMeta(options.silent ? "CDX history refreshed." : "CDX history loaded.");
    }
    function renderCdxMemory(payload, scope = "current", viewMode = "cleaned") {
      const state2 = payload?.state || "unavailable", cleaned = String(payload?.cleaned_excerpt || ""), raw = String(payload?.raw_excerpt || ""), source = String(payload?.source_path || "");
      const bytesBefore = Number(payload?.bytes_before || 0), bytesAfter = Number(payload?.bytes_after || 0), sizeLabel = bytesBefore ? `${Math.round(bytesAfter / 1024)} KB / ${Math.round(bytesBefore / 1024)} KB` : "-";
      const warningRows = Array.isArray(payload?.warnings) && payload.warnings.length ? `<div class="viewer-cdx__pills">${payload.warnings.map((warning) => `<span class="viewer-cdx__pill">${escapeHtml(String(warning))}</span>`).join("")}</div>` : "";
      const cards = [["Memory", cdxLabel(scope)], ["Status", cdxLabel(state2)], ["Cleaned", sizeLabel], ["Noise", payload?.noise_ratio !== void 0 ? `${Math.round(Number(payload.noise_ratio || 0) * 100)}%` : "-"]].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(String(value))}</div>
      </div>
    `).join("");
      const scopeButtons = ["current", "global", "project"].map((item) => `
      <button class="viewer-cdx__mode${scope === item ? " is-active" : ""}" type="button" data-viewer-cdx-memory-scope="${item}">${escapeHtml(cdxLabel(item))}</button>
    `).join("");
      const viewButtons = ["cleaned", "raw"].map((item) => `
      <button class="viewer-cdx__mode${viewMode === item ? " is-active" : ""}" type="button" data-viewer-cdx-memory-view="${item}">${escapeHtml(cdxLabel(item))}</button>
    `).join("");
      const excerpt = viewMode === "raw" ? raw : cleaned, api = markdownApi();
      const body = excerpt ? viewMode === "raw" ? renderCodeViewer(excerpt, { language: "markdown", truncated: false }) : `<div class="viewer-cdx__memory-body markdown-preview">${api && typeof api.renderMarkdownToHtml === "function" ? api.renderMarkdownToHtml(excerpt) : `<pre>${escapeHtml(excerpt)}</pre>`}</div>` : `<div class="viewer-cdx__empty">${escapeHtml(payload?.message || "No CDX memory content reported.")}</div>`;
      return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("memory")}
        <section class="viewer-cdx__section viewer-cdx__section--primary">
          <div class="viewer-ci__heading"><h2>${viewMode === "raw" ? "Raw Memory" : "Useful Handoff"}</h2><span>${escapeHtml(source)}</span></div>
          ${body}
        </section>
        <div class="viewer-cdx__summary">${cards}</div>
        <div class="viewer-cdx__controls" aria-label="CDX memory controls">
          <div class="viewer-cdx__modes" role="tablist" aria-label="CDX memory scope">${scopeButtons}</div>
          <div class="viewer-cdx__modes" role="tablist" aria-label="CDX memory excerpt">${viewButtons}</div>
        </div>
        ${warningRows}
      </div>
    `;
    }
    async function showCdxMemory(options = {}) {
      if (!host.isCapabilityAvailable("cdx")) {
        const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
        latestCdxMemoryPayload = { state: host.capability("cdx").state, message };
        host.setDocument("CDX memory", renderCdxMemory(latestCdxMemoryPayload, latestCdxMemoryScope, latestCdxMemoryView));
        host.setMeta(message);
        return;
      }
      latestCdxMemoryScope = options.scope || latestCdxMemoryScope || "current";
      if (!options.silent) {
        host.setMeta("Loading CDX memory...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch(`/api/cdx-memory?${new URLSearchParams({ scope: latestCdxMemoryScope }).toString()}`, { signal: view.signal, cache: "no-store" });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX memory.");
      }
      latestCdxMemoryPayload = data.payload;
      host.setDocument("CDX memory", renderCdxMemory(data.payload, latestCdxMemoryScope, latestCdxMemoryView));
      host.setMeta(options.silent ? "CDX memory refreshed." : "CDX memory loaded.");
    }
    function renderCdxDisk(payload) {
      if (!payload || payload.state !== "ok") {
        return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("disk")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX disk usage is unavailable.")}</div>
        </div>
      `;
      }
      const disk = payload.disk && typeof payload.disk === "object" ? payload.disk : {};
      const profiles = Array.isArray(disk.children) ? disk.children : [];
      const candidates = Array.isArray(disk.candidates) ? disk.candidates : [];
      const totalBytes = Number(disk.bytes) || 0;
      const measured = formatCdxResetAt(String(payload.measured_at || ""));
      const cards = [
        ["Total", String(disk.size || "-")],
        ["Profiles", String(profiles.length)],
        ["Reclaimable", String(disk.reclaimable_size || "0 B")],
        ["Scanned", measured ? `${measured} \xB7 cached 5 min` : "-"]
      ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
      const profileRows = profiles.slice().sort((left, right) => (Number(right.bytes) || 0) - (Number(left.bytes) || 0)).map((profile) => {
        const bytes = Number(profile.bytes) || 0;
        const share = totalBytes > 0 ? `${Math.round(bytes / totalBytes * 100)}%` : "-";
        return `
        <tr title="${escapeHtml(String(profile.path || ""))}">
          <td><strong>${escapeHtml(String(profile.name || "-"))}</strong></td>
          <td>${escapeHtml(String(profile.size || "-"))}</td>
          <td>${escapeHtml(share)}</td>
        </tr>
      `;
      }).join("");
      const candidateRows = candidates.map((candidate) => `
      <tr title="${escapeHtml(String(candidate.path || ""))}">
        <td><strong>${escapeHtml(String(candidate.profile || "-"))}</strong></td>
        <td>${escapeHtml(String(candidate.kind || "-"))}</td>
        <td>${escapeHtml(String(candidate.size || "-"))}</td>
        <td>${escapeHtml(String(candidate.reason || "-"))}</td>
      </tr>
    `).join("");
      const cleanupHint = candidates.length ? `<div class="viewer-cdx__meta">Reclaim from a terminal: <code>cdx clean profiles --tmp</code> or <code>cdx clean profiles --old-logs 30</code> (both confirm before deleting).</div>` : "";
      return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("disk")}
        <div class="viewer-cdx__summary">${cards}</div>
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Profiles</h2><span>${escapeHtml(String(disk.path || ""))}</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr><th>PROFILE</th><th>SIZE</th><th>SHARE</th></tr></thead>
              <tbody>${profileRows || '<tr><td colspan="3" class="viewer-cdx__empty">No profiles reported.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Cleanup candidates</h2><span>${escapeHtml(disk.reclaimable_size || "0 B")} reclaimable</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr><th>PROFILE</th><th>KIND</th><th>SIZE</th><th>REASON</th></tr></thead>
              <tbody>${candidateRows || '<tr><td colspan="4" class="viewer-cdx__empty">Nothing safe to clean up.</td></tr>'}</tbody>
            </table>
          </div>
          ${cleanupHint}
        </section>
      </div>
    `;
    }
    async function showCdxDisk(options = {}) {
      if (!host.isCapabilityAvailable("cdx")) {
        const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
        host.setDocument("CDX disk", renderCdxDisk({ state: host.capability("cdx").state, message }));
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("CDX disk usage state: scanning...");
        host.setDocument("CDX disk", `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("disk")}
          <div class="viewer-cdx__state">Scanning profile disk usage${options.force ? " (forced rescan)" : ""}... This can take a minute on large installs; results are then cached for 5 minutes.</div>
        </div>
      `);
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch("/api/cdx-disk", options.force ? { signal: view.signal, cache: "no-store", headers: { "Cache-Control": "no-cache" } } : { signal: view.signal });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX disk usage.");
      }
      host.setDocument("CDX disk", renderCdxDisk(data.payload));
      host.setMeta(options.silent ? "CDX disk usage refreshed." : "CDX disk usage loaded.");
    }
    async function showCdxReport(runId, options = {}) {
      if (!runId) {
        return;
      }
      host.setMeta("Loading CDX report...");
      const view = options.view || host.beginView();
      let response;
      let data;
      try {
        response = await fetch(`/api/cdx-run-report?${new URLSearchParams({ runId }).toString()}`, { signal: view.signal });
        data = await response.json();
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX report.");
      }
      host.setDocument("CDX run report", renderCdxReport(data.payload));
      cdxCloseTarget = { type: "cdx-runs" };
      host.setMeta("CDX report loaded.");
    }
    async function openCdxArtifact(path) {
      if (!path) {
        return;
      }
      host.setMeta("Loading CDX log...");
      const response = await fetch("/api/cdx-artifact-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CDX artifact.");
      }
      const reportSnapshot = host.currentDocumentSnapshot("CDX run report");
      host.setDocument(data.payload?.name ? `CDX log \xB7 ${data.payload.name}` : "CDX log", renderCdxLogPreview(data.payload));
      cdxCloseTarget = { type: "cdx-report", title: reportSnapshot.title, html: reportSnapshot.html };
      host.setMeta(`Loaded ${data.payload?.path || path}.`);
    }
    const state = {};
    Object.defineProperties(state, {
      cdxCloseTarget: { get: () => cdxCloseTarget, set: (value) => {
        cdxCloseTarget = value;
      } },
      latestCdxHistoryPayload: { get: () => latestCdxHistoryPayload, set: (value) => {
        latestCdxHistoryPayload = value;
      } },
      latestCdxMemoryPayload: { get: () => latestCdxMemoryPayload, set: (value) => {
        latestCdxMemoryPayload = value;
      } },
      latestCdxMemoryScope: { get: () => latestCdxMemoryScope, set: (value) => {
        latestCdxMemoryScope = value;
      } },
      latestCdxMemoryView: { get: () => latestCdxMemoryView, set: (value) => {
        latestCdxMemoryView = value;
      } },
      latestCdxMissionState: { get: () => latestCdxMissionState, set: (value) => {
        latestCdxMissionState = value;
      } },
      latestCdxRunsPayload: { get: () => latestCdxRunsPayload, set: (value) => {
        latestCdxRunsPayload = value;
      } },
      latestCdxStatusPayload: { get: () => latestCdxStatusPayload, set: (value) => {
        latestCdxStatusPayload = value;
      } },
      latestCdxStatusSignature: { get: () => latestCdxStatusSignature, set: (value) => {
        latestCdxStatusSignature = value;
      } },
      pendingCdxSessionResets: { get: () => pendingCdxSessionResets },
      pendingCdxSessionToggles: { get: () => pendingCdxSessionToggles }
    });
    return {
      state,
      applyCdxMissionPlan,
      applyCdxSessionConfigModal,
      applyCdxSessionPermission,
      applyOptimisticCdxSessionPermission,
      applyOptimisticCdxSessionToggle,
      cdxColumnVisibilityPreference,
      cdxHistoryColumnVisibilityPreference,
      cdxHistorySessionFilterPreference,
      cdxProviderFilterPreference,
      cdxRunColumnVisibilityPreference,
      cdxRunSessionFilterPreference,
      cdxSessionForTerminal,
      cdxSessionLastUsedMs,
      cdxSessionUsage,
      cdxUsageFromStatus,
      chooseCdxHandoffSource,
      isCdxHistoryOpen,
      isCdxMissionsOpen,
      isCdxRunsOpen,
      isCdxStatusOpen,
      launchCdxMission,
      launchCdxMissionInTerminal,
      loadCdxSessionsForCustomTerminal,
      markCdxSectionSeen,
      openCdxArtifact,
      persistCdxColumnVisibility,
      persistCdxHistoryColumnVisibility,
      persistCdxHistorySessionFilter,
      persistCdxProviderFilter,
      persistCdxRunColumnVisibility,
      persistCdxRunSessionFilter,
      persistCdxSessionConfig,
      previewCdxMission,
      recordCdxDelta,
      recordCdxUnreadSnapshot,
      refreshCdxBadgeCounters,
      refreshCdxSessionUsage,
      renderCdxDisk,
      renderCdxHistory,
      renderCdxMemory,
      renderCdxMissionConfigMenu,
      renderCdxMissionInputs,
      renderCdxMissionSetup,
      renderCdxMissions,
      renderCdxRuns,
      renderCdxSessionTable,
      renderCdxStatus,
      rerenderCdxStatusFromPreferences,
      selectCdxMissionFromModal,
      selectedCdxMissionRequest,
      setCdxMissionBusy,
      showCdxDisk,
      showCdxHistory,
      showCdxMemory,
      showCdxMissions,
      showCdxReport,
      showCdxRuns,
      showCdxSessionConfigModal,
      showCdxStatus,
      updateCdxMissionsCount,
      updateCdxSessionConfigFromModal,
      updateCdxUnreadBadges,
      updateMainCdxBadge,
      withCdxMissionAction
    };
  }

  // clients/viewer/src/browser-host/state.js
  function createViewerState(initial = {}) {
    let viewerPreferences = initial.viewerPreferences ?? {};
    let viewerFilterState = initial.viewerFilterState ?? {};
    let latestRepoRoot = initial.latestRepoRoot ?? "";
    let latestRepository = initial.latestRepository ?? null;
    const state = {};
    Object.defineProperties(state, {
      viewerPreferences: { get: () => viewerPreferences, set: (value) => {
        viewerPreferences = value;
      }, enumerable: true },
      viewerFilterState: { get: () => viewerFilterState, set: (value) => {
        viewerFilterState = value;
      }, enumerable: true },
      latestRepoRoot: { get: () => latestRepoRoot, set: (value) => {
        latestRepoRoot = value;
      }, enumerable: true },
      latestRepository: { get: () => latestRepository, set: (value) => {
        latestRepository = value;
      }, enumerable: true }
    });
    return state;
  }
  function readerFor(state) {
    const reader = {};
    for (const key of Object.keys(state)) {
      Object.defineProperty(reader, key, { get: () => state[key], enumerable: true });
    }
    return Object.freeze(reader);
  }

  // clients/viewer/src/browser-host/graph.js
  function _escapeMermaidLabel(text) {
    return String(text || "").replace(/"/g, "'").replace(/[\r\n]+/g, " ");
  }
  function buildChainFlowchartSource(payload) {
    const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
    const edges = Array.isArray(payload?.edges) ? payload.edges : [];
    if (nodes.length === 0) {
      return null;
    }
    const lines = ["flowchart TD"];
    for (const node of nodes) {
      const label = _escapeMermaidLabel(`${node.title || node.ref}
${node.kind} \xB7 ${node.status || "unknown"}`);
      lines.push(`  ${node.ref}["${label}"]`);
    }
    for (const edge of edges) {
      lines.push(`  ${edge.from} --> ${edge.to}`);
    }
    for (const node of nodes) {
      lines.push(`  click ${node.ref} call __logicsGraphNodeClick("${node.ref}")`);
    }
    lines.push("  classDef request fill:#2d5b97,stroke:#79b8ff,color:#fff,stroke-width:1.5px");
    lines.push("  classDef product fill:#6b4ea0,stroke:#c4b5fd,color:#fff,stroke-width:1.5px");
    lines.push("  classDef backlog fill:#176b63,stroke:#5eead4,color:#fff,stroke-width:1.5px");
    lines.push("  classDef task fill:#8a4b18,stroke:#fbbf24,color:#fff,stroke-width:1.5px");
    lines.push("  classDef runbook fill:#7a1f3d,stroke:#f472b6,color:#fff,stroke-width:1.5px");
    lines.push("  classDef category fill:#3f3f46,stroke:#a1a1aa,color:#fff,stroke-width:1.5px");
    for (const node of nodes) {
      lines.push(`  class ${node.ref} ${NODE_CLASS_BY_KIND[node.kind] || "request"}`);
    }
    return lines.join("\n");
  }
  var NODE_CLASS_BY_KIND = { backlog: "backlog", product: "product", task: "task", runbook: "runbook", category: "category" };
  function renderChainGraph(payload, { inline = false, open = !inline } = {}) {
    const source = buildChainFlowchartSource(payload);
    const dangling = Array.isArray(payload?.dangling) ? payload.dangling : [];
    const notes = dangling.length ? `<p class="viewer-graph__dangling">Not resolved (no doc on disk): ${dangling.map(_escapeMermaidLabel).join(", ")}</p>` : "";
    const attrs = `class="viewer-graph${inline ? " viewer-graph--inline" : ""}" aria-label="Linked workflow chain"${open ? " open" : ""}`;
    if (!source) {
      return `<details ${attrs}><summary class="viewer-graph__label">Linked workflow</summary><p>No chain resolved.</p>${notes}</details>`;
    }
    return `<details ${attrs}><summary class="viewer-graph__label">Linked workflow</summary><pre class="mermaid">${source}</pre>${notes}</details>`;
  }
  function createGraphScreen(host) {
    async function showChainGraph(ref, options = {}) {
      host.setMeta("Resolving chain graph...");
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch(`/api/chain-graph?ref=${encodeURIComponent(ref)}`, { signal: view.signal });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (host.isAbortError && host.isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        host.setDocument("Graph", `<p>Unable to resolve chain graph: ${_escapeMermaidLabel(data.error || response.statusText)}</p>`);
        host.setMeta("Chain graph failed to load.");
        return;
      }
      window.__logicsGraphNodeClick = (nodeRef) => host.openDoc(nodeRef);
      host.setDocument("Graph", renderChainGraph(data.payload));
      host.renderMermaidDiagrams();
      host.setMeta("Chain graph loaded.");
    }
    return { showChainGraph };
  }

  // clients/viewer/src/browser-host/workshop.js
  function createWorkshopScreen(host) {
    const workshopButton = () => document.getElementById("viewer-workshop");
    function workshopUsesSystemTerminal() {
      return host.shared.viewerPreferences.workshopUseSystemTerminal === true || window.parent !== window;
    }
    function syncWorkshopSystemTerminalControls() {
      document.querySelectorAll("[data-viewer-workshop-system-terminal]").forEach((node) => {
        if (node instanceof HTMLInputElement) {
          node.checked = workshopUsesSystemTerminal();
        }
      });
    }
    function bindWorkshopSystemTerminalControls() {
      document.querySelectorAll("[data-viewer-workshop-system-terminal]").forEach((node) => {
        if (!(node instanceof HTMLInputElement) || node.dataset.viewerBound === "1") return;
        node.dataset.viewerBound = "1";
        node.addEventListener("change", () => {
          host.updateViewerPreferences({ workshopUseSystemTerminal: node.checked });
          host.setMeta(node.checked ? "Workshop will open system terminals." : "Workshop will use the embedded terminal (xterm.js).");
        });
      });
      syncWorkshopSystemTerminalControls();
    }
    let workshopBadgeCounts = { terminals: 0, commands: 0 };
    function updateWorkshopBadges() {
      const button = document.getElementById("viewer-workshop");
      if (!(button instanceof HTMLElement)) return;
      button.querySelector("[data-viewer-workshop-badges]")?.remove();
      clearNavMenuBadges(["workshop:terminals", "workshop:commands"]);
      const { terminals, commands } = workshopBadgeCounts;
      if (terminals <= 0 && commands <= 0) return;
      const html = [
        terminals > 0 ? `<span class="viewer-git-badge viewer-git-badge--commits" title="${escapeHtml(terminals + " terminal session(s) running")}" aria-label="${escapeHtml(terminals + " terminal session(s) running")}">${escapeHtml(String(terminals))}</span>` : "",
        commands > 0 ? `<span class="viewer-git-badge viewer-git-badge--files" title="${escapeHtml(commands + " command(s) running")}" aria-label="${escapeHtml(commands + " command(s) running")}">${escapeHtml(String(commands))}</span>` : ""
      ].filter(Boolean).join("");
      if (html) {
        button.insertAdjacentHTML("beforeend", `<span class="viewer-git-badges" data-viewer-workshop-badges>${html}</span>`);
      }
      if (terminals > 0) {
        setNavMenuBadges("workshop:terminals", renderGitBadge("commits", terminals));
      }
      if (commands > 0) {
        setNavMenuBadges("workshop:commands", renderGitBadge("files", commands));
      }
    }
    function recomputeWorkshopBadges() {
      const isRunning = (state2) => state2 === "running" || state2 === "starting";
      let terminals = 0;
      for (const entry of workshopTerminalState.sessions.values()) {
        if (isRunning(entry.state)) terminals += 1;
      }
      let commands = 0;
      for (const entry of workshopCommandState.sessions.values()) {
        if (isRunning(entry.state)) commands += 1;
      }
      if (workshopBadgeCounts.terminals === terminals && workshopBadgeCounts.commands === commands) return;
      workshopBadgeCounts = { terminals, commands };
      updateWorkshopBadges();
    }
    async function loadWorkshopExplorer(options = {}) {
      const container = document.querySelector("[data-viewer-workshop-explorer]");
      if (!(container instanceof HTMLElement)) return;
      if (!host.isCapabilityAvailable("workspace")) {
        const message = host.capabilityMessage("workspace", "Explorer is not available for this project.");
        container.innerHTML = renderWorkspace({ state: "unavailable", message }, { state: "unavailable", message });
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("Loading workspace...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      const tree = await fetchWorkspaceTree("");
      const opening = openingWorkspacePath(tree);
      const preview = await fetchWorkspacePreview(opening);
      if (host.isViewStale(view)) {
        return;
      }
      const fresh = document.querySelector("[data-viewer-workshop-explorer]");
      if (fresh instanceof HTMLElement) {
        window.__logicsWorkspaceMarkdownMode = String(host.shared.viewerPreferences.workspaceMarkdownMode || "");
        fresh.innerHTML = renderWorkspace(tree, preview);
        if (typeof host.onWorkspaceExplorerLoaded === "function") {
          host.onWorkspaceExplorerLoaded(tree, preview);
        }
      }
      host.setMeta(options.silent ? "Explorer refreshed." : "Explorer loaded.");
    }
    function openingWorkspacePath(treePayload) {
      const entries = Array.isArray(treePayload?.entries) ? treePayload.entries : [];
      const files = entries.filter((entry) => entry.kind !== "directory" && !entry.ignored);
      const readme = files.find((entry) => /^readme(\.|$)/i.test(String(entry.name || "")));
      return String((readme || files[0])?.path || "");
    }
    function preferredWorkshopTab() {
      const stored = String(host.shared.viewerPreferences.workshopActiveTab || "");
      return workshopTabs.some((tab) => tab.id === stored) ? stored : "terminals";
    }
    function setWorkshopActiveTab(tabId) {
      const next = workshopTabs.some((tab) => tab.id === tabId) ? tabId : "terminals";
      if (next === host.shared.viewerPreferences.workshopActiveTab) return;
      host.updateViewerPreferences({ workshopActiveTab: next });
    }
    function renderWorkshopPanel(tabId) {
      if (tabId === "explorer") {
        return `
        <div class="viewer-workshop__panel viewer-workshop__panel--explorer" role="tabpanel" data-viewer-workshop-panel="explorer" data-viewer-workshop-explorer>
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty">
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span>
            <span>Loading workspace...</span>
          </div>
        </div>
      `;
      }
      if (tabId === "commands") {
        return `
        <div class="viewer-workshop__panel" role="tabpanel" data-viewer-workshop-panel="commands" data-viewer-workshop-commands>
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty">
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span>
            <span>Discovering commands...</span>
          </div>
        </div>
      `;
      }
      return `
      <div class="viewer-workshop__panel viewer-workshop__panel--terminals-active" role="tabpanel" data-viewer-workshop-panel="terminals">
        <div class="viewer-workshop__portrait-blocker" data-viewer-workshop-portrait-blocker aria-hidden="true">
          <span class="viewer-workshop__portrait-blocker-icon" aria-hidden="true">\u21BB</span>
          <span class="viewer-workshop__portrait-blocker-title">Rotate your device</span>
          <span class="viewer-workshop__portrait-blocker-body">Workshop terminals need a wider viewport. Switch to landscape (or resize the window) to use them.</span>
        </div>
        <aside class="viewer-workshop__terminal-list" data-viewer-workshop-terminal-list aria-label="Terminal sessions"></aside>
        <section class="viewer-workshop__terminal-stage" data-viewer-workshop-terminal-stage>
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty" data-viewer-workshop-terminal-empty>
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span>
            <span>No terminal session yet. Click "New terminal" to spawn one.</span>
          </div>
        </section>
      </div>
    `;
    }
    const workshopCommandState = {
      catalog: null,
      sessions: /* @__PURE__ */ new Map(),
      streams: /* @__PURE__ */ new Map(),
      // item_756: what the filter box holds, kept out of the DOM so a re-render caused by
      // a running script's log arriving does not throw away what the operator typed.
      query: "",
      // item_794: the chip narrowing to one prefix. Separate from `query` rather than
      // typed into it: the prefix is an exact match on a group, and "test" as free text
      // also matches `latest` and every command whose body mentions it.
      prefix: ""
    };
    function renderWorkshopCommandRunMenu(entry) {
      const id = escapeHtml(entry.id);
      const terminalsAvailable = Boolean(host.capability("workshop")?.detail?.terminalsAvailable);
      const canLaunchTerminal = terminalsAvailable && Array.isArray(entry.runner) && entry.runner.length > 0;
      if (!canLaunchTerminal) {
        return `<button class="btn" type="button" data-viewer-workshop-command-run="${id}">Run</button>`;
      }
      const name = escapeHtml(entry.name || entry.id);
      return `
      <details class="viewer-cdx__menu viewer-workshop__command-run-menu">
        <summary class="btn viewer-workshop__command-run-summary" title="Choose how to run ${name}">Run</summary>
        <div class="viewer-cdx__menu-panel viewer-workshop__command-run-panel" role="menu" aria-label="Run options for ${name}">
          <button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-workshop-command-run-terminal="${id}">New terminal</button>
          <button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-workshop-command-run="${id}">Run here</button>
        </div>
      </details>
    `;
    }
    function renderWorkshopCommandRow(entry) {
      const session = workshopCommandState.sessions.get(entry.id) || null;
      const state2 = session?.state || "idle";
      const running = state2 === "running" || state2 === "starting";
      const exitBadge = session && session.exitCode !== null && session.exitCode !== void 0 ? `<span class="viewer-workshop__exit viewer-workshop__exit--${session.exitCode === 0 ? "ok" : "fail"}">exit ${escapeHtml(String(session.exitCode))}</span>` : "";
      const accent = running ? "running" : session && session.exitCode !== null && session.exitCode !== void 0 ? session.exitCode === 0 ? "passed" : "failed" : "idle";
      const stateBadge = state2 === "idle" ? "" : `<span class="viewer-workshop__state viewer-workshop__state--${escapeHtml(state2)}">${escapeHtml(state2)}${running ? escapeHtml(formatCommandDuration(session?.startedAt)) : ""}</span>`;
      return `
      <li class="viewer-workshop__command" data-viewer-workshop-command="${escapeHtml(entry.id)}" data-viewer-workshop-command-accent="${escapeHtml(accent)}">
        <div class="viewer-workshop__command-header">
          <div class="viewer-workshop__command-name">
            <strong>${escapeHtml(entry.name)}</strong>
            <code class="viewer-workshop__command-line" title="${escapeHtml(entry.command)}">${escapeHtml(entry.command)}</code>
          </div>
          <div class="viewer-workshop__command-actions">
            ${stateBadge}
            ${exitBadge}
            ${running ? `<button class="btn" type="button" data-viewer-workshop-command-stop="${escapeHtml(entry.id)}">Stop</button>` : renderWorkshopCommandRunMenu(entry)}
          </div>
        </div>
        <pre class="viewer-workshop__log" data-viewer-workshop-command-log="${escapeHtml(entry.id)}" aria-live="polite">${escapeHtml(session?.logText || "")}</pre>
      </li>
    `;
    }
    function formatCommandDuration(startedAt) {
      const started = Number(startedAt) || 0;
      if (!started) return "";
      const seconds = Math.max(0, Math.round((Date.now() - started) / 1e3));
      if (seconds < 60) return ` \xB7 ${seconds}s`;
      return ` \xB7 ${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
    }
    function workshopCommandGroup(entry) {
      const name = String(entry.name || "");
      const colon = name.indexOf(":");
      if (colon > 0) return name.slice(0, colon);
      return entry.group || "Commands";
    }
    function renderWorkshopCommandList(catalog) {
      if (!catalog || catalog.state === "unavailable") {
        return `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span><span>${escapeHtml(catalog?.message || "Commands are unavailable.")}</span></div>`;
      }
      const commands = Array.isArray(catalog.commands) ? catalog.commands : [];
      if (commands.length === 0) {
        return `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span><span>${escapeHtml(catalog.message || "No commands discovered.")}</span></div>`;
      }
      const query = String(workshopCommandState.query || "").trim().toLowerCase();
      const prefix = String(workshopCommandState.prefix || "");
      const matching = commands.filter((entry) => {
        if (prefix && workshopCommandGroup(entry) !== prefix) return false;
        if (!query) return true;
        return `${entry.name} ${entry.command}`.toLowerCase().includes(query);
      });
      const prefixCounts = /* @__PURE__ */ new Map();
      commands.forEach((entry) => {
        const group = workshopCommandGroup(entry);
        prefixCounts.set(group, (prefixCounts.get(group) || 0) + 1);
      });
      const chips = [...prefixCounts.entries()].filter(([, count]) => count > 1).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 6).map(([group, count]) => `<button class="viewer-workshop__chip${group === prefix ? " is-active" : ""}" type="button" data-viewer-workshop-command-prefix="${escapeHtml(group)}" aria-pressed="${group === prefix ? "true" : "false"}">${escapeHtml(group)} <span>${count}</span></button>`).join("");
      const chipBar = chips ? `<div class="viewer-workshop__chips" role="group" aria-label="Filter commands by prefix">${chips}${prefix ? `<button class="viewer-workshop__chip viewer-workshop__chip--clear" type="button" data-viewer-workshop-command-prefix="">All</button>` : ""}</div>` : "";
      const groups = /* @__PURE__ */ new Map();
      matching.forEach((entry) => {
        const group = workshopCommandGroup(entry);
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(entry);
      });
      const sections = [...groups.entries()].map(([group, entries]) => `
      <section class="viewer-workshop__group">
        <h3 class="viewer-workshop__group-title">${escapeHtml(group)} <span class="viewer-workshop__group-count">${entries.length}</span></h3>
        <ul class="viewer-workshop__commands">
          ${entries.map(renderWorkshopCommandRow).join("")}
        </ul>
      </section>
    `).join("");
      const summary = query || prefix ? `<p class="viewer-workshop__command-summary">${matching.length} of ${commands.length} commands${prefix ? ` under ${escapeHtml(prefix)}` : ""}${query ? ` match \u201C${escapeHtml(query)}\u201D` : ""}</p>` : `<p class="viewer-workshop__command-summary">${commands.length} commands from ${escapeHtml(commands[0]?.source || "this repository")}</p>`;
      return `
      ${chipBar}
      <div class="viewer-workshop__command-filter">
        <input type="search" placeholder="Filter by name or command..." aria-label="Filter commands"
               data-viewer-workshop-command-query value="${escapeHtml(workshopCommandState.query || "")}" />
      </div>
      ${summary}
      ${sections || '<p class="viewer-workshop__command-summary">Nothing matches that filter.</p>'}
    `;
    }
    function renderWorkshopCommands() {
      const container = document.querySelector("[data-viewer-workshop-commands]");
      if (!(container instanceof HTMLElement)) return;
      const focused = document.activeElement?.hasAttribute?.("data-viewer-workshop-command-query");
      const caret = focused ? document.activeElement.selectionStart : null;
      container.innerHTML = renderWorkshopCommandList(workshopCommandState.catalog);
      const filter = container.querySelector("[data-viewer-workshop-command-query]");
      if (filter instanceof HTMLInputElement) {
        filter.addEventListener("input", () => {
          workshopCommandState.query = filter.value;
          renderWorkshopCommands();
        });
      }
      container.querySelectorAll("[data-viewer-workshop-command-prefix]").forEach((chip) => {
        chip.addEventListener("click", () => {
          const next = chip.getAttribute("data-viewer-workshop-command-prefix") || "";
          workshopCommandState.prefix = next === workshopCommandState.prefix ? "" : next;
          renderWorkshopCommands();
        });
      });
      if (filter instanceof HTMLInputElement) {
        if (focused) {
          filter.focus();
          if (caret !== null) filter.setSelectionRange(caret, caret);
        }
      }
    }
    async function loadWorkshopCommands() {
      try {
        const response = await fetch("/api/workshop-commands");
        const data = await response.json();
        workshopCommandState.catalog = data?.payload || null;
      } catch (error) {
        workshopCommandState.catalog = { state: "unavailable", commands: [], message: String(error?.message || error) };
      }
      renderWorkshopCommands();
    }
    function updateWorkshopCommandSession(commandId, patch) {
      const previous = workshopCommandState.sessions.get(commandId) || { logText: "" };
      const enteringRun = (patch.state === "running" || patch.state === "starting") && previous.state !== "running" && previous.state !== "starting";
      const startedAt = enteringRun ? Date.now() : previous.startedAt;
      workshopCommandState.sessions.set(commandId, { ...previous, ...patch, startedAt });
      renderWorkshopCommands();
      recomputeWorkshopBadges();
    }
    function appendWorkshopCommandLog(commandId, line) {
      const previous = workshopCommandState.sessions.get(commandId) || { logText: "" };
      const next = previous.logText ? `${previous.logText}
${line}` : line;
      workshopCommandState.sessions.set(commandId, { ...previous, logText: next });
      const node = document.querySelector(`[data-viewer-workshop-command-log="${commandId}"]`);
      if (node instanceof HTMLElement) {
        node.textContent = next;
        node.scrollTop = node.scrollHeight;
      }
    }
    function closeWorkshopCommandStream(commandId) {
      const stream = workshopCommandState.streams.get(commandId);
      if (stream) {
        try {
          stream.close();
        } catch {
        }
        workshopCommandState.streams.delete(commandId);
      }
    }
    async function startWorkshopCommand(commandId) {
      try {
        const response = await fetch("/api/workshop-command-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandId })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Unable to start command.");
        }
        const session = data.payload;
        updateWorkshopCommandSession(commandId, {
          sessionId: session.id,
          state: session.state,
          exitCode: session.exitCode,
          logText: ""
        });
        openWorkshopCommandStream(commandId, session.id);
      } catch (error) {
        updateWorkshopCommandSession(commandId, { state: "error", logText: `! ${error?.message || error}` });
      }
    }
    function openWorkshopCommandStream(commandId, sessionId) {
      closeWorkshopCommandStream(commandId);
      const source = new EventSource(`/api/workshop-session/${encodeURIComponent(sessionId)}/stream`);
      workshopCommandState.streams.set(commandId, source);
      source.addEventListener("line", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          appendWorkshopCommandLog(commandId, String(payload.line || ""));
        } catch {
        }
      });
      source.addEventListener("end", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          updateWorkshopCommandSession(commandId, {
            state: payload.state,
            exitCode: payload.exitCode
          });
        } catch {
        }
        closeWorkshopCommandStream(commandId);
      });
      source.addEventListener("error", () => {
        closeWorkshopCommandStream(commandId);
      });
    }
    async function stopWorkshopCommand(commandId) {
      const session = workshopCommandState.sessions.get(commandId);
      if (!session?.sessionId) return;
      try {
        await fetch("/api/workshop-command-stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.sessionId })
        });
      } catch {
      }
    }
    const workshopTerminalState = {
      sessions: /* @__PURE__ */ new Map(),
      activeId: "",
      streams: /* @__PURE__ */ new Map(),
      order: [],
      draggingId: "",
      suppressSelectUntil: 0,
      hydrated: false
    };
    const workshopExternalLaunches = [];
    function workshopTerminalOrderRootKey() {
      return host.shared.latestRepoRoot || host.shared.latestRepository?.root || "default";
    }
    function storedWorkshopTerminalOrder() {
      const byRoot = host.shared.viewerPreferences.workshopTerminalOrderByRoot;
      const rootKey = workshopTerminalOrderRootKey();
      const value = byRoot && typeof byRoot === "object" ? byRoot[rootKey] : null;
      return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
    }
    function persistWorkshopTerminalOrder() {
      const rootKey = workshopTerminalOrderRootKey();
      const byRoot = host.shared.viewerPreferences.workshopTerminalOrderByRoot && typeof host.shared.viewerPreferences.workshopTerminalOrderByRoot === "object" ? host.shared.viewerPreferences.workshopTerminalOrderByRoot : {};
      host.updateViewerPreferences({
        workshopTerminalOrderByRoot: {
          ...byRoot,
          [rootKey]: [...workshopTerminalState.order]
        }
      });
    }
    function reconcileWorkshopTerminalOrder({ persist = false } = {}) {
      const ids = [...workshopTerminalState.sessions.keys()];
      const live = new Set(ids);
      const preferred = workshopTerminalState.order.length ? workshopTerminalState.order : storedWorkshopTerminalOrder();
      const next = preferred.filter((id) => live.has(id));
      for (const id of ids) {
        if (!next.includes(id)) next.push(id);
      }
      workshopTerminalState.order = next;
      if (persist) persistWorkshopTerminalOrder();
    }
    function orderedWorkshopTerminalEntries() {
      reconcileWorkshopTerminalOrder();
      return workshopTerminalState.order.map((id) => workshopTerminalState.sessions.get(id)).filter(Boolean);
    }
    function moveWorkshopTerminalBefore(sourceId, targetId) {
      if (!sourceId || !targetId || sourceId === targetId) return false;
      reconcileWorkshopTerminalOrder();
      const next = workshopTerminalState.order.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex < 0) return false;
      next.splice(targetIndex, 0, sourceId);
      workshopTerminalState.order = next;
      persistWorkshopTerminalOrder();
      renderWorkshopTerminalList();
      host.setMeta("Terminal order updated.");
      return true;
    }
    function clearWorkshopTerminalDragState() {
      workshopTerminalState.draggingId = "";
      document.querySelectorAll(".viewer-workshop__terminal-row.is-dragging, .viewer-workshop__terminal-row.is-drop-target").forEach((node) => {
        node.classList.remove("is-dragging", "is-drop-target");
        node.removeAttribute("aria-grabbed");
      });
    }
    async function hydrateWorkshopTerminals() {
      if (workshopTerminalState.hydrated) return;
      if (!host.isCapabilityAvailable("workshop")) return;
      if (!host.capability("workshop").detail?.terminalsAvailable) return;
      workshopTerminalState.hydrated = true;
      try {
        const response = await fetch("/api/workshop-terminals");
        const data = await response.json();
        const sessions = Array.isArray(data?.payload?.sessions) ? data.payload.sessions : [];
        for (const remote of sessions) {
          const id = String(remote?.id || "");
          if (!id) continue;
          if (workshopTerminalState.sessions.has(id)) continue;
          const state2 = String(remote?.state || "");
          if (state2 !== "running" && state2 !== "starting") continue;
          workshopTerminalState.sessions.set(id, {
            id,
            label: String(remote?.label || "shell"),
            command: Array.isArray(remote?.command) ? remote.command.map(String) : [],
            cdxSession: String(remote?.cdxSession || ""),
            state: state2,
            bufferedOutput: ""
          });
        }
        if (!workshopTerminalState.activeId) {
          reconcileWorkshopTerminalOrder();
          workshopTerminalState.activeId = workshopTerminalState.order[0] || "";
        }
        reconcileWorkshopTerminalOrder({ persist: true });
        recomputeWorkshopBadges();
      } catch {
        workshopTerminalState.hydrated = false;
      }
    }
    function refreshWorkshopTerminalUsage() {
      if (!workshopTerminalListNode()) return;
      for (const entry of workshopTerminalState.sessions.values()) {
        if (host.cdxSessionForTerminal(entry)) {
          renderWorkshopTerminalList();
          return;
        }
      }
    }
    function renderWorkshopTerminalList() {
      const node = workshopTerminalListNode();
      if (!(node instanceof HTMLElement)) return;
      const entries = orderedWorkshopTerminalEntries();
      const externalRows = workshopExternalLaunches.slice(-12).reverse().map((entry) => {
        const cdxSession = host.cdxSessionForTerminal(entry), raw = Array.isArray(entry.command) ? entry.command.join(" ") : "";
        const displayLabel = cdxSession && (!entry.label || entry.label === raw || /^cdx\s+/.test(String(entry.label))) ? cdxSession : entry.label || cdxSession || raw || "system terminal";
        return `<div class="viewer-workshop__terminal-row" data-viewer-workshop-external="${escapeHtml(entry.id)}" title="${escapeHtml([entry.terminal, entry.nativeRef || entry.id].filter(Boolean).join(" \xB7 "))}"><span class="viewer-workshop__terminal-row-main">${cdxSession ? renderCdxUsageGauge(host.cdxSessionUsage(cdxSession), cdxSession) : ""}<span class="viewer-workshop__terminal-row-label">${escapeHtml(displayLabel)}</span></span><span class="viewer-workshop__state viewer-workshop__state--running">external</span><span class="viewer-workshop__terminal-row-controls"><button class="viewer-workshop__terminal-row-close" type="button" data-viewer-workshop-external-close="${escapeHtml(entry.id)}" aria-label="Remove external terminal entry">\xD7</button></span></div>`;
      }).join("");
      const header = `<div class="viewer-workshop__terminal-list-header">
      <span>Terminals</span>
      <span class="viewer-workshop__terminal-actions">
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-new>+ Shell</button>
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-custom>+ Custom</button>
      </span>
    </div>`;
      if (entries.length === 0 && !externalRows) {
        node.innerHTML = `${header}<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span><span>No sessions yet.</span></div>`;
        return;
      }
      const rows = entries.map((entry) => {
        const isActive = entry.id === workshopTerminalState.activeId;
        const state2 = String(entry.state || "");
        const stateBadge = state2 && state2 !== "running" ? `<span class="viewer-workshop__state viewer-workshop__state--${escapeHtml(state2)}">${escapeHtml(state2)}</span>` : "";
        const closing = Boolean(entry.closing);
        const closeAttrs = closing ? `aria-busy="true" aria-label="Closing session"` : `data-viewer-workshop-terminal-close="${escapeHtml(entry.id)}" role="button" tabindex="0" aria-label="Close session"`;
        const closeGlyph = closing ? `<span class="viewer-workshop__spinner" aria-hidden="true"></span>` : `\xD7`;
        const clearSpan = closing ? "" : `<span class="viewer-workshop__terminal-row-clear" data-viewer-workshop-terminal-clear="${escapeHtml(entry.id)}" role="button" tabindex="0" aria-label="Clear screen">\u239A</span>`;
        const cdxSession = host.cdxSessionForTerminal(entry);
        const rawCommandLabel = Array.isArray(entry.command) ? entry.command.join(" ") : "";
        const isRawCdxLabel = cdxSession && (!entry.label || entry.label === rawCommandLabel || /^cdx\s+/.test(String(entry.label)));
        const displayLabel = isRawCdxLabel ? cdxSession : entry.label || cdxSession || entry.id;
        const gauge = cdxSession ? renderCdxUsageGauge(host.cdxSessionUsage(cdxSession), cdxSession) : "";
        return `<button class="viewer-workshop__terminal-row${isActive ? " is-active" : ""}${closing ? " is-closing" : ""}" type="button" draggable="true" data-viewer-workshop-terminal-drag="${escapeHtml(entry.id)}" data-viewer-workshop-terminal-select="${escapeHtml(entry.id)}">
        <span class="viewer-workshop__terminal-row-main">
          ${gauge}
          <span class="viewer-workshop__terminal-row-label" data-viewer-workshop-terminal-rename="${escapeHtml(entry.id)}">${escapeHtml(displayLabel)}</span>
        </span>
        ${stateBadge}
        <span class="viewer-workshop__terminal-row-controls">
          ${clearSpan}
          <span class="viewer-workshop__terminal-row-close${closing ? " is-closing" : ""}" ${closeAttrs}>${closeGlyph}</span>
        </span>
      </button>`;
      }).join("");
      node.innerHTML = `${header}<div class="viewer-workshop__terminal-rows">${rows}${externalRows}</div>`;
    }
    function ensureWorkshopTerminalStage() {
      const stage = workshopTerminalStageNode();
      if (!(stage instanceof HTMLElement)) return null;
      const active = workshopTerminalState.activeId ? workshopTerminalState.sessions.get(workshopTerminalState.activeId) : null;
      const placeholder = stage.querySelector("[data-viewer-workshop-terminal-empty]");
      if (placeholder) placeholder.remove();
      stage.querySelectorAll("[data-viewer-workshop-terminal-host]").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const id = node.getAttribute("data-viewer-workshop-terminal-host") || "";
        if (!workshopTerminalState.sessions.has(id)) {
          node.remove();
        }
      });
      if (!active) {
        if (!stage.querySelector("[data-viewer-workshop-terminal-empty]")) {
          const empty = document.createElement("div");
          empty.className = "viewer-workspace__placeholder viewer-workspace__placeholder--empty";
          empty.setAttribute("data-viewer-workshop-terminal-empty", "");
          empty.innerHTML = '<span class="viewer-workspace__placeholder-icon" aria-hidden="true">\xB7</span><span>Select or create a terminal session to start.</span>';
          stage.appendChild(empty);
        }
        stage.querySelectorAll("[data-viewer-workshop-terminal-host]").forEach((node) => {
          if (node instanceof HTMLElement) {
            node.classList.add("viewer-workshop__terminal-host--hidden");
          }
        });
        return null;
      }
      let host2 = stage.querySelector(`[data-viewer-workshop-terminal-host="${active.id}"]`);
      stage.querySelectorAll("[data-viewer-workshop-terminal-host]").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const id = node.getAttribute("data-viewer-workshop-terminal-host") || "";
        if (id === active.id) {
          node.classList.remove("viewer-workshop__terminal-host--hidden");
        } else {
          node.classList.add("viewer-workshop__terminal-host--hidden");
        }
      });
      if (!(host2 instanceof HTMLElement)) {
        host2 = document.createElement("div");
        host2.className = "viewer-workshop__terminal-host";
        host2.setAttribute("data-viewer-workshop-terminal-host", active.id);
        stage.appendChild(host2);
      }
      return host2 instanceof HTMLElement ? host2 : null;
    }
    function mountWorkshopTerminalEmulator(entry) {
      if (typeof window.Terminal !== "function") return;
      if (entry.terminal) return;
      const host2 = ensureWorkshopTerminalHostFor(entry.id);
      if (!host2) return;
      const term = new window.Terminal({
        fontSize: workshopTerminalPreferredFontSize(),
        fontFamily: '"Menlo", "Consolas", monospace',
        letterSpacing: 0,
        theme: { background: "#0a0a0a", foreground: "#d4d4d4" },
        cursorBlink: true,
        scrollback: 2e3,
        convertEol: false
      });
      const fitAddon = typeof window.FitAddon === "function" ? new window.FitAddon() : window.FitAddon && typeof window.FitAddon.FitAddon === "function" ? new window.FitAddon.FitAddon() : null;
      const linksAddon = window.WebLinksAddon && typeof window.WebLinksAddon.WebLinksAddon === "function" ? new window.WebLinksAddon.WebLinksAddon() : null;
      if (fitAddon) term.loadAddon(fitAddon);
      if (linksAddon) term.loadAddon(linksAddon);
      term.open(host2);
      if (fitAddon) {
        try {
          fitAddon.fit();
        } catch {
        }
      }
      term.attachCustomKeyEventHandler((ev) => {
        if (ev.type === "keydown" && ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey && (ev.key === "c" || ev.key === "C")) {
          if (typeof ev.preventDefault === "function") ev.preventDefault();
          if (typeof ev.stopPropagation === "function") ev.stopPropagation();
          writeWorkshopTerminalInput(entry.id, "");
          return false;
        }
        if (ev.type === "keydown" && ev.key === "Enter" && ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
          if (typeof ev.preventDefault === "function") ev.preventDefault();
          if (typeof ev.stopPropagation === "function") ev.stopPropagation();
          writeWorkshopTerminalInput(entry.id, "\x1B[13;2u\f");
          return false;
        }
        return true;
      });
      term.onData((data) => {
        writeWorkshopTerminalInput(entry.id, data);
      });
      term.onResize((size) => {
        resizeWorkshopTerminal(entry.id, size.rows, size.cols);
      });
      entry.terminal = term;
      entry.fitAddon = fitAddon;
      syncWorkshopTerminalSize(entry);
      if (document.fonts && typeof document.fonts.ready?.then === "function") {
        document.fonts.ready.then(() => {
          if (entry.terminal === term) syncWorkshopTerminalSize(entry);
        }).catch(() => {
        });
      }
      if (typeof window.ResizeObserver === "function") {
        try {
          const observer = new window.ResizeObserver(() => {
            if (entry.terminal !== term) return;
            if (entry.resizeRaf) cancelAnimationFrame(entry.resizeRaf);
            entry.resizeRaf = requestAnimationFrame(() => {
              entry.resizeRaf = 0;
              syncWorkshopTerminalSize(entry, { useHysteresis: true });
            });
          });
          observer.observe(host2);
          entry.resizeObserver = observer;
        } catch {
        }
      }
      if (entry.id === workshopTerminalState.activeId) {
        openWorkshopTerminalStream(entry.id);
      }
      if (entry.bufferedOutput) {
        host2.viewerDiagnostics.breadcrumb(`terminal:replay ${entry.id} ${entry.bufferedOutput.length}b`);
        term.write(entry.bufferedOutput);
        entry.bufferedOutput = "";
      }
    }
    function setActiveWorkshopTerminal(sessionId) {
      workshopTerminalState.activeId = sessionId || "";
      closeAllInactiveWorkshopTerminalStreams();
      renderWorkshopTerminalList();
      const entry = sessionId ? workshopTerminalState.sessions.get(sessionId) : null;
      ensureWorkshopTerminalStage();
      if (entry) {
        mountWorkshopTerminalEmulator(entry);
        if (!workshopTerminalState.streams.has(entry.id)) {
          openWorkshopTerminalStream(entry.id);
        }
        try {
          entry.terminal?.focus();
        } catch {
        }
        syncWorkshopTerminalSize(entry);
        requestAnimationFrame(() => {
          const term = entry.terminal;
          if (!term) return;
          try {
            term.refresh(0, Math.max(0, term.rows - 1));
          } catch {
          }
        });
      }
    }
    function hasMountedWorkshopTerminals() {
      for (const entry of workshopTerminalState.sessions.values()) {
        if (entry.terminal) return true;
      }
      return false;
    }
    function redrawWorkshopTerminals() {
      let count = 0;
      for (const entry of workshopTerminalState.sessions.values()) {
        const term = entry.terminal;
        if (!term) continue;
        count += 1;
        try {
          term.refresh(0, Math.max(0, term.rows - 1));
        } catch {
        }
        nudgeWorkshopTerminalRedraw(entry);
      }
      return count;
    }
    function clearWorkshopTerminal(sessionId) {
      if (!sessionId) return;
      writeWorkshopTerminalInput(sessionId, "\f");
      const entry = workshopTerminalState.sessions.get(sessionId);
      if (entry?.terminal) {
        try {
          entry.terminal.focus();
        } catch {
        }
      }
      host.setMeta("Sent clear (Ctrl+L) to terminal.");
    }
    async function renameWorkshopTerminal(sessionId) {
      const entry = workshopTerminalState.sessions.get(sessionId);
      if (!entry || entry.closing) return;
      const current = String(entry.label || "").trim();
      const detectedCdxSession = host.cdxSessionForTerminal(entry);
      const next = await showThemedInputModal({
        title: "Rename terminal",
        message: "Edit the label shown in the terminal list.",
        defaultValue: current,
        placeholder: "Terminal label",
        submitLabel: "Rename",
        maxLength: 64
      });
      if (next === null) return;
      const label = String(next || "").trim();
      if (!label || label === current) return;
      try {
        const response = await fetch("/api/workshop-terminal-rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, label })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Unable to rename terminal.");
        }
        const payload = data.payload || {};
        entry.label = String(payload.label || label);
        entry.command = Array.isArray(payload.command) ? payload.command.map(String) : entry.command;
        entry.cdxSession = String(payload.cdxSession || entry.cdxSession || detectedCdxSession || "");
        renderWorkshopTerminalList();
        host.setMeta(`Renamed terminal to ${entry.label}.`);
      } catch (error) {
        host.setMeta(`Terminal rename: ${error?.message || error}`);
      }
    }
    async function showCustomTerminalModal() {
      const sessions = await host.loadCdxSessionsForCustomTerminal();
      return new Promise((resolve) => {
        const modal = createThemedModal({
          title: "Custom terminal",
          message: "Run a command or start a terminal for an available CDX session.",
          submitLabel: "Run command"
        });
        const body = modal.querySelector(".viewer-themed-modal__body");
        const select = document.createElement("select");
        select.className = "viewer-themed-modal__select";
        select.innerHTML = `<option value="">Custom command</option>${sessions.map((session) => `<option value="${escapeHtml(session.name)}">${escapeHtml(session.label)}</option>`).join("")}`;
        const input = document.createElement("input");
        input.className = "viewer-themed-modal__input";
        input.type = "text";
        input.placeholder = "node --version";
        const external = document.createElement("label");
        external.className = "viewer-cdx__field viewer-cdx__field--check";
        external.innerHTML = `<input type="checkbox" data-viewer-custom-terminal-external${workshopUsesSystemTerminal() ? " checked" : ""}> Open in system terminal`;
        body?.append(select, input, external);
        const done = (value) => {
          closeThemedModal(modal);
          resolve(value);
        };
        const submit = () => {
          const sessionName = select.value.trim();
          const systemTerminal = Boolean(modal.querySelector("[data-viewer-custom-terminal-external]")?.checked);
          if (sessionName) return done({ command: ["cdx", sessionName], label: `cdx ${sessionName}`, systemTerminal });
          const command = input.value.trim();
          done(command ? { command: ["sh", "-lc", command], label: command.slice(0, 32) || "custom", systemTerminal } : null);
        };
        select.addEventListener("change", () => {
          const hasSession = Boolean(select.value.trim());
          input.disabled = hasSession;
          input.placeholder = hasSession ? "Using selected CDX session" : "node --version";
        });
        modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", submit);
        modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
        modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
        modal.addEventListener("keydown", (event) => {
          if (event.key === "Escape") done(null);
          if (event.key === "Enter" && !(event.target instanceof HTMLSelectElement)) submit();
        });
        window.setTimeout(() => input.focus(), 0);
      });
    }
    function refitAllWorkshopTerminals() {
      const fontSize = workshopTerminalPreferredFontSize();
      for (const entry of workshopTerminalState.sessions.values()) {
        if (!entry.fitAddon || !entry.terminal) continue;
        try {
          if (entry.terminal.options && entry.terminal.options.fontSize !== fontSize) {
            entry.terminal.options.fontSize = fontSize;
          }
          const dim = entry.fitAddon.proposeDimensions();
          if (dim && dim.cols > 0 && dim.rows > 0) {
            const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
            const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
            entry.lastSyncedCols = cols;
            entry.lastSyncedRows = rows;
            if (entry.terminal.cols !== cols || entry.terminal.rows !== rows) {
              try {
                entry.terminal.resize(cols, rows);
              } catch {
              }
            }
            resizeWorkshopTerminal(entry.id, rows, cols);
          }
        } catch {
        }
      }
    }
    function repaintAllWorkshopTerminals() {
      for (const entry of workshopTerminalState.sessions.values()) {
        const term = entry.terminal;
        if (!term) continue;
        try {
          term.refresh(0, Math.max(0, term.rows - 1));
        } catch {
        }
      }
    }
    function resumeActiveWorkshopTerminalStream() {
      const activeId = workshopTerminalState.activeId;
      if (activeId && workshopTerminalStreamWanted(activeId)) openWorkshopTerminalStream(activeId);
    }
    let workshopTerminalResizeTimer = null;
    let customTerminalBusy = false;
    function setCustomTerminalBusy(trigger, busy) {
      customTerminalBusy = Boolean(busy);
      const controls = trigger instanceof HTMLElement ? [trigger] : Array.from(document.querySelectorAll("[data-viewer-workshop-terminal-custom]")).filter((node) => node instanceof HTMLElement);
      controls.forEach((control) => {
        if (!control.dataset.viewerOriginalLabel) {
          control.dataset.viewerOriginalLabel = control.textContent || "+ Custom";
        }
        if ("disabled" in control) {
          control.disabled = customTerminalBusy;
        }
        control.setAttribute("aria-busy", customTerminalBusy ? "true" : "false");
        control.classList.toggle("is-loading", customTerminalBusy);
        control.textContent = customTerminalBusy ? "Loading..." : control.dataset.viewerOriginalLabel || "+ Custom";
      });
      if (customTerminalBusy) {
        host.setMeta("Loading CDX sessions...");
      }
    }
    function measureWorkshopTerminalGrid() {
      const mounted = [...workshopTerminalState.sessions.values()].find((entry) => entry.terminal && entry.terminal.cols > 0 && entry.terminal.rows > 0);
      if (mounted) {
        return { cols: mounted.terminal.cols, rows: mounted.terminal.rows };
      }
      const stage = workshopTerminalStageNode();
      const rect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : null;
      if (!rect || rect.width < 1 || rect.height < 1) return null;
      const fontSize = workshopTerminalPreferredFontSize();
      const cellW = fontSize * 0.6;
      const cellH = fontSize * 1.2;
      const cols = Math.max(20, Math.min(400, Math.floor(rect.width / cellW)));
      const rows = Math.max(5, Math.min(200, Math.floor(rect.height / cellH)));
      return { cols, rows };
    }
    async function spawnWorkshopTerminal(options = {}) {
      if (options.systemTerminal === true || options.systemTerminal !== false && workshopUsesSystemTerminal()) {
        return spawnSystemWorkshopTerminal(options);
      }
      try {
        const liveCount = [...workshopTerminalState.sessions.values()].filter((entry) => entry.state === "running" || entry.state === "starting").length;
        const WORKSHOP_TERMINAL_SOFT_CAP = 12;
        if (liveCount >= WORKSHOP_TERMINAL_SOFT_CAP) {
          host.setMeta(`Terminal limit reached (${WORKSHOP_TERMINAL_SOFT_CAP} live sessions). Close one before spawning another.`);
          return "";
        }
        const body = {};
        if (Array.isArray(options.command) && options.command.length) body.command = options.command;
        if (options.label) body.label = String(options.label);
        const grid = measureWorkshopTerminalGrid();
        if (grid) {
          body.cols = grid.cols;
          body.rows = grid.rows;
        }
        const response = await fetch("/api/workshop-terminal-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Unable to start terminal.");
        const session = data.payload;
        workshopTerminalState.sessions.set(session.id, {
          id: session.id,
          label: session.label || "shell",
          command: Array.isArray(session.command) ? session.command.map(String) : [],
          cdxSession: String(session.cdxSession || ""),
          state: session.state,
          bufferedOutput: ""
        });
        reconcileWorkshopTerminalOrder({ persist: true });
        recomputeWorkshopBadges();
        if (preferredWorkshopTab() !== "terminals") {
          await showWorkshop({ tab: "terminals" });
        } else {
          await showWorkshop({ tab: "terminals" });
        }
        setActiveWorkshopTerminal(session.id);
        return session.id;
      } catch (error) {
        host.setMeta(`Terminal: ${error?.message || error}`);
        return "";
      }
    }
    async function spawnSystemWorkshopTerminal(options = {}) {
      try {
        if (window.parent !== window) {
          const id2 = `vscode-terminal-${Date.now()}-${workshopExternalLaunches.length + 1}`, command = Array.isArray(options.command) ? options.command.map(String) : [], label = String(options.label || "terminal");
          window.parent.postMessage({ type: "launch-workshop-terminal", command, label, cwd: host.shared.latestRepoRoot || "" }, "*");
          workshopExternalLaunches.push({ id: id2, label, command, terminal: "VS Code", nativeRef: id2 });
          renderWorkshopTerminalList();
          await showWorkshop({ tab: "terminals" });
          host.setMeta(`Opened VS Code terminal: ${label}.`);
          return id2;
        }
        const body = {};
        if (Array.isArray(options.command) && options.command.length) body.command = options.command;
        if (options.label) body.label = String(options.label);
        const response = await fetch("/api/workshop-terminal-external-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Unable to open system terminal.");
        const payload = data.payload || {};
        const id = String(payload.terminalRef || payload.id || `external-${Date.now()}-${workshopExternalLaunches.length + 1}`);
        workshopExternalLaunches.push({
          id,
          label: String(payload.label || options.label || "system terminal"),
          command: Array.isArray(payload.command) ? payload.command.map(String) : [],
          terminal: String(payload.terminal || ""),
          nativeRef: payload.nativeRef ? String(payload.nativeRef) : ""
        });
        renderWorkshopTerminalList();
        await showWorkshop({ tab: "terminals" });
        host.setMeta(`Opened ${payload.terminal || "system terminal"}: ${payload.label || options.label || "terminal"}.`);
        return id;
      } catch (error) {
        host.setMeta(`System terminal: ${error?.message || error}`);
        return "";
      }
    }
    async function spawnCustomWorkshopTerminal(trigger = null) {
      if (customTerminalBusy) return;
      setCustomTerminalBusy(trigger, true);
      try {
        const result = await showCustomTerminalModal();
        if (!result || !Array.isArray(result.command) || !result.command.length) return;
        spawnWorkshopTerminal({ command: result.command, label: result.label, systemTerminal: result.systemTerminal });
      } finally {
        setCustomTerminalBusy(trigger, false);
      }
    }
    const workshopTerminalInputBuffers = /* @__PURE__ */ new Map();
    const workshopTerminalInputInFlight = /* @__PURE__ */ new Set();
    function writeWorkshopTerminalInput(sessionId, data) {
      if (!sessionId || !data) return;
      workshopTerminalInputBuffers.set(
        sessionId,
        (workshopTerminalInputBuffers.get(sessionId) || "") + data
      );
      flushWorkshopTerminalInput(sessionId);
    }
    function flushWorkshopTerminalInput(sessionId) {
      if (workshopTerminalInputInFlight.has(sessionId)) return;
      const buffered = workshopTerminalInputBuffers.get(sessionId);
      if (!buffered) return;
      workshopTerminalInputBuffers.set(sessionId, "");
      workshopTerminalInputInFlight.add(sessionId);
      fetch("/api/workshop-terminal-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, data: buffered })
      }).catch(() => {
      }).finally(() => {
        workshopTerminalInputInFlight.delete(sessionId);
        if (workshopTerminalInputBuffers.get(sessionId)) {
          flushWorkshopTerminalInput(sessionId);
        }
      });
    }
    async function stopWorkshopTerminal(sessionId) {
      if (!sessionId) return;
      const pending = workshopTerminalState.sessions.get(sessionId);
      if (pending?.closing) return;
      if (pending) {
        pending.closing = true;
        renderWorkshopTerminalList();
      }
      try {
        await fetch("/api/workshop-terminal-stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });
      } catch {
      }
      closeWorkshopTerminalStream(sessionId);
      const entry = workshopTerminalState.sessions.get(sessionId);
      releaseWorkshopTerminalObserver(entry);
      if (entry?.terminal) {
        try {
          entry.terminal.dispose();
        } catch {
        }
      }
      workshopTerminalState.sessions.delete(sessionId);
      reconcileWorkshopTerminalOrder({ persist: true });
      if (workshopTerminalState.activeId === sessionId) {
        setActiveWorkshopTerminal(workshopTerminalState.order[0] || "");
      } else {
        renderWorkshopTerminalList();
      }
      recomputeWorkshopBadges();
    }
    function closeWorkshopTerminalStream(sessionId) {
      const stream = workshopTerminalState.streams.get(sessionId);
      if (stream) {
        try {
          stream.close();
        } catch {
        }
        workshopTerminalState.streams.delete(sessionId);
      }
    }
    function closeAllInactiveWorkshopTerminalStreams() {
      const keep = workshopTerminalState.activeId;
      for (const id of Array.from(workshopTerminalState.streams.keys())) {
        if (id !== keep) closeWorkshopTerminalStream(id);
      }
    }
    function openWorkshopTerminalStream(sessionId) {
      closeWorkshopTerminalStream(sessionId);
      closeAllInactiveWorkshopTerminalStreams();
      const entry = workshopTerminalState.sessions.get(sessionId);
      const since = entry && Number.isFinite(entry.lastSeq) ? entry.lastSeq : 0;
      const source = new EventSource(`/api/workshop-terminal/${encodeURIComponent(sessionId)}/stream?since=${since}`);
      workshopTerminalState.streams.set(sessionId, source);
      source.addEventListener("data", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          const chunk = String(payload.data || "");
          const seq = Number(payload.seq);
          const target = workshopTerminalState.sessions.get(sessionId);
          if (!target) return;
          if (Number.isFinite(seq)) target.lastSeq = seq;
          if (target.terminal) {
            target.terminal.write(chunk);
          } else {
            target.bufferedOutput = (target.bufferedOutput || "") + chunk;
          }
        } catch {
        }
      });
      source.addEventListener("end", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          const target = workshopTerminalState.sessions.get(sessionId);
          if (target) target.state = payload.state;
          renderWorkshopTerminalList();
          recomputeWorkshopBadges();
        } catch {
        }
        closeWorkshopTerminalStream(sessionId);
      });
      source.addEventListener("error", () => {
        closeWorkshopTerminalStream(sessionId);
        reopenWorkshopTerminalStreamSoon(sessionId);
      });
    }
    function workshopTerminalStreamWanted(sessionId) {
      return workshopTerminalState.activeId === sessionId && workshopTerminalState.sessions.has(sessionId) && !workshopTerminalState.streams.has(sessionId);
    }
    function reopenWorkshopTerminalStreamSoon(sessionId) {
      const target = workshopTerminalState.sessions.get(sessionId);
      if (!target || ["finished", "failed", "stopped", "error"].includes(target.state)) return;
      setTimeout(() => {
        if (workshopTerminalStreamWanted(sessionId)) openWorkshopTerminalStream(sessionId);
      }, 1e3);
    }
    function renderWorkshop(activeTab, options = {}) {
      if (options.unavailable) {
        return `
        <div class="viewer-workshop">
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable">
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span>
            <span>${escapeHtml(options.message || "Workshop is not available for this project.")}</span>
          </div>
        </div>
      `;
      }
      return `
      <div class="viewer-workshop">
        <div class="viewer-workshop__tabs" role="tablist" aria-label="Workshop sub-screens">
          ${renderWorkshopTabs(activeTab)}
        </div>
        ${renderWorkshopPanel(activeTab)}
      </div>
    `;
    }
    async function showWorkshop(options = {}) {
      const workshopAvailable = host.isCapabilityAvailable("workshop");
      const workspaceAvailable = host.isCapabilityAvailable("workspace");
      if (!workshopAvailable && !workspaceAvailable) {
        const message = host.capabilityMessage("workshop", "Workshop is not available for this project.");
        host.setDocument("Workshop", renderWorkshop("terminals", { unavailable: true, message }));
        host.setMeta(message);
        return;
      }
      const fallbackTab = workshopAvailable ? preferredWorkshopTab() : "explorer";
      const activeTab = options.tab && workshopTabs.some((tab) => tab.id === options.tab) ? options.tab : fallbackTab;
      setWorkshopActiveTab(activeTab);
      host.setDocument("Workshop", renderWorkshop(activeTab));
      host.setMeta(`Workshop / ${activeTab}: loading...`);
      if (activeTab === "explorer") {
        await loadWorkshopExplorer({ silent: Boolean(options.silent) });
      } else if (activeTab === "commands") {
        await loadWorkshopCommands();
        host.setMeta(`Workshop / ${activeTab} loaded.`);
      } else if (activeTab === "terminals") {
        host.setMeta("Workshop / terminals ready.");
        for (const entry of workshopTerminalState.sessions.values()) {
          releaseWorkshopTerminalObserver(entry);
          if (entry.terminal) {
            try {
              entry.terminal.dispose();
            } catch {
            }
          }
          entry.terminal = null;
          entry.fitAddon = null;
          entry.lastSeq = 0;
          closeWorkshopTerminalStream(entry.id);
        }
        if (workshopTerminalState.activeId) {
          setActiveWorkshopTerminal(workshopTerminalState.activeId);
        } else {
          renderWorkshopTerminalList();
          ensureWorkshopTerminalStage();
        }
        host.setMeta(`Workshop / ${activeTab} loaded.`);
      }
    }
    const state = {};
    Object.defineProperties(state, {
      workshopButton: { get: () => workshopButton },
      workshopBadgeCounts: { get: () => workshopBadgeCounts, set: (value) => {
        workshopBadgeCounts = value;
      } },
      workshopCommandState: { get: () => workshopCommandState },
      workshopTerminalState: { get: () => workshopTerminalState },
      workshopExternalLaunches: { get: () => workshopExternalLaunches },
      workshopTerminalResizeTimer: { get: () => workshopTerminalResizeTimer, set: (value) => {
        workshopTerminalResizeTimer = value;
      } },
      customTerminalBusy: { get: () => customTerminalBusy, set: (value) => {
        customTerminalBusy = value;
      } },
      workshopTerminalInputBuffers: { get: () => workshopTerminalInputBuffers },
      workshopTerminalInputInFlight: { get: () => workshopTerminalInputInFlight }
    });
    return {
      state,
      appendWorkshopCommandLog,
      bindWorkshopSystemTerminalControls,
      clearWorkshopTerminal,
      clearWorkshopTerminalDragState,
      closeAllInactiveWorkshopTerminalStreams,
      closeWorkshopCommandStream,
      closeWorkshopTerminalStream,
      ensureWorkshopTerminalStage,
      flushWorkshopTerminalInput,
      hasMountedWorkshopTerminals,
      hydrateWorkshopTerminals,
      loadWorkshopCommands,
      loadWorkshopExplorer,
      measureWorkshopTerminalGrid,
      mountWorkshopTerminalEmulator,
      moveWorkshopTerminalBefore,
      openWorkshopCommandStream,
      openWorkshopTerminalStream,
      orderedWorkshopTerminalEntries,
      persistWorkshopTerminalOrder,
      preferredWorkshopTab,
      recomputeWorkshopBadges,
      reconcileWorkshopTerminalOrder,
      redrawWorkshopTerminals,
      refitAllWorkshopTerminals,
      refreshWorkshopTerminalUsage,
      renameWorkshopTerminal,
      renderWorkshop,
      renderWorkshopCommandList,
      renderWorkshopCommandRow,
      renderWorkshopCommandRunMenu,
      renderWorkshopCommands,
      renderWorkshopPanel,
      renderWorkshopTerminalList,
      reopenWorkshopTerminalStreamSoon,
      repaintAllWorkshopTerminals,
      resumeActiveWorkshopTerminalStream,
      setActiveWorkshopTerminal,
      setCustomTerminalBusy,
      setWorkshopActiveTab,
      showCustomTerminalModal,
      showWorkshop,
      spawnCustomWorkshopTerminal,
      spawnSystemWorkshopTerminal,
      spawnWorkshopTerminal,
      startWorkshopCommand,
      stopWorkshopCommand,
      stopWorkshopTerminal,
      storedWorkshopTerminalOrder,
      syncWorkshopSystemTerminalControls,
      updateWorkshopBadges,
      updateWorkshopCommandSession,
      workshopTerminalOrderRootKey,
      workshopTerminalStreamWanted,
      workshopUsesSystemTerminal,
      writeWorkshopTerminalInput
    };
  }

  // clients/viewer/src/browser-host/git.js
  function createGitScreen(host) {
    const repoGithubLink = () => document.getElementById("viewer-repo-github");
    const ciButton = () => document.getElementById("viewer-ci");
    let latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
    let latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    let latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
    let latestReleaseRunsStatusSignature = "";
    let latestGitStatusSignature = "";
    let latestGitStatusPayload = null;
    let latestCiScreenMode = "git";
    let latestReviewPayload = null;
    let latestReviewBurstId = "";
    function ciActivityEvents(ciStatus = latestCiStatus) {
      const runs = ciStatus && Array.isArray(ciStatus.recentRuns) ? ciStatus.recentRuns : [];
      return runs.filter((run) => run && typeof run === "object").map((run, index) => {
        const workflow = String(run.workflowName || "CI");
        const state2 = String(run.badgeState || "unknown");
        return {
          id: String(run.id ? `ci-${run.id}` : `ci-run-${index}`),
          kind: "ci",
          category: "ci",
          stage: "ci",
          marker: "C",
          action: "CI run",
          title: `${workflow} \u2014 ${state2}`,
          label: state2,
          meta: String(run.title || `${workflow} ${state2}`),
          // req_284/item_516+517: discrete fields for the coloured marker and the
          // recomposed "workflow · outcome · time" meta line.
          workflow,
          outcome: state2,
          badgeState: state2,
          at: run.updatedAt || "",
          updatedAt: run.updatedAt || ""
        };
      });
    }
    function recordGitActivity(action, meta = "") {
      const storedState = readStoredState();
      const baseState = storedState && typeof storedState === "object" ? storedState : {};
      const scopedState = activityStateForRoot(baseState, host.shared.latestRepoRoot);
      const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const safeAction = String(action || "Git").trim() || "Git";
      history.unshift({
        id: `git-action-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        type: "git-action",
        action: safeAction,
        title: `Git ${safeAction}`,
        label: safeAction,
        meta: meta || `Git ${safeAction.toLowerCase()} started`,
        at: now,
        updatedAt: now
      });
      writeStoredState(writeActivityStateForRoot({
        ...baseState,
        viewerFilterState: { ...host.shared.viewerFilterState }
      }, host.shared.latestRepoRoot, { activitySnapshot: scopedState.activitySnapshot || {}, activityHistory: history }));
      host.dispatchViewerActivityUpdate();
    }
    function syncGitCommitActivity(payload) {
      const commits = Array.isArray(payload?.recentCommits) ? payload.recentCommits : [];
      if (!commits.length) {
        return;
      }
      const branch = String(payload?.branch || "").trim();
      const storedState = readStoredState();
      const baseState = storedState && typeof storedState === "object" ? storedState : {};
      const scopedState = activityStateForRoot(baseState, host.shared.latestRepoRoot);
      const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
      const knownIds = new Set(history.map((entry) => String(entry?.id || "")));
      const newEntries = commits.filter((commit) => commit && typeof commit === "object" && commit.hash).map((commit) => {
        const hash = String(commit.hash || "").trim();
        const subject = String(commit.subject || "Untitled commit").trim() || "Untitled commit";
        const author = String(commit.author || "").trim();
        const date = String(commit.date || "").trim();
        return {
          id: `git-commit-${hash}`,
          type: "git-commit",
          action: "Commit",
          title: subject,
          label: "Commit",
          meta: [hash, author, date].filter(Boolean).join(" \xB7 "),
          sha: hash.slice(0, 7),
          branch,
          at: date,
          updatedAt: date
        };
      }).filter((entry) => entry.id && !knownIds.has(entry.id));
      if (!newEntries.length) {
        return;
      }
      writeStoredState(writeActivityStateForRoot({
        ...baseState,
        viewerFilterState: { ...host.shared.viewerFilterState }
      }, host.shared.latestRepoRoot, { activitySnapshot: scopedState.activitySnapshot || {}, activityHistory: [...newEntries, ...history] }));
      if (activityPanelIsOpen()) {
        host.dispatchViewerActivityUpdate();
      }
    }
    function gitBadgeHtml(scope) {
      const behindVisible = latestGitBadgeCounts.unpulledCommits > 0 && (scope === "main" || scope === "history");
      const commitsVisible = latestGitBadgeCounts.unpushedCommits > 0 && (scope === "main" || scope === "history");
      const filesVisible = latestGitBadgeCounts.uncommittedFiles > 0 && (scope === "main" || scope === "changes");
      const html = [
        behindVisible ? renderGitBadge("commits-behind", latestGitBadgeCounts.unpulledCommits) : "",
        commitsVisible ? renderGitBadge("commits", latestGitBadgeCounts.unpushedCommits) : "",
        filesVisible ? renderGitBadge("files", latestGitBadgeCounts.uncommittedFiles) : ""
      ].filter(Boolean).join("");
      return html ? `<span class="viewer-git-badges" data-viewer-git-badges="${escapeHtml(scope)}">${html}</span>` : "";
    }
    function updateMainGitBadges() {
      const button = ciButton();
      if (!(button instanceof HTMLElement)) {
        return;
      }
      button.querySelector('[data-viewer-git-badges="main"]')?.remove();
      const html = gitBadgeHtml("main");
      if (html) {
        const ciBadge = button.querySelector("[data-viewer-ci-badge]");
        if (ciBadge) {
          ciBadge.insertAdjacentHTML("beforebegin", html);
        } else {
          button.insertAdjacentHTML("beforeend", html);
        }
      }
      setNavMenuBadges("remote:git", gitBadgeHtml("main"));
    }
    function updateMainReleaseBadge(payload = latestReleaseRunsStatus) {
      latestReleaseRunsStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
      const button = ciButton();
      if (!(button instanceof HTMLElement)) {
        return;
      }
      button.querySelector("[data-viewer-release-badge]")?.remove();
      clearNavMenuBadges(["remote:release"]);
      if (!latestReleaseRunsStatus.visible) {
        return;
      }
      const badge = renderReleaseRunsButtonBadge(latestReleaseRunsStatus);
      button.insertAdjacentHTML("beforeend", badge);
      setNavMenuBadges("remote:release", badge);
    }
    async function refreshReleaseBadgeCounters() {
      if (!host.isCapabilityAvailable("ci")) {
        updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: host.capabilityMessage("ci", "Release runs are not available for this project.") });
        return;
      }
      try {
        const response = await fetch("/api/release-runs");
        if (response.status === 404) {
          updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: "Release runs endpoint unavailable." });
          return;
        }
        const data = await response.json();
        if (response.ok && data.ok) {
          latestReleaseRunsStatusSignature = runtimeStatusSignature(data.payload);
          updateMainReleaseBadge(data.payload);
        }
      } catch {
        updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: "Release runs unavailable." });
      }
    }
    function setGitBadgeCountsFromPayload(payload, options = {}) {
      latestGitBadgeCounts = normalizeGitBadgeCounts(payload);
      if (options.updateMain !== false) {
        updateMainGitBadges();
      }
    }
    async function refreshGitBadgeCounters() {
      if (!host.isCapabilityAvailable("git")) {
        latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
        updateMainGitBadges();
        return;
      }
      try {
        const response = await fetch("/api/git-status");
        const data = await response.json();
        if (response.ok && data.ok && data.payload?.state === "ok") {
          latestGitStatusPayload = data.payload;
          latestGitStatusSignature = gitStatusSignature(data.payload);
          syncGitCommitActivity(data.payload);
          setGitBadgeCountsFromPayload(data.payload);
        }
      } catch {
        latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
        updateMainGitBadges();
      }
    }
    function isGitCiScreenOpen() {
      const panel = host.documentPanel();
      const title = host.documentTitle();
      return Boolean(panel && !panel.hidden && title && title.textContent === "Remote");
    }
    async function fetchGitRemote() {
      try {
        const response = await fetch("/api/git-fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          host.setMeta(data.error || "Git fetch failed.");
          return false;
        }
        recordGitActivity("Fetch", "Fetched remote-tracking refs");
        return true;
      } catch {
        host.setMeta("Git fetch failed.");
        return false;
      }
    }
    function setGitActionsMenuOpen(open) {
      host.setDropdownOpen(
        document.getElementById("viewer-git-actions-menu"),
        document.getElementById("viewer-git-actions-button"),
        open
      );
    }
    async function showReleaseStatus(options = {}) {
      latestCiScreenMode = "release";
      if (!options.silent) {
        host.setMeta("Checking release workflow state...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      let runsData = {};
      try {
        const [statusResponse, runsResponse] = await Promise.all([
          fetch("/api/release-status", { signal: view.signal }),
          fetch("/api/release-runs", { signal: view.signal }).catch(() => null)
        ]);
        response = statusResponse;
        try {
          data = await response.json();
        } catch {
          data = {};
        }
        if (runsResponse && runsResponse.ok) {
          try {
            runsData = await runsResponse.json();
          } catch {
            runsData = {};
          }
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load release workflow state.");
      }
      const runsPayload = runsData && runsData.ok ? runsData.payload : null;
      if (runsPayload) {
        latestReleaseRunsStatusSignature = runtimeStatusSignature(runsPayload);
        updateMainReleaseBadge(runsPayload);
      }
      host.setDocument("Remote", renderReleaseStatus(data.payload, runsPayload));
      const state2 = data.payload?.state || "unknown";
      const button = ciButton();
      if (button instanceof HTMLElement) {
        button.title = data.payload?.next_action || "Show CI and release workflow state";
      }
      host.setMeta(options.silent ? "Release workflow refreshed." : `Release workflow state: ${state2}.`);
    }
    async function resetReleaseState() {
      host.setMeta("Resetting release evidence...");
      let data = {};
      try {
        const response = await fetch("/api/release-reset", { method: "POST", headers: { "Content-Type": "application/json" } });
        data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Unable to reset release evidence.");
        }
      } catch (error) {
        host.setMeta(`Release reset failed: ${error?.message || error}`);
        return;
      }
      await showReleaseStatus({ force: true });
      const cleared = Number(data.payload?.cleared || 0);
      host.setMeta(cleared > 0 ? `Release evidence reset \u2014 cleared ${cleared} entr${cleared === 1 ? "y" : "ies"}; gates are pending.` : "Release evidence already empty; gates are pending.");
    }
    function renderedGitDomain() {
      const active = document.querySelector(".viewer-git__domain.is-active[data-viewer-git-domain]");
      return active instanceof HTMLElement ? active.getAttribute("data-viewer-git-domain") || "" : "";
    }
    function renderGitStatus(payload) {
      if (!payload || payload.state !== "ok") {
        return `
        <div class="viewer-git">
          ${renderCiModeSwitcher("git")}
          <div class="viewer-git__state">${escapeHtml(payload?.message || "Git status is unavailable.")}</div>
        </div>
      `;
      }
      const counts = payload.counts || {};
      const stagedCount = Number(counts.staged || 0);
      const modifiedCount = Number(counts.modified || 0);
      const deletedCount = Number(counts.deleted || 0);
      const renamedCount = Number(counts.renamed || 0);
      const untrackedCount = Number(counts.untracked || 0);
      const gitVerdict = (() => {
        const ahead = Number(payload.ahead || 0);
        const behind = Number(payload.behind || 0);
        const changed = stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount;
        if (!payload.tracking) {
          return { tone: "attention", text: "No upstream branch, so nothing can be pushed yet.", action: null };
        }
        if (behind > 0 && ahead > 0) {
          return {
            tone: "attention",
            text: `Diverged: ${ahead} to push, ${behind} to pull.`,
            action: { id: "viewer-git-pull", label: "Pull first" }
          };
        }
        if (behind > 0) {
          return { tone: "attention", text: `${behind} commit${behind === 1 ? "" : "s"} to pull.`, action: { id: "viewer-git-pull", label: "Pull" } };
        }
        const changeNote = changed > 0 ? ` ${changed} file${changed === 1 ? "" : "s"} changed here are not part of them.` : "";
        if (ahead > 0) {
          return {
            tone: "ready",
            text: `${ahead} commit${ahead === 1 ? "" : "s"} ready to push.${changeNote}`,
            action: { id: "viewer-git-push", label: "Push" }
          };
        }
        if (stagedCount > 0) {
          return { tone: "ready", text: `${stagedCount} file${stagedCount === 1 ? "" : "s"} staged and ready to commit.`, action: { id: "viewer-git-commit", label: "Commit" } };
        }
        if (changed > 0) {
          return { tone: "attention", text: `${changed} file${changed === 1 ? "" : "s"} changed, none staged.`, action: null };
        }
        return { tone: "clean", text: "Nothing to push. Working tree clean and up to date.", action: null };
      })();
      const verdictHtml = `
      <section class="viewer-git__verdict viewer-git__verdict--${escapeHtml(gitVerdict.tone)}" role="status">
        <p class="viewer-git__verdict-text">${escapeHtml(gitVerdict.text)}</p>
        ${gitVerdict.action ? `<button class="btn viewer-git__verdict-action" type="button" data-viewer-git-run="${escapeHtml(gitVerdict.action.id)}">${escapeHtml(gitVerdict.action.label)}</button>` : ""}
      </section>
    `;
      const cards = [
        renderGitSummaryCard("Branch", payload.branch || "HEAD"),
        renderGitSummaryCard("Tracking", payload.tracking || "None"),
        renderGitSummarySegments("Ahead / Behind", [
          ["Ahead", payload.ahead || 0],
          ["Behind", payload.behind || 0]
        ]),
        renderGitSummaryCard("State", payload.clean ? "Clean" : "Dirty")
      ].join("");
      const groupDefs = [
        ["staged", "Staged", "staged"],
        ["modified", "Modified", "worktree"],
        ["deleted", "Deleted", "worktree"],
        ["renamed", "Renamed", "worktree"],
        ["untracked", "Untracked", "untracked"]
      ];
      const domainDefs = [
        ["changes", "Changes", stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount],
        ["staged", "Staged", stagedCount],
        ["worktree", "Worktree", modifiedCount + deletedCount + renamedCount],
        ["untracked", "Untracked", untrackedCount],
        ["history", "History", formatGitHistoryCount(payload)]
        // item_733: the Remote domain's entire content was `Tracking <ref>` and
        // `Ahead N, behind M` -- both printed verbatim in the tiles above it. A navigation
        // entry whose only content is elsewhere on the same screen is a place to go that
        // takes you nowhere.
      ];
      const openingDomain = (() => {
        const withContent = domainDefs.find(([, , count]) => Number(String(count).replace(/[^0-9]/g, "")) > 0);
        return withContent ? withContent[0] : "history";
      })();
      const domains = domainDefs.map(([key, label, count]) => `
      <button class="viewer-git__domain${key === openingDomain ? " is-active" : ""}" type="button" data-viewer-git-domain="${escapeHtml(key)}" aria-pressed="${key === openingDomain ? "true" : "false"}">
        <span class="viewer-git__domain-label">${escapeHtml(label)}${key === "changes" ? gitBadgeHtml("changes") : ""}${key === "history" ? gitBadgeHtml("history") : ""}</span><strong>${escapeHtml(count)}</strong>
      </button>
    `).join("");
      const renderChangeStats = (entry) => {
        const additions = Number(entry?.additions);
        const deletions = Number(entry?.deletions);
        if (!Number.isFinite(additions) || !Number.isFinite(deletions)) {
          return "";
        }
        return `<span class="viewer-git__file-changes" title="Line changes"><span class="viewer-git__file-additions">+${escapeHtml(additions)}</span><span class="viewer-git__file-deletions">-${escapeHtml(deletions)}</span></span>`;
      };
      const renderFileSections = (allowedKeys) => groupDefs.filter(([key]) => allowedKeys.includes(key)).map(([key, label]) => {
        const entries = Array.isArray(payload.groups?.[key]) ? payload.groups[key] : [];
        if (!entries.length) {
          return "";
        }
        return `
        <section class="viewer-git__section">
          <h2>${escapeHtml(label)}</h2>
          <ul class="viewer-git__files">${entries.map((entry) => `
            <li>
              <button class="viewer-git__file" type="button" data-viewer-git-file="${escapeHtml(entry.path)}" data-viewer-git-cached="${key === "staged" ? "1" : "0"}">
                <span class="viewer-git__file-path">${escapeHtml(entry.from ? `${entry.from} -> ${entry.path}` : entry.path)}</span>
                ${renderChangeStats(entry)}
                ${entry.logicsType ? `<span class="viewer-git__file-kind">${escapeHtml(entry.logicsType)}</span>` : ""}
              </button>
            </li>
          `).join("")}</ul>
        </section>
      `;
      }).join("");
      const changesSections = renderFileSections(["staged", "modified", "deleted", "renamed", "untracked"]);
      const stagedSections = renderFileSections(["staged"]);
      const worktreeSections = renderFileSections(["modified", "deleted", "renamed"]);
      const untrackedSections = renderFileSections(["untracked"]);
      const clean = payload.clean ? '<p class="viewer-git__state">Working tree clean.</p>' : "";
      const recentCommits = Array.isArray(payload.recentCommits) ? payload.recentCommits : [];
      const historyCount = formatGitHistoryCount(payload);
      const renderGitHistoryReveal = (hiddenCount) => {
        if (hiddenCount <= 0) {
          return "";
        }
        const nextCount = Math.min(gitHistoryPageSize, hiddenCount);
        return `<li class="viewer-git__commit-row viewer-git__commit-row--reveal"><button class="viewer-git__reveal" type="button" data-viewer-git-history-reveal>Show ${escapeHtml(nextCount)} more</button></li>`;
      };
      const historyRows = recentCommits.length ? recentCommits.map((commit, index) => `
        <li class="viewer-git__commit-row" ${index >= gitHistoryPageSize ? "hidden data-viewer-git-history-hidden" : ""}>
          <button class="viewer-git__commit" type="button" data-viewer-git-commit="${escapeHtml(commit.hash || "")}" data-viewer-git-commit-title="${escapeHtml(commit.subject || "Untitled commit")}">
            <span class="viewer-git__commit-main">
              <code>${escapeHtml(commit.hash || "")}</code>
              <strong>${escapeHtml(commit.subject || "Untitled commit")}</strong>
            </span>
            <span class="viewer-git__commit-meta">
              <span>${escapeHtml([commit.author, commit.date].filter(Boolean).join(" \xB7 ") || "Unknown")}</span>
              ${commit.refs ? `<span class="viewer-git__commit-refs">${escapeHtml(commit.refs)}</span>` : ""}
            </span>
          </button>
        </li>
      `).join("") + renderGitHistoryReveal(Math.max(0, recentCommits.length - gitHistoryPageSize)) : `<li class="viewer-git__commit-row">${escapeHtml(payload.latestCommit || "No commit history available.")}</li>`;
      const history = `
      <section class="viewer-git__section">
        <h2>History</h2>
        <ul class="viewer-git__commits">${historyRows}</ul>
      </section>
    `;
      return `
      <div class="viewer-git">
        ${renderCiModeSwitcher("git")}
        ${verdictHtml}
        <div class="viewer-git__summary viewer-git__summary--strip">${cards}</div>
        <div class="viewer-git__workspace has-diff-detail">
          <nav class="viewer-git__domains" aria-label="Git domains">${domains}</nav>
          <div class="viewer-git__content" aria-label="Git domain content">
            <section class="viewer-git__panel" data-viewer-git-panel="changes" ${openingDomain === "changes" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Changes</span><strong>${escapeHtml(stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount)} files</strong></header>
              ${clean}
              ${changesSections || '<p class="viewer-git__state">No file changes detected.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="staged" ${openingDomain === "staged" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Staged</span><strong>${escapeHtml(stagedCount)} files</strong></header>
              ${stagedSections || '<p class="viewer-git__state">No staged files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="worktree" ${openingDomain === "worktree" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Worktree</span><strong>${escapeHtml(modifiedCount + deletedCount + renamedCount)} files</strong></header>
              ${worktreeSections || '<p class="viewer-git__state">No modified, deleted, or renamed files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="untracked" ${openingDomain === "untracked" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Untracked</span><strong>${escapeHtml(untrackedCount)} files</strong></header>
              ${untrackedSections || '<p class="viewer-git__state">No untracked files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="history" ${openingDomain === "history" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>History</span><strong>${escapeHtml(historyCount)} commits</strong></header>
              ${history}
            </section>
          </div>
          <section class="viewer-git__detail" aria-label="Git diff" data-viewer-git-detail>
            <div class="viewer-git__detail-title">Diff preview</div>
            <div class="viewer-git__diff" data-viewer-git-diff>Select a changed file or history commit to preview its diff.</div>
          </section>
        </div>
      </div>
    `;
    }
    function gitDiffLineKind(line) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return "add";
      }
      if (line.startsWith("-") && !line.startsWith("---")) {
        return "delete";
      }
      if (line.startsWith("@@")) {
        return "hunk";
      }
      if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("+++") || line.startsWith("---")) {
        return "meta";
      }
      return "context";
    }
    function stripGitDiffHeader(content) {
      const lines = String(content || "").split("\n");
      const firstHunk = lines.findIndex((line) => line.startsWith("@@"));
      if (firstHunk <= 0) return String(content || "");
      const kept = lines.slice(firstHunk);
      return kept.join("\n");
    }
    function gitDiffLineRows(content) {
      let oldLine = 0;
      let newLine = 0;
      let hunkCount = 0;
      return String(content || "").split("\n").map((line) => {
        const kind = gitDiffLineKind(line);
        if (kind === "hunk") {
          const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
          oldLine = Number(match?.[1] || 0);
          newLine = Number(match?.[2] || 0);
          hunkCount += 1;
          return { line, number: "", rowClass: hunkCount > 1 ? "viewer-code__row--diff-hunk-break" : "" };
        }
        if (kind === "add") {
          return { line, number: newLine++ || "" };
        }
        if (kind === "delete") {
          return { line, number: oldLine++ || "" };
        }
        const number = newLine || oldLine || "";
        if (oldLine) oldLine += 1;
        if (newLine) newLine += 1;
        return { line, number };
      });
    }
    function renderGitDiffPreview(content) {
      const diff = stripGitDiffHeader(content);
      const rows = gitDiffLineRows(diff);
      return renderCodeViewer(diff, {
        language: "diff",
        lineClassName: (line) => `viewer-git__diff-line viewer-git__diff-line--${gitDiffLineKind(line)}`,
        rowClassName: (_line, index) => rows[index]?.rowClass || "",
        lineNumbers: rows.map((row) => row.number),
        renderLineHtml: (line) => escapeHtml(line || " ")
      });
    }
    function setActiveGitCommit(button) {
      document.querySelectorAll("[data-viewer-git-commit]").forEach((node) => {
        if (node instanceof HTMLElement) {
          node.classList.toggle("is-active", node === button);
        }
      });
      document.querySelectorAll("[data-viewer-git-file]").forEach((node) => {
        if (node instanceof HTMLElement) {
          node.classList.remove("is-active");
        }
      });
    }
    async function loadGitDiff(path, cached, button = null, options = {}) {
      const diffPanel = document.querySelector("[data-viewer-git-diff]");
      const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
      if (!(diffPanel instanceof HTMLElement) || !path) {
        return;
      }
      if (button instanceof HTMLElement) {
        setActiveGitFile(button);
      }
      if (detailTitle instanceof HTMLElement) {
        detailTitle.textContent = "Diff preview";
      }
      diffPanel.textContent = "Loading diff...";
      const params = new URLSearchParams({ path });
      if (cached) {
        params.set("cached", "1");
      }
      if (options.full) {
        params.set("full", "1");
      }
      const response = await fetch(`/api/git-diff?${params.toString()}`);
      const data = await response.json();
      const payload = data.payload || {};
      if (!response.ok || !data.ok || payload.state !== "ok") {
        diffPanel.textContent = payload.message || data.error || "Unable to load diff.";
        return;
      }
      const content = payload.diff || "";
      if (!content.trim()) {
        await loadGitFilePreview(path, diffPanel, detailTitle);
        return;
      }
      const more = payload.canForce ? `<button class="btn viewer-git__diff-more" type="button" data-viewer-git-diff-full="${escapeHtml(payload.path || path)}" data-viewer-git-diff-cached="${cached ? "1" : "0"}">Load the rest of this diff</button>` : "";
      diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} \xB7 ${escapeHtml(payload.mode || "worktree")}${payload.truncated ? " \xB7 truncated" : ""}</div>${renderGitDiffPreview(content)}${more}`;
    }
    async function loadGitCommitDiff(ref, button = null, options = {}) {
      const diffPanel = document.querySelector("[data-viewer-git-diff]");
      const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
      if (!(diffPanel instanceof HTMLElement) || !ref) {
        return;
      }
      if (button instanceof HTMLElement) {
        setActiveGitCommit(button);
      }
      const title = String(options.title || button?.getAttribute("data-viewer-git-commit-title") || button?.querySelector("strong")?.textContent || "").trim();
      if (detailTitle instanceof HTMLElement) {
        detailTitle.textContent = title || "Commit diff";
      }
      diffPanel.textContent = "Loading commit diff...";
      const params = new URLSearchParams({ ref });
      if (options.path) {
        params.set("path", options.path);
      }
      if (options.full) {
        params.set("full", "1");
      }
      const response = await fetch(`/api/git-commit-diff?${params.toString()}`);
      const data = await response.json();
      const payload = data.payload || {};
      if (!response.ok || !data.ok || payload.state !== "ok") {
        diffPanel.textContent = payload.message || data.error || "Unable to load commit diff.";
        return;
      }
      const content = payload.diff || "";
      if (!content.trim()) {
        diffPanel.textContent = payload.message || "No diff is available for this commit.";
        return;
      }
      const label = payload.path ? `${payload.path} \xB7 ${payload.ref || ref}` : `${payload.ref || ref}`;
      const more = payload.canForce ? `<button class="btn viewer-git__diff-more" type="button" data-viewer-git-diff-full="${escapeHtml(payload.path || "")}" data-viewer-git-diff-ref="${escapeHtml(payload.ref || ref)}" data-viewer-git-diff-title="${escapeHtml(title)}">Load the rest of this diff</button>` : "";
      diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(label)} \xB7 commit${payload.truncated ? " \xB7 truncated" : ""}</div>${renderGitDiffPreview(content)}${more}`;
    }
    function reviewBursts() {
      return latestReviewPayload && Array.isArray(latestReviewPayload.bursts) ? latestReviewPayload.bursts : [];
    }
    function activeReviewBurst() {
      const bursts = reviewBursts();
      return bursts.find((burst) => burst?.id === latestReviewBurstId) || bursts[0] || null;
    }
    function reviewTimelineBursts() {
      const bursts = reviewBursts();
      const working = bursts.find((burst) => burst?.kind === "working-tree");
      const commits = bursts.filter((burst) => burst?.kind !== "working-tree").reverse();
      return working ? [...commits, working] : commits;
    }
    function reviewBurstMeta(burst) {
      const timestamp = String(burst?.timestamp || "").trim();
      const stamp = Date.parse(timestamp);
      const relative = Number.isFinite(stamp) ? formatRelativeTime(stamp) : "";
      const stat = Number(burst?.additions || 0) || Number(burst?.deletions || 0) ? `+${Number(burst?.additions || 0)}-${Number(burst?.deletions || 0)}` : "";
      return [relative || String(burst?.meta || "").trim() || "No timestamp", stat].filter(Boolean).join(" \xB7 ");
    }
    function renderReviewFileButton(file, burst) {
      const path = String(file?.path || "");
      const parts = path.split("/");
      const name = parts.pop() || path;
      const directory = parts.join("/");
      const additions = Number(file?.additions || 0);
      const deletions = Number(file?.deletions || 0);
      const stat = additions || deletions ? `<span class="viewer-review__file-stat">+${additions}-${deletions}</span>` : "";
      return `<button class="viewer-review__file" type="button" title="${escapeHtml(path)}" data-viewer-review-file="${escapeHtml(path)}" data-viewer-review-burst-id="${escapeHtml(String(burst?.id || ""))}" data-viewer-review-kind="${escapeHtml(String(burst?.kind || ""))}" data-viewer-review-ref="${escapeHtml(String(burst?.ref || ""))}" data-viewer-review-cached="${file?.cached ? "1" : "0"}">
      <span class="viewer-review__file-name">${escapeHtml(name)}</span>
      <span class="viewer-review__file-directory">${escapeHtml(directory || ".")}</span>
      <span class="viewer-review__file-kind">${escapeHtml(String(file?.kind || "M"))}</span>
      ${stat}
    </button>`;
    }
    function renderReviewTimeline(payload = latestReviewPayload) {
      if (!payload || payload.state !== "ok") {
        return `<section class="viewer-review"><p class="viewer-git__state">${escapeHtml(payload?.message || "Review timeline is unavailable.")}</p></section>`;
      }
      const bursts = reviewTimelineBursts();
      const active = activeReviewBurst();
      const ghostRows = Array.from({ length: 5 }, () => '<span class="viewer-review__burst viewer-review__burst--ghost" aria-hidden="true"><span class="viewer-review__burst-label"></span><span class="viewer-review__burst-title"></span><span class="viewer-review__burst-meta"></span></span>').join("");
      const burstRows = bursts.map((burst) => `<button class="viewer-review__burst${burst === active ? " is-active" : ""}${burst?.kind === "working-tree" ? " viewer-review__burst--working" : ""}" type="button" data-viewer-review-burst="${escapeHtml(String(burst?.id || ""))}" aria-pressed="${burst === active ? "true" : "false"}">
      <span class="viewer-review__burst-label">${escapeHtml(String(burst?.label || burst?.ref || "Change"))}</span>
      <span class="viewer-review__burst-title">${escapeHtml(String(burst?.title || ""))}</span>
      <span class="viewer-review__burst-meta">${escapeHtml(reviewBurstMeta(burst))}</span>
    </button>`).join("");
      const files = Array.isArray(active?.files) ? active.files : [];
      return `<section class="viewer-review" data-viewer-review>
      <div class="viewer-review__bursts" role="listbox" aria-label="Review timeline">${burstRows ? burstRows + ghostRows : '<p class="viewer-git__state">No changes are available.</p>'}</div>
      <div class="viewer-review__body viewer-split">
        <div class="viewer-review__files viewer-split__list" role="listbox" aria-label="Changed files">${files.map((file) => renderReviewFileButton(file, active)).join("") || '<p class="viewer-git__state">No files for this change.</p>'}</div>
        <div class="viewer-git__detail viewer-review__detail viewer-split__detail" data-viewer-git-detail>
          <div class="viewer-git__detail-title">File diff</div>
          <div class="viewer-git__diff" data-viewer-git-diff data-viewer-review-diff>Select a file to preview its change.</div>
        </div>
      </div>
    </section>`;
    }
    function firstReviewFileButton() {
      return document.querySelector("[data-viewer-review-file]");
    }
    function moveReviewButton(selector, current, delta) {
      const nodes = Array.from(document.querySelectorAll(selector)).filter((node) => node instanceof HTMLElement);
      if (!nodes.length) return;
      const focusedIndex = current instanceof HTMLElement ? nodes.indexOf(current) : -1;
      const selectedIndex = nodes.findIndex((node) => node instanceof HTMLElement && (node.classList.contains("is-active") || node.getAttribute("aria-pressed") === "true"));
      const index = focusedIndex >= 0 ? focusedIndex : Math.max(0, selectedIndex);
      const next = nodes[(index + delta + nodes.length) % nodes.length];
      if (next instanceof HTMLElement) {
        next.focus();
        next.click();
      }
    }
    function bindReviewKeyboard() {
      const root = document.querySelector("[data-viewer-review]");
      if (!(root instanceof HTMLElement)) return;
      root.addEventListener("keydown", (event) => {
        if (!(event.target instanceof Element)) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          moveReviewButton("[data-viewer-review-burst]", event.target.closest("[data-viewer-review-burst]"), event.key === "ArrowRight" ? 1 : -1);
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          moveReviewButton("[data-viewer-review-file]", event.target.closest("[data-viewer-review-file]"), event.key === "ArrowDown" ? 1 : -1);
        }
      });
    }
    async function selectReviewBurst(id) {
      latestReviewBurstId = id;
      const burst = activeReviewBurst();
      if (burst && !Array.isArray(burst.files)) {
        const params = new URLSearchParams({ kind: String(burst.kind || "") });
        if (burst.ref) params.set("ref", String(burst.ref));
        const response = await fetch(`/api/review-burst-files?${params.toString()}`);
        const data = await response.json();
        const payload = data.payload || {};
        if (!response.ok || !data.ok || payload.state !== "ok") {
          latestReviewPayload = { state: "error", message: payload.message || data.error || "Unable to load Review files.", bursts: reviewBursts() };
        } else {
          burst.files = Array.isArray(payload.files) ? payload.files : [];
          burst.fileCount = payload.fileCount ?? burst.files.length;
          burst.additions = payload.additions ?? burst.additions ?? 0;
          burst.deletions = payload.deletions ?? burst.deletions ?? 0;
        }
      }
      host.setSurfacePanel("review-panel", renderReviewTimeline());
      bindReviewKeyboard();
      Array.from(document.querySelectorAll("[data-viewer-review-burst]")).find((node) => node instanceof HTMLElement && node.getAttribute("data-viewer-review-burst") === id)?.focus();
      const firstFile = firstReviewFileButton();
      if (firstFile instanceof HTMLElement) {
        await loadReviewFile(firstFile);
      }
    }
    async function loadReviewFile(button) {
      if (!(button instanceof HTMLElement)) {
        return;
      }
      document.querySelectorAll("[data-viewer-review-file]").forEach((node) => {
        if (node instanceof HTMLElement) {
          node.classList.toggle("is-active", node === button);
        }
      });
      const path = button.getAttribute("data-viewer-review-file") || "";
      const kind = button.getAttribute("data-viewer-review-kind") || "";
      if (kind === "commit") {
        await loadGitCommitDiff(button.getAttribute("data-viewer-review-ref") || "", null, { path, title: activeReviewBurst()?.title || "" });
        document.querySelector("[data-viewer-review-diff]")?.scrollTo?.(0, 0);
        return;
      }
      await loadGitDiff(path, button.getAttribute("data-viewer-review-cached") === "1", null);
      document.querySelector("[data-viewer-review-diff]")?.scrollTo?.(0, 0);
    }
    async function showReviewTimeline(options = {}) {
      if (!host.isCapabilityAvailable("git")) {
        const message = host.capabilityMessage("git", "Git is not available for this project.");
        host.setSurfacePanel("review-panel", renderReviewTimeline({ state: host.capability("git").state, message, bursts: [] }));
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("Loading Review timeline...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      const response = await fetch("/api/review-bursts", { signal: view.signal });
      const data = await response.json();
      if (host.isViewStale(view)) {
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load Review timeline.");
      }
      latestReviewPayload = data.payload || {};
      latestReviewBurstId = String(reviewTimelineBursts().at(-1)?.id || "");
      host.setSurfacePanel("review-panel", renderReviewTimeline());
      bindReviewKeyboard();
      if (latestReviewBurstId) {
        await selectReviewBurst(latestReviewBurstId);
      }
      host.setMeta(latestReviewPayload.message || "Review timeline ready.");
    }
    async function loadGitFilePreview(path, diffPanel, detailTitle = null, options = {}) {
      if (detailTitle instanceof HTMLElement) {
        detailTitle.textContent = "File preview";
      }
      diffPanel.textContent = "Loading file preview...";
      const params = new URLSearchParams({ path });
      if (options.full) {
        params.set("full", "1");
      }
      const response = await fetch(`/api/git-file-preview?${params.toString()}`);
      const data = await response.json();
      const payload = data.payload || {};
      if (!response.ok || !data.ok) {
        diffPanel.textContent = data.error || "Unable to load file preview.";
        return;
      }
      if (payload.state !== "ok") {
        diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} \xB7 file preview unavailable</div><p class="viewer-git__state">${escapeHtml(payload.message || "File preview is unavailable.")}</p>`;
        return;
      }
      const content = payload.content || "";
      const previewPath = payload.path || path;
      const forceButtonHtml = payload.canForce ? `<button class="btn viewer-code__force" type="button" data-viewer-git-preview-full="${escapeHtml(previewPath)}">Load anyway</button>` : "";
      diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(previewPath)} \xB7 file preview${payload.truncated ? " \xB7 truncated" : ""}</div>${renderCodeViewer(content, {
        language: detectHljsLanguage(previewPath),
        lineCount: payload.lineCount,
        truncated: Boolean(payload.truncated),
        hardCapHit: Boolean(payload.hardCapHit),
        forceButtonHtml
      })}`;
    }
    async function openGitCommitModal() {
      let payload = latestGitStatusPayload;
      if (!payload || payload.state !== "ok") {
        const response = await fetch("/api/git-status");
        const data = await response.json();
        if (!response.ok || !data.ok || data.payload?.state !== "ok") {
          throw new Error(data.error || data.payload?.message || "Unable to load Git changes.");
        }
        payload = data.payload;
        latestGitStatusPayload = payload;
      }
      const entries = gitCommitModalEntries(payload);
      if (!entries.length) {
        await showThemedMessageModal({ title: "Commit", message: "No changed files are available to commit." });
        return;
      }
      const modal = createThemedModal({
        title: "Commit",
        message: "Select files, enter a message, then create the commit.",
        submitLabel: "Commit"
      });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const submit = modal.querySelector(".viewer-themed-modal__submit");
      const error = document.createElement("div");
      error.className = "viewer-git-commit__error";
      error.hidden = true;
      const files = document.createElement("div");
      files.className = "viewer-git-commit__files";
      for (const entry of entries) {
        const label = document.createElement("label");
        label.className = "viewer-git-commit__file";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = entry.path;
        checkbox.checked = true;
        const text = document.createElement("span");
        text.textContent = `${entry.group}: ${entry.from ? `${entry.from} -> ${entry.path}` : entry.path}`;
        label.append(checkbox, text);
        files.appendChild(label);
      }
      const message = document.createElement("textarea");
      message.className = "viewer-themed-modal__input viewer-git-commit__message";
      message.placeholder = "Commit message";
      message.rows = 3;
      body?.append(files, message, error);
      const selectedFiles = () => Array.from(files.querySelectorAll("input[type='checkbox']")).filter((node) => node instanceof HTMLInputElement && node.checked).map((node) => node.value);
      const updateSubmit = () => {
        if (submit instanceof HTMLButtonElement) {
          submit.disabled = !selectedFiles().length || !message.value.trim();
        }
      };
      const close = () => closeThemedModal(modal);
      const fail = (text) => {
        error.textContent = text;
        error.hidden = false;
      };
      files.addEventListener("change", updateSubmit);
      message.addEventListener("input", updateSubmit);
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", close);
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", close);
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close();
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          if (submit instanceof HTMLButtonElement && !submit.disabled) submit.click();
        }
      });
      submit?.addEventListener("click", async () => {
        const filesToCommit = selectedFiles();
        const commitMessage = message.value.trim();
        if (!filesToCommit.length || !commitMessage) {
          updateSubmit();
          return;
        }
        if (submit instanceof HTMLButtonElement) submit.disabled = true;
        error.hidden = true;
        try {
          const response = await fetch("/api/git-commit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: filesToCommit, message: commitMessage })
          });
          const data = await response.json();
          if (!response.ok || !data.ok) {
            throw new Error(data.error || data.payload?.message || "Git commit failed.");
          }
          close();
          latestGitStatusPayload = null;
          latestGitStatusSignature = "";
          recordGitActivity("Commit", `Created commit ${data.payload?.shortHash || ""}`.trim());
          await showGitStatus({ force: true });
          host.setMeta(`Commit created${data.payload?.shortHash ? `: ${data.payload.shortHash}` : "."}`);
        } catch (err) {
          fail(err?.message || "Git commit failed.");
          updateSubmit();
        }
      });
      updateSubmit();
      window.setTimeout(() => message.focus(), 0);
    }
    async function showGitStatus(options = {}) {
      latestCiScreenMode = "git";
      const previous = options.preserve ? currentGitViewState() : { domain: "", path: "", cached: false };
      if (!host.isCapabilityAvailable("git")) {
        const message = host.capabilityMessage("git", "Git is not available for this project.");
        host.setDocument("Remote", renderGitStatus({ state: host.capability("git").state, message }));
        host.setMeta(message);
        return;
      }
      if (!options.silent) {
        host.setMeta("Checking Git status...");
      }
      const view = options.view || host.beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch("/api/git-status", { signal: view.signal });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (host.isViewStale(view)) {
        return;
      }
      if (response.status === 404) {
        host.setDocument("Remote", renderGitStatus({
          state: "unavailable",
          message: "Git status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
        }));
        host.setMeta("Restart the local viewer to enable Git status.");
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load Git status.");
      }
      syncGitCommitActivity(data.payload);
      const nextGitSignature = gitStatusSignature(data.payload);
      if (options.skipUnchanged && !options.force && latestGitStatusSignature && nextGitSignature === latestGitStatusSignature) {
        setGitBadgeCountsFromPayload(data.payload, { updateMain: false });
        updateMainGitBadges();
        if (!options.silent) {
          host.setMeta(`Checked Git status just now \xB7 no changes (${(/* @__PURE__ */ new Date()).toLocaleTimeString()})`);
        }
        return;
      }
      latestGitStatusSignature = nextGitSignature;
      latestGitStatusPayload = data.payload;
      setGitBadgeCountsFromPayload(data.payload, { updateMain: false });
      updateMainGitBadges();
      host.setDocument("Remote", renderGitStatus(data.payload));
      applyGitDomain(previous.domain || renderedGitDomain() || "changes");
      const restoredFile = previous.path ? findGitFileButton(previous.path, previous.cached) : null;
      const firstFile = restoredFile || document.querySelector("[data-viewer-git-file]");
      if (firstFile instanceof HTMLElement) {
        await loadGitDiff(firstFile.getAttribute("data-viewer-git-file") || "", firstFile.getAttribute("data-viewer-git-cached") === "1", firstFile);
      }
      host.setMeta(options.silent ? "Git status refreshed." : "Git status loaded.");
    }
    const state = {};
    Object.defineProperties(state, {
      repoGithubLink: { get: () => repoGithubLink },
      ciButton: { get: () => ciButton },
      latestGitBadgeCounts: { get: () => latestGitBadgeCounts, set: (value) => {
        latestGitBadgeCounts = value;
      } },
      latestCiStatus: { get: () => latestCiStatus, set: (value) => {
        latestCiStatus = value;
      } },
      latestReleaseRunsStatus: { get: () => latestReleaseRunsStatus, set: (value) => {
        latestReleaseRunsStatus = value;
      } },
      latestReleaseRunsStatusSignature: { get: () => latestReleaseRunsStatusSignature, set: (value) => {
        latestReleaseRunsStatusSignature = value;
      } },
      latestGitStatusSignature: { get: () => latestGitStatusSignature, set: (value) => {
        latestGitStatusSignature = value;
      } },
      latestGitStatusPayload: { get: () => latestGitStatusPayload, set: (value) => {
        latestGitStatusPayload = value;
      } },
      latestCiScreenMode: { get: () => latestCiScreenMode, set: (value) => {
        latestCiScreenMode = value;
      } }
    });
    return {
      state,
      ciActivityEvents,
      fetchGitRemote,
      gitBadgeHtml,
      gitDiffLineKind,
      isGitCiScreenOpen,
      loadGitCommitDiff,
      loadGitDiff,
      loadGitFilePreview,
      openGitCommitModal,
      recordGitActivity,
      refreshGitBadgeCounters,
      refreshReleaseBadgeCounters,
      renderGitDiffPreview,
      renderGitStatus,
      resetReleaseState,
      setActiveGitCommit,
      setGitActionsMenuOpen,
      setGitBadgeCountsFromPayload,
      showGitStatus,
      showReviewTimeline,
      selectReviewBurst,
      loadReviewFile,
      showReleaseStatus,
      syncGitCommitActivity,
      updateMainGitBadges,
      updateMainReleaseBadge
    };
  }

  // clients/viewer/src/browser-host/filters.js
  function matchesFilterState(item, viewerFilterState) {
    if (!item) {
      return false;
    }
    const status = statusValue(item);
    if (viewerFilterState.focus === "active" && isClosed(item)) {
      return false;
    }
    if (viewerFilterState.focus === "blocked" && !status.includes("blocked")) {
      return false;
    }
    if (viewerFilterState.focus === "needs-promotion" && !needsPromotion(item)) {
      return false;
    }
    if (viewerFilterState.focus === "recent" && !updatedWithin(item, 14)) {
      return false;
    }
    if (viewerFilterState.type === "workflow" && !["request", "backlog", "task"].includes(item.stage)) {
      return false;
    }
    if (viewerFilterState.type === "companion" && !["product", "roadmap", "architecture", "spec", "runbook"].includes(item.stage)) {
      return false;
    }
    if (!["all", "workflow", "companion"].includes(viewerFilterState.type) && item.stage !== viewerFilterState.type) {
      return false;
    }
    if (viewerFilterState.status === "ready" && !status.includes("ready")) {
      return false;
    }
    if (viewerFilterState.status === "in-progress" && !status.includes("in progress")) {
      return false;
    }
    if (viewerFilterState.status === "blocked" && !status.includes("blocked")) {
      return false;
    }
    if (viewerFilterState.status === "done" && status !== "done") {
      return false;
    }
    if (!["any", "ready", "in-progress", "blocked", "done"].includes(viewerFilterState.status)) {
      const expected = String(viewerFilterState.status || "").replace(/-/g, " ");
      if (status !== expected) {
        return false;
      }
    }
    if (viewerFilterState.relation === "unlinked" && hasLinks(item)) {
      return false;
    }
    if (viewerFilterState.relation === "linked" && !hasLinks(item)) {
      return false;
    }
    if (viewerFilterState.relation === "needs-promotion" && !needsPromotion(item)) {
      return false;
    }
    if (viewerFilterState.activity === "recent" && !updatedWithin(item, 14)) {
      return false;
    }
    if (viewerFilterState.activity === "stale" && !isStale(item)) {
      return false;
    }
    return true;
  }
  function updateFilterOptionCounts({ items, filterState }) {
    document.querySelectorAll("[data-viewer-filter-group]").forEach((control) => {
      if (!(control instanceof HTMLSelectElement)) {
        return;
      }
      const group = control.getAttribute("data-viewer-filter-group") || "";
      Array.from(control.options).forEach((option) => {
        if (!option.dataset.baseLabel) {
          option.dataset.baseLabel = option.textContent || "";
        }
        const candidate = { ...filterState, [group]: option.value };
        const count = items.filter((item) => matchesFilterState(item, candidate)).length;
        option.textContent = `${option.dataset.baseLabel} (${count})`;
        option.dataset.matchCount = String(count);
        const selected = option.value === control.value;
        option.disabled = count === 0 && !selected;
        option.title = count === 0 ? "No document matches this here" : `${count} document(s)`;
      });
      const neutral = control.options[0];
      if (neutral) {
        const narrowing = Array.from(control.options).slice(1).filter((option) => Number(option.dataset.matchCount || 0) > 0).length;
        neutral.textContent = `${neutral.dataset.baseLabel} ${NEUTRAL_DIMENSION[group] || ""}`.trim() + (narrowing ? ` \u2014 ${narrowing} to narrow by` : " \u2014 nothing to narrow by");
      }
    });
  }
  var NEUTRAL_DIMENSION = {
    type: "types",
    status: "status",
    relation: "relation",
    activity: "activity"
  };
  function focusFilterLabel(value) {
    return {
      active: "Active work",
      all: "All docs",
      blocked: "Blocked",
      "needs-promotion": "Needs promotion",
      recent: "Recently changed"
    }[value] || "All docs";
  }

  // clients/viewer/src/browser-host/projectTools.js
  function escapeHtml2(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function renderTranslations(payload) {
    if (payload?.state !== "ready") return `<div class="viewer-project-tool__empty"><h2>Translations</h2><p>${escapeHtml2(payload?.capability?.message || "Translation source is read-only.")}</p></div>`;
    const locales = Array.isArray(payload.locales) ? payload.locales : [];
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const heads = locales.map((locale) => `<th>${escapeHtml2(locale.id)}</th>`).join("");
    const body = rows.map((row) => {
      const cells = locales.map((locale) => {
        const value = row.values?.[locale.id];
        const missing = value === null || value === void 0;
        const editable = payload.capability?.detail?.editable === true && !missing;
        return `<td class="${missing ? "is-missing" : value === "" ? "is-empty" : ""}"><span>${escapeHtml2(missing ? "Missing" : value)}</span>${editable ? `<button class="viewer-project-tool__edit" type="button" data-project-i18n-edit data-locale="${escapeHtml2(locale.id)}" data-key="${escapeHtml2(row.key)}" data-value="${escapeHtml2(value)}" data-revision="${escapeHtml2(locale.revision)}">Edit</button>` : ""}</td>`;
      }).join("");
      return `<tr><th class="viewer-project-tool__key">${escapeHtml2(row.key)}</th>${cells}</tr>`;
    }).join("");
    const missingCount = Object.values(payload.diagnostics || {}).reduce((sum, entry) => sum + (entry?.missing?.length || 0), 0);
    return `<div class="viewer-project-tool"><div class="viewer-project-tool__summary"><strong>${escapeHtml2(rows.length)} keys</strong><span>${escapeHtml2(locales.length)} locales</span><span>${escapeHtml2(missingCount)} missing</span>${payload.readOnly ? "<span>Read-only source dictionary</span>" : ""}</div><label class="viewer-project-tool__search">Search <input type="search" data-project-i18n-search placeholder="Key or translation"></label><div class="viewer-project-tool__table-wrap"><table><thead><tr><th>Key</th>${heads}</tr></thead><tbody data-project-i18n-rows>${body}</tbody></table></div></div>`;
  }
  function themeTokenPreview(token) {
    const value = String(token.value || "").trim();
    const safeColor = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s/-]+\)|[a-z]+)$/i.test(value);
    const safeRadius = /^-?[0-9.]+(?:px|rem|em|%)$/.test(value);
    if (token.group === "colors" && safeColor) return `<span class="viewer-project-tool__swatch" style="background:${escapeHtml2(value)}"></span>`;
    if (token.group === "radii" && safeRadius) return `<span class="viewer-project-tool__shape" style="border-radius:${escapeHtml2(value)}"></span>`;
    return `<span class="viewer-project-tool__placeholder" aria-hidden="true"></span>`;
  }
  function renderProjectTheme(payload) {
    if (payload?.state !== "ready") return `<div class="viewer-project-tool__empty"><h2>Theme</h2><p>${escapeHtml2(payload?.capability?.message || "Theme source is read-only.")}</p></div>`;
    const editable = payload.capability?.detail?.editable === true;
    const groups = /* @__PURE__ */ new Map();
    (payload.selectors || []).forEach((entry) => (entry.tokens || []).forEach((token) => {
      const group = token.group || "other";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ ...token, selector: entry.selector });
    }));
    const sections = Array.from(groups.entries()).map(([group, tokens]) => `<section class="viewer-project-tool__group"><h2>${escapeHtml2(group)}</h2><div class="viewer-project-tool__tokens">${tokens.map((token) => `<div class="viewer-project-tool__token">${themeTokenPreview(token)}<div><strong>${escapeHtml2(token.name)}</strong><small>${escapeHtml2(token.selector)}</small><code>${escapeHtml2(token.value)}</code></div>${editable ? `<button class="viewer-project-tool__edit" type="button" data-project-theme-edit data-selector="${escapeHtml2(token.selector)}" data-name="${escapeHtml2(token.name)}" data-value="${escapeHtml2(token.value)}" data-revision="${escapeHtml2(payload.revision)}">Edit</button>` : ""}</div>`).join("")}</div></section>`).join("");
    return `<div class="viewer-project-tool"><div class="viewer-project-tool__summary"><strong>${escapeHtml2(payload.path)}</strong><span>${escapeHtml2(groups.size)} groups</span></div>${sections}</div>`;
  }
  async function openProjectTool(kind, { beginView, isViewStale, setDocument, setMeta }, options = {}) {
    const i18n = kind === "i18n";
    const view = options.view || beginView();
    const response = await fetch(i18n ? "/api/project-i18n" : "/api/project-theme", { signal: view.signal });
    const data = await response.json();
    if (isViewStale(view)) return;
    if (!response.ok || !data.ok) throw new Error(data.error || `Unable to load project ${kind}.`);
    setDocument(i18n ? "Translations" : "Theme", i18n ? renderTranslations(data.payload) : renderProjectTheme(data.payload), { eyebrow: data.payload?.capability?.message || `Project ${kind}` });
    setMeta(`Project ${i18n ? "translations" : "theme"} loaded.`);
  }
  async function handleProjectToolEdit(target, setDocument, setMeta) {
    const i18n = target.hasAttribute("data-project-i18n-edit");
    const current = target.getAttribute("data-value") || "";
    const label = target.getAttribute(i18n ? "data-key" : "data-name") || "";
    const value = window.prompt(`${i18n ? "Translation" : "Theme token"}: ${label}`, current);
    if (value === null || value === current) return;
    const body = i18n ? { locale: target.getAttribute("data-locale") || "", key: label, value, revision: target.getAttribute("data-revision") || "" } : { selector: target.getAttribute("data-selector") || "", name: label, value, revision: target.getAttribute("data-revision") || "" };
    const response = await fetch(i18n ? "/api/project-i18n-value" : "/api/project-theme-value", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Unable to save project value.");
    setDocument(i18n ? "Translations" : "Theme", i18n ? renderTranslations(data.payload) : renderProjectTheme(data.payload));
    setMeta("Project value saved.");
  }
  function filterTranslationRows(search) {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll("[data-project-i18n-rows] tr").forEach((row) => {
      if (row instanceof HTMLTableRowElement) row.hidden = Boolean(query) && !(row.textContent || "").toLowerCase().includes(query);
    });
  }
  function updateProjectToolControls(isAvailable, navMenuItem2) {
    const separator = document.querySelector("[data-project-tools-separator]");
    const translations = navMenuItem2("project:translations");
    const theme = navMenuItem2("project:theme");
    const hasI18n = isAvailable("i18n");
    const hasTheme = isAvailable("theme");
    if (separator instanceof HTMLElement) separator.hidden = !(hasI18n || hasTheme);
    if (translations instanceof HTMLButtonElement) translations.hidden = !hasI18n;
    if (theme instanceof HTMLButtonElement) theme.hidden = !hasTheme;
  }
  function setupProjectToolInteractions(setDocument, setMeta) {
    document.addEventListener("input", (event) => {
      const search = event.target instanceof Element ? event.target.closest("[data-project-i18n-search]") : null;
      if (search instanceof HTMLInputElement) filterTranslationRows(search);
    });
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-project-i18n-edit], [data-project-theme-edit]") : null;
      if (!(target instanceof HTMLButtonElement)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleProjectToolEdit(target, setDocument, setMeta).catch((error) => setMeta(error?.message || String(error)));
    });
  }

  // clients/viewer/src/browser-host/index.js
  (() => {
    let activeProjectId = new URLSearchParams(window.location.search).get("project") || "";
    function withProjectContext(input) {
      if (!activeProjectId || typeof input !== "string" || !input.startsWith("/api/")) return input;
      const url = new URL(input, window.location.origin);
      url.searchParams.set("project", activeProjectId);
      return `${url.pathname}${url.search}`;
    }
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function patchedFetch(input, init) {
      const opts = init ? { ...init } : {};
      if (!opts.signal && primaryActionController) {
        opts.signal = primaryActionController.signal;
      }
      return nativeFetch(input, opts);
    };
    captureLanTokenFromUrl();
    const originalFetch = window.fetch.bind(window);
    function viewerFetch(input, init) {
      const target = withProjectContext(input);
      return originalFetch(target, withLanAuthorization(target, init));
    }
    window.fetch = (input, init) => viewerFetch(input, init);
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
    window.logicsViewerModals = {
      prompt: showThemedInputModal,
      choice: showThemedChoiceModal,
      message: showThemedMessageModal,
      confirm: showThemedConfirmModal,
      requestDraft: showRequestDraftModal,
      statusChange: showStatusChangeModal
    };
    window.addEventListener("DOMContentLoaded", () => {
      const pairButton = document.getElementById("viewer-lan-banner-pair");
      if (pairButton instanceof HTMLButtonElement) {
        pairButton.addEventListener("click", () => {
          startDevicePairing();
        });
      }
      refreshLanBannerPairingState();
    });
    const meta = () => document.getElementById("viewer-meta");
    const documentPanel = () => document.getElementById("viewer-document");
    const documentTitle = () => document.getElementById("viewer-document-title");
    const documentContent = () => document.getElementById("viewer-document-content");
    const documentStatusButton = () => document.getElementById("viewer-document-status");
    const documentMinimizeButton = () => document.getElementById("viewer-document-minimize");
    const minimizedDock = () => document.getElementById("viewer-minimized-dock");
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
    const viewerState = createViewerState({ viewerPreferences: readViewerPreferences() });
    const {
      state: gitState,
      ciActivityEvents,
      fetchGitRemote,
      gitBadgeHtml,
      gitDiffLineKind,
      isGitCiScreenOpen,
      loadGitCommitDiff,
      loadGitDiff,
      loadGitFilePreview,
      loadReviewFile,
      openGitCommitModal,
      recordGitActivity,
      refreshGitBadgeCounters,
      refreshReleaseBadgeCounters,
      renderGitDiffPreview,
      renderGitStatus,
      resetReleaseState,
      setActiveGitCommit,
      setGitActionsMenuOpen,
      setGitBadgeCountsFromPayload,
      showGitStatus,
      showReviewTimeline,
      showReleaseStatus,
      selectReviewBurst,
      syncGitCommitActivity,
      updateMainGitBadges,
      updateMainReleaseBadge
    } = createGitScreen({
      beginView,
      capability,
      capabilityMessage,
      dispatchViewerActivityUpdate,
      documentPanel,
      documentTitle,
      isCapabilityAvailable,
      isViewStale,
      meta,
      setDocument,
      setSurfacePanel,
      setDropdownOpen,
      setMeta,
      updateCapabilityControls,
      shared: readerFor(viewerState)
    });
    createGraphScreen({ beginView, isViewStale, setDocument, setMeta, renderMermaidDiagrams, openDoc: (ref) => showDocumentByPath(ref) });
    const repoFolderButton = () => document.getElementById("viewer-repo-folder");
    const {
      state: workshopState,
      appendWorkshopCommandLog,
      bindWorkshopSystemTerminalControls,
      clearWorkshopTerminal,
      clearWorkshopTerminalDragState,
      closeAllInactiveWorkshopTerminalStreams,
      closeWorkshopCommandStream,
      closeWorkshopTerminalStream,
      ensureWorkshopTerminalStage,
      flushWorkshopTerminalInput,
      hasMountedWorkshopTerminals,
      hydrateWorkshopTerminals,
      loadWorkshopCommands,
      loadWorkshopExplorer,
      measureWorkshopTerminalGrid,
      mountWorkshopTerminalEmulator,
      moveWorkshopTerminalBefore,
      openWorkshopCommandStream,
      openWorkshopTerminalStream,
      orderedWorkshopTerminalEntries,
      persistWorkshopTerminalOrder,
      preferredWorkshopTab,
      recomputeWorkshopBadges,
      reconcileWorkshopTerminalOrder,
      redrawWorkshopTerminals,
      refitAllWorkshopTerminals,
      refreshWorkshopTerminalUsage,
      renameWorkshopTerminal,
      renderWorkshop,
      renderWorkshopCommandList,
      renderWorkshopCommandRow,
      renderWorkshopCommandRunMenu,
      renderWorkshopCommands,
      renderWorkshopPanel,
      renderWorkshopTerminalList,
      reopenWorkshopTerminalStreamSoon,
      repaintAllWorkshopTerminals,
      resumeActiveWorkshopTerminalStream,
      setActiveWorkshopTerminal,
      setCustomTerminalBusy,
      setWorkshopActiveTab,
      showCustomTerminalModal,
      showWorkshop,
      spawnCustomWorkshopTerminal,
      spawnSystemWorkshopTerminal,
      spawnWorkshopTerminal,
      startWorkshopCommand,
      stopWorkshopCommand,
      stopWorkshopTerminal,
      storedWorkshopTerminalOrder,
      syncWorkshopSystemTerminalControls,
      updateWorkshopBadges,
      updateWorkshopCommandSession,
      workshopTerminalOrderRootKey,
      workshopTerminalStreamWanted,
      workshopUsesSystemTerminal,
      writeWorkshopTerminalInput
    } = createWorkshopScreen({
      beginView,
      capability,
      capabilityMessage,
      isCapabilityAvailable,
      isViewStale,
      setDocument,
      setMeta,
      showScreenLoading,
      updateViewerPreferences,
      meta,
      renderMermaidDiagrams,
      openDoc: (ref) => showDocumentByPath(ref),
      viewerDiagnostics: {
        breadcrumb: (...args) => viewerDiagnostics.breadcrumb(...args),
        record: (...args) => viewerDiagnostics.record(...args)
      },
      cdxSessionForTerminal: (...args) => cdxSessionForTerminal(...args),
      cdxSessionUsage: (...args) => cdxSessionUsage(...args),
      loadCdxSessionsForCustomTerminal: (...args) => loadCdxSessionsForCustomTerminal(...args),
      shared: readerFor(viewerState),
      onWorkspaceExplorerLoaded: (tree, preview) => {
        latestWorkspaceTreePayload = tree;
        latestWorkspacePreviewPayload = preview;
      }
    });
    const autoRefreshControl = () => document.getElementById("viewer-auto-refresh");
    const refreshIntervalControl = () => document.getElementById("viewer-refresh-interval");
    const minimizedScreens = /* @__PURE__ */ new Map();
    let liveMinimizedScreenId = "";
    const refreshMenuButton = () => document.getElementById("viewer-refresh-menu-button");
    const refreshMenuPanel = () => document.getElementById("viewer-refresh-menu");
    const versionLink = () => document.getElementById("viewer-version-link");
    const bootstrapLogicsButton = () => document.getElementById("viewer-bootstrap-logics");
    const activityClearControl = () => document.getElementById("activity-clear");
    let latestItems = [];
    let latestCapabilities = {};
    let latestProjects = [];
    let latestFleet = false;
    let latestFleetRoots = [];
    let latestCanBootstrapLogics = false;
    let latestShouldPromptBootstrapLogics = false;
    let latestBootstrapLogicsTitle = "Bootstrap Logics in this project";
    let bootstrapPromptOpen = false;
    const promptedBootstrapRoots = /* @__PURE__ */ new Set();
    let latestMetaText = "Read-only local viewer";
    let autoRefreshIntervalMs = defaultAutoRefreshIntervalMs;
    const AUTO_REFRESH_DUTY_DIVISOR = 10;
    let lastAutoRefreshMs = 0;
    let nextAutoRefreshAt = 0;
    let autoRefreshEnabled = true;
    let autoRefreshTimeoutId = 0;
    let autoRefreshIntervalTouched = false;
    let applyingLocalChrome = false;
    let autoRefreshStarted = false;
    let viewerEventsStarted = false;
    let viewerEventsSource = null;
    let itemsLoadInFlight = false;
    let refreshAfterVisible = false;
    let mermaidInitialized = false;
    let focusApplied = false;
    let latestUpdateInfo = {};
    const {
      state: cdxState,
      applyCdxMissionPlan,
      applyCdxSessionConfigModal,
      applyCdxSessionPermission,
      applyOptimisticCdxSessionPermission,
      applyOptimisticCdxSessionToggle,
      cdxColumnVisibilityPreference,
      cdxHistoryColumnVisibilityPreference,
      cdxHistorySessionFilterPreference,
      cdxProviderFilterPreference,
      cdxRunColumnVisibilityPreference,
      cdxRunSessionFilterPreference,
      cdxSessionForTerminal,
      cdxSessionLastUsedMs,
      cdxSessionUsage,
      cdxUsageFromStatus,
      chooseCdxHandoffSource,
      isCdxHistoryOpen,
      isCdxMissionsOpen,
      isCdxRunsOpen,
      isCdxStatusOpen,
      launchCdxMission,
      launchCdxMissionInTerminal,
      loadCdxSessionsForCustomTerminal,
      markCdxSectionSeen,
      openCdxArtifact,
      persistCdxColumnVisibility,
      persistCdxHistoryColumnVisibility,
      persistCdxHistorySessionFilter,
      persistCdxProviderFilter,
      persistCdxRunColumnVisibility,
      persistCdxRunSessionFilter,
      persistCdxSessionConfig,
      previewCdxMission,
      recordCdxDelta,
      recordCdxUnreadSnapshot,
      refreshCdxBadgeCounters,
      refreshCdxSessionUsage,
      renderCdxDisk,
      renderCdxHistory,
      renderCdxMemory,
      renderCdxMissionConfigMenu,
      renderCdxMissionInputs,
      renderCdxMissionSetup,
      renderCdxMissions,
      renderCdxRuns,
      renderCdxSessionTable,
      renderCdxStatus,
      rerenderCdxStatusFromPreferences,
      selectCdxMissionFromModal,
      selectedCdxMissionRequest,
      setCdxMissionBusy,
      showCdxDisk,
      showCdxHistory,
      showCdxMemory,
      showCdxMissions,
      showCdxReport,
      showCdxRuns,
      showCdxSessionConfigModal,
      showCdxStatus,
      updateCdxMissionsCount,
      updateCdxSessionConfigFromModal,
      updateCdxUnreadBadges,
      updateMainCdxBadge,
      withCdxMissionAction
    } = createCdxScreen({
      applyLocalViewerChrome,
      beginView,
      capability,
      capabilityMessage,
      currentDocumentSnapshot,
      isCapabilityAvailable,
      isViewStale,
      renderWorkshopTerminalList,
      setDocument,
      setMeta,
      spawnWorkshopTerminal,
      updateCapabilityControls,
      updateViewerPreferences,
      documentPanel,
      documentTitle,
      shared: readerFor(viewerState)
    });
    let connectionState = "connected";
    let lastSuccessfulSyncAt = 0;
    let latestViewerStateSignature = "";
    let latestCiStatusSignature = "";
    let currentDocumentItem = null;
    let primaryActionBusyKey = "";
    let primaryActionController = null;
    let autoRefreshIntervalForcedByLaunch = false;
    let embeddedHost = "";
    let viewSeq = 0;
    let userViewSeq = 0;
    let activeUserViewController = null;
    async function hydrateViewerPreferencesFromServer() {
      try {
        const response = await fetch("/api/preferences");
        const data = await response.json();
        if (!response.ok || !data?.ok || !data.payload || typeof data.payload !== "object") return;
        viewerState.viewerPreferences = { ...viewerState.viewerPreferences, ...data.payload, version: preferenceVersion };
        cacheViewerPreferences();
        renderProjectMenu();
        syncWorkshopSystemTerminalControls();
      } catch {
      }
    }
    function persistViewerPreferencesToServer(patch, removed) {
      if (!patch && !removed) return;
      fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: patch || {}, removed: removed || {} })
      }).catch(() => {
      });
    }
    function cacheViewerPreferences() {
      try {
        window.localStorage.setItem(preferenceKey, JSON.stringify(viewerState.viewerPreferences));
      } catch {
      }
    }
    function writeViewerPreferences(nextPreferences) {
      viewerState.viewerPreferences = { ...nextPreferences, version: preferenceVersion };
      cacheViewerPreferences();
    }
    function updateViewerPreferences(patch, options = {}) {
      writeViewerPreferences({ ...viewerState.viewerPreferences, ...patch });
      persistViewerPreferencesToServer(patch, options.removed);
      if (patch.projectLastUsedAt && window.parent !== window) window.parent.postMessage({ type: "viewer-project-last-used", projectLastUsedAt: patch.projectLastUsedAt }, "*");
      if (patch.favoriteProjects && window.parent !== window) window.parent.postMessage({ type: "viewer-favorite-projects", favoriteProjects: patch.favoriteProjects }, "*");
      syncWorkshopSystemTerminalControls();
    }
    window.addEventListener("message", (event) => {
      const projectLastUsedAt = event.data?.type === "viewer-project-last-used" ? event.data.projectLastUsedAt : null;
      if (projectLastUsedAt && typeof projectLastUsedAt === "object" && !Array.isArray(projectLastUsedAt)) {
        writeViewerPreferences({ ...viewerState.viewerPreferences, projectLastUsedAt });
        renderProjectMenu();
      }
    });
    window.addEventListener("message", (event) => {
      const favoriteProjects = event.data?.type === "viewer-favorite-projects" ? event.data.favoriteProjects : null;
      if (Array.isArray(favoriteProjects)) {
        writeViewerPreferences({ ...viewerState.viewerPreferences, favoriteProjects: favoriteProjects.map((value) => String(value)).filter(Boolean).sort() });
        renderProjectMenu();
      }
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type !== "viewer-embed-host" || event.data.host !== "vscode" || window.parent === window) return;
      embeddedHost = "vscode";
      const section = document.getElementById("viewer-vscode-section");
      if (!(section instanceof HTMLElement)) return;
      section.hidden = false;
      document.getElementById("viewer-vscode-reload")?.addEventListener("click", () => window.location.reload());
      document.getElementById("viewer-vscode-restart")?.addEventListener("click", () => window.parent.postMessage({ type: "restart-viewer" }, "*"));
      document.getElementById("viewer-vscode-open-external")?.addEventListener("click", () => window.parent.postMessage({ type: "open-external-viewer" }, "*"));
    });
    function favoriteProjectIds() {
      const stored = Array.isArray(viewerState.viewerPreferences.favoriteProjects) ? viewerState.viewerPreferences.favoriteProjects : [];
      return new Set(stored.map((value) => String(value)).filter(Boolean));
    }
    function persistFavoriteProject(projectId, favorite) {
      if (!projectId) {
        return;
      }
      const favorites = favoriteProjectIds();
      if (favorite) {
        favorites.add(projectId);
      } else {
        favorites.delete(projectId);
      }
      updateViewerPreferences(
        { favoriteProjects: Array.from(favorites).sort() },
        favorite ? {} : { removed: { favoriteProjects: [projectId] } }
      );
    }
    function preferredAutoRefreshIntervalSeconds() {
      const seconds = Number(viewerState.viewerPreferences.autoRefreshIntervalSeconds);
      return Number.isFinite(seconds) && seconds > 0 ? normalizeAutoRefreshIntervalSeconds(seconds) : null;
    }
    let transientMetaText = "";
    let latestEnvironmentWarning = null;
    const LOADING_RING_STAGES = /* @__PURE__ */ new Set(["request", "backlog", "task", "product"]);
    const LOADING_AFFORDANCE_DELAY_MS = 250;
    const LOADING_AFFORDANCE_LAP_MS = 2e3;
    function installTopbarMenu() {
      const topbar = document.querySelector(".viewer-topbar");
      const button = document.getElementById("viewer-topbar-menu");
      const actions = document.getElementById("viewer-topbar-actions");
      if (!(topbar instanceof HTMLElement) || !(button instanceof HTMLElement) || !(actions instanceof HTMLElement)) return;
      const setOpen = (open) => {
        topbar.toggleAttribute("data-menu-open", open);
        button.setAttribute("aria-expanded", open ? "true" : "false");
      };
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setOpen(!topbar.hasAttribute("data-menu-open"));
      });
      actions.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("button") !== null) setOpen(false);
      });
      document.addEventListener("click", (event) => {
        if (!topbar.hasAttribute("data-menu-open")) return;
        const inside = event.target instanceof Node && (actions.contains(event.target) || button.contains(event.target));
        if (!inside) setOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setOpen(false);
      });
    }
    function createLoadingAffordance(findNode) {
      let timer = null;
      let shownAt = 0;
      const clear = () => {
        shownAt = 0;
        findNode()?.removeAttribute("data-loading");
      };
      return (busy, colour) => {
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if (!busy) {
          if (!shownAt) {
            clear();
            return;
          }
          const remaining = LOADING_AFFORDANCE_LAP_MS - (Date.now() - shownAt);
          if (remaining <= 0) {
            clear();
            return;
          }
          timer = window.setTimeout(() => {
            timer = null;
            clear();
          }, remaining);
          return;
        }
        const node = findNode();
        if (!node) return;
        if (colour) node.style.setProperty("--loading-color", colour);
        timer = window.setTimeout(() => {
          timer = null;
          shownAt = Date.now();
          findNode()?.setAttribute("data-loading", "");
        }, LOADING_AFFORDANCE_DELAY_MS);
      };
    }
    const setDocumentHeaderLoading = createLoadingAffordance(() => document.querySelector(".viewer-document__header"));
    const setTopbarLoading = createLoadingAffordance(() => document.querySelector(".viewer-topbar"));
    function loadingColourFor(screenChange) {
      const stage = screenChange ? "" : String(currentDocumentItem?.stage || "");
      return LOADING_RING_STAGES.has(stage) ? `var(--stage-color-${stage})` : "var(--viewer-loading-neutral)";
    }
    function applyLoadingRing(busy, screenChange = false) {
      const colour = busy ? loadingColourFor(screenChange) : "";
      setDocumentHeaderLoading(busy, colour);
      setTopbarLoading(busy, colour);
    }
    function setPrimaryActionBusy(actionKey, label = "", options = {}) {
      primaryActionBusyKey = actionKey || "";
      applyLoadingRing(Boolean(actionKey), Boolean(options.screenChange));
      document.body?.classList.toggle("viewer-is-busy", Boolean(primaryActionBusyKey));
      document.body?.toggleAttribute("data-viewer-busy", Boolean(primaryActionBusyKey));
      if (primaryActionBusyKey) {
        document.body?.setAttribute("data-viewer-busy-action", primaryActionBusyKey);
      } else {
        document.body?.removeAttribute("data-viewer-busy-action");
      }
      primaryActionControls().forEach((control) => {
        if (!("disabled" in control)) {
          return;
        }
        control.disabled = Boolean(primaryActionBusyKey);
        control.setAttribute("aria-busy", primaryActionBusyKey ? "true" : "false");
        if (primaryActionBusyKey) {
          control.setAttribute("data-viewer-action-busy", control.getAttribute("data-viewer-action-key") === actionKey ? "active" : "blocked");
        } else {
          control.removeAttribute("data-viewer-action-busy");
        }
      });
      if (!primaryActionBusyKey) {
        updateCapabilityControls();
        applyLocalViewerChrome();
      }
      if (primaryActionBusyKey && label) {
        transientMetaText = `${label}...`;
        setMeta(transientMetaText);
      } else if (!primaryActionBusyKey && transientMetaText) {
        if ((meta()?.textContent || "") === transientMetaText) {
          setMeta("Ready.");
        }
        transientMetaText = "";
      }
    }
    function actionErrorNodes() {
      return {
        banner: document.getElementById("viewer-action-error"),
        label: document.getElementById("viewer-action-error-label"),
        message: document.getElementById("viewer-action-error-message")
      };
    }
    function showActionFailure(label, message) {
      const nodes = actionErrorNodes();
      if (!(nodes.banner instanceof HTMLElement)) {
        setMeta(message);
        return;
      }
      if (nodes.label) nodes.label.textContent = label ? `${label} failed` : "Action failed";
      if (nodes.message) nodes.message.textContent = message;
      nodes.banner.hidden = false;
    }
    function clearActionFailure() {
      const nodes = actionErrorNodes();
      if (nodes.banner instanceof HTMLElement) nodes.banner.hidden = true;
    }
    function withPrimaryAction(actionKey, label, action, options = {}) {
      if (primaryActionBusyKey && !options.supersede) {
        setMeta("Action unavailable while another viewer action is running.");
        return Promise.resolve(false);
      }
      if (primaryActionController) {
        try {
          primaryActionController.abort();
        } catch {
        }
      }
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      primaryActionController = controller;
      clearActionFailure();
      setPrimaryActionBusy(actionKey, label, { screenChange: Boolean(options.supersede) });
      return Promise.resolve().then(action).then(() => true).catch((error) => {
        if (error && (error.name === "AbortError" || controller?.signal.aborted)) {
          return false;
        }
        showActionFailure(label, error?.message || "The viewer did not say why.");
        return false;
      }).finally(() => {
        if (primaryActionController === controller) {
          primaryActionController = null;
          setPrimaryActionBusy("", "");
        }
      });
    }
    function hydrateViewerFilterState() {
      const storedState = readStoredState();
      viewerState.viewerFilterState = sanitizeViewerFilterState(storedState?.viewerFilterState);
    }
    function persistViewerFilterState() {
      const storedState = readStoredState();
      const nextState = storedState && typeof storedState === "object" ? storedState : {};
      writeStoredState({ ...nextState, viewerFilterState: { ...viewerState.viewerFilterState } });
    }
    function activityEventsFromStoredState(state = readStoredState(), root = viewerState.latestRepoRoot) {
      const scopedState = activityStateForRoot(state, root);
      return (Array.isArray(scopedState.activityHistory) ? scopedState.activityHistory : []).filter((entry) => entry && typeof entry === "object" && ["git-action", "git-commit"].includes(entry.type)).map((entry, index) => ({
        id: String(entry.id || `git-action-${index}`),
        kind: "git",
        category: "git",
        stage: "git",
        marker: "G",
        action: String(entry.action || "Git"),
        title: String(entry.title || `Git ${entry.action || "action"}`),
        label: String(entry.label || entry.action || "Git action"),
        meta: String(entry.meta || entry.message || "Git action"),
        // req_284/item_517: branch + short SHA for the recomposed human meta line.
        branch: String(entry.branch || ""),
        sha: String(entry.sha || ""),
        at: entry.at || entry.updatedAt || "",
        updatedAt: entry.updatedAt || entry.at || ""
      }));
    }
    function dispatchViewerActivityUpdate() {
      const storedState = readStoredState();
      const payload = {
        root: viewerState.latestRepoRoot,
        items: latestItems,
        selectedId: storedState?.selectedId || "",
        activityEvents: [
          ...activityEventsFromStoredState(storedState, viewerState.latestRepoRoot),
          ...ciActivityEvents()
        ]
      };
      window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload } }));
      applyLocalViewerChrome();
    }
    function refreshActivityFeedForCi() {
      if (activityPanelIsOpen()) {
        dispatchViewerActivityUpdate();
      }
    }
    function setViewerSurface(surface) {
      const next = ["activity", "project", "review"].includes(surface) ? surface : "project";
      const activityPanel = document.getElementById("activity-panel");
      const current = document.body?.dataset.viewerSurface || (activityPanelIsOpen() ? "activity" : "project");
      if (current === next) {
        if (next === "activity") dispatchViewerActivityUpdate();
        return;
      }
      if (document.body) {
        document.body.dataset.viewerSurface = next;
        document.body.classList.toggle("viewer-screen-activity", next === "activity");
        document.body.classList.toggle("viewer-screen-project", next === "project");
        document.body.classList.toggle("viewer-screen-review", next === "review");
      }
      window.dispatchEvent(new CustomEvent("viewer-surface-change", { detail: { surface: next } }));
      if (activityPanel instanceof HTMLElement) {
        activityPanel.hidden = next !== "activity";
      }
      document.querySelectorAll("[data-viewer-surface]").forEach((node) => {
        if (node instanceof HTMLElement) {
          const active = node.getAttribute("data-viewer-surface") === next;
          node.classList.toggle("is-active", active);
          node.setAttribute("aria-selected", String(active));
          node.removeAttribute("aria-pressed");
        }
      });
      if (next === "activity") {
        dispatchViewerActivityUpdate();
      } else if (next === "review") {
        withPrimaryAction("review-timeline", "Loading Review timeline", () => showReviewTimeline(), { supersede: true });
      }
    }
    function updateStoredActivity(nextItems, root = viewerState.latestRepoRoot) {
      const storedState = readStoredState();
      const baseState = storedState && typeof storedState === "object" ? storedState : {};
      const scopedState = activityStateForRoot(baseState, root);
      const previousSnapshot = scopedState.activitySnapshot && typeof scopedState.activitySnapshot === "object" ? scopedState.activitySnapshot : {};
      const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
      const nextSnapshot = {};
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const decorated = nextItems.map((item) => {
        const relPath = String(item.relPath || item.path || item.id || "");
        const status = String(item?.indicators?.Status || "").trim();
        if (relPath) {
          nextSnapshot[relPath] = { status, updatedAt: item.updatedAt || "" };
        }
        const previous = relPath ? previousSnapshot[relPath] : null;
        const previousStatus = String(previous?.status || "").trim();
        const statusChanged = Boolean(previousStatus && status && previousStatus !== status);
        if (relPath && (statusChanged || !previous)) {
          prependUniqueActivity(history, { path: relPath, at: now, status, previousStatus, type: statusChanged ? "status-change" : "updated" });
        }
        return statusChanged ? { ...item, activityType: "status-change" } : item;
      });
      writeStoredState(writeActivityStateForRoot({
        ...baseState,
        viewerFilterState: { ...viewerState.viewerFilterState }
      }, root, { activitySnapshot: nextSnapshot, activityHistory: history }));
      return decorated;
    }
    function clearActivityHistory() {
      const storedState = readStoredState();
      const nextState = storedState && typeof storedState === "object" ? { ...storedState } : {};
      const byRoot = nextState.activityByRoot && typeof nextState.activityByRoot === "object" ? { ...nextState.activityByRoot } : {};
      delete byRoot[activityRootKey(viewerState.latestRepoRoot)];
      nextState.activityByRoot = byRoot;
      writeStoredState(nextState);
      latestItems = latestItems.map((item) => {
        const clone = { ...item };
        delete clone.activityType;
        return clone;
      });
      setMeta("Local activity history cleared.");
    }
    function setMeta(text) {
      latestMetaText = text;
      renderMeta();
    }
    const viewerDiagnostics = createViewerDiagnostics({
      getPanel: documentPanel,
      getTitle: documentTitle,
      getContent: documentContent,
      getBoard: () => document.getElementById("board"),
      setMeta,
      postDiagnostic: (path, payload, options = {}) => viewerFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: Boolean(options.keepalive)
      }),
      recoverApplication: refreshCurrentScreen,
      onCircuitOpen: (entry) => {
        setAutoRefreshEnabled(false);
        setMeta(`Stability guard paused auto-refresh after repeated ${entry.kind} failures. Refresh manually after reviewing diagnostics.`);
      },
      getMetadata: () => ({
        viewerVersion: String(latestUpdateInfo?.currentVersion || versionLink()?.textContent || "").replace(/^v/i, "")
      }),
      updateDocumentHeaderNav,
      renderMermaidDiagrams
    });
    function renderConnectionNotice() {
      const banner = connectionBanner();
      if (!(banner instanceof HTMLElement)) {
        return;
      }
      if (connectionState !== "disconnected") {
        banner.hidden = true;
        return;
      }
      const copy = connectionCopy();
      const detail = connectionDetail();
      if (copy) {
        copy.textContent = "Local viewer server disconnected. Displayed data may be stale; waiting for reconnection.";
      }
      if (detail) {
        detail.textContent = formatConnectionTime(lastSuccessfulSyncAt);
      }
      banner.hidden = false;
    }
    function markConnectionHealthy(options = {}) {
      const wasDisconnected = connectionState === "disconnected";
      connectionState = "connected";
      lastSuccessfulSyncAt = Date.now();
      renderConnectionNotice();
      if (wasDisconnected && !options.silent) {
        setMeta(`Reconnected \xB7 refreshed ${new Date(lastSuccessfulSyncAt).toLocaleTimeString()}`);
      }
    }
    function markConnectionDisconnected(error) {
      connectionState = "disconnected";
      renderConnectionNotice();
      scheduleNextAutoRefresh();
      const message = error instanceof Error && error.message ? error.message : "Unable to reach local viewer server.";
      setMeta(`Disconnected \xB7 ${message}`);
    }
    function renderMeta() {
      const node = meta();
      if (node) {
        node.textContent = latestMetaText;
      }
    }
    function updateRefreshIntervalControl() {
      const control = refreshIntervalControl();
      if (!(control instanceof HTMLSelectElement)) {
        return;
      }
      const seconds = String(Math.round(autoRefreshIntervalMs / 1e3));
      if (![...control.options].some((option) => option.value === seconds)) {
        const option = document.createElement("option");
        option.value = seconds;
        option.textContent = `${seconds} sec`;
        control.appendChild(option);
      }
      control.value = seconds;
      const throttled = autoRefreshIsThrottled();
      control.title = throttled ? `Refreshing every ${Math.round(autoRefreshDelayMs() / 1e3)} sec: a refresh currently takes ${(lastAutoRefreshMs / 1e3).toFixed(1)} sec, and it may not occupy more than a tenth of the interval.` : "How often the board reloads";
      control.dataset.throttled = throttled ? "true" : "false";
    }
    function setAutoRefreshIntervalSeconds(value, options = {}) {
      autoRefreshIntervalMs = normalizeAutoRefreshIntervalSeconds(value) * 1e3;
      if (options.user) {
        autoRefreshIntervalTouched = true;
        updateViewerPreferences({ autoRefreshIntervalSeconds: Math.round(autoRefreshIntervalMs / 1e3) });
      }
      updateRefreshIntervalControl();
      scheduleNextAutoRefresh();
    }
    function autoRefreshDelayMs() {
      return Math.max(autoRefreshIntervalMs, Math.round(lastAutoRefreshMs * AUTO_REFRESH_DUTY_DIVISOR));
    }
    function autoRefreshIsThrottled() {
      return autoRefreshDelayMs() > autoRefreshIntervalMs;
    }
    function scheduleNextAutoRefresh() {
      if (autoRefreshTimeoutId) {
        window.clearTimeout(autoRefreshTimeoutId);
        autoRefreshTimeoutId = 0;
      }
      const delayMs = autoRefreshDelayMs();
      nextAutoRefreshAt = autoRefreshEnabled ? Date.now() + delayMs : 0;
      if (autoRefreshEnabled) {
        autoRefreshTimeoutId = window.setTimeout(autoRefreshItems, delayMs);
      }
      renderMeta();
    }
    function buildFocusLink(id) {
      const url = new URL(window.location.href);
      url.search = "";
      if (activeProjectId) {
        url.searchParams.set("project", activeProjectId);
      }
      url.searchParams.set("focus", id);
      return url.toString();
    }
    function updateRepositoryIdentity(payload) {
      const url = new URL(window.location.href);
      if (payload.fleetHome) {
        activeProjectId = "";
        url.searchParams.delete("project");
        window.history.replaceState(null, "", url);
      } else {
        activeProjectId = String(payload.projectId || activeProjectId || "");
      }
      if (activeProjectId) {
        url.searchParams.set("project", activeProjectId);
        window.history.replaceState(null, "", url);
      }
      viewerState.latestRepoRoot = String(payload.root || viewerState.latestRepoRoot || "");
      latestProjects = Array.isArray(payload.projects) ? payload.projects : latestProjects;
      latestFleet = Boolean(payload.fleet);
      latestFleetRoots = Array.isArray(payload.fleetRoots) ? payload.fleetRoots : [];
      const repository = payload.repository && typeof payload.repository === "object" ? payload.repository : {};
      viewerState.latestRepository = {
        root: String(repository.root || viewerState.latestRepoRoot || ""),
        provider: String(repository.provider || ""),
        webUrl: String(repository.webUrl || repository.githubUrl || repository.gitlabUrl || ""),
        githubUrl: String(repository.githubUrl || ""),
        gitlabUrl: String(repository.gitlabUrl || "")
      };
      const pill = repoPill();
      if (pill) {
        const repoName = payload.fleetHome ? "Fleet" : String(payload.repoName || viewerState.latestRepoRoot.split(/[\\/]/).filter(Boolean).pop() || "repository");
        const label = pill.querySelector("[data-viewer-project-label]");
        if (label) {
          label.textContent = repoName;
        } else {
          pill.textContent = repoName;
        }
        pill.title = viewerState.latestRepoRoot || repoName;
        if ("disabled" in pill) {
          pill.disabled = false;
        }
        pill.onclick = () => {
          const menu = projectMenu();
          setProjectMenuOpen(Boolean(menu?.hidden));
        };
      }
      updateRepositoryShortcuts();
      renderProjectMenu();
    }
    function renderProjectMenu() {
      const menu = projectMenu();
      if (!(menu instanceof HTMLElement)) {
        return;
      }
      const favorites = favoriteProjectIds();
      const projects = latestProjects.filter((project) => project && typeof project === "object").map((project, index) => {
        const stored = viewerState.viewerPreferences.projectLastUsedAt, value = stored && typeof stored === "object" ? stored[projectPreferenceId(project)] : "", time = Date.parse(String(value || ""));
        return { project, index, favorite: favorites.has(projectPreferenceId(project)), lastUsed: Number.isFinite(time) ? time : 0 };
      }).sort((left, right) => Number(right.project.active) - Number(left.project.active) || Number(right.favorite) - Number(left.favorite) || (left.favorite && right.favorite ? right.lastUsed - left.lastUsed : 0) || left.index - right.index);
      const projectRows = projects.map(({ project, favorite }) => {
        const preferenceId = projectPreferenceId(project);
        return `
        <div class="viewer-project-switcher__row${project.active ? " is-active" : ""}${favorite ? " is-favorite" : ""}" role="none">
          <button class="viewer-project-switcher__favorite" type="button" aria-label="${favorite ? "Remove favorite" : "Add favorite"} ${escapeHtml(project.name || "project")}" aria-pressed="${favorite ? "true" : "false"}" data-viewer-project-favorite="${escapeHtml(preferenceId)}" data-viewer-hint="${favorite ? "Remove favorite" : "Add favorite"}">
            <span aria-hidden="true">${favorite ? "\u2605" : "\u2606"}</span>
          </button>
          <button class="viewer-project-switcher__item${project.active ? " is-active" : ""}" type="button" role="menuitem" data-viewer-project-id="${escapeHtml(project.id || "")}" title="${escapeHtml(project.root || project.name || "")}">
            <span class="viewer-project-switcher__item-name">${escapeHtml(project.name || "project")}</span>
            <span class="viewer-project-switcher__item-state">${escapeHtml(projectStateLabel(project, latestProjectState[project.id] || null))}</span>
            <span class="viewer-project-switcher__item-path">${escapeHtml(project.root || "")}</span>
          </button>
        </div>
      `;
      }).join("");
      const fleetHomeRow = latestFleet ? `
      <button class="viewer-project-switcher__item viewer-project-switcher__item--picker" type="button" role="menuitem" data-viewer-fleet-home>
        <span class="viewer-project-switcher__item-name">Fleet home</span>
        <span class="viewer-project-switcher__item-state">${latestProjects.length} project${latestProjects.length === 1 ? "" : "s"}</span>
        <span class="viewer-project-switcher__item-path">See every project this operator has</span>
      </button>
    ` : "";
      const pickerRow = `
      <button class="viewer-project-switcher__item viewer-project-switcher__item--picker" type="button" role="menuitem" data-viewer-project-pick>
        <span class="viewer-project-switcher__item-name">Choose folder...</span>
        <span class="viewer-project-switcher__item-state">browse</span>
        <span class="viewer-project-switcher__item-path">Select another project location</span>
      </button>
    `;
      const fleetRootRow = latestFleet ? `
      <button class="viewer-project-switcher__item viewer-project-switcher__item--picker" type="button" role="menuitem" data-viewer-fleet-root-pick>
        <span class="viewer-project-switcher__item-name">Add fleet root...</span>
        <span class="viewer-project-switcher__item-state">bounded scan</span>
        <span class="viewer-project-switcher__item-path">Discover immediate project folders</span>
      </button>
    ` : "";
      const fleetRoots = latestFleetRoots.map((root) => `<div class="viewer-project-switcher__row" role="none"><button class="viewer-project-switcher__favorite" type="button" data-viewer-fleet-root-remove="${escapeHtml(root)}" aria-label="Remove fleet root ${escapeHtml(root)}" data-viewer-hint="Remove fleet root">\xD7</button><span class="viewer-project-switcher__item"><span class="viewer-project-switcher__item-name">Fleet root</span><span class="viewer-project-switcher__item-path">${escapeHtml(root)}</span></span></div>`).join("");
      menu.innerHTML = `${fleetHomeRow}${projectRows}${pickerRow}${fleetRootRow}${fleetRoots}`;
    }
    let latestProjectState = {};
    function fleetProjectState(project, state) {
      if (project.hasLogics === false) return { key: "bootstrap", label: "No Logics corpus", action: "Bootstrap" };
      if (state && state.ok === false) return { key: "unreadable", label: state.error || "Could not be read", action: "Details" };
      if (!state) return { key: "unknown", label: projectStateLabel(project, state), action: "Open" };
      if (state.issueCount) return { key: "issues", label: "", action: "Open" };
      if (state.staleCount) return { key: "stale", label: "", action: "Open" };
      return { key: "clean", label: "", action: "Open" };
    }
    function renderFleetMetric(label, value, tone) {
      const zero = !value;
      return `<span class="viewer-fleet__metric${zero ? " is-zero" : ""}${tone && !zero ? ` is-${tone}` : ""}"><b>${escapeHtml(String(value ?? 0))}</b> ${escapeHtml(label)}</span>`;
    }
    function renderFleetRow({ project, state, favorite }) {
      const projectState = fleetProjectState(project, state);
      const counted = projectState.key !== "bootstrap" && projectState.key !== "unreadable" && state;
      const facts = counted ? `<span class="viewer-fleet__metrics">${renderFleetMetric("open", state.openCount ?? 0, "")}${renderFleetMetric("issues", state.issueCount ?? 0, "bad")}${renderFleetMetric("stale", state.staleCount ?? 0, "warn")}</span>` : `<span class="viewer-fleet__note">${escapeHtml(projectState.label)}</span>`;
      return `
      <div class="viewer-fleet__row viewer-fleet__row--${escapeHtml(projectState.key)}" data-viewer-fleet-state="${escapeHtml(projectState.key)}">
        <span class="viewer-fleet__accent" aria-hidden="true"></span>
        <button class="viewer-project-switcher__favorite viewer-fleet__favorite${favorite ? " is-on" : ""}" type="button" aria-label="${favorite ? "Remove favorite" : "Add favorite"} ${escapeHtml(project.name || "project")}" aria-pressed="${favorite ? "true" : "false"}" data-viewer-project-favorite="${escapeHtml(projectPreferenceId(project))}" data-viewer-hint="${favorite ? "Remove favorite" : "Add favorite"}">
          <span aria-hidden="true">${favorite ? "\u2605" : "\u2606"}</span>
        </button>
        <span class="viewer-fleet__identity">
          <span class="viewer-fleet__name"><b>${escapeHtml(project.name || "project")}</b>${project.active ? '<span class="viewer-fleet__tag">current</span>' : ""}</span>
          <span class="viewer-fleet__path-inline" title="${escapeHtml(project.root || "")}">${escapeHtml(project.root || "")}</span>
        </span>
        ${facts}
        <button class="viewer-fleet__open" type="button" data-viewer-project-id="${escapeHtml(project.id || "")}">${escapeHtml(projectState.action)}</button>
      </div>
    `;
    }
    const FLEET_ATTENTION_ORDER = { issues: 0, unreadable: 1, stale: 2, bootstrap: 3, unknown: 4, clean: 5 };
    let fleetFilterText = "";
    function renderFleetHome() {
      const favorites = favoriteProjectIds();
      const needle = fleetFilterText.trim().toLowerCase();
      const all = latestProjects.filter((project) => project && typeof project === "object").map((project, index) => {
        const state = latestProjectState[project.id] || null;
        return { project, state, index, favorite: favorites.has(projectPreferenceId(project)), key: fleetProjectState(project, state).key };
      });
      const projects = all.filter(({ project }) => !needle || String(project.name || "").toLowerCase().includes(needle) || String(project.root || "").toLowerCase().includes(needle)).sort((left, right) => (FLEET_ATTENTION_ORDER[left.key] ?? 9) - (FLEET_ATTENTION_ORDER[right.key] ?? 9) || Number(right.favorite) - Number(left.favorite) || left.index - right.index);
      const rootChips = latestFleetRoots.map((root) => `
      <span class="viewer-fleet__root-chip" title="${escapeHtml(root)}">
        <span>${escapeHtml(root.split(/[\\/]/).filter(Boolean).pop() || root)}</span>
        <button type="button" data-viewer-fleet-root-remove="${escapeHtml(root)}" aria-label="Remove fleet root ${escapeHtml(root)}" data-viewer-hint="Remove fleet root">&times;</button>
      </span>
    `).join("");
      const attention = all.filter(({ key }) => key === "issues" || key === "unreadable").length;
      const fleetSection = (label, group) => group.length ? `<p class="viewer-fleet__section-label">${escapeHtml(label)}</p><section class="viewer-fleet__rows">${group.map(renderFleetRow).join("")}</section>` : "";
      const rows = `${fleetSection("Favorites", projects.filter((p) => p.favorite))}${fleetSection("All projects", projects.filter((p) => !p.favorite))}`;
      const empty = `
      <div class="viewer-fleet__empty">
        <p class="viewer-fleet__empty-title">No projects yet</p>
        <p>A fleet root is a folder whose immediate subfolders are your projects.</p>
        <button class="viewer-fleet__open" type="button" data-viewer-fleet-root-pick>Choose a folder...</button>
      </div>
    `;
      const counted = needle ? `${projects.length} of ${all.length} project${all.length === 1 ? "" : "s"}` : `${all.length} project${all.length === 1 ? "" : "s"}`;
      const noMatch = `<div class="viewer-fleet__empty"><p class="viewer-fleet__empty-title">Nothing matches "${escapeHtml(fleetFilterText)}"</p><p>Clear the filter to see all ${all.length}.</p></div>`;
      return `
      <section class="viewer-fleet">
        <div class="viewer-fleet__toolbar">
          <input class="viewer-fleet__filter" type="search" data-viewer-fleet-filter placeholder="Filter projects..." aria-label="Filter projects" value="${escapeHtml(fleetFilterText)}">
          <p class="viewer-fleet__count">${counted}${attention ? ` \xB7 <b class="viewer-fleet__attention">${attention} need${attention === 1 ? "s" : ""} attention</b>` : ""}</p>
          <span class="viewer-fleet__roots">${rootChips}</span>
          <button class="viewer-fleet__open" type="button" data-viewer-fleet-root-pick>Add root</button>
        </div>
        ${all.length ? rows || noMatch : empty}
      </section>
    `;
    }
    function bindFleetFilter() {
      document.addEventListener("input", (event) => {
        const field = event.target instanceof Element ? event.target.closest("[data-viewer-fleet-filter]") : null;
        if (!(field instanceof HTMLInputElement)) return;
        const caret = field.selectionStart;
        fleetFilterText = field.value;
        void showFleetHome({ silent: true, skipStateLoad: true });
        const next = document.querySelector("[data-viewer-fleet-filter]");
        if (next instanceof HTMLInputElement) {
          next.focus();
          if (caret !== null) next.setSelectionRange(caret, caret);
        }
      });
    }
    function isFleetHomeOpen() {
      const panel = documentPanel();
      const title = documentTitle();
      return Boolean(panel && !panel.hidden && title?.textContent === "Fleet");
    }
    async function showFleetHome(options = {}) {
      const view = options.view || beginView({ silent: Boolean(options.silent) });
      setDocument("Fleet", renderFleetHome());
      if (!options.silent) {
        setMeta(`Fleet \xB7 ${latestProjects.length} projects`);
      }
      if (!options.skipStateLoad) {
        await loadProjectState({ view });
      }
    }
    async function loadProjectState(options = {}) {
      try {
        const response = await fetch("/api/projects-state");
        const data = await response.json();
        latestProjectState = data?.payload?.projects || {};
        renderProjectMenu();
        if (isViewStale(options.view)) {
          return;
        }
        if (isFleetHomeOpen()) {
          setDocument("Fleet", renderFleetHome());
        }
      } catch {
      }
    }
    function setProjectMenuOpen(open) {
      const button = repoPill();
      const menu = projectMenu();
      if (!(button instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return;
      }
      const nextOpen = Boolean(open);
      menu.hidden = !nextOpen;
      button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      if (nextOpen) {
        void loadProjectState();
      }
    }
    async function switchViewerProject(projectId) {
      if (!projectId) {
        return;
      }
      const target = latestProjects.find((project) => project.id === projectId);
      if (!target || target.active) {
        setProjectMenuOpen(false);
        return;
      }
      setProjectMenuOpen(false);
      returnToProjectSurface();
      setMeta(`Switching to ${target.name || "project"}...`);
      const response = await fetch("/api/switch-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to switch project.");
      }
      {
        const active = (Array.isArray(data.payload?.projects) ? data.payload.projects : []).find((project) => project?.active), projectId2 = projectPreferenceId(active), stored = viewerState.viewerPreferences.projectLastUsedAt;
        if (projectId2) updateViewerPreferences({ projectLastUsedAt: { ...stored && typeof stored === "object" ? stored : {}, [projectId2]: (/* @__PURE__ */ new Date()).toISOString() } });
      }
      gitState.latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
      gitState.latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
      gitState.latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
      updateMainGitBadges();
      updateMainCiBadge(gitState.latestCiStatus);
      updateMainReleaseBadge(gitState.latestReleaseRunsStatus);
      updateMainCdxBadge(null);
      const panel = documentPanel();
      if (panel) {
        panel.hidden = true;
      }
      postToApp(data.payload);
    }
    async function pickViewerProjectRoot() {
      setProjectMenuOpen(false);
      returnToProjectSurface();
      setMeta("Opening project folder picker...");
      let response;
      let data = {};
      try {
        response = await fetch("/api/select-project-root", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
        data = await response.json();
      } catch (error) {
        return openProjectPickerModal(error?.message || "Native folder picker is unavailable.");
      }
      if (!response.ok || !data.ok) {
        await openProjectPickerModal(String(data.error || "Native folder picker is unavailable."));
        return;
      }
      applySelectedProjectPayload(data.payload, `Switched to ${data.payload?.repoName || "selected project"}.`);
    }
    async function pickFleetRoot() {
      setProjectMenuOpen(false);
      setMeta("Opening fleet root picker...");
      let response;
      let data = {};
      try {
        response = await fetch("/api/select-fleet-root", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        data = await response.json();
      } catch (error) {
        return openFleetRootPickerModal(error?.message || "Native folder picker is unavailable.");
      }
      if (!response.ok || !data.ok) {
        await openFleetRootPickerModal(String(data.error || "Native folder picker is unavailable."));
        return;
      }
      postToApp(data.payload);
    }
    async function removeFleetRoot(root) {
      const response = await fetch("/api/remove-fleet-root", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to remove fleet root.");
      postToApp(data.payload);
    }
    function applySelectedProjectPayload(payload, message) {
      returnToProjectSurface();
      {
        const active = (Array.isArray(payload?.projects) ? payload.projects : []).find((project) => project?.active), projectId = projectPreferenceId(active), stored = viewerState.viewerPreferences.projectLastUsedAt;
        if (projectId) updateViewerPreferences({ projectLastUsedAt: { ...stored && typeof stored === "object" ? stored : {}, [projectId]: (/* @__PURE__ */ new Date()).toISOString() } });
      }
      gitState.latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
      gitState.latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
      gitState.latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
      updateMainGitBadges();
      updateMainCiBadge(gitState.latestCiStatus);
      updateMainReleaseBadge(gitState.latestReleaseRunsStatus);
      updateMainCdxBadge(null);
      const panel = documentPanel();
      if (panel) {
        panel.hidden = true;
      }
      postToApp(payload, { force: true });
      setMeta(message);
    }
    async function openFolderPickerModal({ reason = "", title = "Choose project folder", onSelect } = {}) {
      const modal = createThemedModal({
        title,
        message: reason ? `${reason} Use the fallback folder browser below.` : "Use the fallback folder browser below.",
        submitLabel: "Close",
        cancelLabel: "Cancel"
      });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const submit = modal.querySelector(".viewer-themed-modal__submit");
      if (submit instanceof HTMLButtonElement) submit.textContent = "Close";
      let currentPath = "";
      const load = async (path = "") => {
        currentPath = path;
        if (body instanceof HTMLElement) {
          body.innerHTML = '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span>Loading folders...</span></div>';
        }
        renderProjectPickerModalBody(body, await fetchProjectPickerTree(path));
      };
      const close = () => closeThemedModal(modal);
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", close);
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", close);
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", close);
      modal.addEventListener("click", async (event) => {
        const openTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-picker-open]") : null;
        const selectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-picker-select]") : null;
        if (openTarget instanceof HTMLElement && !openTarget.hasAttribute("disabled")) {
          event.preventDefault();
          await load(openTarget.getAttribute("data-viewer-project-picker-open") || "");
          return;
        }
        if (selectTarget instanceof HTMLElement) {
          event.preventDefault();
          const selectedPath = selectTarget.getAttribute("data-viewer-project-picker-select") || currentPath;
          try {
            await onSelect(selectedPath, () => closeThemedModal(modal));
          } catch (error) {
            await showThemedMessageModal({ title: "Folder refused", message: String(error?.message || error) });
          }
        }
      });
      try {
        await load("");
      } catch (error) {
        if (body instanceof HTMLElement) {
          body.innerHTML = `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable"><span>${escapeHtml(error?.message || "Unable to browse folders.")}</span></div>`;
        }
      }
    }
    function openProjectPickerModal(reason = "") {
      return openFolderPickerModal({
        reason,
        title: "Choose project folder",
        onSelect: async (path, close) => {
          const response = await fetch("/api/select-project-root-path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path })
          });
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error(String(data.error || response.status));
          close();
          applySelectedProjectPayload(data.payload, `Switched to ${data.payload?.repoName || "selected project"}.`);
        }
      });
    }
    function openFleetRootPickerModal(reason = "") {
      return openFolderPickerModal({
        reason,
        title: "Choose fleet root",
        onSelect: async (path, close) => {
          const response = await fetch("/api/select-fleet-root-path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path })
          });
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error(String(data.error || response.status));
          close();
          postToApp(data.payload);
        }
      });
    }
    async function bootstrapLogicsProject() {
      setMeta("Bootstrapping Logics...");
      const response = await fetch("/api/bootstrap-logics", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to bootstrap Logics.");
      }
      postToApp(data.payload);
      const created = Array.isArray(data.bootstrap?.created_paths) ? data.bootstrap.created_paths.length : 0;
      setMeta(created > 0 ? `Logics bootstrapped \xB7 ${created} paths created.` : "Logics bootstrap checked.");
    }
    function scheduleReloadAfterServerRestart() {
      let attempts = 0;
      const maxAttempts = 24;
      const probe = async () => {
        attempts += 1;
        try {
          const response = await fetch(`/api/items?restart=${Date.now()}`, { cache: "no-store" });
          if (response.ok) {
            window.location.reload();
            return;
          }
        } catch {
        }
        if (attempts < maxAttempts) {
          window.setTimeout(probe, 800);
          return;
        }
        setMeta("Viewer server restarted. Reload this page if it did not reconnect automatically.");
      };
      window.setTimeout(probe, 1200);
    }
    async function controlViewerServer({ endpoint, title, message, submitLabel, pending, done }) {
      const confirmed = await showThemedConfirmModal({ title, message, submitLabel });
      if (!confirmed) return;
      setMeta(pending);
      const response = await fetch(endpoint, { method: "POST" });
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `${submitLabel} failed.`);
      }
      done();
    }
    function restartViewerServer() {
      return controlViewerServer({
        endpoint: "/api/restart-viewer",
        title: "Restart viewer server",
        message: "The local viewer server will restart with the same command. This page will reconnect automatically when it is back.",
        submitLabel: "Restart server",
        pending: "Restarting viewer server...",
        done: () => {
          setMeta("Viewer server restarting...");
          scheduleReloadAfterServerRestart();
        }
      });
    }
    function stopViewerServer() {
      return controlViewerServer({
        endpoint: "/api/stop-viewer",
        title: "Stop viewer server",
        message: "The local viewer server will shut down. This page will stop working until you start it again from the terminal.",
        submitLabel: "Stop server",
        pending: "Stopping viewer server...",
        done: () => setMeta("Viewer server stopped. Restart it from the terminal to reconnect.")
      });
    }
    async function confirmBootstrapLogics({ automatic = false } = {}) {
      if (!latestCanBootstrapLogics || bootstrapPromptOpen) {
        return false;
      }
      bootstrapPromptOpen = true;
      try {
        const confirmed = await showThemedConfirmModal({
          title: "Bootstrap Logics",
          message: latestShouldPromptBootstrapLogics ? "This project does not have a Logics workflow yet. Bootstrap it now to create the local workflow structure and enable the viewer." : "Refresh generated Logics bootstrap files for this project, including local assistant bridge files.",
          submitLabel: latestShouldPromptBootstrapLogics ? "Bootstrap" : "Refresh",
          cancelLabel: automatic ? "Not now" : "Cancel"
        });
        if (!confirmed) {
          return false;
        }
        await bootstrapLogicsProject();
        return true;
      } finally {
        bootstrapPromptOpen = false;
      }
    }
    function maybePromptBootstrapLogics() {
      if (!latestCanBootstrapLogics || !latestShouldPromptBootstrapLogics || !viewerState.latestRepoRoot || bootstrapPromptOpen) {
        return;
      }
      if (promptedBootstrapRoots.has(viewerState.latestRepoRoot)) {
        return;
      }
      promptedBootstrapRoots.add(viewerState.latestRepoRoot);
      window.setTimeout(() => {
        confirmBootstrapLogics({ automatic: true }).catch((error) => setMeta(error?.message || "Unable to bootstrap Logics."));
      }, 0);
    }
    let latestLanShareUrl = "";
    function applyLanBanner(active, shareUrl, rwMode = false) {
      const banner = document.getElementById("viewer-lan-banner");
      if (!(banner instanceof HTMLElement)) return;
      const paired = Boolean(getDeviceToken());
      banner.hidden = !active || paired;
      latestLanShareUrl = active ? String(shareUrl || "") : "";
      window.__logicsLanRwEnabled = Boolean(active && rwMode);
      const urlNode = document.getElementById("viewer-lan-banner-url");
      const copyButton = document.getElementById("viewer-lan-banner-copy");
      if (urlNode instanceof HTMLElement) {
        if (latestLanShareUrl) {
          urlNode.hidden = false;
          urlNode.textContent = latestLanShareUrl;
        } else {
          urlNode.hidden = true;
          urlNode.textContent = "";
        }
      }
      if (copyButton instanceof HTMLButtonElement) {
        copyButton.hidden = !latestLanShareUrl;
      }
      refreshLanBannerPairingState();
    }
    function capability(name) {
      return latestCapabilities?.[name] || { state: "unknown", available: false, message: "" };
    }
    function isCapabilityAvailable(name) {
      return capability(name).available === true;
    }
    function capabilityMessage(name, fallback) {
      return String(capability(name).message || fallback || "");
    }
    function updateCapabilityControls() {
      const bootstrapButton = bootstrapLogicsButton();
      if (bootstrapButton instanceof HTMLButtonElement) {
        bootstrapButton.hidden = !latestCanBootstrapLogics;
        bootstrapButton.disabled = !latestCanBootstrapLogics;
        bootstrapButton.title = latestBootstrapLogicsTitle || "Bootstrap Logics in this project";
      }
      updateProjectToolControls(isCapabilityAvailable, navMenuItem);
      const workshop = workshopState.workshopButton();
      if (workshop instanceof HTMLElement) {
        const workshopAvailable = isCapabilityAvailable("workshop");
        const workspaceAvailable = isCapabilityAvailable("workspace");
        const workshopVisible = workshopAvailable || workspaceAvailable || isCapabilityAvailable("i18n") || isCapabilityAvailable("theme");
        workshop.hidden = !workshopVisible;
        if (workshopVisible) {
          setButtonAvailable(workshop, "Show Workshop and project tools");
        } else {
          setButtonUnavailable(workshop, capabilityMessage("workshop", "Workshop is not available for this project."));
        }
        updateWorkshopBadges();
        hydrateWorkshopTerminals();
      }
      const gitCi = gitState.ciButton();
      if (gitCi instanceof HTMLElement) {
        const gitAvailable = isCapabilityAvailable("git");
        const ciAvailable = isCapabilityAvailable("ci");
        gitCi.hidden = !(gitAvailable || ciAvailable);
        if (gitAvailable || ciAvailable) {
          setButtonAvailable(gitCi, "Show Git status, CI runs, and release state");
        } else {
          setButtonUnavailable(gitCi, capabilityMessage("git", "Git and CI are not available for this project."));
        }
      }
      const cdx = document.getElementById("viewer-cdx");
      if (cdx instanceof HTMLElement) {
        if (isCapabilityAvailable("cdx")) {
          setButtonAvailable(cdx, "Show CDX status");
        } else {
          setButtonUnavailable(cdx, capabilityMessage("cdx", "CDX is not available for this project."));
        }
      }
    }
    function updateRepositoryShortcuts() {
      const github = gitState.repoGithubLink();
      const folder = repoFolderButton();
      if (github instanceof HTMLAnchorElement) {
        if (viewerState.latestRepository.webUrl) {
          github.hidden = false;
          github.href = viewerState.latestRepository.webUrl;
          github.onclick = (event) => {
            if (embeddedHost !== "vscode" || window.parent === window) return;
            event.preventDefault();
            window.parent.postMessage({ type: "open-external-link", target: viewerState.latestRepository.webUrl }, "*");
          };
          const providerLabel = viewerState.latestRepository.provider === "gitlab" ? "GitLab" : viewerState.latestRepository.provider === "github" ? "GitHub" : "remote";
          github.title = `Open ${providerLabel} repository`;
          github.setAttribute("aria-label", `Open ${providerLabel} repository`);
        } else {
          github.hidden = true;
          github.removeAttribute("href");
          github.onclick = null;
        }
      }
      if (folder instanceof HTMLButtonElement) {
        folder.hidden = !viewerState.latestRepository.root;
      }
    }
    function updateVersionLink(updateInfo = latestUpdateInfo) {
      latestUpdateInfo = updateInfo && typeof updateInfo === "object" ? updateInfo : {};
      const link = versionLink();
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const currentVersion = String(latestUpdateInfo.currentVersion || "").trim();
      link.textContent = currentVersion ? `v${currentVersion.replace(/^v/i, "")}` : "v0.0.0";
      link.href = "https://github.com/AlexAgo83/logics-manager";
      link.title = "Open Logics Manager on GitHub";
    }
    async function openRepositoryFolder() {
      if (!viewerState.latestRepository.root) {
        setMeta("Repository folder is unavailable.");
        return;
      }
      try {
        const response = await fetch("/api/open-repo-folder", { method: "POST" });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Unable to open repository folder.");
        }
        setMeta("Repository folder opened.");
      } catch (error) {
        await openProjectPickerModal(error instanceof Error ? error.message : "Unable to open repository folder.");
      }
    }
    function updateMainCiBadge(payload = gitState.latestCiStatus) {
      gitState.latestCiStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
      const button = gitState.ciButton();
      if (!(button instanceof HTMLElement)) {
        return;
      }
      button.querySelector("[data-viewer-ci-badge]")?.remove();
      clearNavMenuBadges(["remote:runs"]);
      if (!gitState.latestCiStatus.visible) {
        return;
      }
      button.title = gitState.latestCiStatus.message || "Show Git status, CI runs, and release state";
      const badge = renderCiButtonBadge(gitState.latestCiStatus);
      button.insertAdjacentHTML("beforeend", badge);
      setNavMenuBadges("remote:runs", badge);
    }
    async function refreshCiBadgeCounters() {
      if (!isCapabilityAvailable("ci")) {
        updateMainCiBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "CI is not available for this project.") });
        return;
      }
      try {
        const response = await fetch("/api/ci-status");
        if (response.status === 404) {
          updateMainCiBadge({ visible: false, badgeState: "unknown", message: "CI status endpoint unavailable." });
          return;
        }
        const data = await response.json();
        if (response.ok && data.ok) {
          latestCiStatusSignature = runtimeStatusSignature(data.payload);
          updateMainCiBadge(data.payload);
          refreshActivityFeedForCi();
        }
      } catch {
        updateMainCiBadge({ visible: false, badgeState: "unknown", message: "CI status unavailable." });
      }
    }
    async function refreshBadgeCounters(options = {}) {
      let payload;
      try {
        const response = await fetch("/api/status", options.periodic ? void 0 : { cache: "no-store" });
        if (response.status === 404) {
          refreshCiBadgeCounters();
          refreshReleaseBadgeCounters();
          refreshCdxBadgeCounters();
          refreshGitBadgeCounters();
          return;
        }
        const data = await response.json();
        if (!response.ok || !data.ok) {
          return;
        }
        payload = data.payload || {};
      } catch {
        return;
      }
      if (isCapabilityAvailable("ci")) {
        if (payload.ci) {
          latestCiStatusSignature = runtimeStatusSignature(payload.ci);
          updateMainCiBadge(payload.ci);
          refreshActivityFeedForCi();
        }
        if (payload.releaseRuns) {
          gitState.latestReleaseRunsStatusSignature = runtimeStatusSignature(payload.releaseRuns);
          updateMainReleaseBadge(payload.releaseRuns);
        }
      } else {
        updateMainCiBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "CI is not available for this project.") });
        updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "Release runs are not available for this project.") });
      }
      if (isCapabilityAvailable("cdx")) {
        if (payload.cdx) {
          const runsPayload = payload.cdxRuns || null;
          const historyPayload = payload.cdxHistory || null;
          cdxState.latestCdxStatusPayload = payload.cdx;
          cdxState.latestCdxStatusSignature = runtimeStatusSignature({ status: payload.cdx, runs: runsPayload });
          if (runsPayload) {
            cdxState.latestCdxRunsPayload = runsPayload;
            updateCdxMissionsCount(runsPayload);
            recordCdxUnreadSnapshot("runs", runsPayload);
          }
          if (historyPayload) {
            cdxState.latestCdxHistoryPayload = historyPayload;
            recordCdxUnreadSnapshot("history", historyPayload);
          }
          updateMainCdxBadge(payload.cdx, runsPayload);
          rerenderCdxStatusFromPreferences();
          refreshWorkshopTerminalUsage();
        }
      } else {
        updateMainCdxBadge(null);
      }
      if (isCapabilityAvailable("git")) {
        if (payload.git && payload.git.state === "ok") {
          gitState.latestGitStatusPayload = payload.git;
          gitState.latestGitStatusSignature = gitStatusSignature(payload.git);
          syncGitCommitActivity(payload.git);
          setGitBadgeCountsFromPayload(payload.git);
        }
      } else {
        gitState.latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
        updateMainGitBadges();
      }
    }
    function activeDocumentTitle() {
      const panel = documentPanel();
      if (!panel || panel.hidden) {
        return "";
      }
      return documentTitle()?.textContent || "";
    }
    async function handleViewerEventChange(components) {
      const changed = new Set(Array.isArray(components) ? components.map(String) : []);
      if (!changed.size) {
        return;
      }
      if (changed.has("corpus")) {
        await refreshViewer("POST", { silent: true });
        return;
      }
      if (changed.has("git") && activeDocumentTitle() === "Remote") {
        await showGitStatus({ silent: true, preserve: true });
        return;
      }
      if (changed.has("ci") && activeDocumentTitle() === "Remote" && gitState.latestCiScreenMode === "runs") {
        await showCiStatus({ silent: true });
        return;
      }
      if (changed.has("releaseRuns") && activeDocumentTitle() === "Remote" && gitState.latestCiScreenMode === "release") {
        await showReleaseStatus({ silent: true });
        return;
      }
      if (changed.has("cdx")) {
        const title = activeDocumentTitle();
        if (title === "CDX status") {
          await showCdxStatus({ silent: true });
          return;
        }
        if (title === "CDX reports") {
          await showCdxRuns({ silent: true });
          return;
        }
        if (title === "CDX history") {
          await showCdxHistory({ silent: true });
          return;
        }
      }
      await refreshBadgeCounters();
    }
    function startViewerEvents() {
      if (viewerEventsStarted || typeof window.EventSource !== "function") {
        return;
      }
      viewerEventsStarted = true;
      try {
        viewerEventsSource = new EventSource("/api/events");
        viewerEventsSource.addEventListener("changed", (event) => {
          try {
            const payload = JSON.parse(event.data || "{}");
            handleViewerEventChange(payload.components).catch(() => {
            });
          } catch {
          }
        });
        viewerEventsSource.onerror = () => {
          if (viewerEventsSource && typeof viewerEventsSource.close === "function") {
            viewerEventsSource.close();
          }
          viewerEventsSource = null;
          viewerEventsStarted = false;
          scheduleNextAutoRefresh();
        };
      } catch {
        viewerEventsSource = null;
        viewerEventsStarted = false;
      }
    }
    function findItemByPath(relPath) {
      const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\//, "");
      return latestItems.find((entry) => entry.relPath === normalized || entry.path === normalized) || null;
    }
    const SHORT_DOCUMENT_ID = /^[a-z]+_\d+$/i;
    function findFocusItem(target) {
      const normalized = normalizeFocusTarget(target);
      if (!normalized) {
        return null;
      }
      const bare = normalized.endsWith(".md") ? normalized.slice(0, -3).split("/").pop() : normalized;
      const exact = latestItems.find((entry) => {
        const relPath = String(entry.relPath || "").replace(/\\/g, "/");
        const fullPath = String(entry.path || "").replace(/\\/g, "/");
        return entry.id === normalized || entry.id === bare || entry.filename === normalized || relPath === normalized || fullPath.endsWith(`/${normalized}`);
      });
      if (exact) {
        return exact;
      }
      if (!SHORT_DOCUMENT_ID.test(bare)) {
        return null;
      }
      const prefix = `${bare.toLowerCase()}_`;
      const matches = latestItems.filter((entry) => String(entry.id || "").toLowerCase().startsWith(prefix));
      return matches.length === 1 ? matches[0] : null;
    }
    function persistSelectedItem(id) {
      const storedState = readStoredState();
      const nextState = storedState && typeof storedState === "object" ? { ...storedState } : {};
      writeStoredState({ ...nextState, selectedId: id, viewerFilterState: { ...viewerState.viewerFilterState } });
    }
    function revealFocusedCard(item) {
      window.setTimeout(() => {
        const escapedId = cssEscape(item.id);
        const selector = `.card[data-id="${escapedId}"], [data-id="${escapedId}"]`;
        const card = document.querySelector(selector);
        if (card instanceof HTMLElement && typeof card.scrollIntoView === "function") {
          card.scrollIntoView({ block: "center", inline: "nearest" });
          card.focus?.({ preventScroll: true });
        }
        applyLocalViewerChrome();
      }, 0);
    }
    function applyFocusRequest(payload, options = {}) {
      const request = focusRequest();
      if (!request.focus) {
        if (!focusApplied && !options.silent && window.location.search.includes("focus=")) {
          window.setTimeout(() => setMeta("Invalid focus target. Loaded corpus without changing selection."), 0);
        }
        focusApplied = true;
        return payload;
      }
      const item = findFocusItem(request.focus);
      if (!item) {
        if (!focusApplied && !options.silent) {
          window.setTimeout(() => setMeta(`Focus target not found: ${request.focus}`), 0);
        }
        focusApplied = true;
        return payload;
      }
      const nextPayload = { ...payload, selectedId: item.id };
      if (focusApplied) {
        persistSelectedItem(item.id);
        return nextPayload;
      }
      viewerState.viewerFilterState = { ...viewerState.viewerFilterState, focus: "all", type: "all", status: "any", relation: "any", activity: "any" };
      persistSelectedItem(item.id);
      focusApplied = true;
      window.setTimeout(() => {
        revealFocusedCard(item);
        if (request.read) {
          showDocument(item).catch((error) => setMeta(error.message));
        } else {
          setMeta(`Focused ${item.relPath || item.id}.`);
        }
      }, 0);
      return nextPayload;
    }
    function selectedItem() {
      const selectedCard = document.querySelector(".card--selected[data-id]");
      const selectedCardId = selectedCard instanceof HTMLElement ? selectedCard.dataset.id : "";
      if (selectedCardId) {
        return latestItems.find((entry) => entry.id === selectedCardId) || null;
      }
      try {
        const state = readStoredState();
        const selectedId = typeof state?.selectedId === "string" ? state.selectedId : "";
        return latestItems.find((entry) => entry.id === selectedId) || null;
      } catch {
        return null;
      }
    }
    function showGettingStarted() {
      setDocument("Getting Started", renderViewerOnboarding(latestItems));
      setMeta("Getting Started opened.");
    }
    async function createNewRequest(draft) {
      const response = await fetch("/api/new-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: draft || {} })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to create request.");
      }
      postToApp(data.payload, { force: true });
      if (data.created?.id) {
        selectItem(data.created.id);
      }
      setMeta(`Created ${data.created?.path || "request"}.`);
    }
    async function startNewRequest() {
      const modals = window.logicsViewerModals;
      const nextNumber = viewerState.items.reduce((highest, item) => {
        const match = /^req_(\d{3})_/.exec(String(item.id || ""));
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, -1) + 1;
      const draft = modals && typeof modals.requestDraft === "function" ? await modals.requestDraft({ nextNumber: nextNumber > 0 ? nextNumber : void 0 }) : null;
      if (!draft) {
        return;
      }
      await createNewRequest(draft);
    }
    function runOnboardingAction(action) {
      const key = String(action || "");
      if (key === "open-logics-insights") {
        withPrimaryAction("insights", "Loading insights", showCorpusInsights);
        return;
      }
      if (key === "health") {
        withPrimaryAction("health", "Checking health", showHealth);
        return;
      }
      if (key === "workshop-explorer") {
        withPrimaryAction("workshop-explorer", "Opening Explorer", () => showWorkshop({ tab: "explorer" }));
        return;
      }
      if (key === "board") {
        closeDocumentPanel();
        return;
      }
      if (key === "cdx-missions") {
        withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
        return;
      }
      if (key === "new-request") {
        startNewRequest().catch((error) => setMeta(error.message));
        return;
      }
      if (key === "assist-triage") {
        setMeta("Triage assistance is available from the VS Code extension tools.");
        return;
      }
      setMeta("This onboarding action is not available in the local viewer.");
    }
    function documentScreenId(titleText) {
      return String(titleText || "Document").trim() || "Document";
    }
    function desktopScreensCanMinimize() {
      return typeof window.matchMedia !== "function" || window.matchMedia("(min-width: 901px)").matches;
    }
    function refitRestoredScreen() {
      requestAnimationFrame(() => {
        refitAllWorkshopTerminals();
        repaintAllWorkshopTerminals();
        resumeActiveWorkshopTerminalStream();
      });
    }
    function minimizedScreenSnapshot() {
      const snapshot = currentDocumentSnapshot();
      const eyebrow = document.getElementById("viewer-document-eyebrow");
      const badge = document.getElementById("viewer-document-badge");
      return {
        id: documentScreenId(snapshot.title),
        title: snapshot.title,
        html: snapshot.html,
        item: currentDocumentItem,
        eyebrow: eyebrow instanceof HTMLElement && !eyebrow.hidden ? eyebrow.textContent || "" : "",
        badgeStage: badge instanceof HTMLElement && !badge.hidden ? badge.dataset.stage || "" : ""
      };
    }
    function renderMinimizedDock() {
      const dock = minimizedDock();
      if (!dock) return;
      dock.innerHTML = "";
      dock.hidden = minimizedScreens.size === 0;
      for (const entry of minimizedScreens.values()) {
        const pill = document.createElement("div");
        pill.className = "viewer-minimized-dock__pill";
        pill.setAttribute("role", "listitem");
        const restore = document.createElement("button");
        restore.className = "viewer-minimized-dock__restore";
        restore.type = "button";
        restore.textContent = entry.title || "Document";
        restore.title = `Restore ${entry.title || "Document"}`;
        restore.setAttribute("data-viewer-minimized-restore", entry.id);
        const close = document.createElement("button");
        close.className = "viewer-minimized-dock__close";
        close.type = "button";
        close.textContent = "\xD7";
        close.title = `Close ${entry.title || "Document"}`;
        close.setAttribute("aria-label", `Close ${entry.title || "Document"}`);
        close.setAttribute("data-viewer-minimized-close", entry.id);
        pill.append(restore, close);
        dock.appendChild(pill);
      }
    }
    function minimizeDocumentPanel() {
      if (!desktopScreensCanMinimize()) return;
      const panel = documentPanel();
      const title = documentTitle();
      const content = documentContent();
      if (!panel || panel.hidden || !title || !content) return;
      const entry = minimizedScreenSnapshot();
      minimizedScreens.set(entry.id, entry);
      liveMinimizedScreenId = entry.id;
      invalidatePendingViews();
      panel.hidden = true;
      setDocumentChromeOpen(false);
      updateScreenActions("");
      renderMinimizedDock();
      setMeta(`${entry.title} minimized.`);
    }
    function restoreMinimizedScreen(id) {
      const entry = minimizedScreens.get(id);
      if (!entry) return;
      const panel = documentPanel();
      const title = documentTitle();
      const content = documentContent();
      const stillLive = id === liveMinimizedScreenId && panel && panel.hidden && title?.textContent === entry.title && content?.innerHTML === entry.html;
      minimizedScreens.delete(id);
      renderMinimizedDock();
      if (stillLive && panel) {
        panel.hidden = false;
        setDocumentChromeOpen(true);
        updateScreenActions(entry.title);
      } else {
        setDocument(entry.title, entry.html, {
          item: entry.item,
          eyebrow: entry.eyebrow,
          badgeStage: entry.badgeStage,
          forceReset: true
        });
      }
      liveMinimizedScreenId = "";
      refitRestoredScreen();
      setMeta(`${entry.title} restored.`);
    }
    function closeMinimizedScreen(id) {
      const entry = minimizedScreens.get(id);
      if (!entry) return;
      minimizedScreens.delete(id);
      if (id === liveMinimizedScreenId) {
        liveMinimizedScreenId = "";
        const title = documentTitle();
        const content = documentContent();
        viewerDiagnostics.breadcrumb(`closeMinimizedScreen:clear ${entry.title || id}`);
        if (title) title.textContent = "";
        if (content) content.innerHTML = "";
      }
      renderMinimizedDock();
      setMeta(`${entry.title} closed.`);
    }
    function updateScreenActions(titleText) {
      const isGit = titleText === "Remote" && gitState.latestCiScreenMode === "git";
      const isRelease = titleText === "Remote" && gitState.latestCiScreenMode === "release";
      const gitActions = document.getElementById("viewer-git-actions");
      const releaseReset = document.getElementById("viewer-release-reset");
      const status = documentStatusButton();
      const minimize = documentMinimizeButton();
      if (gitActions) gitActions.hidden = !isGit;
      if (!isGit) setGitActionsMenuOpen(false);
      if (releaseReset) releaseReset.hidden = !isRelease;
      const close = document.getElementById("viewer-document-close");
      if (close instanceof HTMLButtonElement) {
        close.hidden = false;
        close.disabled = false;
      }
      if (minimize instanceof HTMLButtonElement) {
        minimize.hidden = !titleText || !desktopScreensCanMinimize();
        minimize.disabled = minimize.hidden;
      }
      if (status instanceof HTMLButtonElement) {
        const options = statusOptionsByStage[currentDocumentItem?.stage] || [];
        const currentStatus = String(currentDocumentItem?.indicators?.Status || currentDocumentItem?.status || "").trim();
        status.hidden = !(currentDocumentItem && currentDocumentItem.relPath && options.length);
        status.disabled = status.hidden;
        status.title = currentStatus ? `Change status from ${currentStatus}` : "Change status";
      }
    }
    function renderDocumentMeta(item) {
      const indicators = item?.indicators && typeof item.indicators === "object" ? item.indicators : {};
      const ordered = ["Status", "Progress", "Understanding", "Confidence", "Complexity", "Theme", "Owner", "From version"];
      const hidden = /* @__PURE__ */ new Set(["Priority", "Reminder"]);
      const keys = [...ordered, ...Object.keys(indicators).filter((key) => !ordered.includes(key))].filter((key) => !hidden.has(key));
      const chips = keys.map((key) => [key, indicators[key]]).filter(([, value]) => value !== void 0 && value !== null && String(value).trim()).map(([key, value]) => `<span class="viewer-document-meta__chip"><span>${escapeHtml(key)}</span><strong>${renderDocumentMetaValue(key, value)}</strong></span>`);
      return chips.length ? `<section class="viewer-document-meta" aria-label="Document metadata">${chips.join("")}</section>` : "";
    }
    function renderDocumentMetaValue(key, value) {
      if (/^Related /.test(String(key || ""))) {
        const refs = String(value || "").split(",").map((part) => workflowRefInfo(part)).filter(Boolean);
        if (refs.length) {
          return refs.map((ref) => `<button class="markdown-preview__doc-ref markdown-preview__doc-ref--${escapeHtml(ref.kind)}" type="button" data-viewer-doc-path="${escapeHtml(ref.target)}" title="${escapeHtml(ref.target)}"><code>${escapeHtml(ref.label)}</code></button>`).join("");
        }
      }
      return escapeHtml(value);
    }
    function roadmapMilestones(markdown) {
      const milestones = [];
      String(markdown || "").split(/\r?\n/).forEach((line) => {
        const match = line.match(/^##\s+(\d+(?:\.\d+){1,2})\s+-\s+(.+?)\s*$/);
        if (match) milestones.push({ version: match[1], title: match[2] });
      });
      return milestones;
    }
    function renderRoadmapMilestones(markdown) {
      const milestones = roadmapMilestones(markdown);
      if (!milestones.length) return "";
      return `<section class="viewer-roadmap" aria-label="Roadmap milestones">
      ${milestones.map((milestone, index) => `
        <div class="viewer-roadmap__milestone">
          <span class="viewer-roadmap__version">${escapeHtml(milestone.version)}</span>
          <span class="viewer-roadmap__dot" aria-hidden="true"></span>
          <span class="viewer-roadmap__title">${escapeHtml(milestone.title)}</span>
          ${index < milestones.length - 1 ? '<span class="viewer-roadmap__line" aria-hidden="true"></span>' : ""}
        </div>
      `).join("")}
    </section>`;
    }
    function workflowRefInfo(value) {
      const raw = String(value || "").trim().replace(/^`|`$/g, "").replace(/\\/g, "/").replace(/^\.?\//, "");
      if (!raw || raw.startsWith("/") || raw.startsWith("~") || raw.split("/").includes("..")) return null;
      const stem = raw.replace(/\.md$/i, "").split("/").pop() || "";
      const directory = raw.split("/").slice(-2, -1)[0] || "";
      const match = stem.match(/^(req|item|task|prod|road|adr|spec)_(\d+)/i);
      if (!match) return null;
      const kindByPrefix = { req: "request", item: "backlog", task: "task", prod: "product", road: "roadmap", adr: "architecture", spec: "spec" };
      const prefixByKind = { request: "R", backlog: "I", task: "T", product: "P", roadmap: "M", architecture: "A", spec: "S" };
      const kind = directory === "specs" ? "spec" : kindByPrefix[match[1].toLowerCase()];
      const prefix = prefixByKind[kind];
      return prefix ? { label: `${prefix}${match[2]}`, target: raw, kind } : null;
    }
    function documentPriorityNode() {
      let node = document.getElementById("viewer-document-priority");
      if (node instanceof HTMLElement) return node;
      const title = documentTitle();
      if (!(title instanceof HTMLElement) || !(title.parentElement instanceof HTMLElement)) return null;
      node = document.createElement("span");
      node.id = "viewer-document-priority";
      node.className = "viewer-document__priority";
      node.hidden = true;
      title.parentElement.insertBefore(node, title);
      return node;
    }
    function updateDocumentPriority(item) {
      const node = documentPriorityNode();
      if (!(node instanceof HTMLElement)) return;
      const priority = String(item?.indicators?.Priority || "").trim();
      if (!priority) {
        node.innerHTML = "";
        node.hidden = true;
        return;
      }
      const level = priority.toLowerCase();
      const knownLevel = level === "low" || level === "high" ? level : "medium";
      const filled = knownLevel === "high" ? 3 : knownLevel === "low" ? 1 : 2;
      const bars = [1, 2, 3].map((index) => `<span class="${index <= filled ? "card__priority-bar card__priority-bar--on" : "card__priority-bar"}"></span>`).join("");
      node.innerHTML = `<span class="card__priority-meter card__priority-meter--${knownLevel}" title="Priority: ${escapeHtml(priority)}" role="img" aria-label="Priority: ${escapeHtml(priority)}">${bars}</span>`;
      node.hidden = false;
    }
    function parseDocumentIndicators(markdown) {
      const indicators = {};
      String(markdown || "").split(/\r?\n/).some((line) => {
        if (!line.trim()) return false;
        const match = line.match(/^>\s*([^:]+):\s*(.+?)\s*$/);
        if (!match) return false;
        indicators[match[1].trim()] = match[2].trim();
        return false;
      });
      return indicators;
    }
    function documentItemWithIndicators(item, markdown, relPath) {
      return {
        ...item,
        relPath,
        indicators: { ...parseDocumentIndicators(markdown), ...item?.indicators || {} }
      };
    }
    function beginView(options = {}) {
      const silent = Boolean(options.silent);
      const seq = ++viewSeq;
      let userSeq = userViewSeq;
      let signal;
      if (!silent) {
        userSeq = ++userViewSeq;
        if (activeUserViewController) {
          activeUserViewController.abort();
        }
        activeUserViewController = new AbortController();
        signal = activeUserViewController.signal;
      }
      return { seq, userSeq, silent, signal };
    }
    function invalidatePendingViews() {
      viewSeq += 1;
      userViewSeq += 1;
    }
    function isViewStale(view) {
      if (!view) {
        return false;
      }
      if (view.silent) {
        return view.userSeq !== userViewSeq || view.seq !== viewSeq;
      }
      return view.userSeq !== userViewSeq;
    }
    let detachReadingPosition = null;
    let screenLoadingTimer = null;
    function setSurfacePanel(id, html) {
      const panel = document.getElementById(id);
      if (!(panel instanceof HTMLElement)) return null;
      panel.innerHTML = html;
      return panel;
    }
    function setDocument(titleText, html, options = {}) {
      stopScreenLoadingTimer();
      invalidatePendingViews();
      cdxState.cdxCloseTarget = null;
      const screenId = documentScreenId(titleText);
      if (minimizedScreens.delete(screenId)) {
        if (liveMinimizedScreenId === screenId) liveMinimizedScreenId = "";
        renderMinimizedDock();
      }
      currentDocumentItem = options.item || null;
      const panel = documentPanel();
      const title = documentTitle();
      const content = documentContent();
      const eyebrow = document.getElementById("viewer-document-eyebrow");
      const previousTitle = title ? title.textContent : "";
      const sameScreenRepaint = Boolean(content) && content.childNodes.length > 0 && !options.forceReset && previousTitle === (titleText || "Document");
      const preserved = sameScreenRepaint ? captureDocumentViewState(content) : null;
      const previousDocument = content && content.childNodes.length > 0 ? { title: previousTitle || "Document", html: content.innerHTML } : viewerDiagnostics.healthyDocument();
      viewerDiagnostics.breadcrumb(`setDocument:start ${titleText || "Document"}`);
      try {
        if (title) {
          title.textContent = titleText || "Document";
        }
        if (eyebrow instanceof HTMLElement) {
          const description = options.eyebrow !== void 0 ? String(options.eyebrow || "") : describeDocumentScreen(titleText);
          eyebrow.textContent = description;
          eyebrow.hidden = !description;
        }
        const pathCopy = document.getElementById("viewer-document-path-copy");
        if (pathCopy instanceof HTMLElement) {
          const documentPath = String(options.path || "");
          pathCopy.hidden = !documentPath;
          pathCopy.dataset.path = documentPath;
          pathCopy.dataset.focusId = String(currentDocumentItem?.id || "");
          if (documentPath) {
            pathCopy.title = `Copy a link to ${documentPath}`;
            pathCopy.setAttribute("aria-label", `Copy a link to ${documentPath}`);
          }
        }
        updateDocumentBadge(options.badgeStage);
        updateDocumentPriority(currentDocumentItem);
        updateScreenActions(titleText);
        if (content) {
          content.innerHTML = html || "";
          updateDocumentHeaderNav(content);
          detachReadingPosition?.();
          detachReadingPosition = options.item ? applyReadingLayout(content) : null;
          if (!options.item) content.classList.remove("markdown-preview--reading", "markdown-preview--with-contents");
        }
        if (panel) {
          panel.hidden = false;
          setDocumentChromeOpen(true);
          if (!sameScreenRepaint && typeof panel.scrollIntoView === "function") {
            panel.scrollIntoView({ block: "nearest" });
          }
        }
        renderMermaidDiagrams();
        if (preserved) restoreDocumentViewState(content, preserved);
        viewerDiagnostics.rememberHealthyDocument();
        if (content && content.childNodes.length === 0) viewerDiagnostics.recoverBlankDocument();
        viewerDiagnostics.breadcrumb(`setDocument:end ${titleText || "Document"}`);
      } catch (error) {
        viewerDiagnostics.recordError(error, { kind: "render-error", screen: titleText || "Document" });
        if (previousDocument && content) {
          void viewerDiagnostics.recoverDocument(previousDocument, "render-error-recovery");
          if (panel) panel.hidden = false;
        }
      }
    }
    function currentDocumentSnapshot(fallbackTitle = "Document") {
      const title = documentTitle();
      const content = documentContent();
      return {
        title: title?.textContent || fallbackTitle,
        html: content?.innerHTML || ""
      };
    }
    async function closeDocumentPanel() {
      const target = cdxState.cdxCloseTarget;
      cdxState.cdxCloseTarget = null;
      if (target?.type === "cdx-report") {
        setDocument(target.title || "CDX run report", target.html || "");
        cdxState.cdxCloseTarget = { type: "cdx-runs" };
        setMeta("Returned to CDX run report.");
        return;
      }
      if (target?.type === "cdx-runs") {
        await showCdxRuns({ silent: true });
        setMeta("Returned to CDX reports.");
        return;
      }
      const panel = documentPanel();
      if (panel) {
        invalidatePendingViews();
        const screenId = documentScreenId(documentTitle()?.textContent || "");
        if (screenId && minimizedScreens.delete(screenId)) renderMinimizedDock();
        if (liveMinimizedScreenId === screenId) liveMinimizedScreenId = "";
        panel.hidden = true;
        setDocumentChromeOpen(false);
      }
      updateScreenActions("");
    }
    function renderMermaidDiagrams() {
      const nodes = Array.from(document.querySelectorAll(".mermaid"));
      if (nodes.length === 0) {
        return;
      }
      if (!window.mermaid) {
        showMermaidFallback("Mermaid preview unavailable. Raw diagram source shown below.");
        return;
      }
      try {
        if (!mermaidInitialized && typeof window.mermaid.initialize === "function") {
          window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
          mermaidInitialized = true;
        }
        if (typeof window.mermaid.run !== "function") {
          showMermaidFallback("Mermaid preview unavailable. Raw diagram source shown below.");
          return;
        }
        Promise.resolve(window.mermaid.run({ nodes })).catch((error) => {
          const detail = error instanceof Error ? error.message : String(error);
          showMermaidFallback(`Mermaid preview unavailable. Raw diagram source shown below. (${detail})`);
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        showMermaidFallback(`Mermaid preview unavailable. Raw diagram source shown below. (${detail})`);
      }
    }
    function applyLocalViewerChrome() {
      if (applyingLocalChrome) {
        return;
      }
      applyingLocalChrome = true;
      try {
        const hiddenActions = ["promote", "mark-done", "mark-obsolete", "change-status"];
        hiddenActions.forEach((action) => {
          document.querySelectorAll(`[data-action="${action}"]`).forEach((element) => {
            if (!(element instanceof HTMLElement)) {
              return;
            }
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
            if ("disabled" in element) {
              element.disabled = true;
            }
          });
        });
        document.querySelectorAll('[data-action="open"]').forEach((element) => {
          if (!(element instanceof HTMLElement)) {
            return;
          }
          element.hidden = true;
          element.setAttribute("aria-hidden", "true");
          if ("disabled" in element) {
            element.disabled = true;
          }
        });
        document.querySelectorAll('[data-action="read"]').forEach((element) => {
          if (!(element instanceof HTMLElement)) {
            return;
          }
          element.textContent = "Read document";
          element.title = "Read selected document";
        });
        const editButton = editDocumentButton();
        if (editButton instanceof HTMLButtonElement) {
          const item = selectedItem();
          editButton.disabled = !item;
          editButton.title = item ? "Open selected document in the system editor" : "Select a document to edit";
        }
        document.querySelectorAll(".column__menu-item").forEach((element) => {
          if (!(element instanceof HTMLElement)) {
            return;
          }
          const label = (element.textContent || "").trim().toLowerCase();
          if (label === "promote" || label === "open") {
            element.hidden = true;
            element.setAttribute("aria-hidden", "true");
          }
          if (label === "read") {
            element.textContent = "Read document";
          }
        });
      } finally {
        applyingLocalChrome = false;
      }
    }
    function postToApp(payload, options = {}) {
      markConnectionHealthy({ silent: Boolean(options.silent) });
      const nextSignature = viewerStateSignature(payload);
      if (!options.force && latestViewerStateSignature && nextSignature === latestViewerStateSignature) {
        if (!options.silent) {
          setMeta(`Checked just now \xB7 no viewer changes (${(/* @__PURE__ */ new Date()).toLocaleTimeString()})`);
        }
        scheduleNextAutoRefresh();
        return false;
      }
      latestViewerStateSignature = nextSignature;
      const payloadRoot = String(payload?.root || viewerState.latestRepoRoot || "");
      latestItems = updateStoredActivity(Array.isArray(payload.items) ? payload.items : [], payloadRoot);
      if (!autoRefreshIntervalTouched) {
        const launchSeconds = Number(payload.autoRefreshIntervalSeconds);
        const preferredSeconds = preferredAutoRefreshIntervalSeconds();
        autoRefreshIntervalForcedByLaunch = Boolean(payload.autoRefreshIntervalForced);
        const nextSeconds = autoRefreshIntervalForcedByLaunch || preferredSeconds === null ? launchSeconds : preferredSeconds;
        autoRefreshIntervalMs = normalizeAutoRefreshIntervalSeconds(nextSeconds) * 1e3;
        updateRefreshIntervalControl();
      }
      updateRepositoryIdentity(payload);
      latestCapabilities = normalizeCapabilities(payload);
      latestCanBootstrapLogics = Boolean(payload?.canBootstrapLogics);
      latestShouldPromptBootstrapLogics = typeof payload?.shouldPromptBootstrapLogics === "boolean" ? payload.shouldPromptBootstrapLogics : latestCapabilities.logics?.available === false;
      latestBootstrapLogicsTitle = String(payload?.bootstrapLogicsTitle || "Bootstrap Logics in this project");
      applyLanBanner(Boolean(payload?.lanMode), String(payload?.lanShareUrl || ""), Boolean(payload?.lanRwMode));
      updateCapabilityControls();
      const payloadWithActivity = { ...payload, items: latestItems, activityEvents: activityEventsFromStoredState(readStoredState(), payloadRoot) };
      const nextPayload = applyFocusRequest(payloadWithActivity, { silent: Boolean(options.silent) });
      window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload: nextPayload } }));
      const rootName = payload.root ? payload.root.split(/[\\/]/).filter(Boolean).pop() : "repository";
      if (!options.silent) {
        setMeta(`${rootName} \xB7 ${payload.items.length} docs \xB7 refreshed ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`);
      }
      scheduleNextAutoRefresh();
      updateVersionLink(payload.updateInfo);
      renderUpdateNotice(payload.updateInfo, payload.cdxUpdateInfo);
      latestEnvironmentWarning = payload.bootstrapWarning || payload.environmentWarning || null;
      renderEnvironmentWarning(latestEnvironmentWarning);
      refreshBadgeCounters();
      maybePromptBootstrapLogics();
      updateFilterSummary();
      applyLocalViewerChrome();
      bindRefreshMenuControls();
      bindFocusMenuControls();
      if (activityPanelIsOpen()) {
        dispatchViewerActivityUpdate();
      }
      if (payload.fleetHome) {
        void showFleetHome({ silent: Boolean(options.silent) });
      }
      return true;
    }
    function renderUpdateNotice(updateInfo, cdxUpdateInfo) {
      const banner = updateBanner();
      if (!(banner instanceof HTMLElement)) {
        return;
      }
      const notices = [
        { name: "logics-manager", fallbackCommand: "logics-manager self-update", info: updateInfo },
        { name: "cdx", fallbackCommand: "cdx update", info: cdxUpdateInfo }
      ].filter(({ info }) => info && info.updateAvailable === true && info.latestVersion);
      if (notices.length === 0) {
        banner.hidden = true;
        return;
      }
      const copy = updateCopy();
      const command = updateCommand();
      if (copy) {
        const messages = notices.map(({ name, info }) => `${name} ${info.latestVersion} is available. Current version: ${info.currentVersion || "unknown"}.`);
        copy.textContent = messages.join(" ");
      }
      if (command) {
        command.textContent = notices.length ? notices.map(({ fallbackCommand, info }) => info.updateCommand || fallbackCommand).join(" && ") : "";
      }
      banner.hidden = false;
    }
    async function loadItems(method = "GET", options = {}) {
      if (itemsLoadInFlight) {
        return false;
      }
      itemsLoadInFlight = true;
      setTopbarLoading(true, "var(--viewer-loading-neutral)");
      try {
        if (!options.silent) {
          setMeta("Refreshing...");
        }
        const response = await fetch(method === "POST" ? "/api/refresh" : "/api/items", { method });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Unable to load viewer data.");
        }
        const changed = postToApp(data.payload, { silent: Boolean(options.silent), force: Boolean(options.force) });
        if (method !== "POST") {
          await refreshGitBadgeCounters();
        }
        return changed;
      } catch (error) {
        markConnectionDisconnected(error);
        throw error;
      } finally {
        itemsLoadInFlight = false;
        setTopbarLoading(false);
      }
    }
    function isWorkspaceOpen() {
      const panel = documentPanel();
      return Boolean(panel && !panel.hidden && document.querySelector("[data-viewer-workshop-explorer]"));
    }
    function isReviewOpen() {
      return document.body?.dataset.viewerSurface === "review" && documentTitle()?.textContent === "Review";
    }
    async function refreshViewer(method = "POST", options = {}) {
      const changed = await loadItems(method, options);
      if (isFleetHomeOpen()) {
        await showFleetHome({ silent: Boolean(options.silent), skipStateLoad: !changed && !options.force });
      } else if (isWorkspaceOpen()) {
        if (changed || options.force) {
          await showWorkspace({ silent: Boolean(options.silent) });
        }
      } else if (isReviewOpen()) {
        await showReviewTimeline({ silent: Boolean(options.silent), force: Boolean(options.force) });
      } else if (isGitCiScreenOpen()) {
        if (gitState.latestCiScreenMode === "release") {
          await showReleaseStatus({ silent: Boolean(options.silent), force: Boolean(options.force) });
        } else if (gitState.latestCiScreenMode === "runs") {
          await showCiStatus({ silent: Boolean(options.silent), skipUnchanged: !changed && !options.force, force: Boolean(options.force) });
        } else {
          await showGitStatus({ preserve: true, silent: Boolean(options.silent), skipUnchanged: !changed && !options.force, force: Boolean(options.force) });
        }
      } else if (isCdxStatusOpen()) {
        await showCdxStatus({ silent: Boolean(options.silent), skipUnchanged: !changed && !options.force, force: Boolean(options.force) });
      } else if (isCdxRunsOpen()) {
        if (changed || options.force) {
          await showCdxRuns({ silent: Boolean(options.silent) });
        }
      } else if (isCdxHistoryOpen()) {
        if (changed || options.force) {
          await showCdxHistory({ silent: Boolean(options.silent) });
        }
      } else if (method === "POST") {
        await refreshBadgeCounters({ periodic: Boolean(options.periodic) });
      }
      if (!changed && !options.silent && !options.force) {
        setMeta(`Checked just now \xB7 no viewer changes (${(/* @__PURE__ */ new Date()).toLocaleTimeString()})`);
      }
    }
    const screenRegistry = [
      { title: "Fleet", refresh: (opts) => showFleetHome(opts) },
      { title: "Getting Started", refresh: () => showGettingStarted() },
      { title: "CDX status", refresh: (opts) => showCdxStatus(opts) },
      { title: "CDX missions", refresh: (opts) => showCdxMissions(opts) },
      { title: "CDX reports", refresh: (opts) => showCdxRuns(opts) },
      { title: "CDX history", refresh: (opts) => showCdxHistory(opts) },
      { title: "CDX memory", refresh: (opts) => showCdxMemory(opts) },
      { title: "CDX disk", refresh: (opts) => showCdxDisk(opts) },
      { title: "Corpus insights", refresh: () => showCorpusInsights() },
      { title: "Validation health", refresh: () => showHealth() },
      {
        title: "Remote",
        // Remote is three sub-screens behind one title; the mode decides which refreshes.
        refresh: async (opts) => {
          if (gitState.latestCiScreenMode === "release") return showReleaseStatus(opts);
          if (gitState.latestCiScreenMode === "runs") return showCiStatus(opts);
          setMeta("Fetching from remote...");
          await fetchGitRemote();
          return showGitStatus({ preserve: true, ...opts });
        }
      },
      {
        title: "Workshop",
        refresh: (opts) => {
          if (preferredWorkshopTab() === "terminals" && hasMountedWorkshopTerminals()) {
            const count = redrawWorkshopTerminals();
            setMeta(count === 1 ? "Redrew 1 terminal." : `Redrew ${count} terminals.`);
            return void 0;
          }
          return showWorkshop(opts);
        }
      }
    ];
    function screenFor(title) {
      return screenRegistry.find((screen) => screen.title === title) || null;
    }
    async function refreshCurrentScreen() {
      const panel = documentPanel();
      const title = documentTitle();
      if (!panel || panel.hidden || !title) return;
      const screen = title.textContent || "";
      viewerDiagnostics.breadcrumb(`refreshCurrentScreen ${screen}`);
      const declared = screenFor(screen);
      return declared ? declared.refresh({ force: true }) : showDocumentByPath(screen);
    }
    function autoRefreshItems() {
      if (!autoRefreshEnabled) {
        return;
      }
      if (document.hidden) {
        refreshAfterVisible = true;
        return;
      }
      const startedAt = Date.now();
      refreshViewer("POST", { silent: true, periodic: true }).then(() => {
        lastAutoRefreshMs = Date.now() - startedAt;
      }).catch((error) => {
        lastAutoRefreshMs = Date.now() - startedAt;
        setMeta(error.message);
      });
    }
    function startAutoRefresh() {
      if (autoRefreshStarted) {
        return;
      }
      autoRefreshStarted = true;
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && refreshAfterVisible) {
          refreshAfterVisible = false;
          autoRefreshItems();
        }
      });
    }
    function setAutoRefreshEnabled(enabled) {
      autoRefreshEnabled = Boolean(enabled);
      if (autoRefreshEnabled) viewerDiagnostics.resetCircuit();
      const control = autoRefreshControl();
      if (control instanceof HTMLInputElement) {
        control.checked = autoRefreshEnabled;
      }
      scheduleNextAutoRefresh();
    }
    function setDropdownOpen(panel, button, open) {
      if (!panel) return;
      panel.hidden = !open;
      if (button instanceof HTMLElement) button.setAttribute("aria-expanded", open ? "true" : "false");
    }
    async function copyViewerDiagnostics() {
      const response = await fetch("/api/viewer-diagnostics?limit=50");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load viewer diagnostics.");
      const exportPayload = {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        current: window.logicsViewer?.diagnostics?.().state || {},
        ...data.payload
      };
      const copied = await copyTextToClipboard(JSON.stringify(exportPayload, null, 2));
      if (!copied) throw new Error("Clipboard access was refused.");
      setMeta(`Copied ${data.payload?.entries?.length || 0} viewer diagnostic entries.`);
    }
    function setRefreshMenuOpen(open) {
      setDropdownOpen(refreshMenuPanel(), refreshMenuButton(), open);
    }
    function renderSettingsIdentity(info, mcpState) {
      const rows = [
        ["Address", info?.address || window.location.origin],
        ["Mode", info?.mode || "unknown"],
        ["Transport", info?.transport || (window.location.protocol === "https:" ? "HTTPS" : "HTTP")],
        ["Version", info?.version ? `v${info.version}` : "unknown"],
        ["Project", info?.repoName || "unknown"],
        ["MCP connector", mcpState || "unknown"]
      ];
      return `<section class="viewer-settings-identity">
      <h3>This viewer</h3>
      <dl class="viewer-settings-identity__list">
        ${rows.map(([label, value]) => `<div class="viewer-settings-identity__row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join("")}
      </dl>
    </section>`;
    }
    function renderSettingsScreen(info, mcpState) {
      const vscode = Boolean(document.getElementById("viewer-vscode-section") && !document.getElementById("viewer-vscode-section").hidden);
      return `<div class="viewer-settings-screen">
      ${renderSettingsIdentity(info, mcpState)}
      <div class="viewer-settings-screen__grid">
        <!-- item_820: the Corpus menu was a top-level header entry holding three links, so
             it is gone and the links live here. item_737 had moved these three out of
             Settings, recording that they were "navigation dressed as settings" -- that
             reasoning still holds and is why these are links to the screens rather than the
             screens themselves. Settings is where something is changed; those are where
             something is read, and they stay screens of their own. Moving between them is
             still one click once inside, through the switcher they already carry. -->
        <section class="viewer-settings-card"><h3>This corpus</h3><p>Read what this project holds, and whether anything blocks.</p>
          <button class="btn viewer-settings-quiet" type="button" data-viewer-nav-target="corpus:getting-started">Getting Started</button>
          <button class="btn viewer-settings-quiet" type="button" data-viewer-nav-target="corpus:insights">Corpus insights</button>
          <button class="btn viewer-settings-quiet" type="button" data-viewer-nav-target="corpus:health">Validation health</button>
        </section>
        <section class="viewer-settings-card"><h3>Refresh</h3><label class="viewer-auto-refresh viewer-settings-toggle"><input type="checkbox" role="switch" aria-checked="${autoRefreshEnabled ? "true" : "false"}" data-viewer-settings-auto-refresh ${autoRefreshEnabled ? "checked" : ""} /><span>Automatic refresh</span><em class="viewer-settings-toggle__state">${autoRefreshEnabled ? "On" : "Off"}</em></label><label class="viewer-refresh-menu__interval"><span>Interval</span><select data-viewer-settings-interval aria-label="Automatic refresh interval"><option value="5">5 sec</option><option value="10">10 sec</option><option value="15">15 sec</option><option value="30">30 sec</option><option value="60">60 sec</option></select></label><button class="btn" type="button" data-viewer-settings-action="refresh">Refresh now</button><p class="viewer-settings-card__readout">${lastSuccessfulSyncAt ? `Last refreshed ${escapeHtml(new Date(lastSuccessfulSyncAt).toLocaleTimeString())}` : "Not refreshed yet this session"}</p></section>
        <section class="viewer-settings-card"><h3>ChatGPT Developer Mode</h3><label class="viewer-settings-toggle"><input type="checkbox" role="switch" aria-checked="${mcpState === "On" ? "true" : "false"}" data-viewer-settings-mcp ${mcpState === "On" ? "checked" : ""} /><span>Connector</span><em class="viewer-settings-toggle__state">${escapeHtml(mcpState)}</em></label><p>Starts a temporary HTTPS MCP connector. Nothing is exposed until this is on.</p><button class="btn viewer-settings-quiet" type="button" data-viewer-settings-action="mcp">${mcpState === "On" ? "Show URL and token" : "Open MCP controls"}</button></section>
        <section class="viewer-settings-card"><h3>Server</h3><button class="btn viewer-settings-quiet" type="button" data-viewer-settings-action="copy-diagnostics">Copy diagnostics</button>
          <button class="btn viewer-settings-danger" type="button" data-viewer-settings-action="restart">Restart viewer<small>Reconnects this page automatically</small></button>
          <button class="btn viewer-settings-danger viewer-settings-danger--destructive" type="button" data-viewer-settings-action="stop">Stop viewer<small>This page stops working until you restart it from a terminal</small></button>
        </section>
        ${vscode ? `<section class="viewer-settings-card"><h3>VS Code panel</h3><button class="btn" type="button" data-viewer-settings-action="vscode-reload">Reload</button><button class="btn viewer-settings-danger" type="button" data-viewer-settings-action="vscode-restart">Restart panel<small>Discards this panel's open screens</small></button><button class="btn" type="button" data-viewer-settings-action="vscode-external">Open externally</button></section>` : ""}
      </div>
    </div>`;
    }
    async function showSettings(options = {}) {
      const view = options.view || beginView();
      let info = null;
      try {
        const response = await fetch("/api/viewer-info");
        const data = await response.json();
        if (response.ok && data.ok) info = data.payload;
      } catch {
      }
      let mcpState = "unknown";
      try {
        const response = await fetch("/api/mcp-connector");
        const data = await response.json();
        if (response.ok && data.ok) mcpState = data.payload?.running ? "On" : "Off";
      } catch {
      }
      if (isViewStale(view)) return;
      setDocument("Settings", renderSettingsScreen(info, mcpState));
      const interval = document.querySelector("[data-viewer-settings-interval]");
      if (interval instanceof HTMLSelectElement) interval.value = String(Math.round(autoRefreshIntervalMs / 1e3));
      setMeta("Settings loaded.");
    }
    function renderMcpPrerequisiteRow(row) {
      const state = row.met ? "met" : row.actionable ? "next" : "waiting";
      const mark = row.met ? "\u2713" : row.actionable ? "\u2192" : "\xB7";
      let control = "";
      if (row.met && row.replaceable) {
        control = `<label class="viewer-settings-field"><span>Replace the key</span><input type="password" data-viewer-mcp-api-key autocomplete="off" /></label><button class="btn viewer-settings-quiet" type="button" data-viewer-mcp-action="save-key">${escapeHtml(row.action_label)}</button>`;
      }
      if (!row.met && row.actionable) {
        if (row.id === "api_key") {
          control = '<label class="viewer-settings-field"><span>Control-plane API key</span><input type="password" data-viewer-mcp-api-key autocomplete="off" /></label>';
        } else if (row.id === "profile") {
          control = '<label class="viewer-settings-field"><span>Tunnel ID from the console</span><input type="text" data-viewer-mcp-tunnel-id placeholder="tun_\u2026" autocomplete="off" /></label>';
        }
        control += row.url ? `<a class="btn" href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(row.action_label)}</a>` : `<button class="btn" type="button" data-viewer-mcp-action="${escapeHtml(row.action)}">${escapeHtml(row.action_label)}</button>`;
      }
      return `<li class="viewer-mcp-step viewer-mcp-step--${state}"><strong>${mark} ${escapeHtml(row.label)}</strong><br /><span class="viewer-settings-screen__hint">${escapeHtml(row.detail || "")}</span>${control}</li>`;
    }
    function renderMcpPrerequisites(prerequisites) {
      const rows = prerequisites && Array.isArray(prerequisites.rows) ? prerequisites.rows : [];
      if (!rows.length || rows.every((row) => row.met)) return "";
      return `<section class="viewer-settings-card"><h3>Getting ChatGPT connected</h3><p>${escapeHtml(prerequisites.message || "One step at a time, in this order.")}</p><ul class="viewer-settings-list">${rows.map(renderMcpPrerequisiteRow).join("")}</ul><button class="btn viewer-settings-quiet" type="button" data-viewer-mcp-action="prerequisites">Check again</button></section>`;
    }
    function renderMcpTransports(stdioCommand) {
      const command = String(stdioCommand || "logics-manager mcp serve");
      return `<section class="viewer-settings-card"><h3>Which transport your client needs</h3><ul class="viewer-settings-list"><li><strong>ChatGPT (developer mode)</strong> \u2014 OpenAI Secure MCP Tunnel<br /><span class="viewer-settings-screen__hint">Set up above. tunnel-client runs here, outbound only: nothing is published and the tunnel ID never changes.</span></li><li><strong>Claude Code, Claude Desktop, any client that launches the server itself</strong> \u2014 stdio<br /><span class="viewer-settings-screen__hint">No connector at all. Point the client at this command:</span><code class="viewer-mcp-url">${escapeHtml(command)}</code><button class="btn" type="button" data-viewer-mcp-copy="${escapeHtml(command)}" data-viewer-mcp-copy-kind="command">Copy command</button></li><li><strong>Hosted web clients other than ChatGPT</strong> \u2014 not supported yet</li></ul></section>`;
    }
    async function showChatgptMcp(options = {}) {
      const view = options.view || beginView();
      const response = await fetch("/api/mcp-connector");
      const data = await response.json().catch(() => ({}));
      const state = data.payload || {};
      const tunnel = state.mode !== "localtunnel";
      const ready = state.ready !== void 0 ? Boolean(state.ready) : Boolean(state.running && state.url);
      const token = String(state.token || "");
      let prerequisites = null;
      if (tunnel) {
        const probe = await fetch("/api/mcp-connector", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prerequisites" }) });
        const probed = await probe.json().catch(() => ({}));
        if (probe.ok && probed.ok) prerequisites = probed.payload;
      }
      if (isViewStale(view)) return;
      const blocked = Boolean(prerequisites && !prerequisites.ok);
      const setup = renderMcpPrerequisites(prerequisites);
      const headline = ready ? "Connector ON" : state.running ? "Connector starting" : "Connector OFF";
      const lede = ready ? tunnel ? "ChatGPT reaches this repository through OpenAI's Secure MCP Tunnel. Nothing is published, and there is nothing to paste." : "Copy the HTTPS /mcp URL and bearer token into ChatGPT developer mode. Stop it when you are done." : state.running ? "Starting the secure tunnel\u2026 the outcome will appear here." : blocked ? "One prerequisite is missing. Resolve it below and the connector will start." : "Nothing is exposed until you turn this connector on.";
      setDocument("ChatGPT Developer Mode", `<div class="viewer-settings-screen"><section class="viewer-settings-screen__hero"><p class="viewer-settings-screen__eyebrow">Per-project MCP connector</p><h2>${headline}</h2><p>${lede}</p></section>${setup}<section class="viewer-settings-card"><h3>ChatGPT connection</h3>${ready && state.url ? `<code class="viewer-mcp-url">${escapeHtml(state.url)}</code><button class="btn" type="button" data-viewer-mcp-copy="${escapeHtml(state.url)}">Copy URL</button>${token ? `<button class="btn" type="button" data-viewer-mcp-copy="${escapeHtml(token)}" data-viewer-mcp-copy-kind="token">Copy token</button>` : ""}` : ""}${state.error ? `<p class="viewer-settings-screen__error"><strong>${state.running ? "The connector is not carrying anything." : "The connector stopped."}</strong> ${escapeHtml(state.error)}</p>` : ""}${blocked ? "" : `<button class="btn" type="button" data-viewer-mcp-action="${state.running ? "stop" : "start"}">${state.running ? "Stop the connector" : "Start the connector"}</button>`}${state.running && !ready ? '<button class="btn" type="button" data-viewer-mcp-action="refresh">Refresh status</button>' : ""}</section>${renderMcpTransports(prerequisites && prerequisites.stdio_command)}</div>`, { eyebrow: "Settings / ChatGPT Developer Mode" });
      setMeta(ready ? "MCP connector ready." : state.running ? "MCP connector starting." : blocked ? "MCP connector is not ready to start." : "MCP connector is off.");
      if (state.running && !ready && !state.error) {
        setTimeout(() => {
          const panel = documentPanel();
          if (!panel || panel.hidden || documentTitle()?.textContent !== "ChatGPT Developer Mode") return;
          showChatgptMcp({ view: beginView({ silent: true }) });
        }, 1500);
      }
    }
    function bindRefreshMenuControls() {
      const button = refreshMenuButton();
      if (button) {
        button.onclick = (event) => {
          event.stopPropagation();
          withPrimaryAction("settings", "Opening settings", showSettings);
        };
      }
      const panel = refreshMenuPanel();
      if (panel) {
        panel.onclick = (event) => {
          event.stopPropagation();
        };
      }
    }
    function matchesViewerFilter(item) {
      return matchesFilterState(item, viewerState.viewerFilterState);
    }
    function applyViewerFilter(group, value) {
      if (!Object.prototype.hasOwnProperty.call(defaultFilterState, group)) {
        return;
      }
      viewerState.viewerFilterState = { ...viewerState.viewerFilterState, [group]: value || defaultFilterState[group] };
      window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
      persistViewerFilterState();
      updateFilterSummary();
      requestBoardRender();
    }
    function setFocusMenuOpen(open) {
      const menu = document.getElementById("focus-menu-options");
      const button = document.getElementById("focus-menu-toggle");
      if (menu) menu.hidden = !open;
      if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
    }
    function updateFocusMenuState() {
      const value = viewerState.viewerFilterState.focus || defaultFilterState.focus;
      const label = focusFilterLabel(value);
      const labelNode = document.getElementById("focus-menu-label");
      const button = document.getElementById("focus-menu-toggle");
      if (labelNode) labelNode.textContent = label;
      if (button) button.title = `Corpus focus: ${label}`;
      document.querySelectorAll("[data-viewer-focus-value]").forEach((node) => {
        if (node instanceof HTMLElement) {
          node.setAttribute("aria-checked", node.getAttribute("data-viewer-focus-value") === value ? "true" : "false");
        }
      });
    }
    function bindFocusMenuControls() {
      const button = document.getElementById("focus-menu-toggle");
      const menu = document.getElementById("focus-menu-options");
      if (button) {
        button.onclick = (event) => {
          event.stopPropagation();
          setFocusMenuOpen(Boolean(menu?.hidden));
        };
      }
      if (menu) {
        menu.onclick = (event) => {
          event.stopPropagation();
        };
      }
      document.querySelectorAll("[data-viewer-focus-value]").forEach((node) => {
        if (node instanceof HTMLElement) {
          node.onclick = () => {
            applyViewerFilter("focus", node.getAttribute("data-viewer-focus-value") || "");
            setFocusMenuOpen(false);
          };
        }
      });
    }
    function clearLocalPreset() {
      viewerState.viewerFilterState = { ...defaultFilterState };
      window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
      persistViewerFilterState();
      setControlValue("search-input", "", "input");
      updateFilterSummary();
      requestBoardRender();
    }
    window.__CDX_LOGICS_AFTER_RENDER__ = () => updateFilterSummary();
    function requestBoardRender() {
      if (typeof window.__CDX_LOGICS_RENDER__ === "function") {
        window.__CDX_LOGICS_RENDER__();
      }
    }
    function updateFilterSummary() {
      updateFocusMenuState();
      const activeLabels = Object.entries(viewerState.viewerFilterState).filter(([key, value]) => value !== defaultFilterState[key]).map(([key, value]) => `${key}: ${String(value).replace("-", " ")}`);
      const hasActiveFilters = activeLabels.length > 0;
      const filterButton = document.getElementById("filter-toggle");
      if (filterButton instanceof HTMLElement) {
        filterButton.setAttribute("data-viewer-filter-active", String(hasActiveFilters));
        filterButton.setAttribute("data-has-active-controls", String(hasActiveFilters));
        filterButton.classList.toggle("toolbar__filter--active", hasActiveFilters);
      }
      document.querySelectorAll("[data-viewer-filter-group]").forEach((control) => {
        if (control instanceof HTMLSelectElement) {
          const group = control.getAttribute("data-viewer-filter-group") || "";
          control.value = viewerState.viewerFilterState[group] || defaultFilterState[group] || "";
          return;
        }
        if (control instanceof HTMLElement) {
          const group = control.getAttribute("data-viewer-filter-group") || "";
          const value = control.getAttribute("data-viewer-filter-value") || "";
          control.setAttribute("aria-pressed", viewerState.viewerFilterState[group] === value ? "true" : "false");
        }
      });
      updateFilterOptionCounts({ items: latestItems, filterState: viewerState.viewerFilterState });
      const count = filterCount();
      if (!count) {
        return;
      }
      const visibleCount = typeof window.__CDX_LOGICS_VISIBLE_COUNT__ === "function" ? window.__CDX_LOGICS_VISIBLE_COUNT__() : latestItems.filter(matchesViewerFilter).length;
      const suffix = activeLabels.length > 0 ? ` \xB7 ${activeLabels.join(" \xB7 ")}` : " \xB7 All docs";
      const rendered = document.querySelectorAll(".card[data-id]").length;
      const paging = rendered && rendered < visibleCount ? ` \xB7 ${rendered} drawn so far, the rest load as you reach them` : "";
      count.textContent = `${visibleCount} of ${latestItems.length} docs match${paging}${suffix}`;
      const reset = document.getElementById("filter-reset");
      if (reset instanceof HTMLButtonElement) {
        reset.disabled = !hasActiveFilters;
        reset.title = hasActiveFilters ? "Clear every filter" : "No filter is set";
      }
    }
    function renderInsightBars(entries, total) {
      const denominator = Math.max(1, Number(total) || 0);
      if (!entries.length) {
        return '<li class="viewer-insights__bar-row">No corpus shape available</li>';
      }
      return entries.map(([label, value]) => {
        const count = Number(value) || 0;
        const width = Math.max(count > 0 ? 4 : 0, Math.min(100, Math.round(count / denominator * 100)));
        const stage = String(label || "").trim().toLowerCase();
        return `
        <li class="viewer-insights__bar-row" data-stage="${escapeHtml(stage)}">
          <div class="viewer-insights__bar-meta"><span>${escapeHtml(label)}</span><strong>${escapeHtml(count)}</strong></div>
          <div class="viewer-insights__bar-track" aria-hidden="true"><span style="width: ${width}%"></span></div>
        </li>
      `;
      }).join("");
    }
    function buildCorpusInsights(lintData = null, auditData = null) {
      const docs = latestItems;
      const itemPaths = new Set(docs.map((item) => item.relPath).filter(Boolean));
      const countsByStage = countBy(docs, (item) => item.stage);
      const closed = docs.filter(isClosed);
      const open = docs.filter((item) => !isClosed(item));
      const blocked = docs.filter((item) => statusValue(item).includes("blocked"));
      const missingStatus = docs.filter(hasMissingOrAmbiguousStatus);
      const recentlyModified = docs.filter((item) => isRecent(item, 7));
      const incompleteChains = docs.filter((item) => ["request", "backlog"].includes(item.stage) && !item.isPromoted && !isClosed(item));
      const unlinked = docs.filter((item) => (item.references || []).length === 0 && (item.usedBy || []).length === 0);
      const brokenRefs = [];
      const relationshipCounts = {};
      docs.forEach((item) => {
        relationshipCounts[item.stage] = (relationshipCounts[item.stage] || 0) + (item.references || []).length + (item.usedBy || []).length;
        (item.references || []).forEach((ref) => {
          if (ref.path && isSafeLogicsDocPath(ref.path) && !itemPaths.has(ref.path)) {
            brokenRefs.push(`${item.id} -> ${ref.path}`);
          }
        });
      });
      const mostReferenced = [...docs].sort((left, right) => (right.usedBy || []).length - (left.usedBy || []).length).filter((item) => (item.usedBy || []).length > 0).slice(0, 8);
      const recentRows = [...docs].sort((left, right) => (Date.parse(right.updatedAt || "") || 0) - (Date.parse(left.updatedAt || "") || 0)).slice(0, 8);
      const staleActive = open.filter(isStale).slice(0, 8);
      const qualityFindings = lintData && auditData ? collectHealthFindings(lintData, auditData) : [];
      const qualityBySource = countBy(qualityFindings, (finding) => finding.source || finding.code || "finding");
      const qualityByDocType = countBy(qualityFindings, (finding) => {
        const path = String(finding.path || "");
        const matched = docs.find((item) => item.relPath === path);
        return matched?.stage || (path ? "unknown document" : "repository");
      });
      const concentratedIssues = Object.entries(countBy(qualityFindings, (finding) => finding.path || "repository")).sort((left, right) => Number(right[1]) - Number(left[1])).slice(0, 8);
      const IN_FLIGHT_GRACE_DAYS = 14;
      const settledIntoDefect = (item) => !isRecent(item, IN_FLIGHT_GRACE_DAYS);
      const chainsInFlight = incompleteChains.filter((item) => !settledIntoDefect(item));
      const chainsOverdue = incompleteChains.filter(settledIntoDefect);
      const actions = [];
      if (blocked.length) {
        actions.push({ label: "Review blocked workflow docs", value: blocked.length, filter: { group: "focus", value: "blocked" } });
      }
      if (chainsOverdue.length) {
        actions.push({ label: `Promote or close chains untouched for ${IN_FLIGHT_GRACE_DAYS} days`, value: chainsOverdue.length, filter: { group: "focus", value: "needs-promotion" } });
      }
      if (brokenRefs.length) {
        actions.push({ label: "Repair broken references", value: brokenRefs.length, health: true });
      }
      if (qualityFindings.length) {
        actions.push({ label: "Open validation health", value: qualityFindings.length, health: true });
      }
      if (missingStatus.length) {
        actions.push({ label: "Normalize missing or ambiguous statuses", value: missingStatus.length, path: missingStatus[0]?.relPath || "" });
      }
      if (!actions.length) {
        actions.push({ label: "No immediate operator action detected", value: "OK" });
      }
      const stageRows = Object.entries(countsByStage).sort((left, right) => String(left[0]).localeCompare(String(right[0]))).map(([stage, count]) => [stage, count]);
      const qualityTotal = qualityFindings.length;
      const needsAttention = blocked.length + chainsOverdue.length + brokenRefs.length + missingStatus.length + qualityTotal;
      const activeQuiet = Math.max(0, open.length - recentlyModified.length - staleActive.length);
      const primaryState = needsAttention > 0 ? `${needsAttention} signals need attention` : "No immediate workflow risk detected";
      const insightsTone = qualityTotal > 0 ? "bad" : needsAttention > 0 ? "warn" : "ok";
      const insightsAction = qualityTotal > 0 ? { label: `Open Health (${qualityTotal} finding${qualityTotal === 1 ? "" : "s"})`, action: "health" } : null;
      return `
      <div class="viewer-insights">
        ${renderCorpusModeSwitcher("insights")}
        <section class="viewer-insights__hero viewer-insights__hero--${escapeHtml(insightsTone)}">
          <div>
            <h2>Overview</h2>
            <p>${escapeHtml(primaryState)} across ${escapeHtml(docs.length)} workflow docs.</p>
            ${insightsAction ? `<button class="btn viewer-insights__hero-action" type="button" data-viewer-onboarding-action="${escapeHtml(insightsAction.action)}">${escapeHtml(insightsAction.label)}</button>` : ""}
          </div>
          <div class="viewer-insights__summary viewer-insights__summary--strip">${renderMetricCards([
        // item_747/AC3: `Needs attention` is the sum of the signals reported below it,
        // so it is labelled as a total rather than sitting beside its own components as
        // if it were one more of them.
        ["Docs", docs.length],
        ["Needs attention (total)", needsAttention, needsAttention ? "warning" : "ok"],
        ["Recent 7d", recentlyModified.length],
        ["Quality findings", qualityTotal, qualityTotal ? "warning" : "ok"]
      ])}</div>
        </section>
        <section class="viewer-insights__section">
          <h2>Operator actions</h2>
          <ul class="viewer-insights__rows viewer-insights__rows--actions">${renderActionRows(actions)}</ul>
        </section>
        <div class="viewer-insights__workspace">
          <section class="viewer-insights__section">
            <h2>Corpus shape</h2>
            <h3 class="viewer-insights__subhead">By stage</h3>
            <ul class="viewer-insights__bars">${renderInsightBars(stageRows, docs.length)}</ul>
            <h3 class="viewer-insights__subhead">By state</h3>
            <ul class="viewer-insights__bars">${renderInsightBars([
        ["Open", open.length],
        ["Closed", closed.length],
        ["Blocked", blocked.length],
        ["Missing status", missingStatus.length]
      ], docs.length)}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Flow health</h2>
            <!-- item_747 split these rows by the rule that decides whether they are defects,
                 but left them in one list where only a tone told them apart. item_797 makes
                 the split structural: what needs a decision, then what is merely the shape of
                 work in progress -- dimmed, because reading it as a problem is the mistake
                 this grouping exists to prevent. -->
            <h3 class="viewer-insights__subhead">Needs a decision</h3>
            <ul class="viewer-insights__signals">${renderSignalRows([
        [`Chains untouched for ${IN_FLIGHT_GRACE_DAYS}+ days`, chainsOverdue.length, chainsOverdue.length ? "warning" : "ok"],
        ["Broken reference risks", brokenRefs.length, brokenRefs.length ? "warning" : "ok"]
      ])}</ul>
            <h3 class="viewer-insights__subhead viewer-insights__subhead--muted">Expected while work is in flight</h3>
            <ul class="viewer-insights__signals viewer-insights__signals--muted">${renderSignalRows([
        ["Chains in flight", chainsInFlight.length, "muted"],
        ["Orphan or unlinked docs", unlinked.length, "muted"]
      ])}</ul>
            <ul class="viewer-insights__rows">${renderDocRows(
        chainsOverdue.length ? chainsOverdue : chainsInFlight,
        chainsInFlight.length ? "No chains are overdue" : "No incomplete chains",
        6,
        chainsOverdue.length ? `untouched ${IN_FLIGHT_GRACE_DAYS}+ days` : "in flight"
      )}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Activity</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
        ["Recently active docs", recentlyModified.length],
        ["Stale active docs", staleActive.length, staleActive.length ? "warning" : "ok"],
        ["Quiet active docs", activeQuiet]
      ])}</ul>
            <ul class="viewer-insights__rows">${renderDocRows(recentRows, "No recent documents", 6, "recently active")}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Traceability</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
        ["Broken references", brokenRefs.length, brokenRefs.length ? "warning" : "ok"],
        ["Unlinked docs", unlinked.length, unlinked.length ? "muted" : "ok"],
        ["Most referenced docs", mostReferenced.map((item) => `${item.id} (${(item.usedBy || []).length})`).join(", ") || "None"],
        ["Relationships by type", Object.entries(relationshipCounts).map(([stage, count]) => `${stage} ${count}`).join(", ") || "None"]
      ])}</ul>
            <ul class="viewer-insights__rows">${renderPathRows(brokenRefs, "No broken references")}${renderDocRows(unlinked, "No unlinked documents")}</ul>
          </section>
          <section class="viewer-insights__section viewer-insights__section--wide">
            <h2>Quality signals</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
        ["Lint/audit categories", Object.entries(qualityBySource).map(([key, count]) => `${key} ${count}`).join(", ") || "No findings loaded", qualityTotal ? "warning" : "ok"],
        ["Findings by document type", Object.entries(qualityByDocType).map(([key, count]) => `${key} ${count}`).join(", ") || "No findings loaded"],
        ["Concentrated issues", concentratedIssues.map(([key, count]) => `${key} ${count}`).join(", ") || "None"]
      ])}</ul>
            <ul class="viewer-insights__rows">${renderPathRows(concentratedIssues.map(([key, count]) => `${key} (${count})`), "No concentrated issues")}</ul>
          </section>
        </div>
      </div>
    `;
    }
    function showScreenLoading(title, waitingFor) {
      setDocument(
        title,
        `<div class="viewer-screen-loading" data-viewer-screen-loading role="status" aria-live="polite">
        <p class="viewer-screen-loading__title">Working on ${escapeHtml(title)}</p>
        <p class="viewer-screen-loading__detail">Waiting for ${escapeHtml(waitingFor)}. On a corpus this size that takes a few seconds.</p>
        <p class="viewer-screen-loading__elapsed" data-viewer-screen-loading-elapsed>0.0s</p>
      </div>`
      );
      const elapsed = document.querySelector("[data-viewer-screen-loading-elapsed]");
      if (!(elapsed instanceof HTMLElement)) return;
      const startedAt = Date.now();
      screenLoadingTimer = window.setInterval(() => {
        if (!elapsed.isConnected) {
          stopScreenLoadingTimer();
          return;
        }
        elapsed.textContent = `${((Date.now() - startedAt) / 1e3).toFixed(1)}s`;
      }, 100);
    }
    function stopScreenLoadingTimer() {
      if (screenLoadingTimer === null) return;
      window.clearInterval(screenLoadingTimer);
      screenLoadingTimer = null;
    }
    const screenAnswers = /* @__PURE__ */ new Map();
    function rememberScreenAnswer(title, html) {
      screenAnswers.set(title, { projectId: activeProjectId, html });
    }
    function recallScreenAnswer(title) {
      const entry = screenAnswers.get(title);
      if (!entry || entry.projectId !== activeProjectId) return "";
      return entry.html;
    }
    function withFreshness(html, stale) {
      const note = stale ? '<p class="viewer-screen-freshness viewer-screen-freshness--stale">Showing the previous answer while the corpus is rechecked.</p>' : '<p class="viewer-screen-freshness">Checked just now.</p>';
      return note + html;
    }
    function showKeptAnswerOrLoading(title, waitingFor) {
      const previous = recallScreenAnswer(title);
      if (previous) {
        setDocument(title, withFreshness(previous, true));
        return;
      }
      showScreenLoading(title, waitingFor);
    }
    async function showCorpusInsights(options = {}) {
      if (!options.view) showKeptAnswerOrLoading("Corpus insights", "the corpus lint and audit scans");
      const view = options.view || beginView();
      try {
        const [lintResponse, auditResponse] = await Promise.all([
          fetch("/api/lint", { signal: view.signal }),
          fetch("/api/audit", { signal: view.signal })
        ]);
        const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
        if (isViewStale(view)) {
          return;
        }
        const insightsHtml = buildCorpusInsights(lintData, auditData);
        rememberScreenAnswer("Corpus insights", insightsHtml);
        setDocument("Corpus insights", withFreshness(insightsHtml, false));
        setMeta("Corpus insights loaded.");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
    }
    async function showDocument(item, view) {
      if (!item || !item.relPath) {
        return;
      }
      const tracked = view || beginView();
      try {
        const response = await fetch(`/api/doc?path=${encodeURIComponent(item.relPath)}`, { signal: tracked.signal });
        const data = await response.json();
        if (isViewStale(tracked)) {
          return;
        }
        if (!response.ok || !data.ok) {
          setMeta(data.error || "Unable to read document.");
          return;
        }
        const api = markdownApi();
        let markdown = data.document.content || "";
        const docPath = data.document.path || item.relPath;
        const documentItem = documentItemWithIndicators(item, markdown, docPath);
        if (api && typeof api.stripLeadingDocumentFrontMatter === "function") {
          markdown = api.stripLeadingDocumentFrontMatter(markdown, item);
        }
        const bodyHtml = api && typeof api.renderMarkdownToHtml === "function" ? api.renderMarkdownToHtml(markdown) : `<pre>${escapeHtml(markdown)}</pre>`;
        const roadmapHtml = item.stage === "roadmap" ? renderRoadmapMilestones(markdown) : "";
        let chainHtml = "";
        if (["request", "backlog", "task"].includes(item.stage)) {
          try {
            const graphResponse = await fetch(`/api/chain-graph?ref=${encodeURIComponent(item.id || item.relPath)}`, { signal: tracked.signal });
            const graphData = await graphResponse?.json?.().catch(() => ({}));
            if (!isViewStale(tracked) && graphResponse?.ok && graphData?.ok) {
              window.__logicsGraphNodeClick = (nodeRef) => showDocumentByPath(nodeRef);
              chainHtml = renderChainGraph(graphData.payload, { inline: true, open: true });
            }
          } catch {
          }
        }
        const html = `${renderDocumentMeta(documentItem)}${chainHtml}${roadmapHtml}${bodyHtml}`;
        const objectName = String(item.title || "").trim() || docPath;
        const reference = shortDocumentRef(item.id, item.stage) || String(item.id || "").trim();
        const documentStatus = String(item.indicators?.Status || "").trim();
        const eyebrowText = [reference, documentStatus].filter(Boolean).join(" \u2022 ") || docPath;
        setDocument(objectName, html, {
          item: documentItem,
          badgeStage: item.stage,
          eyebrow: eyebrowText,
          path: docPath
        });
        setMeta("Document loaded.");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
    }
    async function showDocumentByPath(relPath, view) {
      const item = findItemByPath(relPath) || findFocusItem(relPath) || { relPath, title: relPath, id: relPath };
      await showDocument(item, view);
    }
    async function editDocument(item) {
      if (!item || !item.relPath) {
        setMeta("Select a document to edit.");
        return;
      }
      if (embeddedHost !== "vscode") {
        await openDocEditorScreen(item);
        return;
      }
      setMeta("Opening document in system editor...");
      const response = await fetch(`/api/edit?path=${encodeURIComponent(item.relPath)}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 404 && data.error === "Not found") {
          throw new Error("Edit endpoint unavailable. Restart the local viewer so it loads the current logics-manager code.");
        }
        throw new Error(data.error || "Unable to open document editor.");
      }
      setMeta(`Opened ${data.document.path} in system editor.`);
    }
    let activeEditSession = null;
    async function openDocEditorScreen(item) {
      setMeta("Opening editor...");
      const response = await fetch(`/api/doc?path=${encodeURIComponent(item.relPath)}`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load document for editing.");
      }
      const content = String(data.document?.content || "");
      const label = item.id || item.relPath;
      activeEditSession = { item, originalContent: content };
      const panelTitle = String(item.title || "").trim() || item.relPath;
      const reference = shortDocumentRef(item.id, item.stage) || String(item.id || "").trim();
      const documentStatus = String(item.indicators?.Status || "").trim();
      const eyebrowText = [reference, documentStatus].filter(Boolean).join(" \u2022 ") || item.relPath;
      setDocument(`Edit ${panelTitle}`, renderDocEditorScreen({ content }), { eyebrow: eyebrowText });
      setMeta(`Editing ${label}.`);
      window.setTimeout(() => {
        const textarea = documentContent()?.querySelector(".viewer-doc-editor__textarea");
        if (textarea instanceof HTMLTextAreaElement) textarea.focus();
      }, 0);
    }
    async function cancelDocEditorScreen() {
      const session = activeEditSession;
      activeEditSession = null;
      if (!session) return;
      await showDocumentByPath(session.item.relPath);
      setMeta("Edit cancelled.");
    }
    async function saveDocEditorScreen() {
      const session = activeEditSession;
      if (!session) return;
      const textarea = documentContent()?.querySelector(".viewer-doc-editor__textarea");
      const content = textarea instanceof HTMLTextAreaElement ? textarea.value : session.originalContent;
      const label = session.item.id || session.item.relPath;
      const response = await viewerFetch("/api/save-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: session.item.relPath, content })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to save the document.");
      }
      activeEditSession = null;
      const savedPath = data.payload?.path || session.item.relPath;
      if (data.payload?.changed === false) {
        await showDocumentByPath(savedPath);
        setMeta(`${label} was already saved.`);
        return;
      }
      await loadItems("POST", { force: true });
      await showDocumentByPath(savedPath);
      const requested = await showCommitOfferModal({
        message: `Commit the saved change to ${label}?`,
        defaultMessage: `${label}: edited`
      });
      if (!requested.commit) {
        setMeta(`Saved ${label}.`);
        return;
      }
      try {
        const payload = await commitFiles([savedPath], requested.message || `${label}: edited`);
        setMeta(`Saved ${label}. Committed${payload?.shortHash ? `: ${payload.shortHash}` : "."}`);
      } catch (err) {
        setMeta(`Saved ${label}. Commit failed: ${err?.message || "unknown error"}.`);
      }
    }
    async function commitFiles(files, message) {
      const response = await fetch("/api/git-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, message })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.payload?.message || "Git commit failed.");
      }
      recordGitActivity("Commit", `Created commit ${data.payload?.shortHash || ""}`.trim());
      return data.payload;
    }
    async function changeCurrentDocumentStatus() {
      const item = currentDocumentItem;
      if (!item || !item.relPath) {
        setMeta("Open a Logics document before changing status.");
        return;
      }
      const options = statusOptionsByStage[item.stage] || [];
      if (!options.length) {
        setMeta("Status changes are not available for this document type.");
        return;
      }
      const currentStatus = String(item?.indicators?.Status || item?.status || "").trim();
      const label = item.id || item.relPath;
      const requested = await showStatusChangeModal({
        title: "Change status",
        message: currentStatus ? `${label} is currently ${currentStatus}.` : `Choose a status for ${label}.`,
        options,
        value: currentStatus || options[0],
        previewLabel: label,
        submitLabel: "Update status",
        defaultCommitMessage: (status) => `${label}: status -> ${status}`
      });
      if (requested === null) {
        return;
      }
      const normalized = options.find((status) => status.toLowerCase() === requested.status.trim().toLowerCase());
      if (!normalized) {
        setMeta(`Unsupported status. Allowed: ${options.join(", ")}.`);
        return;
      }
      if (normalized === currentStatus) {
        setMeta(`${label} is already ${normalized}.`);
        return;
      }
      const response = await viewerFetch("/api/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: item.relPath, status: normalized })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to update status.");
      }
      await loadItems("POST", { force: true });
      const changedPath = data.payload?.path || item.relPath;
      await showDocumentByPath(changedPath);
      const wasNoOp = data.payload?.changed === false;
      const applied = wasNoOp ? `${label} was already ${normalized}.` : `Updated ${label} to ${normalized}.`;
      if (!requested.commit || wasNoOp) {
        setMeta(applied);
        return;
      }
      try {
        const commitMessage = requested.message || `${label}: status -> ${normalized}`;
        const payload = await commitFiles([changedPath], commitMessage);
        setMeta(`${applied} Committed${payload?.shortHash ? `: ${payload.shortHash}` : "."}`);
      } catch (err) {
        setMeta(`${applied} Commit failed: ${err?.message || "unknown error"}.`);
      }
    }
    async function showHealth(options = {}) {
      if (!options.view) showKeptAnswerOrLoading("Validation health", "the corpus lint, audit and workflow health reports");
      const view = options.view || beginView();
      setMeta("Checking health...");
      try {
        const [lintResponse, auditResponse, healthResponse] = await Promise.all([
          fetch("/api/lint", { signal: view.signal }),
          fetch("/api/audit", { signal: view.signal }),
          // Workflow health is a separate report: a failure here must not blank
          // the screen, so it degrades to an "unavailable" note instead.
          fetch("/api/health", { signal: view.signal }).catch(() => null)
        ]);
        const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
        const healthData = healthResponse ? await healthResponse.json().catch(() => ({ ok: false, error: "unreadable response" })) : { ok: false, error: "unreachable" };
        if (isViewStale(view)) {
          return;
        }
        const healthHtml = renderHealthSummary(
          lintData,
          auditData,
          healthData,
          new Set(latestItems.map((item) => item.relPath).filter(Boolean))
        );
        rememberScreenAnswer("Validation health", healthHtml);
        setDocument("Validation health", withFreshness(healthHtml, false));
        setMeta("Health loaded.");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
    }
    async function requestFixes(preview) {
      const response = await fetch("/api/apply-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: Boolean(preview) })
      });
      const payload = await response.json().catch(() => ({ ok: false }));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error || "Unable to apply fixes.");
      }
      return payload;
    }
    async function applyFixes() {
      setMeta("Checking what can be repaired...");
      const preview = await requestFixes(true);
      const files = Array.isArray(preview?.audit?.autofix?.modified_files) ? preview.audit.autofix.modified_files : [];
      if (!files.length) {
        setMeta("No findings can be repaired automatically.");
        await showThemedMessageModal({
          title: "Nothing to apply",
          message: "No finding on this screen can be repaired automatically. The rest need a decision."
        });
        return;
      }
      const shown = files.slice(0, 20);
      const confirmed = await showThemedConfirmModal({
        title: `Apply fixes to ${files.length} document${files.length === 1 ? "" : "s"}?`,
        message: `These documents would be edited:

${shown.join("\n")}${files.length > shown.length ? `
... and ${files.length - shown.length} more` : ""}`,
        submitLabel: `Apply to ${files.length}`,
        cancelLabel: "Cancel"
      });
      if (!confirmed) {
        setMeta("Fixes not applied.");
        return;
      }
      setMeta("Applying fixes...");
      const applied = await requestFixes(false);
      const changed = Array.isArray(applied?.audit?.autofix?.modified_files) ? applied.audit.autofix.modified_files.length : 0;
      setMeta(`Fixes applied to ${changed} document${changed === 1 ? "" : "s"}.`);
      await showHealth();
    }
    async function showWorkspace(options = {}) {
      if (!document.querySelector("[data-viewer-workshop-explorer]")) {
        return showWorkshop({ tab: "explorer", silent: Boolean(options.silent) });
      }
      await loadWorkshopExplorer({ silent: Boolean(options.silent), view: options.view });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        requestAnimationFrame(repaintAllWorkshopTerminals);
        resumeActiveWorkshopTerminalStream();
      }
    });
    window.addEventListener("focus", () => {
      requestAnimationFrame(repaintAllWorkshopTerminals);
      resumeActiveWorkshopTerminalStream();
    });
    window.addEventListener("resize", () => {
      if (workshopState.workshopTerminalResizeTimer) clearTimeout(workshopState.workshopTerminalResizeTimer);
      workshopState.workshopTerminalResizeTimer = setTimeout(() => {
        workshopState.workshopTerminalResizeTimer = null;
        refitAllWorkshopTerminals();
      }, 80);
    });
    window.logicsViewer = window.logicsViewer || {};
    window.logicsViewer.launchTerminal = (command, label) => spawnWorkshopTerminal({ command, label });
    async function openWorkspaceTree(path) {
      if (!document.querySelector("[data-viewer-workshop-explorer]")) return;
      const [tree, preview] = await Promise.all([fetchWorkspaceTree(path), fetchWorkspacePreview(path)]);
      const container = document.querySelector("[data-viewer-workshop-explorer]");
      if (container instanceof HTMLElement) {
        window.__logicsWorkspaceMarkdownMode = String(viewerState.viewerPreferences.workspaceMarkdownMode || "");
        container.innerHTML = renderWorkspace(tree, preview);
        latestWorkspaceTreePayload = tree;
        latestWorkspacePreviewPayload = preview;
      }
      setMeta(path ? `Explorer folder ${path}` : "Explorer root.");
    }
    let latestWorkspaceTreePayload = null;
    let latestWorkspacePreviewPayload = null;
    function updateWorkspaceSelection(path) {
      document.querySelectorAll("[data-viewer-workspace-preview]").forEach((node) => {
        if (node instanceof HTMLElement) {
          const selected = node.getAttribute("data-viewer-workspace-preview") === path;
          node.classList.toggle("is-selected", selected);
          if (selected) {
            node.setAttribute("aria-current", "true");
          } else {
            node.removeAttribute("aria-current");
          }
        }
      });
    }
    function updateWorkspacePreviewPane(preview) {
      latestWorkspacePreviewPayload = preview;
      const pane = document.querySelector(".viewer-workspace__preview");
      if (pane instanceof HTMLElement) {
        window.__logicsWorkspaceMarkdownMode = String(viewerState.viewerPreferences.workspaceMarkdownMode || "");
        pane.innerHTML = renderWorkspacePreview(preview);
        pane.scrollTop = 0;
      }
    }
    async function openWorkspacePreview(path, { full = false } = {}) {
      if (!document.querySelector("[data-viewer-workshop-explorer]")) return;
      const treePath = workspaceParentPath(path);
      const currentTreePath = String(latestWorkspaceTreePayload?.path || "");
      if (latestWorkspaceTreePayload && currentTreePath === treePath) {
        const preview2 = await fetchWorkspacePreview(path, { full });
        updateWorkspaceSelection(path);
        updateWorkspacePreviewPane(preview2);
        setMeta(full ? `Loaded full preview of ${path}.` : `Previewing ${path || "workspace root"}.`);
        return;
      }
      const [tree, preview] = await Promise.all([fetchWorkspaceTree(treePath), fetchWorkspacePreview(path, { full })]);
      const container = document.querySelector("[data-viewer-workshop-explorer]");
      if (container instanceof HTMLElement) {
        window.__logicsWorkspaceMarkdownMode = String(viewerState.viewerPreferences.workspaceMarkdownMode || "");
        container.innerHTML = renderWorkspace(tree, preview);
        latestWorkspaceTreePayload = tree;
        latestWorkspacePreviewPayload = preview;
      }
      setMeta(full ? `Loaded full preview of ${path}.` : `Previewing ${path || "workspace root"}.`);
    }
    async function showCiStatus(options = {}) {
      gitState.latestCiScreenMode = "runs";
      if (!isCapabilityAvailable("ci")) {
        const message = capabilityMessage("ci", "CI is not available for this project.");
        setDocument("Remote", renderCiStatus({ visible: false, state: capability("ci").state, message }));
        setMeta(message);
        return;
      }
      if (!options.silent) {
        setMeta("Checking CI status...");
      }
      const view = options.view || beginView({ silent: Boolean(options.silent) });
      let response;
      let data = {};
      try {
        response = await fetch("/api/ci-status", { signal: view.signal });
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
      if (isViewStale(view)) {
        return;
      }
      if (response.status === 404) {
        setDocument("Remote", renderCiStatus({
          visible: true,
          state: "unavailable",
          badgeState: "unavailable",
          message: "CI status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
        }));
        setMeta("Restart the local viewer to enable CI status.");
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load CI status.");
      }
      const nextCiSignature = runtimeStatusSignature(data.payload);
      if (options.skipUnchanged && !options.force && latestCiStatusSignature && nextCiSignature === latestCiStatusSignature) {
        updateMainCiBadge(data.payload);
        if (!options.silent) {
          setMeta(`Checked CI status just now \xB7 no changes (${(/* @__PURE__ */ new Date()).toLocaleTimeString()})`);
        }
        return;
      }
      latestCiStatusSignature = nextCiSignature;
      updateMainCiBadge(data.payload);
      refreshActivityFeedForCi();
      setDocument("Remote", renderCiStatus(data.payload));
      setMeta(options.silent ? "CI status refreshed." : "CI status loaded.");
    }
    window.acquireVsCodeApi = function acquireVsCodeApi() {
      return {
        postMessage(message) {
          if (!message || typeof message.type !== "string") {
            return;
          }
          if (message.type === "ready") {
            void hydrateViewerPreferencesFromServer();
            loadItems().then(() => startViewerEvents()).catch((error) => setMeta(error.message));
            return;
          }
          if (message.type === "refresh") {
            refreshViewer("POST", { force: Boolean(message.force) }).catch((error) => setMeta(error.message));
            return;
          }
          if (message.type === "bootstrap-logics") {
            bootstrapLogicsProject().catch((error) => setMeta(error.message));
            return;
          }
          if (message.type === "new-request" || message.type === "new-request-guided") {
            const draft = message.draft || {};
            const action = message.type === "new-request-guided" && draft ? createNewRequest(draft) : startNewRequest();
            action.catch((error) => setMeta(error.message));
            return;
          }
          if (message.type === "open" || message.type === "read") {
            const item = latestItems.find((entry) => entry.id === message.id);
            showDocument(item).catch((error) => setMeta(error.message));
            return;
          }
          setMeta("This action is read-only in the local viewer. Use the CLI for workflow changes.");
        },
        getState() {
          return readStoredState();
        },
        setState(value) {
          const nextState = value && typeof value === "object" ? { ...value } : null;
          if (nextState) {
            nextState.viewerFilterState = sanitizeViewerFilterState(nextState.viewerFilterState || viewerState.viewerFilterState);
          }
          writeStoredState(nextState);
        }
      };
    };
    window.addEventListener("load", () => {
      hydrateViewerFilterState();
      bindWorkshopSystemTerminalControls();
      window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
      setControlValue("hide-complete", true, "change");
      setControlValue("hide-processed-requests", true, "change");
      setControlValue("hide-spec", false, "change");
      setControlValue("show-companion-docs", true, "change");
      setControlValue("hide-empty-columns", true, "change");
      applyLocalViewerChrome();
      [document.getElementById("viewer-insights")].forEach((button) => {
        button?.addEventListener("click", () => {
          setRefreshMenuOpen(false);
          withPrimaryAction("insights", "Loading insights", showCorpusInsights);
        });
      });
      document.querySelectorAll('#viewer-getting-started, [data-action="getting-started"]').forEach((button) => {
        button.addEventListener("click", () => {
          setRefreshMenuOpen(false);
          showGettingStarted();
        });
      });
      document.getElementById("viewer-restart-server")?.addEventListener("click", () => {
        setRefreshMenuOpen(false);
        withPrimaryAction("restart-viewer", "Restarting server", restartViewerServer);
      });
      document.getElementById("viewer-copy-diagnostics")?.addEventListener("click", () => {
        setRefreshMenuOpen(false);
        withPrimaryAction("copy-viewer-diagnostics", "Copying diagnostics", copyViewerDiagnostics);
      });
      document.getElementById("viewer-stop-server")?.addEventListener("click", () => {
        setRefreshMenuOpen(false);
        withPrimaryAction("stop-viewer", "Stopping server", stopViewerServer);
      });
      bootstrapLogicsButton()?.addEventListener("click", () => {
        setRefreshMenuOpen(false);
        confirmBootstrapLogics().catch((error) => setMeta(error?.message || "Unable to bootstrap Logics."));
      });
      document.getElementById("viewer-environment-warning-action")?.addEventListener("click", () => {
        confirmBootstrapLogics().catch((error) => setMeta(error?.message || "Unable to bootstrap Logics."));
      });
      const autoControl = autoRefreshControl();
      if (autoControl instanceof HTMLInputElement) {
        autoControl.addEventListener("change", () => {
          setAutoRefreshEnabled(autoControl.checked);
        });
        setAutoRefreshEnabled(autoControl.checked);
      }
      const intervalControl = refreshIntervalControl();
      if (intervalControl instanceof HTMLSelectElement) {
        updateRefreshIntervalControl();
        intervalControl.addEventListener("change", () => {
          setAutoRefreshIntervalSeconds(intervalControl.value, { user: true });
        });
      }
      bindRefreshMenuControls();
      bindFocusMenuControls();
      bindFleetFilter();
      document.addEventListener("click", (event) => {
        const target = event.target;
        const button = refreshMenuButton();
        const panel = refreshMenuPanel();
        const focusButton = document.getElementById("focus-menu-toggle");
        const focusPanel = document.getElementById("focus-menu-options");
        const gitActions = document.getElementById("viewer-git-actions");
        try {
          if (target && (button?.contains(target) || panel?.contains(target))) {
            return;
          }
          if (!(target && (focusButton?.contains(target) || focusPanel?.contains(target)))) {
            setFocusMenuOpen(false);
          }
          if (!(target && gitActions?.contains(target))) {
            setGitActionsMenuOpen(false);
          }
        } catch {
        }
        setRefreshMenuOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          setRefreshMenuOpen(false);
          setFocusMenuOpen(false);
          setGitActionsMenuOpen(false);
          closeNavMenus();
          setProjectMenuOpen(false);
        }
      });
      document.querySelectorAll('[data-action="refresh"]').forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        element.addEventListener("click", (event) => {
          setRefreshMenuOpen(false);
          withPrimaryAction("refresh", "Refreshing", () => refreshViewer("POST", { force: Boolean(event.shiftKey) }));
        });
      });
      document.getElementById("viewer-health")?.addEventListener("click", () => {
        setRefreshMenuOpen(false);
        withPrimaryAction("health", "Checking health", showHealth);
      });
      document.addEventListener("change", (event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.matches("[data-viewer-settings-auto-refresh]")) {
          setAutoRefreshEnabled(target.checked);
        }
        if (target instanceof HTMLSelectElement && target.matches("[data-viewer-settings-interval]")) {
          setAutoRefreshIntervalSeconds(target.value, { user: true });
        }
        if (target instanceof HTMLInputElement && target.matches("[data-viewer-settings-mcp]")) {
          const wanted = target.checked;
          const value = wanted ? "start" : "stop";
          withPrimaryAction(`mcp-${value}`, wanted ? "Starting connector" : "Stopping connector", async () => {
            const response = await fetch("/api/mcp-connector", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: value })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) {
              target.checked = !wanted;
              throw new Error(data.error || `Unable to ${value} the MCP connector.`);
            }
            await showSettings();
          });
        }
      });
      document.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target.closest("[data-viewer-settings-action]") : null;
        if (!(target instanceof HTMLElement)) return;
        event.preventDefault();
        const action = target.dataset.viewerSettingsAction;
        if (action === "refresh") withPrimaryAction("settings-refresh", "Refreshing", () => refreshViewer("POST", { force: true }));
        if (action === "mcp") withPrimaryAction("settings-mcp", "Loading MCP controls", showChatgptMcp);
        if (action === "copy-diagnostics") withPrimaryAction("settings-diagnostics", "Copying diagnostics", copyViewerDiagnostics);
        if (action === "restart") withPrimaryAction("settings-restart", "Restarting server", restartViewerServer);
        if (action === "stop") withPrimaryAction("settings-stop", "Stopping server", stopViewerServer);
        if (action === "vscode-reload") document.getElementById("viewer-vscode-reload")?.click();
        if (action === "vscode-restart") document.getElementById("viewer-vscode-restart")?.click();
        if (action === "vscode-external") document.getElementById("viewer-vscode-open-external")?.click();
      });
      document.addEventListener("click", (event) => {
        const copy = event.target instanceof Element ? event.target.closest("[data-viewer-mcp-copy]") : null;
        if (copy instanceof HTMLElement) copyTextToClipboard(copy.dataset.viewerMcpCopy || "").then((ok) => setMeta(ok ? `MCP ${copy.dataset.viewerMcpCopyKind === "token" ? "token" : "URL"} copied.` : "Clipboard access was refused."));
        const action = event.target instanceof Element ? event.target.closest("[data-viewer-mcp-action]") : null;
        if (!(action instanceof HTMLElement)) return;
        const value = action.dataset.viewerMcpAction;
        if (value === "refresh") return void showChatgptMcp();
        const labels = { stop: "Stopping connector", install: "Installing tunnel-client", "init-profile": "Creating the tunnel profile", "save-key": "Saving the API key", prerequisites: "Checking prerequisites" };
        const field = (selector) => {
          const node = documentContent()?.querySelector(selector);
          return node instanceof HTMLInputElement ? node.value.trim() : "";
        };
        const body = { action: value };
        if (value === "init-profile") {
          const tunnelId = field("[data-viewer-mcp-tunnel-id]");
          if (!tunnelId) return void setMeta("Paste the tunnel ID from the console first.");
          body.tunnel_id = tunnelId;
        }
        if (value === "save-key") {
          const apiKey = field("[data-viewer-mcp-api-key]");
          if (!apiKey) return void setMeta("Enter the control-plane API key first.");
          body.api_key = apiKey;
        }
        withPrimaryAction(`mcp-${value}`, labels[value] || "Starting connector", async () => {
          const response = await fetch("/api/mcp-connector", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) throw new Error(data.error || `Unable to ${value} the MCP connector.`);
          if (data.payload && data.payload.ok === false) throw new Error(data.payload.message || `Unable to ${value}.`);
          await showChatgptMcp();
        });
      });
      document.addEventListener("toggle", (event) => {
        const current = event.target instanceof Element ? event.target.closest("#viewer-refresh-menu details.viewer-settings-menu__section") : null;
        if (!(current instanceof HTMLDetailsElement) || !current.open) return;
        document.querySelectorAll("#viewer-refresh-menu details.viewer-settings-menu__section[open]").forEach((section) => {
          if (section !== current && section instanceof HTMLDetailsElement) section.open = false;
        });
      }, true);
      document.getElementById("viewer-action-error-dismiss")?.addEventListener("click", () => clearActionFailure());
      document.getElementById("viewer-lan-banner-copy")?.addEventListener("click", async () => {
        const share = latestLanShareUrl;
        if (!share) return;
        const ok = await copyTextToClipboard(share);
        if (ok) {
          setMeta("LAN share URL copied to the clipboard.");
        } else {
          setMeta(`Copy failed \u2014 long-press to select: ${share}`);
        }
      });
      const workshopSlot = document.querySelector('[data-viewer-nav="workshop"] [data-project-tools-separator]');
      if (workshopSlot instanceof HTMLElement && workshopSlot.dataset.menuBuilt !== "1") {
        workshopSlot.dataset.menuBuilt = "1";
        workshopSlot.insertAdjacentHTML("beforebegin", renderWorkshopMenuItems());
      }
      ["viewer-workshop", "viewer-corpus", "viewer-ci", "viewer-cdx"].forEach((id) => {
        const button = document.getElementById(id);
        if (!(button instanceof HTMLElement) || button.dataset.navBound === "1") return;
        button.dataset.navBound = "1";
        button.addEventListener("click", () => {
          const wrapper = button.closest(".viewer-nav-menu");
          if (!(wrapper instanceof HTMLElement)) return;
          setNavMenuOpen(wrapper, !wrapper.classList.contains("is-open"));
        });
      });
      repoPill()?.addEventListener("click", () => {
        const menu = projectMenu();
        setProjectMenuOpen(Boolean(menu?.hidden));
      });
      repoFolderButton()?.addEventListener("click", () => {
        withPrimaryAction("open-repo-folder", "Opening repository folder", openRepositoryFolder);
      });
      activityClearControl()?.addEventListener("click", () => {
        clearActivityHistory();
      });
      document.querySelectorAll("[data-viewer-surface]").forEach((node) => {
        if (node instanceof HTMLElement) {
          node.addEventListener("click", () => setViewerSurface(node.getAttribute("data-viewer-surface") || "project"));
        }
      });
      document.querySelectorAll("[data-viewer-filter-group]").forEach((element) => {
        if (element instanceof HTMLSelectElement) {
          element.addEventListener("change", () => {
            applyViewerFilter(element.getAttribute("data-viewer-filter-group") || "", element.value || "");
          });
          return;
        }
        if (!(element instanceof HTMLElement)) {
          return;
        }
        element.addEventListener("click", () => {
          applyViewerFilter(element.getAttribute("data-viewer-filter-group") || "", element.getAttribute("data-viewer-filter-value") || "");
        });
      });
      document.getElementById("viewer-environment-warning-dismiss")?.addEventListener("click", () => {
        if (latestEnvironmentWarning) dismissEnvironmentWarning(latestEnvironmentWarning);
      });
      document.getElementById("viewer-update-dismiss")?.addEventListener("click", () => {
        dismissUpdateWarning(latestUpdateInfo?.shadowingExecutables);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const panel = documentPanel();
        if (!panel || panel.hidden) return;
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("[data-viewer-workshop-terminal-stage], input, textarea, select")) {
          return;
        }
        event.preventDefault();
        closeDocumentPanel();
      });
      document.getElementById("filter-reset")?.addEventListener("click", () => {
        clearLocalPreset();
      });
      const editButton = editDocumentButton();
      if (editButton instanceof HTMLElement) {
        editButton.addEventListener("click", () => {
          withPrimaryAction("edit-document", "Opening document", () => editDocument(selectedItem()));
        });
      }
      document.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target.closest("[data-viewer-editor-action]") : null;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.viewerEditorAction;
        if (action === "cancel") withPrimaryAction("doc-editor-cancel", "Cancelling", cancelDocEditorScreen);
        if (action === "save") withPrimaryAction("doc-editor-save", "Saving", saveDocEditorScreen);
      });
      setupProjectToolInteractions(setDocument, setMeta);
      document.addEventListener("change", (event) => {
        const sessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session]") : null;
        const cdxSessionConfigInputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-input]") : null;
        const cdxInputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-input]") : null;
        const cdxRunModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-mode]") : null;
        const cdxPromptTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-prompt]") : null;
        const cdxColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-column]") : null;
        const cdxRunColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-column]") : null;
        const cdxRunSessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-session]") : null;
        const cdxHistoryColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-column]") : null;
        const cdxHistorySessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-session]") : null;
        const cdxProviderTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider]") : null;
        if (cdxPromptTarget instanceof HTMLTextAreaElement) {
          cdxState.latestCdxMissionState.promptOverride = cdxPromptTarget.value || "";
          return;
        }
        if (cdxSessionConfigInputTarget instanceof HTMLElement) {
          updateCdxSessionConfigFromModal(cdxSessionConfigInputTarget.closest("[data-viewer-cdx-session-config-modal]"));
          return;
        }
        if (cdxRunModeTarget instanceof HTMLSelectElement) {
          cdxState.latestCdxMissionState.runMode = cdxRunModeTarget.value === "terminal" ? "terminal" : "background";
          setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload, cdxState.latestCdxMissionState.planPayload, cdxState.latestCdxMissionState.runPayload, cdxState.latestCdxMissionState.applyPayload));
          return;
        }
        if (sessionTarget instanceof HTMLSelectElement) {
          cdxState.latestCdxMissionState.sessionId = sessionTarget.value || "";
          delete cdxState.latestCdxMissionState.missionInputs.model;
          cdxState.latestCdxMissionState.planPayload = null;
          cdxState.latestCdxMissionState.runPayload = null;
          cdxState.latestCdxMissionState.applyPayload = null;
          cdxState.latestCdxMissionState.outputMode = "plan";
          cdxState.latestCdxMissionState.promptOverride = "";
          setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload));
        }
        if (cdxInputTarget instanceof HTMLInputElement || cdxInputTarget instanceof HTMLTextAreaElement || cdxInputTarget instanceof HTMLSelectElement) {
          const key = cdxInputTarget.getAttribute("data-viewer-cdx-input") || "";
          if (key) {
            cdxState.latestCdxMissionState.missionInputs[key] = cdxInputTarget instanceof HTMLInputElement && cdxInputTarget.type === "checkbox" ? cdxInputTarget.checked ? "true" : "false" : cdxInputTarget.value || "";
            cdxState.latestCdxMissionState.planPayload = null;
            cdxState.latestCdxMissionState.runPayload = null;
            cdxState.latestCdxMissionState.applyPayload = null;
            cdxState.latestCdxMissionState.outputMode = "plan";
            cdxState.latestCdxMissionState.promptOverride = "";
          }
        }
        if (cdxColumnTarget instanceof HTMLInputElement) {
          persistCdxColumnVisibility(cdxColumnTarget.getAttribute("data-viewer-cdx-column") || "", cdxColumnTarget.checked);
          rerenderCdxStatusFromPreferences();
        }
        if (cdxRunColumnTarget instanceof HTMLInputElement) {
          persistCdxRunColumnVisibility(cdxRunColumnTarget.getAttribute("data-viewer-cdx-run-column") || "", cdxRunColumnTarget.checked);
          preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(cdxState.latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
        }
        if (cdxRunSessionTarget instanceof HTMLInputElement) {
          const session = cdxRunSessionTarget.getAttribute("data-viewer-cdx-run-session") || "";
          const current = cdxRunSessionFilterPreference();
          const selected = new Set(current.mode === "subset" ? current.selected : knownCdxRunSessions(cdxState.latestCdxRunsPayload?.runs || []));
          if (cdxRunSessionTarget.checked) {
            selected.add(session);
          } else {
            selected.delete(session);
          }
          persistCdxRunSessionFilter({ mode: "subset", selected: Array.from(selected) });
          preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(cdxState.latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
        }
        if (cdxHistoryColumnTarget instanceof HTMLInputElement) {
          persistCdxHistoryColumnVisibility(cdxHistoryColumnTarget.getAttribute("data-viewer-cdx-history-column") || "", cdxHistoryColumnTarget.checked);
          preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(cdxState.latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
        }
        if (cdxHistorySessionTarget instanceof HTMLInputElement) {
          const session = cdxHistorySessionTarget.getAttribute("data-viewer-cdx-history-session") || "";
          const current = cdxHistorySessionFilterPreference();
          const selected = new Set(current.mode === "subset" ? current.selected : knownCdxHistorySessions(cdxState.latestCdxHistoryPayload?.history || []));
          if (cdxHistorySessionTarget.checked) {
            selected.add(session);
          } else {
            selected.delete(session);
          }
          persistCdxHistorySessionFilter({ mode: "subset", selected: Array.from(selected) });
          preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(cdxState.latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
        }
        if (cdxProviderTarget instanceof HTMLInputElement) {
          const provider = cdxProviderTarget.getAttribute("data-viewer-cdx-provider") || "";
          const status = cdxState.latestCdxStatusPayload?.status || {};
          const allProviders = cdxKnownProviders(status, cdxProviders(status), cdxSessions(status));
          const current = cdxProviderFilterPreference();
          const selected = new Set(current.mode === "subset" ? current.selected : allProviders);
          if (cdxProviderTarget.checked) {
            selected.add(provider);
          } else {
            selected.delete(provider);
          }
          const nextSelected = Array.from(selected).filter((entry) => allProviders.includes(entry));
          persistCdxProviderFilter(nextSelected.length === allProviders.length ? { mode: "all", selected: [] } : { mode: "subset", selected: nextSelected });
          rerenderCdxStatusFromPreferences();
        }
      });
      document.addEventListener("dragstart", (event) => {
        const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
        if (!(row instanceof HTMLElement)) return;
        if (event.target instanceof Element && event.target.closest("[data-viewer-workshop-terminal-close], [data-viewer-workshop-terminal-clear], [data-viewer-workshop-terminal-rename], [data-viewer-cdx-usage-refresh]")) {
          event.preventDefault();
          return;
        }
        const id = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
        if (!id) return;
        workshopState.workshopTerminalState.draggingId = id;
        row.classList.add("is-dragging");
        row.setAttribute("aria-grabbed", "true");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", id);
        }
      });
      document.addEventListener("dragover", (event) => {
        const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
        if (!(row instanceof HTMLElement) || !workshopState.workshopTerminalState.draggingId) return;
        const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
        if (!targetId || targetId === workshopState.workshopTerminalState.draggingId) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        document.querySelectorAll(".viewer-workshop__terminal-row.is-drop-target").forEach((node) => {
          if (node !== row) node.classList.remove("is-drop-target");
        });
        row.classList.add("is-drop-target");
      });
      document.addEventListener("drop", (event) => {
        const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
        if (!(row instanceof HTMLElement)) {
          clearWorkshopTerminalDragState();
          return;
        }
        const sourceId = workshopState.workshopTerminalState.draggingId || event.dataTransfer?.getData("text/plain") || "";
        const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
        if (sourceId && targetId && sourceId !== targetId) {
          event.preventDefault();
          moveWorkshopTerminalBefore(sourceId, targetId);
          workshopState.workshopTerminalState.suppressSelectUntil = Date.now() + 250;
        }
        clearWorkshopTerminalDragState();
      });
      document.addEventListener("dragend", () => {
        workshopState.workshopTerminalState.suppressSelectUntil = Date.now() + 250;
        clearWorkshopTerminalDragState();
      });
      document.addEventListener("click", (event) => {
        window.setTimeout(() => applyLocalViewerChrome(), 0);
        const activeCdxMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__menu, .viewer-workshop__command-run-menu") : null;
        closeCdxMenus(activeCdxMenu);
        if (!(event.target instanceof Element) || !event.target.closest(".viewer-nav-menu")) {
          closeNavMenus();
        }
        if (!(event.target instanceof Element) || !event.target.closest("#viewer-project-menu") && !event.target.closest("#viewer-repo-pill")) {
          setProjectMenuOpen(false);
        }
        const target = event.target instanceof Element ? event.target.closest("[data-viewer-doc-path]") : null;
        const healthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-open-health]") : null;
        const filterTarget = event.target instanceof Element ? event.target.closest("[data-viewer-filter-group][data-viewer-filter-value]") : null;
        const revealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-reveal]") : null;
        const gitHistoryRevealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-history-reveal]") : null;
        const gitDomainTarget = event.target instanceof Element ? event.target.closest(".viewer-git__domain[data-viewer-git-domain]") : null;
        const gitVerdictRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-run]") : null;
        const gitFileTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-file]") : null;
        const gitCommitTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-commit]") : null;
        const reviewBurstTarget = event.target instanceof Element ? event.target.closest("[data-viewer-review-burst]") : null;
        const reviewFileTarget = event.target instanceof Element ? event.target.closest("[data-viewer-review-file]") : null;
        const gitPreviewFullTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-preview-full]") : null;
        const gitDiffFullTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-diff-full]") : null;
        const workspaceTreeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-tree]") : null;
        const workspacePreviewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-preview]") : null;
        const workspaceSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-select]") : null;
        const workspacePreviewFullTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-preview-full]") : null;
        const workspaceMarkdownModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-markdown-mode]") : null;
        const workshopTabTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-tab]") : null;
        const workshopRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run]") : null;
        const fleetHomeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-fleet-home]") : null;
        if (fleetHomeTarget instanceof HTMLElement) {
          event.preventDefault();
          setProjectMenuOpen(false);
          void showFleetHome();
          return;
        }
        const fleetRootPickTarget = event.target instanceof Element ? event.target.closest("[data-viewer-fleet-root-pick]") : null;
        const fleetRootRemoveTarget = event.target instanceof Element ? event.target.closest("[data-viewer-fleet-root-remove]") : null;
        const workshopRunTerminalTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run-terminal]") : null;
        const workshopStopTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-stop]") : null;
        const workshopTerminalNewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-new]") : null;
        const workshopTerminalCustomTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-custom]") : null;
        const workshopTerminalSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-select]") : null;
        const workshopTerminalCloseTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-close]") : null;
        const workshopExternalCloseTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-external-close]") : null;
        const workshopTerminalClearTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-clear]") : null;
        const workshopTerminalRenameTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-rename]") : null;
        const workshopCdxUsageTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-usage-refresh]") : null;
        const projectSwitcherTarget = event.target instanceof Element ? event.target.closest("#viewer-repo-pill") : null;
        const projectFavoriteTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-favorite]") : null;
        const projectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-id]") : null;
        const projectPickTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-pick]") : null;
        const ciModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-ci-mode]") : null;
        const cdxModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mode]") : null;
        const corpusModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-corpus-mode]") : null;
        const cdxMemoryScopeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-memory-scope]") : null;
        const cdxMemoryViewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-memory-view]") : null;
        const cdxBackRunsTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-back-runs]") : null;
        const cdxReportTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-report]") : null;
        const cdxArtifactTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-artifact-path]") : null;
        const cdxProviderAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider-all]") : null;
        const cdxMissionSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mission-select]") : null;
        const cdxStrengthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-strength]") : null;
        const cdxPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-plan]") : null;
        const cdxRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run]") : null;
        const cdxApplyPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-apply-plan]") : null;
        const cdxMissionOutputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mission-output]") : null;
        const cdxToggleTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-toggle]") : null;
        const cdxResetTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-reset]") : null;
        const cdxSessionActionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-action]") : null;
        const cdxSessionConfigSubmitTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-submit]") : null;
        const cdxSessionConfigCancelTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-cancel]") : null;
        const cdxLoginTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-login]") : null;
        const navTarget = event.target instanceof Element ? event.target.closest("[data-viewer-nav-target]") : null;
        const onboardingActionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-onboarding-action]") : null;
        if (onboardingActionTarget instanceof HTMLElement) {
          event.preventDefault();
          runOnboardingAction(onboardingActionTarget.getAttribute("data-viewer-onboarding-action") || "");
          return;
        }
        const applyFixesTarget = event.target instanceof Element ? event.target.closest("[data-viewer-apply-fixes]") : null;
        if (applyFixesTarget instanceof HTMLElement) {
          event.preventDefault();
          withPrimaryAction("apply-fixes", "Applying fixes", applyFixes);
          return;
        }
        if (navTarget instanceof HTMLElement) {
          event.preventDefault();
          const [screen, section] = (navTarget.getAttribute("data-viewer-nav-target") || "").split(":");
          closeNavMenus();
          if (screen === "project") {
            withPrimaryAction(`project-${section}`, `Opening project ${section}`, () => openProjectTool(section === "theme" ? "theme" : "i18n", { beginView, isViewStale, setDocument, setMeta }), { supersede: true });
          } else if (screen === "workshop") {
            withPrimaryAction("workshop-nav", `Opening Workshop ${section}`, () => showWorkshop({ tab: section }), { supersede: true });
          } else if (screen === "remote") {
            if (section === "release") {
              withPrimaryAction("remote-release", "Checking release workflow", showReleaseStatus, { supersede: true });
            } else if (section === "runs") {
              withPrimaryAction("remote-runs", "Checking CI status", showCiStatus, { supersede: true });
            } else {
              withPrimaryAction("remote-git", "Checking Git status", () => showGitStatus(), { supersede: true });
            }
          } else if (screen === "corpus") {
            if (section === "health") {
              withPrimaryAction("corpus-health", "Checking health", showHealth, { supersede: true });
            } else if (section === "getting-started") {
              showGettingStarted();
            } else {
              withPrimaryAction("corpus-insights", "Loading insights", showCorpusInsights, { supersede: true });
            }
          } else if (screen === "cdx") {
            if (section === "runs") {
              withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns, { supersede: true });
            } else if (section === "missions") {
              withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions, { supersede: true });
            } else if (section === "history") {
              withPrimaryAction("cdx-history", "Loading CDX history", showCdxHistory, { supersede: true });
            } else if (section === "memory") {
              withPrimaryAction("cdx-memory", "Loading CDX memory", showCdxMemory, { supersede: true });
            } else if (section === "disk") {
              withPrimaryAction("cdx-disk", "Loading CDX disk usage", showCdxDisk, { supersede: true });
            } else {
              withPrimaryAction("cdx", "Checking CDX status", showCdxStatus, { supersede: true });
            }
          }
          return;
        }
        if (cdxToggleTarget instanceof HTMLButtonElement) {
          event.preventDefault();
          const sessionName = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle") || "";
          const currentState = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle-state") || "on";
          const enable = currentState === "off";
          if (!sessionName) return;
          cdxState.pendingCdxSessionToggles.set(sessionName, enable);
          const rollbackCdxToggle = applyOptimisticCdxSessionToggle(sessionName, enable);
          fetch("/api/cdx-toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session: sessionName, enable })
          }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
            if (!ok || !data.ok) {
              throw new Error(data.error || "Toggle failed.");
            }
            return showCdxStatus({ silent: true, force: true }).catch(() => {
            });
          }).catch((error) => {
            rollbackCdxToggle();
            setMeta(`CDX toggle: ${error?.message || error}`);
          }).finally(() => {
            cdxState.pendingCdxSessionToggles.delete(sessionName);
            rerenderCdxStatusFromPreferences();
          });
          return;
        }
        if (cdxResetTarget instanceof HTMLButtonElement) {
          event.preventDefault();
          const sessionName = cdxResetTarget.getAttribute("data-viewer-cdx-reset") || "";
          if (!sessionName || cdxState.pendingCdxSessionResets.has(sessionName)) return;
          showThemedConfirmModal({
            title: "Activate banked reset",
            message: `Consume one banked Codex reset for ${sessionName}? This spends a reset credit.`,
            submitLabel: "Activate"
          }).then((confirmed) => {
            if (!confirmed) return void 0;
            cdxState.pendingCdxSessionResets.add(sessionName);
            rerenderCdxStatusFromPreferences();
            return fetch("/api/cdx-reset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session: sessionName })
            }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
              if (!ok || !data.ok) {
                throw new Error(data.error || "Reset failed.");
              }
              setMeta(data.payload?.message || `Activated banked reset for ${sessionName}.`);
              return showCdxStatus({ silent: true, force: true }).catch(() => {
              });
            }).catch((error) => {
              setMeta(`CDX reset: ${error?.message || error}`);
            }).finally(() => {
              cdxState.pendingCdxSessionResets.delete(sessionName);
              rerenderCdxStatusFromPreferences();
            });
          });
          return;
        }
        if (cdxSessionConfigSubmitTarget instanceof HTMLElement) {
          event.preventDefault();
          const modal = cdxSessionConfigSubmitTarget.closest("[data-viewer-cdx-session-config-modal]");
          applyCdxSessionConfigModal(modal);
          return;
        }
        if (cdxSessionConfigCancelTarget instanceof HTMLElement) {
          event.preventDefault();
          closeThemedModal(cdxSessionConfigCancelTarget.closest("[data-viewer-cdx-session-config-modal]"));
          return;
        }
        if (ciModeTarget instanceof HTMLElement) {
          const mode = ciModeTarget.getAttribute("data-viewer-ci-mode") || "git";
          if (mode === "release") {
            withPrimaryAction("ci-release", "Checking release workflow", showReleaseStatus);
          } else if (mode === "runs") {
            withPrimaryAction("ci-runs", "Checking CI status", showCiStatus);
          } else {
            withPrimaryAction("ci-git", "Checking Git status", () => showGitStatus());
          }
          return;
        }
        if (corpusModeTarget instanceof HTMLElement) {
          const mode = corpusModeTarget.getAttribute("data-viewer-corpus-mode") || "insights";
          if (mode === "health") {
            withPrimaryAction("corpus-health", "Checking health", showHealth, { supersede: true });
          } else if (mode === "getting-started") {
            showGettingStarted();
          } else {
            withPrimaryAction("corpus-insights", "Loading insights", showCorpusInsights, { supersede: true });
          }
          return;
        }
        if (cdxSessionActionTarget instanceof HTMLElement) {
          event.preventDefault();
          const action = cdxSessionActionTarget.getAttribute("data-viewer-cdx-session-action") || "new";
          const sessionName = cdxSessionActionTarget.getAttribute("data-viewer-cdx-session") || "";
          cdxSessionActionTarget.closest("details")?.removeAttribute("open");
          if (!sessionName) {
            return;
          }
          if (action === "config") {
            showCdxSessionConfigModal(sessionName);
          } else if (action === "resume") {
            spawnWorkshopTerminal({ command: ["cdx", "resume", sessionName], label: `cdx resume ${sessionName}` });
          } else if (action === "handoff") {
            chooseCdxHandoffSource(sessionName).then((handoffSource) => {
              if (handoffSource) {
                spawnWorkshopTerminal({ command: ["cdx", "handoff", handoffSource, sessionName], label: `cdx handoff ${handoffSource} ${sessionName}` });
              }
            });
          } else if (action === "remove") {
            cdxSessionActionTarget.disabled = true;
            fetch("/api/cdx-remove", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session: sessionName })
            }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
              if (!ok || !data.ok) {
                throw new Error(data.error || "Remove failed.");
              }
              setMeta(data.payload?.message || `Removed ${sessionName}.`);
              showCdxStatus({ silent: true, force: true }).catch(() => {
              });
            }).catch((error) => {
              setMeta(`CDX remove: ${error?.message || error}`);
            }).finally(() => {
              cdxSessionActionTarget.disabled = false;
            });
          } else {
            spawnWorkshopTerminal({ command: ["cdx", sessionName], label: `cdx ${sessionName}` });
          }
          return;
        }
        if (cdxLoginTarget instanceof HTMLElement) {
          event.preventDefault();
          const sessionName = cdxLoginTarget.getAttribute("data-viewer-cdx-login") || "";
          if (sessionName) {
            spawnWorkshopTerminal({ command: ["cdx", "login", sessionName], label: `cdx login ${sessionName}` });
          }
          return;
        }
        if (cdxMissionSelectTarget instanceof HTMLElement) {
          selectCdxMissionFromModal().catch((error) => setMeta(`Mission selection failed: ${error?.message || error}`));
          return;
        }
        if (cdxStrengthTarget instanceof HTMLElement) {
          cdxState.latestCdxMissionState.strengthId = cdxStrengthTarget.getAttribute("data-viewer-cdx-strength") || "standard";
          cdxState.latestCdxMissionState.planPayload = null;
          cdxState.latestCdxMissionState.runPayload = null;
          cdxState.latestCdxMissionState.applyPayload = null;
          cdxState.latestCdxMissionState.outputMode = "plan";
          cdxState.latestCdxMissionState.promptOverride = "";
          setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload));
          return;
        }
        if (cdxMissionOutputTarget instanceof HTMLElement) {
          cdxState.latestCdxMissionState.outputMode = cdxMissionOutputTarget.getAttribute("data-viewer-cdx-mission-output") === "run" ? "run" : "plan";
          setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload, cdxState.latestCdxMissionState.planPayload, cdxState.latestCdxMissionState.runPayload, cdxState.latestCdxMissionState.applyPayload));
          return;
        }
        if (cdxPlanTarget instanceof HTMLElement) {
          withCdxMissionAction("cdx-plan", "Building CDX mission plan", previewCdxMission);
          return;
        }
        if (cdxRunTarget instanceof HTMLElement) {
          withCdxMissionAction("cdx-run", "Launching CDX mission", launchCdxMission);
          return;
        }
        if (cdxApplyPlanTarget instanceof HTMLElement) {
          withCdxMissionAction("cdx-apply-plan", "Applying CDX mission plan", applyCdxMissionPlan);
          return;
        }
        if (cdxProviderAllTarget instanceof HTMLElement) {
          persistCdxProviderFilter({ mode: "all", selected: [] });
          rerenderCdxStatusFromPreferences();
          return;
        }
        const cdxRunSessionAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-session-all]") : null;
        if (cdxRunSessionAllTarget instanceof HTMLElement) {
          persistCdxRunSessionFilter({ mode: "all", selected: [] });
          preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(cdxState.latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
          return;
        }
        const cdxHistorySessionAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-session-all]") : null;
        if (cdxHistorySessionAllTarget instanceof HTMLElement) {
          persistCdxHistorySessionFilter({ mode: "all", selected: [] });
          preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(cdxState.latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
          return;
        }
        if (cdxBackRunsTarget instanceof HTMLElement) {
          withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
          return;
        }
        if (cdxReportTarget instanceof HTMLElement) {
          withPrimaryAction("cdx-report", "Loading CDX report", () => showCdxReport(cdxReportTarget.getAttribute("data-viewer-cdx-report") || ""));
          return;
        }
        if (cdxArtifactTarget instanceof HTMLElement) {
          withPrimaryAction("cdx-artifact", "Opening CDX artifact", () => openCdxArtifact(cdxArtifactTarget.getAttribute("data-viewer-cdx-artifact-path") || ""));
          return;
        }
        if (cdxMemoryScopeTarget instanceof HTMLElement) {
          const scope = cdxMemoryScopeTarget.getAttribute("data-viewer-cdx-memory-scope") || "current";
          withPrimaryAction(`cdx-memory-${scope}`, "Loading CDX memory", () => showCdxMemory({ scope }));
          return;
        }
        if (cdxMemoryViewTarget instanceof HTMLElement) {
          cdxState.latestCdxMemoryView = cdxMemoryViewTarget.getAttribute("data-viewer-cdx-memory-view") || "cleaned";
          setDocument("CDX memory", renderCdxMemory(cdxState.latestCdxMemoryPayload, cdxState.latestCdxMemoryScope, cdxState.latestCdxMemoryView));
          setMeta(`CDX memory ${cdxState.latestCdxMemoryView} view.`);
          return;
        }
        if (cdxModeTarget instanceof HTMLElement) {
          const mode = cdxModeTarget.getAttribute("data-viewer-cdx-mode") || "status";
          if (mode === "runs") {
            withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
          } else if (mode === "missions") {
            withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
          } else if (mode === "history") {
            withPrimaryAction("cdx-history", "Loading CDX history", showCdxHistory);
          } else if (mode === "memory") {
            withPrimaryAction("cdx-memory", "Loading CDX memory", showCdxMemory);
          } else if (mode === "disk") {
            withPrimaryAction("cdx-disk", "Loading CDX disk usage", showCdxDisk);
          } else {
            withPrimaryAction("cdx", "Checking CDX status", showCdxStatus);
          }
          return;
        }
        if (workshopTabTarget instanceof HTMLElement) {
          event.preventDefault();
          const tab = workshopTabTarget.getAttribute("data-viewer-workshop-tab") || "terminals";
          withPrimaryAction("workshop-tab", `Switching to ${tab}`, () => showWorkshop({ tab }));
          return;
        }
        if (fleetRootPickTarget instanceof HTMLElement) {
          event.preventDefault();
          withPrimaryAction("fleet-root-pick", "Adding fleet root", pickFleetRoot);
          return;
        }
        if (fleetRootRemoveTarget instanceof HTMLElement) {
          event.preventDefault();
          const root = fleetRootRemoveTarget.getAttribute("data-viewer-fleet-root-remove") || "";
          withPrimaryAction("fleet-root-remove", "Removing fleet root", () => removeFleetRoot(root));
          return;
        }
        if (workshopTerminalCloseTarget instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          const id = workshopTerminalCloseTarget.getAttribute("data-viewer-workshop-terminal-close") || "";
          if (id) stopWorkshopTerminal(id);
          return;
        }
        if (workshopExternalCloseTarget instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          const id = workshopExternalCloseTarget.getAttribute("data-viewer-workshop-external-close") || "", index = workshopState.workshopExternalLaunches.findIndex((entry) => entry.id === id);
          if (index >= 0) workshopState.workshopExternalLaunches.splice(index, 1);
          renderWorkshopTerminalList();
          return;
        }
        if (workshopTerminalClearTarget instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          const id = workshopTerminalClearTarget.getAttribute("data-viewer-workshop-terminal-clear") || "";
          if (id) clearWorkshopTerminal(id);
          return;
        }
        if (workshopTerminalRenameTarget instanceof HTMLElement && event.detail >= 2) {
          event.preventDefault();
          event.stopPropagation();
          const id = workshopTerminalRenameTarget.getAttribute("data-viewer-workshop-terminal-rename") || "";
          if (id) renameWorkshopTerminal(id);
          return;
        }
        if (workshopCdxUsageTarget instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          const session = workshopCdxUsageTarget.getAttribute("data-viewer-cdx-usage-refresh") || "";
          refreshCdxSessionUsage(session);
          return;
        }
        if (workshopTerminalNewTarget instanceof HTMLElement) {
          event.preventDefault();
          spawnWorkshopTerminal();
          return;
        }
        if (workshopTerminalCustomTarget instanceof HTMLElement) {
          event.preventDefault();
          spawnCustomWorkshopTerminal(workshopTerminalCustomTarget);
          return;
        }
        if (workshopTerminalSelectTarget instanceof HTMLElement) {
          event.preventDefault();
          if (Date.now() < workshopState.workshopTerminalState.suppressSelectUntil) return;
          const id = workshopTerminalSelectTarget.getAttribute("data-viewer-workshop-terminal-select") || "";
          if (id) setActiveWorkshopTerminal(id);
          return;
        }
        if (workshopRunTarget instanceof HTMLElement) {
          event.preventDefault();
          workshopRunTarget.closest("details")?.removeAttribute("open");
          const commandId = workshopRunTarget.getAttribute("data-viewer-workshop-command-run") || "";
          if (commandId) {
            updateWorkshopCommandSession(commandId, { state: "starting", logText: "" });
            startWorkshopCommand(commandId);
          }
          return;
        }
        if (workshopRunTerminalTarget instanceof HTMLElement) {
          event.preventDefault();
          workshopRunTerminalTarget.closest("details")?.removeAttribute("open");
          const commandId = workshopRunTerminalTarget.getAttribute("data-viewer-workshop-command-run-terminal") || "";
          const commands = workshopState.workshopCommandState.catalog?.commands;
          const entry = Array.isArray(commands) ? commands.find((item) => item?.id === commandId) : null;
          if (entry && Array.isArray(entry.runner) && entry.runner.length) {
            spawnWorkshopTerminal({ command: entry.runner.map(String), label: String(entry.name || commandId) });
          }
          return;
        }
        if (workshopStopTarget instanceof HTMLElement) {
          event.preventDefault();
          const commandId = workshopStopTarget.getAttribute("data-viewer-workshop-command-stop") || "";
          if (commandId) {
            stopWorkshopCommand(commandId);
          }
          return;
        }
        if (workspaceTreeTarget instanceof HTMLElement) {
          event.preventDefault();
          withPrimaryAction("workspace-tree", "Loading Explorer folder", () => openWorkspaceTree(workspaceTreeTarget.getAttribute("data-viewer-workspace-tree") || ""));
          return;
        }
        if (gitDiffFullTarget instanceof HTMLElement) {
          event.preventDefault();
          const diffPath = gitDiffFullTarget.getAttribute("data-viewer-git-diff-full") || "";
          const diffRef = gitDiffFullTarget.getAttribute("data-viewer-git-diff-ref") || "";
          const diffTitle = gitDiffFullTarget.getAttribute("data-viewer-git-diff-title") || "";
          const diffCached = gitDiffFullTarget.getAttribute("data-viewer-git-diff-cached") === "1";
          withPrimaryAction(
            "git-diff-full",
            "Loading the rest of the diff",
            () => diffRef ? loadGitCommitDiff(diffRef, null, { path: diffPath, full: true, title: diffTitle }) : loadGitDiff(diffPath, diffCached, null, { full: true })
          );
          return;
        }
        if (gitPreviewFullTarget instanceof HTMLElement) {
          event.preventDefault();
          const diffPanel = document.querySelector("[data-viewer-git-diff]");
          const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
          if (diffPanel instanceof HTMLElement) {
            withPrimaryAction("git-preview-full", "Loading full Git preview", () => loadGitFilePreview(gitPreviewFullTarget.getAttribute("data-viewer-git-preview-full") || "", diffPanel, detailTitle, { full: true }));
          }
          return;
        }
        if (workspacePreviewFullTarget instanceof HTMLElement) {
          event.preventDefault();
          withPrimaryAction("workspace-preview-full", "Loading full file", () => openWorkspacePreview(workspacePreviewFullTarget.getAttribute("data-viewer-workspace-preview-full") || "", { full: true }));
          return;
        }
        if (workspaceMarkdownModeTarget instanceof HTMLElement) {
          event.preventDefault();
          updateViewerPreferences({ workspaceMarkdownMode: workspaceMarkdownModeTarget.getAttribute("data-viewer-workspace-markdown-mode") || "preview" });
          const currentPath = document.querySelector("[data-viewer-workspace-preview-path]")?.getAttribute("data-viewer-workspace-preview-path") || "";
          withPrimaryAction("workspace-markdown-mode", "Switching Markdown view", async () => {
            const preview = latestWorkspacePreviewPayload || (currentPath ? await fetchWorkspacePreview(currentPath) : null);
            if (preview) updateWorkspacePreviewPane(preview);
          });
          return;
        }
        if (workspaceSelectTarget instanceof HTMLElement) {
          event.preventDefault();
          const path2 = workspaceSelectTarget.getAttribute("data-viewer-workspace-select") || "";
          const kind = workspaceSelectTarget.getAttribute("data-viewer-workspace-select-kind") || "file";
          withPrimaryAction("workspace-select", "Opening", () => kind === "directory" ? openWorkspaceTree(path2) : openWorkspacePreview(path2));
          return;
        }
        if (workspacePreviewTarget instanceof HTMLElement) {
          event.preventDefault();
          withPrimaryAction("workspace-preview", "Loading Explorer preview", () => openWorkspacePreview(workspacePreviewTarget.getAttribute("data-viewer-workspace-preview") || ""));
          return;
        }
        if (projectSwitcherTarget instanceof HTMLElement) {
          const menu = projectMenu();
          setProjectMenuOpen(Boolean(menu?.hidden));
          return;
        }
        if (projectFavoriteTarget instanceof HTMLElement) {
          event.preventDefault();
          event.stopPropagation();
          const projectId = projectFavoriteTarget.getAttribute("data-viewer-project-favorite") || "";
          const currentlyFavorite = projectFavoriteTarget.getAttribute("aria-pressed") === "true";
          persistFavoriteProject(projectId, !currentlyFavorite);
          if (isFleetHomeOpen()) {
            void showFleetHome({ silent: true, skipStateLoad: true });
            return;
          }
          renderProjectMenu();
          setProjectMenuOpen(true);
          return;
        }
        if (projectPickTarget instanceof HTMLElement) {
          event.preventDefault();
          withPrimaryAction("select-project-root", "Selecting project folder", pickViewerProjectRoot);
          return;
        }
        if (projectTarget instanceof HTMLElement) {
          event.preventDefault();
          withPrimaryAction("switch-project", "Switching project", () => switchViewerProject(projectTarget.getAttribute("data-viewer-project-id") || ""));
          return;
        }
        if (gitHistoryRevealTarget instanceof HTMLElement) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (gitHistoryRevealTarget.dataset.viewerGitHistoryBusy === "true") {
            return;
          }
          gitHistoryRevealTarget.dataset.viewerGitHistoryBusy = "true";
          const list = gitHistoryRevealTarget.closest("ul");
          const hiddenRows = Array.from(list?.querySelectorAll("[data-viewer-git-history-hidden]") || []).filter((row) => row instanceof HTMLElement);
          hiddenRows.slice(0, gitHistoryPageSize).forEach((row) => {
            if (row instanceof HTMLElement) {
              row.hidden = false;
              row.removeAttribute("data-viewer-git-history-hidden");
            }
          });
          const remaining = Array.from(list?.querySelectorAll("[data-viewer-git-history-hidden]") || []).length;
          if (remaining > 0) {
            gitHistoryRevealTarget.textContent = `Show ${Math.min(gitHistoryPageSize, remaining)} more`;
            gitHistoryRevealTarget.dataset.viewerGitHistoryBusy = "false";
          } else {
            gitHistoryRevealTarget.closest("li")?.remove();
          }
          return;
        }
        if (revealTarget instanceof HTMLElement) {
          const list = revealTarget.closest("ul");
          list?.querySelectorAll("[data-viewer-hidden-row]").forEach((row) => {
            if (row instanceof HTMLElement) {
              row.hidden = false;
              row.removeAttribute("data-viewer-hidden-row");
            }
          });
          revealTarget.closest("li")?.remove();
          return;
        }
        if (gitVerdictRunTarget instanceof HTMLElement) {
          event.preventDefault();
          const controlId = gitVerdictRunTarget.getAttribute("data-viewer-git-run") || "";
          document.getElementById(controlId)?.click();
          return;
        }
        if (gitDomainTarget instanceof HTMLElement) {
          const domain = gitDomainTarget.getAttribute("data-viewer-git-domain") || "changes";
          applyGitDomain(domain);
          const diffPanel = document.querySelector("[data-viewer-git-diff]");
          if (domain === "history" && diffPanel instanceof HTMLElement && !document.querySelector("[data-viewer-git-commit].is-active")) {
            diffPanel.textContent = "Select a commit to preview its diff.";
          }
          return;
        }
        if (gitCommitTarget instanceof HTMLElement) {
          loadGitCommitDiff(gitCommitTarget.getAttribute("data-viewer-git-commit") || "", gitCommitTarget).catch((error) => setMeta(error.message));
          return;
        }
        if (reviewBurstTarget instanceof HTMLElement) {
          selectReviewBurst(reviewBurstTarget.getAttribute("data-viewer-review-burst") || "").catch((error) => setMeta(error.message));
          return;
        }
        if (reviewFileTarget instanceof HTMLElement) {
          loadReviewFile(reviewFileTarget).catch((error) => setMeta(error.message));
          return;
        }
        if (gitFileTarget instanceof HTMLElement) {
          loadGitDiff(
            gitFileTarget.getAttribute("data-viewer-git-file") || "",
            gitFileTarget.getAttribute("data-viewer-git-cached") === "1",
            gitFileTarget
          ).catch((error) => setMeta(error.message));
          return;
        }
        if (healthTarget instanceof HTMLElement) {
          withPrimaryAction("health", "Checking health", showHealth);
          return;
        }
        if (filterTarget instanceof HTMLElement) {
          applyViewerFilter(filterTarget.getAttribute("data-viewer-filter-group") || "", filterTarget.getAttribute("data-viewer-filter-value") || "");
          setMeta("Insight filter applied. Clear filters restores the normal viewer view.");
          return;
        }
        const path = target instanceof HTMLElement ? target.getAttribute("data-viewer-doc-path") : "";
        if (path) {
          withPrimaryAction("read-document", "Loading document", () => showDocumentByPath(path));
        }
      });
      document.addEventListener("focusin", (event) => {
        const activeCdxMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__menu, .viewer-workshop__command-run-menu") : null;
        closeCdxMenus(activeCdxMenu);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeCdxMenus();
        }
      });
      document.getElementById("viewer-document-close")?.addEventListener("click", () => {
        withPrimaryAction("close-document", "Closing preview", closeDocumentPanel);
      });
      documentMinimizeButton()?.addEventListener("click", () => {
        withPrimaryAction("minimize-document", "Minimizing screen", minimizeDocumentPanel);
      });
      minimizedDock()?.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const close = target?.closest("[data-viewer-minimized-close]");
        if (close instanceof HTMLElement) {
          closeMinimizedScreen(close.getAttribute("data-viewer-minimized-close") || "");
          return;
        }
        const restore = target?.closest("[data-viewer-minimized-restore]");
        if (restore instanceof HTMLElement) {
          withPrimaryAction("restore-document", "Restoring screen", () => restoreMinimizedScreen(restore.getAttribute("data-viewer-minimized-restore") || ""));
        }
      });
      document.getElementById("viewer-document-path-copy")?.addEventListener("click", async (event) => {
        const control = event.currentTarget;
        const documentPath = control instanceof HTMLElement ? control.dataset.path || "" : "";
        const focusId = control instanceof HTMLElement ? control.dataset.focusId || "" : "";
        if (!documentPath) return;
        const text = focusId ? buildFocusLink(focusId) : documentPath;
        const copied = await copyTextToClipboard(text);
        setMeta(copied ? `Copied ${text}` : "Clipboard access was refused.");
      });
      document.getElementById("viewer-document-refresh")?.addEventListener("click", () => {
        withPrimaryAction("refresh-document", "Refreshing", refreshCurrentScreen);
      });
      document.getElementById("viewer-release-reset")?.addEventListener("click", () => {
        withPrimaryAction("release-reset", "Resetting release state", resetReleaseState);
      });
      documentStatusButton()?.addEventListener("click", () => {
        withPrimaryAction("change-document-status", "Updating status", changeCurrentDocumentStatus);
      });
      document.getElementById("viewer-git-actions-button")?.addEventListener("click", (event) => {
        event.stopPropagation();
        const panel = document.getElementById("viewer-git-actions-menu");
        setGitActionsMenuOpen(Boolean(panel?.hidden));
      });
      function confirmGitRemoteAction({ title, verb, submitLabel }) {
        const payload = gitState.latestGitStatusPayload || {};
        const branch = payload.branch || "the current branch";
        const tracking = payload.tracking ? ` (tracking ${payload.tracking})` : "";
        const ahead = Number(payload.ahead || 0);
        const behind = Number(payload.behind || 0);
        const counts = verb === "push" ? `${ahead} commit${ahead === 1 ? "" : "s"} ahead` : `${behind} commit${behind === 1 ? "" : "s"} behind`;
        return showThemedConfirmModal({
          title,
          message: `Run \`git ${verb}\` on ${branch}${tracking}: ${counts}. It runs in a Workshop terminal.`,
          submitLabel
        });
      }
      document.getElementById("viewer-git-pull")?.addEventListener("click", async () => {
        setGitActionsMenuOpen(false);
        if (!await confirmGitRemoteAction({ title: "Pull from the remote?", verb: "pull", submitLabel: "Pull" })) return;
        recordGitActivity("Pull", "Git pull started in a Workshop terminal");
        spawnWorkshopTerminal({ command: ["git", "pull"], label: "git pull" });
      });
      document.getElementById("viewer-git-commit")?.addEventListener("click", () => {
        setGitActionsMenuOpen(false);
        openGitCommitModal().catch((error) => setMeta(error?.message || "Git commit failed."));
      });
      document.getElementById("viewer-git-push")?.addEventListener("click", async () => {
        setGitActionsMenuOpen(false);
        if (!await confirmGitRemoteAction({ title: "Push to the remote?", verb: "push", submitLabel: "Push" })) return;
        recordGitActivity("Push", "Git push started in a Workshop terminal");
        spawnWorkshopTerminal({ command: ["git", "push"], label: "git push" });
      });
      document.getElementById("viewer-git-fetch")?.addEventListener("click", () => {
        setGitActionsMenuOpen(false);
        withPrimaryAction("git-fetch", "Fetching", async () => {
          if (await fetchGitRemote()) await refreshCurrentScreen();
        });
      });
      installViewerHints();
      installTopbarMenu();
      startAutoRefresh();
    });
  })();
})();
//# sourceMappingURL=browser-host.js.map
