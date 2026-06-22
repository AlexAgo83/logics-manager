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
      "logics/architecture/",
      "logics/specs/"
    ].some((prefix) => path.startsWith(prefix));
  }

  function matchesViewerFilter(item) {
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
    if (viewerFilterState.type === "companion" && !["product", "architecture", "spec"].includes(item.stage)) {
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
    if (viewerFilterState.status === "done" && !isClosed(item)) {
      return false;
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

  function applyViewerFilter(group, value) {
    if (!Object.prototype.hasOwnProperty.call(defaultFilterState, group)) {
      return;
    }
    viewerFilterState = { ...viewerFilterState, [group]: value || defaultFilterState[group] };
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    persistViewerFilterState();
    setControlValue("hide-complete", false, "change");
    setControlValue("hide-processed-requests", false, "change");
    setControlValue("hide-spec", false, "change");
    setControlValue("show-companion-docs", true, "change");
    setControlValue("hide-empty-columns", true, "change");
    updateFilterSummary();
  }

  function clearLocalPreset() {
    viewerFilterState = { ...defaultFilterState };
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    persistViewerFilterState();
    setControlValue("search-input", "", "input");
    setControlValue("hide-complete", false, "change");
    setControlValue("hide-processed-requests", false, "change");
    setControlValue("hide-spec", false, "change");
    setControlValue("show-companion-docs", true, "change");
    setControlValue("hide-empty-columns", true, "change");
    updateFilterSummary();
  }

  function updateFilterSummary() {
    document.querySelectorAll("[data-viewer-filter-group]").forEach((control) => {
      if (control instanceof HTMLSelectElement) {
        const group = control.getAttribute("data-viewer-filter-group") || "";
        control.value = viewerFilterState[group] || defaultFilterState[group] || "";
        return;
      }
      if (control instanceof HTMLElement) {
        const group = control.getAttribute("data-viewer-filter-group") || "";
        const value = control.getAttribute("data-viewer-filter-value") || "";
        control.setAttribute("aria-pressed", viewerFilterState[group] === value ? "true" : "false");
      }
    });
    const count = filterCount();
    if (!count) {
      return;
    }
    const visibleCount = latestItems.filter(matchesViewerFilter).length;
    const activeLabels = Object.entries(viewerFilterState)
      .filter(([key, value]) => value !== defaultFilterState[key])
      .map(([key, value]) => `${key}: ${String(value).replace("-", " ")}`);
    const suffix = activeLabels.length > 0 ? ` · ${activeLabels.join(" · ")}` : " · Active work";
    count.textContent = `${visibleCount} of ${latestItems.length} docs shown${suffix}`;
  }

  function countBy(items, selector) {
    return items.reduce((acc, item) => {
      const key = selector(item) || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function renderMetricCards(entries) {
    return entries.map(([label, value, tone]) => `
      <div class="viewer-insights__card${tone ? ` viewer-insights__card--${escapeHtml(tone)}` : ""}">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
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

  function renderInsightBars(entries, total) {
    const denominator = Math.max(1, Number(total) || 0);
    if (!entries.length) {
      return '<li class="viewer-insights__bar-row">No corpus shape available</li>';
    }
    return entries.map(([label, value]) => {
      const count = Number(value) || 0;
      const width = Math.max(count > 0 ? 4 : 0, Math.min(100, Math.round((count / denominator) * 100)));
      return `
        <li class="viewer-insights__bar-row">
          <div class="viewer-insights__bar-meta"><span>${escapeHtml(label)}</span><strong>${escapeHtml(count)}</strong></div>
          <div class="viewer-insights__bar-track" aria-hidden="true"><span style="width: ${width}%"></span></div>
        </li>
      `;
    }).join("");
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

  function renderInsightRows(items, emptyText = "No signals") {
    if (!items.length) {
      return `<li class="viewer-insights__item">${escapeHtml(emptyText)}</li>`;
    }
    return items.map(([label, value]) => `
      <li class="viewer-insights__item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("");
  }

  function renderDocRows(items, emptyText = "None", limit = 6) {
    if (!items.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = items.map((item, index) => {
      const path = item.relPath || item.path || "";
      const control = path && isSafeLogicsDocPath(path)
        ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(item.id || path)}</button>`
        : `<span class="viewer-insights__doc">${escapeHtml(item.id || path || item.title)}</span>`;
      return `
        <li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>
          ${control}
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

  function renderPathRows(paths, emptyText = "None", limit = 6) {
    if (!paths.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = paths.map((path, index) => {
      const control = isSafeLogicsDocPath(path)
        ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(path)}</button>`
        : `<span class="viewer-insights__doc">${escapeHtml(path)}</span>`;
      return `<li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>${control}</li>`;
    });
    const hiddenCount = Math.max(0, paths.length - limit);
    if (hiddenCount > 0) {
      rows.push(`<li class="viewer-insights__row"><button class="viewer-insights__reveal" type="button" data-viewer-reveal>Show ${hiddenCount} more</button></li>`);
    }
    return rows.join("");
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

  function itemLabel(item) {
    return `${item.id || item.relPath || "doc"} - ${item.indicators?.Status || "No status"}`;
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
    const mostReferenced = [...docs]
      .sort((left, right) => (right.usedBy || []).length - (left.usedBy || []).length)
      .filter((item) => (item.usedBy || []).length > 0)
      .slice(0, 8);
    const recentRows = [...docs]
      .sort((left, right) => (Date.parse(right.updatedAt || "") || 0) - (Date.parse(left.updatedAt || "") || 0))
      .slice(0, 8);
    const staleActive = open.filter(isStale).slice(0, 8);
    const qualityFindings = lintData && auditData ? collectHealthFindings(lintData, auditData) : [];
    const qualityBySource = countBy(qualityFindings, (finding) => finding.source || finding.code || "finding");
    const qualityByDocType = countBy(qualityFindings, (finding) => {
      const path = String(finding.path || "");
      const matched = docs.find((item) => item.relPath === path);
      return matched?.stage || (path ? "unknown document" : "repository");
    });
    const concentratedIssues = Object.entries(countBy(qualityFindings, (finding) => finding.path || "repository"))
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .slice(0, 8);
    const actions = [];
    if (blocked.length) {
      actions.push({ label: "Review blocked workflow docs", value: blocked.length, filter: { group: "focus", value: "blocked" } });
    }
    if (incompleteChains.length) {
      actions.push({ label: "Promote or close incomplete workflow chains", value: incompleteChains.length, filter: { group: "focus", value: "needs-promotion" } });
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

    const stageRows = Object.entries(countsByStage)
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
      .map(([stage, count]) => [stage, count]);
    const qualityTotal = qualityFindings.length;
    const needsAttention = blocked.length + incompleteChains.length + brokenRefs.length + missingStatus.length + qualityTotal;
    const activeQuiet = Math.max(0, open.length - recentlyModified.length - staleActive.length);
    const primaryState = needsAttention > 0
      ? `${needsAttention} signals need attention`
      : "No immediate workflow risk detected";
    return `
      <div class="viewer-insights">
        <section class="viewer-insights__hero">
          <div>
            <h2>Overview</h2>
            <p>${escapeHtml(primaryState)} across ${escapeHtml(docs.length)} workflow docs.</p>
          </div>
          <div class="viewer-insights__summary">${renderMetricCards([
            ["Docs", docs.length],
            ["Needs attention", needsAttention, needsAttention ? "warning" : "ok"],
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
            <ul class="viewer-insights__bars">${renderInsightBars(stageRows, docs.length)}</ul>
            <ul class="viewer-insights__list">${renderInsightRows([
              ["Open", open.length],
              ["Closed", closed.length],
              ["Blocked", blocked.length],
              ["Missing status", missingStatus.length]
            ])}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Flow health</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
              ["Incomplete workflow chains", incompleteChains.length, incompleteChains.length ? "warning" : "ok"],
              ["Promotion gaps", incompleteChains.filter((item) => item.stage === "request" || item.stage === "backlog").length, incompleteChains.length ? "warning" : "ok"],
              ["Orphan or unlinked docs", unlinked.length, unlinked.length ? "muted" : "ok"],
              ["Broken reference risks", brokenRefs.length, brokenRefs.length ? "warning" : "ok"]
            ])}</ul>
            <ul class="viewer-insights__rows">${renderDocRows(incompleteChains, "No incomplete chains")}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Activity</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
              ["Recently active docs", recentlyModified.length],
              ["Stale active docs", staleActive.length, staleActive.length ? "warning" : "ok"],
              ["Quiet active docs", activeQuiet]
            ])}</ul>
            <ul class="viewer-insights__rows">${renderDocRows(recentRows, "No recent documents")}</ul>
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

