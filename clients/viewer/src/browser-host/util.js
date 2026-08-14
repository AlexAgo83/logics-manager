// Auto-extracted pure leaf helpers from browser-host/index.js.
// Each function here references no shared closure state (verified: zero
// local-symbol references), so it lives as a standalone ES module that
// esbuild re-bundles into the viewer host. Bodies are kept verbatim.

export function activeCdxInteractionMenu() {
    return document.querySelector(".viewer-cdx__menu[open], .viewer-workshop__command-run-menu[open]");
  }

export function activityMinuteBucket(value) {
    const timestamp = Date.parse(String(value || ""));
    if (!Number.isFinite(timestamp)) {
      return "";
    }
    return new Date(Math.floor(timestamp / 6e4) * 6e4).toISOString();
  }

export function activityPanelIsOpen() {
    const panel = document.getElementById("activity-panel");
    return panel instanceof HTMLElement && !panel.hidden;
  }

export function activityRootKey(root = "") {
    return String(root || "default").trim() || "default";
  }

export function applyCdxBadge(host, selector, desiredLabel, makeHtml) {
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

export function applyGitDomain(domain) {
    const selected = domain || "changes";
    const diffDomains = new Set(["changes", "staged", "worktree", "untracked", "history"]);
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

export function asArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.entries(value).map(([key, entry]) => ({ name: key, ...(entry && typeof entry === "object" ? entry : { value: entry }) }));
    }
    return [];
  }

export function cdxBadgeLabel(count) {
    if (!Number.isFinite(count) || count <= 0) return null;
    return count === 1 ? "!" : String(count);
  }

export function cdxField(item, keys, fallback = "-") {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return fallback;
  }

export function cdxHistoryList(payload) {
    return payload && payload.state === "ok" && Array.isArray(payload.history) ? payload.history : [];
  }

export function cdxLabel(value) {
    return String(value || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

export function cdxMenuKey(menu) {
    if (!(menu instanceof HTMLElement)) {
      return "";
    }
    if (menu.id) {
      return `id:${menu.id}`;
    }
    const summaryLabel = menu.querySelector("summary")?.getAttribute("aria-label")
      || menu.querySelector("summary")?.getAttribute("title")
      || "";
    const panelLabel = menu.querySelector(".viewer-cdx__menu-panel, .viewer-workshop__command-run-menu-panel")?.getAttribute("aria-label") || "";
    const label = panelLabel || summaryLabel;
    return label ? `label:${label}` : "";
  }

export function cdxMissionActionControls() {
    return Array.from(document.querySelectorAll([
      "[data-viewer-cdx-plan]",
      "[data-viewer-cdx-run]",
      "[data-viewer-cdx-apply-plan]",
      "[data-viewer-cdx-mission-select]"
    ].join(","))).filter((node) => node instanceof HTMLElement);
  }

export function cdxMissionCatalog(payload = {}) {
    return payload.catalog || {
      missions: [
        { id: "full-audit", title: "Full audit", description: "Audit the repository, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.", scope: "repository", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
        { id: "release-review", title: "Review since latest release", description: "Review changes since the latest release, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.", scope: "latest-release", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
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

export function cdxMissionTerminalProgressScript() {
    return [
      'mission_id="$1"',
      'session_id="$2"',
      'report_hint="$3"',
      'shift 3',
      'mode="${CDX_MISSION_PROGRESS_MODE:-compact}"',
      'start_ts="$(date +%s)"',
      'last_activity="$start_ts"',
      'last_total=0',
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
      '  sleep 5',
      '  now="$(date +%s)"',
      '  elapsed=$((now - start_ts))',
      '  stdout_bytes="$(wc -c < "$stdout_file" | tr -d " ")"',
      '  stderr_bytes="$(wc -c < "$stderr_file" | tr -d " ")"',
      '  total_bytes=$((stdout_bytes + stderr_bytes))',
      '  if [ "$total_bytes" -gt "$last_total" ]; then',
      '    last_activity="$now"',
      '    last_total="$total_bytes"',
      '    activity="output activity"',
      '  elif [ $((now - last_activity)) -ge 60 ]; then',
      '    activity="no recent activity"',
      '  else',
      '    activity="waiting on command output"',
      '  fi',
      '  idle=$((now - last_activity))',
      '  if [ "$mode" = "watch" ]; then printf "\\033[H\\033[2J"; fi',
      '  printf "%s\\n" "[cdx mission] heartbeat elapsed=${elapsed}s idle=${idle}s phase=running command=${command_label:-cdx run} active=${elapsed}s state=$activity"',
      '  if [ "$mode" = "verbose" ]; then',
      '    if [ "$stdout_bytes" -gt 0 ]; then printf "%s\\n" "[cdx mission] stdout tail:"; tail -n 5 "$stdout_file"; fi',
      '    if [ "$stderr_bytes" -gt 0 ]; then printf "%s\\n" "[cdx mission] stderr tail:"; tail -n 5 "$stderr_file"; fi',
      '  fi',
      'done',
      'wait "$pid"',
      'rc="$?"',
      'end_ts="$(date +%s)"',
      'elapsed=$((end_ts - start_ts))',
      'stdout_bytes="$(wc -c < "$stdout_file" | tr -d " ")"',
      'stderr_bytes="$(wc -c < "$stderr_file" | tr -d " ")"',
      'if [ "$rc" -eq 0 ]; then status="success"; else status="failure"; fi',
      'printf "\\n%s\\n" "[cdx mission] final status=$status exit=$rc elapsed=${elapsed}s stdout_bytes=$stdout_bytes stderr_bytes=$stderr_bytes report/transcript=${report_hint:-Reports tab after completion}"',
      'if [ "$stdout_bytes" -gt 0 ]; then',
      '  printf "%s\\n" "[cdx mission] stdout:"',
      '  cat "$stdout_file"',
      'fi',
      'if [ "$stderr_bytes" -gt 0 ]; then',
      '  printf "%s\\n" "[cdx mission] stderr tail:"',
      '  tail -n 40 "$stderr_file"',
      'fi',
      'if [ "$rc" -ne 0 ]; then printf "%s\\n" "[cdx mission] next action: inspect the terminal output and the Reports tab for the failed run."; fi',
      'rm -f "$stdout_file" "$stderr_file"',
      'exit "$rc"'
    ].join("\n");
  }

export function cdxPct(value) {
    const percent = Number(value);
    return Number.isFinite(percent) ? `${Math.max(0, Math.min(100, Math.round(percent)))}%` : "-";
  }

export function cdxPermissionValues() {
    return ["review", "default", "auto", "full"];
  }

export function cdxRemainingClass(percent) {
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

export function cdxRemainingPct(item) {
    const value = item?.remaining_pct ?? item?.remainingPct ?? item?.available_pct ?? item?.availablePct ?? item?.lowest_available_pct ?? item?.lowestAvailablePct;
    const percent = Number(value);
    return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : null;
  }

export function cdxReportMissionOutput(report, run, taskReport) {
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

export function cdxReportSummary(report, taskReport, missionOutput, runError, permissionDenials) {
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

export function cdxRunStatusDetail(run) {
    return "";
  }

export function cdxRunsList(payload) {
    return payload && payload.state === "ok" && Array.isArray(payload.runs) ? payload.runs : [];
  }

export function cdxSectionBadgeTitle(section, count) {
    if (section === "missions") {
      return count === 1 ? "1 mission run in progress" : `${count} mission runs in progress`;
    }
    if (section === "runs") {
      return count === 1 ? "1 new report" : `${count} new reports`;
    }
    return count === 1 ? "1 new history entry" : `${count} new history entries`;
  }

export function cdxStateClass(value) {
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

export function cdxUsageNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

/** item_734: `ciBadgeTone` takes a badge *state* -- "passing", "failing", "running" -- and
 *  the job rows were feeding it a raw GitHub status or conclusion instead, so every job
 *  resolved to "unknown" and the six rows on a run were drawn identically. The server
 *  computes this for the run itself in `_ci_badge_state`; jobs arrive without it, so this
 *  mirrors that rule rather than each surface guessing at the vocabulary.
 *
 *  Kept in step with logics_manager/viewer.py::_ci_badge_state -- a job whose status and
 *  conclusion are read differently on the two sides is a job reported two ways. */
export function ciStateFromStatus(status, conclusion) {
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

export function ciBadgeTone(value) {
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

export function closeCdxMenus(exceptMenu = null) {
    document.querySelectorAll(".viewer-cdx__menu[open], .viewer-workshop__command-run-menu[open]").forEach((menu) => {
      if (exceptMenu && menu === exceptMenu) {
        return;
      }
      menu.removeAttribute("open");
    });
  }

export function closeThemedModal(modal) {
    if (modal instanceof HTMLElement) {
      modal.remove();
    }
  }

export function collectHealthFindings(lintData, auditData) {
    const findings = [];
    const append = (source, payload) => {
      const canonicalEntries = Array.isArray(payload?.findings)
        ? payload.findings
        : [
            ...(Array.isArray(payload?.issues) ? payload.issues : []),
            ...(Array.isArray(payload?.warnings) ? payload.warnings : [])
          ];
      const seen = new Set();
      canonicalEntries.forEach((entry) => {
        const key = `${entry?.path || ""}\n${entry?.code || ""}\n${entry?.message || ""}`;
        seen.add(key);
        findings.push({ source, ...entry });
      });
      const strictEntries = Array.isArray(payload?.strict) ? payload.strict : [];
      strictEntries.forEach((entry) => {
        const key = `${entry?.path || ""}\n${entry?.code || ""}\n${entry?.message || ""}`;
        if (!seen.has(key)) {
          findings.push({ source, ...entry });
        }
      });
    };
    append("lint", lintData.payload || {});
    append("audit", auditData.payload || {});
    return findings;
  }

export async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through to legacy path */ }
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

export function countBy(items, selector) {
    return items.reduce((acc, item) => {
      const key = selector(item) || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

export function countPayloadEntries(payload, keys) {
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

export function createThemedModal({ title, message, submitLabel = "OK", cancelLabel = "Cancel" }) {
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
    document.body.appendChild(modal);
    return modal;
  }

export function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value ?? "").replace(/["\\]/g, "\\$&");
  }

export function currentGitViewState() {
    const activeDomain = document.querySelector(".viewer-git__domain.is-active[data-viewer-git-domain]");
    const activeFile = document.querySelector(".viewer-git__file.is-active[data-viewer-git-file]");
    return {
      domain: activeDomain instanceof HTMLElement ? activeDomain.getAttribute("data-viewer-git-domain") || "changes" : "changes",
      path: activeFile instanceof HTMLElement ? activeFile.getAttribute("data-viewer-git-file") || "" : "",
      cached: activeFile instanceof HTMLElement && activeFile.getAttribute("data-viewer-git-cached") === "1",
    };
  }

export function describeDocumentScreen(titleText) {
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
      "CDX log": "Streaming log output",
    };
    if (exact[title]) return exact[title];
    if (title.startsWith("CDX log")) return "Streaming log output";
    if (title.startsWith("logics/request/")) return "Logics request";
    if (title.startsWith("logics/task/")) return "Logics task";
    if (title.startsWith("logics/backlog")) return "Logics backlog";
    if (title.endsWith(".md")) return "Logics document";
    return "";
  }

export function downloadBase64File(base64, filename) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

export async function fetchProjectPickerTree(path = "") {
    const response = await fetch(`/api/project-picker-tree?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to browse folders.");
    }
    return data.payload || {};
  }

export async function fetchWorkspacePreview(path = "", { full = false } = {}) {
    const query = `path=${encodeURIComponent(path)}${full ? "&full=1" : ""}`;
    const response = await fetch(`/api/workspace-preview?${query}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load workspace preview.");
    }
    return data.payload;
  }

export async function fetchWorkspaceTree(path = "") {
    const response = await fetch(`/api/workspace-tree?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load workspace tree.");
    }
    return data.payload;
  }

export function fileToBase64(file) {
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

export function findGitFileButton(path, cached) {
    return Array.from(document.querySelectorAll("[data-viewer-git-file]")).find((node) => (
      node instanceof HTMLElement &&
      node.getAttribute("data-viewer-git-file") === path &&
      (node.getAttribute("data-viewer-git-cached") === "1") === Boolean(cached)
    )) || null;
  }

export function formatCdxCredits(value) {
    const text = String(value ?? "").trim();
    if (!text || text === "-") {
      return "-";
    }
    const number = Number(text);
    return Number.isFinite(number) ? number.toFixed(2) : text;
  }

export function formatCdxDuration(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) {
      return "-";
    }
    const totalSeconds = Math.round(value / 1000);
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

export function formatCdxTokenUsage(usage) {
    if (!usage) {
      return "";
    }
    const total = usage.totalTokens ?? "-";
    const input = usage.inputTokens ?? "-";
    const output = usage.outputTokens ?? "-";
    return `${total} total · ${input} in · ${output} out`;
  }

export function formatCiDate(value) {
    const timestamp = Date.parse(String(value || ""));
    if (!Number.isFinite(timestamp)) {
      return "";
    }
    return new Date(timestamp).toLocaleString();
  }

export function formatConnectionTime(timestamp) {
    if (!timestamp) {
      return "No successful sync yet";
    }
    return `Last successful sync ${new Date(timestamp).toLocaleTimeString()}`;
  }

export function formatGitHistoryCount(payload) {
    const count = Array.isArray(payload?.recentCommits) ? payload.recentCommits.length : (payload?.latestCommit ? 1 : 0);
    return `${count}${payload?.recentCommitsHasMore ? "+" : ""}`;
  }

/** item_734: the CI screen showed both ends of a run and never how long it took, which is
 *  the number an operator is actually asking for. Both ends are already in the payload. */
export function formatCiDuration(startIso, endIso) {
    const start = Date.parse(startIso || "");
    const end = Date.parse(endIso || "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "";
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

/** A relative time an operator can read, with the absolute one kept for the tooltip -- the
 *  screen showed absolute stamps only, which answer "when" and not "how long ago". */
export function formatCiAgo(iso) {
    const stamp = Date.parse(iso || "");
    if (!Number.isFinite(stamp)) return "";
    return formatRelativeTime(stamp);
  }

export function formatRelativeTime(timestamp) {
    const diffMs = timestamp - Date.now();
    const absMs = Math.abs(diffMs);
    const minutes = Math.round(absMs / 60000);
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

export function gitCommitModalEntries(payload) {
    const labels = {
      staged: "Staged",
      modified: "Modified",
      deleted: "Deleted",
      renamed: "Renamed",
      untracked: "Untracked"
    };
    const entries = [];
    const seen = new Set();
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

export function hasLinks(item) {
    return (item.references || []).length > 0 || (item.usedBy || []).length > 0;
  }

export function hasMissingOrAmbiguousStatus(item) {
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

export function isAbortError(error) {
    return Boolean(error) && (error.name === "AbortError" || error.code === 20);
  }

export function isSafeLogicsDocPath(value) {
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

export function itemLabel(item) {
    return `${item.id || item.relPath || "doc"} - ${item.indicators?.Status || "No status"}`;
  }

export function markdownApi() {
    if (typeof window.createCdxLogicsMarkdownApi === "function") {
      return window.createCdxLogicsMarkdownApi();
    }
    return null;
  }

export function navMenuItem(target) {
    return Array.from(document.querySelectorAll("[data-viewer-nav-target]"))
      .find((item) => item.getAttribute("data-viewer-nav-target") === target) || null;
  }

export function normalizeCapabilities(payload) {
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

export function normalizeFocusTarget(value) {
    const normalized = String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").replace(/^\//, "").trim();
    if (!normalized || normalized.startsWith("~") || /^[A-Za-z]:/.test(normalized)) {
      return "";
    }
    if (normalized.split("/").includes("..")) {
      return "";
    }
    return normalized;
  }

export function normalizeGitBadgeCounts(payload) {
    const counts = payload && typeof payload === "object" ? payload.badgeCounts || {} : {};
    return {
      unpushedCommits: Math.max(0, Number(counts.unpushedCommits || payload?.ahead || 0)),
      unpulledCommits: Math.max(0, Number(counts.unpulledCommits || payload?.behind || 0)),
      uncommittedFiles: Math.max(0, Number(counts.uncommittedFiles || 0))
    };
  }

export function numericValues(values) {
    return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }

export function objectEntries(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : [];
  }

export function parseCdxDate(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return null;
    }
    const shortDate = raw.match(/^([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{1,2}:\d{2})$/);
    if (shortDate) {
      const year = new Date().getFullYear();
      const timestamp = Date.parse(`${shortDate[1]} ${shortDate[2]} ${year} ${shortDate[3]}`);
      return Number.isFinite(timestamp) ? timestamp : null;
    }
    const timestamp = Date.parse(raw);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
    return null;
  }

export function parseCdxLogJson(content) {
    const raw = String(content || "").trim();
    if (!raw) {
      return null;
    }
    try {
      return { kind: "json", value: JSON.parse(raw) };
    } catch {
      // Fall through to JSONL detection.
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

export function pickFirstObject(status, keys) {
    for (const key of keys) {
      if (status?.[key] && typeof status[key] === "object" && !Array.isArray(status[key])) {
        return status[key];
      }
    }
    return {};
  }

export function primaryActionControls() {
    return Array.from(document.querySelectorAll([
      "#viewer-insights",
      "#viewer-health",
      "#viewer-getting-started",
      "#viewer-bootstrap-logics",
      "#viewer-restart-server",
      "#viewer-workshop",
      "#viewer-ci",
      "#viewer-cdx",
      "#viewer-repo-folder",
      "#viewer-document-status",
      "#viewer-release-reset",
      '[data-action="getting-started"]',
      '[data-action="refresh"]',
      '[data-viewer-action="edit-document"]',
      "[data-viewer-project-id]",
      "[data-viewer-nav-target]",
      "[data-viewer-ci-mode]",
      "[data-viewer-cdx-mode]",
      "[data-viewer-cdx-session-action]",
      "[data-viewer-cdx-report]",
      "[data-viewer-cdx-artifact-path]",
    ].join(","))).filter((node) => node instanceof HTMLElement);
  }

export function projectPreferenceId(project) {
    return String(project?.id || project?.root || project?.name || "");
  }

export function projectStateLabel(project, state = null) {
    if (project?.available === false) {
      return "missing";
    }
    if (project?.hasLogics === false) {
      return "no Logics";
    }
    // Once the on-demand scan has landed, say what is actually going on in the
    // project. The switcher used to report only whether a corpus existed, so
    // finding where work was blocked meant switching into each one in turn.
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

export function releaseBadgeTone(value) {
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

export function releaseWorkshopTerminalObserver(entry) {
    if (entry?.resizeObserver) {
      try { entry.resizeObserver.disconnect(); } catch { /* noop */ }
      entry.resizeObserver = null;
    }
    if (entry?.resizeRaf) {
      cancelAnimationFrame(entry.resizeRaf);
      entry.resizeRaf = 0;
    }
  }

export function renderCdxModeSwitcher(active) {
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

export function renderCiModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes viewer-ci__modes" role="tablist" aria-label="Git and CI views">
        <button class="viewer-cdx__mode${active === "git" ? " is-active" : ""}" type="button" data-viewer-ci-mode="git" aria-selected="${active === "git" ? "true" : "false"}">Git</button>
        <button class="viewer-cdx__mode${active === "runs" ? " is-active" : ""}" type="button" data-viewer-ci-mode="runs" aria-selected="${active === "runs" ? "true" : "false"}">CI</button>
        <button class="viewer-cdx__mode${active === "release" ? " is-active" : ""}" type="button" data-viewer-ci-mode="release" aria-selected="${active === "release" ? "true" : "false"}">Release</button>
      </div>
    `;
  }

//: A dismissal lasts a session, and is keyed on what the warning says. Session storage is
//: exactly that lifetime, and keying on the message means a warning about something new
//: comes back immediately rather than hiding behind a decision made about something else.
const ENVIRONMENT_WARNING_DISMISS_KEY = "logics.viewer.environmentWarningDismissed";

function environmentWarningSignature(warning) {
    return `${warning.title || ""}::${warning.message || ""}`;
  }

export function dismissEnvironmentWarning(warning) {
    try {
      window.sessionStorage.setItem(ENVIRONMENT_WARNING_DISMISS_KEY, environmentWarningSignature(warning));
    } catch { /* the banner simply reappears on the next render */ }
    const banner = document.getElementById("viewer-environment-warning");
    if (banner instanceof HTMLElement) banner.hidden = true;
  }

export function environmentWarningIsDismissed(warning) {
    try {
      return window.sessionStorage.getItem(ENVIRONMENT_WARNING_DISMISS_KEY) === environmentWarningSignature(warning);
    } catch {
      return false;
    }
  }

//: Same lifetime and same reasoning as the environment warning's dismissal, keyed on the
//: duplicate executables named rather than the whole rendered message: a different set of
//: duplicates is a different warning and should not hide behind an old decision.
const UPDATE_WARNING_DISMISS_KEY = "logics.viewer.updateWarningDismissed";

function updateWarningSignature(duplicates) {
    return (duplicates || []).join(",");
  }

export function dismissUpdateWarning(duplicates) {
    try {
      window.sessionStorage.setItem(UPDATE_WARNING_DISMISS_KEY, updateWarningSignature(duplicates));
    } catch { /* the banner simply reappears on the next render */ }
    const banner = document.getElementById("viewer-update");
    if (banner instanceof HTMLElement) banner.hidden = true;
  }

export function updateWarningIsDismissed(duplicates) {
    try {
      return window.sessionStorage.getItem(UPDATE_WARNING_DISMISS_KEY) === updateWarningSignature(duplicates);
    } catch {
      return false;
    }
  }

export function renderEnvironmentWarning(warning) {
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

export function restoreDocumentViewState(content, state) {
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

export function scrollableAncestor(el) {
    let node = el;
    while (node && node !== document.body && node.parentElement) {
      const overflowY = (window.getComputedStyle(node).overflowY || "");
      if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement || el;
  }

export function setActiveGitFile(button) {
    document.querySelectorAll("[data-viewer-git-file]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("is-active", node === button);
      }
    });
  }

export function setButtonAvailable(button, title) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.title = title;
  }

export function setButtonUnavailable(button, message) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.title = message;
  }

export function setControlValue(id, value, eventName) {
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

export function setDocumentChromeOpen(open) {
    document.body?.classList.toggle("viewer-screen-document", Boolean(open));
  }

export function setNavMenuOpen(wrapper, open) {
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

export function showCdxFormStatus(el, type, message) {
    if (!el) return;
    el.hidden = false;
    el.className = `viewer-cdx__form-status viewer-cdx__form-status--${type}`;
    el.textContent = message;
  }

export function showMermaidFallback(message) {
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

export function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

export function statusValue(item) {
    return String(item?.indicators?.Status || "").toLowerCase();
  }

export function updateDocumentHeaderNav(content) {
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

export function updatedWithin(item, days) {
    const timestamp = Date.parse(item.updatedAt || "") || 0;
    return timestamp > 0 && timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
  }

export function workshopTerminalListNode() {
    return document.querySelector("[data-viewer-workshop-terminal-list]");
  }

export function workshopTerminalPreferredFontSize() {
    // Smaller cells on narrow viewports keep enough columns visible to make
    // TUIs (btop, lazygit, cdx) usable on a phone without horizontal scroll
    // taking over. Phone portrait sits in <=420, landscape in <=900.
    const width = window.innerWidth || document.documentElement?.clientWidth || 0;
    if (width <= 360) return 6;
    if (width <= 420) return 7;
    if (width <= 560) return 8;
    if (width <= 700) return 9;
    if (width <= 900) return 10;
    return 12;
  }

export function workshopTerminalStageNode() {
    return document.querySelector("[data-viewer-workshop-terminal-stage]");
  }

export function workspaceEntryIcon(kind, ignored) {
    if (kind === "directory") {
      return ignored
        ? '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 4h4l1 1h7v8H2V4Zm9.5 3.2L9.7 9l1.8 1.8-.7.7L9 9.7l-1.8 1.8-.7-.7L8.3 9 6.5 7.2l.7-.7L9 8.3l1.8-1.8.7.7Z"/></svg>'
        : '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 4h4l1 1h7v8H2V4Z"/></svg>';
    }
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 2h6l3 3v9H4V2Zm6 0v3h3"/></svg>';
  }

export function workspaceParentPath(path) {
    const parts = String(path || "").split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
  }

/**
 * Give a rendered document a reading measure and a contents list.
 *
 * item_762: the reader set its prose across the whole window -- about 150 characters a
 * line, twice a comfortable measure -- on the screen in the product most made of prose.
 * Narrowing it frees a column, and the column carries the navigation the reader did not
 * have: what the sections are, how many there are, and which one is on screen.
 *
 * Called after the markdown is in the DOM rather than woven into the renderer, because
 * the headings it lists are the rendered ones -- whatever produced them.
 */
export function applyReadingLayout(content) {
    if (!(content instanceof HTMLElement)) return null;
    const headings = Array.from(content.querySelectorAll(":scope > h1, :scope > h2"));
    // Two sections is a document you can see the end of; a contents list for it is a
    // second copy of the screen. The measure below still applies -- that is about the
    // line length, which is wrong at any number of headings.
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
    // The count is stated rather than left to be counted: how long the document is, is
    // the first thing the list is being asked.
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
        // The document scrolls inside its own panel, so the default hash jump moves the
        // page rather than the reader.
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

/**
 * Mark the section currently on screen in the contents list.
 *
 * The topmost heading that has passed the top of the viewport, not the first one
 * intersecting it: a reader halfway through a long section sees no heading at all, and a
 * list that then marks nothing says the reader is nowhere.
 */
function trackReadingPosition(content, sections) {
    const links = new Map(Array.from(content.querySelectorAll(".markdown-preview__contents-list a"))
      .map((link) => [link.dataset.section, link]));
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
    // Not marked synchronously: this runs while the document panel is still hidden, so
    // every rect is zero, every heading reads as "already passed the top", and the list
    // opens with its LAST section marked -- measured, and the reason this is deferred.
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(mark);
    else mark();
    content.addEventListener("scroll", mark, { passive: true });
    return () => content.removeEventListener("scroll", mark);
  }

/**
 * The slug the backend will give a document created from this title.
 *
 * item_763: mirrors `_slugify_viewer_doc` in logics_manager/viewer.py, so the path the
 * modal states is the path the file is written at. Two copies of one rule drift, so
 * tests/viewer.request-modal.test.ts runs both against the same inputs and fails when
 * they disagree -- the statement is only worth making if it is true.
 */
export function slugifyViewerDoc(text) {
    const slug = String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return slug.slice(0, 80) || "cdx_code_review_findings";
  }

/**
 * Where a request drafted with these fields will be written.
 *
 * The title falling back to the first line of the need is the backend's rule, not a
 * convenience added here: a modal that showed a path for a filled title and nothing for
 * an empty one would be silent in exactly the case the operator cannot predict.
 */
export function previewRequestPath({ title, intent, nextNumber }) {
    const effectiveTitle = String(title || "").trim()
      || String(intent || "").split("\n")[0].trim().slice(0, 80)
      || "New request";
    const number = Number.isInteger(nextNumber) && nextNumber >= 0
      ? String(nextNumber).padStart(3, "0")
      : "";
    // Without a number the path is still stated, with the part that is not yet decided
    // named as such. Inventing one would be worse than admitting it is allocated later.
    const ref = number ? `req_${number}_${slugifyViewerDoc(effectiveTitle)}` : `req_<next>_${slugifyViewerDoc(effectiveTitle)}`;
    return `logics/request/${ref}.md`;
  }
