(() => {
  const WORKFLOW_STAGE_ORDER = ["request", "backlog", "task"];

  function getStageLabel(stage) {
    switch (stage) {
      case "request":
        return "request";
      case "backlog":
        return "backlog";
      case "task":
        return "task";
      case "product":
        return "product brief";
      case "architecture":
        return "architecture decision";
      case "spec":
        return "spec";
      default:
        return String(stage || "item");
    }
  }

  function getStageHeading(stage) {
    switch (stage) {
      case "request":
        return "Requests";
      case "backlog":
        return "Backlog";
      case "task":
        return "Tasks";
      case "product":
        return "Product briefs";
      case "architecture":
        return "Architecture decisions";
      case "spec":
        return "Specs";
      default:
        return String(stage || "").trim();
    }
  }

  function isPrimaryFlowStage(stage) {
    return stage === "request" || stage === "backlog" || stage === "task";
  }

  function isCompanionStage(stage) {
    return stage === "product" || stage === "architecture";
  }

  function normalizeManagedDocValue(value) {
    return String(value || "")
      .replace(/\\/g, "/")
      .replace(/^\.?\//, "")
      .trim();
  }

  function inferManagedDocId(normalizedValue, fallbackUsage) {
    if (fallbackUsage && typeof fallbackUsage.id === "string" && fallbackUsage.id) {
      return fallbackUsage.id;
    }
    if (!normalizedValue) {
      return "";
    }
    return normalizedValue.split("/").pop()?.replace(/\.md$/i, "") || normalizedValue;
  }

  function inferCompanionStage(normalizedValue, fallbackUsage) {
    if (fallbackUsage && isCompanionStage(fallbackUsage.stage)) {
      return fallbackUsage.stage;
    }
    const fileStem = inferManagedDocId(normalizedValue);
    if (normalizedValue.startsWith("logics/product/") || fileStem.startsWith("prod_")) {
      return "product";
    }
    if (normalizedValue.startsWith("logics/architecture/") || fileStem.startsWith("adr_")) {
      return "architecture";
    }
    return null;
  }

  function findManagedItemByReference(rawValue, allItems, fallbackUsage) {
    const normalizedValue = normalizeManagedDocValue(rawValue);
    if (fallbackUsage && fallbackUsage.id) {
      const byUsageId = allItems.find((entry) => entry.id === fallbackUsage.id);
      if (byUsageId) {
        return byUsageId;
      }
    }
    if (!normalizedValue) {
      return null;
    }
    const fileStem = normalizedValue.split("/").pop()?.replace(/\.md$/i, "") || "";
    return (
      allItems.find((entry) => entry.relPath === normalizedValue) ||
      allItems.find((entry) => entry.id === normalizedValue) ||
      allItems.find((entry) => entry.id === fileStem) ||
      null
    );
  }

  function resolveCompanionFromValue(rawValue, allItems, fallbackUsage) {
    const normalizedValue = normalizeManagedDocValue(rawValue);
    const matchedItem = findManagedItemByReference(normalizedValue, allItems, fallbackUsage);
    if (matchedItem && isCompanionStage(matchedItem.stage)) {
      return {
        id: matchedItem.id,
        title: matchedItem.title,
        stage: matchedItem.stage,
        relPath: matchedItem.relPath,
        item: matchedItem
      };
    }

    const fallbackStage = inferCompanionStage(normalizedValue, fallbackUsage);
    if (!fallbackStage) {
      return null;
    }

    const fallbackId = inferManagedDocId(normalizedValue, fallbackUsage);
    return {
      id: fallbackId || normalizedValue,
      title: fallbackUsage && fallbackUsage.title ? fallbackUsage.title : normalizedValue,
      stage: fallbackStage,
      relPath: normalizedValue,
      item: null
    };
  }

  function collectCompanionDocs(item, allItems) {
    const companions = new Map();

    const registerCompanion = (candidate) => {
      if (!candidate || !isCompanionStage(candidate.stage)) {
        return;
      }
      const key = candidate.relPath || candidate.id;
      if (!key || companions.has(key)) {
        return;
      }
      companions.set(key, candidate);
    };

    (item.references || []).forEach((reference) => {
      if (!reference || typeof reference !== "object") {
        return;
      }
      registerCompanion(resolveCompanionFromValue(reference.path, allItems));
    });

    (item.usedBy || []).forEach((usage) => {
      registerCompanion(resolveCompanionFromValue(usage.relPath || usage.id, allItems, usage));
    });

    const order = ["product", "architecture"];
    return Array.from(companions.values()).sort((left, right) => {
      const leftIndex = order.indexOf(left.stage);
      const rightIndex = order.indexOf(right.stage);
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return String(left.id).localeCompare(String(right.id));
    });
  }

  function collectSpecs(item, allItems) {
    const specs = new Map();

    const registerSpec = (candidate) => {
      if (!candidate || candidate.stage !== "spec") {
        return;
      }
      const key = candidate.relPath || candidate.id;
      if (!key || specs.has(key)) {
        return;
      }
      specs.set(key, candidate);
    };

    (item.references || []).forEach((reference) => {
      if (!reference || typeof reference !== "object") {
        return;
      }
      registerSpec(findManagedItemByReference(reference.path, allItems));
    });

    (item.usedBy || []).forEach((usage) => {
      registerSpec(findManagedItemByReference(usage.relPath || usage.id, allItems, usage));
    });

    return Array.from(specs.values()).sort((left, right) => String(left.id).localeCompare(String(right.id)));
  }

  function collectPrimaryFlowItems(item, allItems) {
    const linkedItems = new Map();

    const registerItem = (candidate) => {
      if (!candidate || !isPrimaryFlowStage(candidate.stage)) {
        return;
      }
      const key = candidate.relPath || candidate.id;
      if (!key || linkedItems.has(key)) {
        return;
      }
      linkedItems.set(key, candidate);
    };

    (item.references || []).forEach((reference) => {
      if (!reference || typeof reference !== "object") {
        return;
      }
      registerItem(findManagedItemByReference(reference.path, allItems));
    });

    (item.usedBy || []).forEach((usage) => {
      registerItem(findManagedItemByReference(usage.relPath || usage.id, allItems, usage));
    });

    const order = ["request", "backlog", "task"];
    return Array.from(linkedItems.values()).sort((left, right) => {
      const leftIndex = order.indexOf(left.stage);
      const rightIndex = order.indexOf(right.stage);
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return String(left.id).localeCompare(String(right.id));
    });
  }

  function normalizeStatus(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function parseProgress(value) {
    const match = String(value || "").match(/(\d+(?:\.\d+)?)/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.max(0, Math.min(100, parsed));
  }

  function isProcessedWorkflowStatus(value) {
    const normalized = normalizeStatus(value);
    return normalized === "ready" || normalized === "done" || normalized === "complete" || normalized === "completed" || normalized === "archived";
  }

  function isProcessedWorkflowItem(item) {
    if (!item) {
      return false;
    }
    if (item.stage !== "backlog" && item.stage !== "task") {
      return false;
    }
    if (isProcessedWorkflowStatus(item && item.indicators ? item.indicators.Status : "")) {
      return true;
    }
    return parseProgress(item && item.indicators ? item.indicators.Progress : "") === 100;
  }

  function workflowCandidateKeys(candidate) {
    const keys = new Set();
    if (candidate && candidate.relPath) {
      const normalizedPath = normalizeManagedDocValue(candidate.relPath);
      keys.add(normalizedPath);
      keys.add(normalizedPath.split("/").pop()?.replace(/\.md$/i, "") || normalizedPath);
    }
    if (candidate && candidate.id) {
      keys.add(candidate.id);
    }
    return Array.from(keys).filter(Boolean);
  }

  function collectLinkedWorkflowItems(item, allItems) {
    if (!item || item.stage !== "request") {
      return [];
    }
    const linkedValues = new Set();
    if (Array.isArray(item.references)) {
      item.references.forEach((ref) => {
        if (ref && typeof ref.path === "string") {
          linkedValues.add(normalizeManagedDocValue(ref.path));
        }
      });
    }
    if (Array.isArray(item.usedBy)) {
      item.usedBy.forEach((usage) => {
        const rawValue =
          usage && typeof usage.relPath === "string"
            ? usage.relPath
            : usage && typeof usage.id === "string"
              ? usage.id
              : "";
        if (rawValue) {
          linkedValues.add(normalizeManagedDocValue(rawValue));
        }
      });
    }
    const linkedItems = new Map();
    (allItems || []).forEach((candidate) => {
      workflowCandidateKeys(candidate).forEach((key) => {
        if (!linkedItems.has(key)) {
          linkedItems.set(key, candidate);
        }
      });
    });
    return Array.from(linkedValues)
      .map((rawValue) => linkedItems.get(rawValue) || findManagedItemByReference(rawValue, allItems))
      .filter((candidate, index, collection) => candidate && collection.indexOf(candidate) === index);
  }

  function isRequestProcessed(item, allItems) {
    if (!item || item.stage !== "request") {
      return false;
    }
    if (!isProcessedWorkflowStatus(item && item.indicators ? item.indicators.Status : "")) {
      return false;
    }
    return collectLinkedWorkflowItems(item, allItems).some((candidate) => isProcessedWorkflowItem(candidate));
  }

  function getWorkflowStageRank(stage) {
    return WORKFLOW_STAGE_ORDER.indexOf(stage);
  }

  function dedupeItems(items) {
    const seen = new Set();
    return (items || []).filter((item) => {
      if (!item) {
        return false;
      }
      const key = item.relPath || item.id;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function sortWorkflowItems(items) {
    return dedupeItems(items).sort((left, right) => {
      const leftRank = getWorkflowStageRank(left.stage);
      const rightRank = getWorkflowStageRank(right.stage);
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return String(left.id).localeCompare(String(right.id));
    });
  }

  function sortManagedItems(items) {
    return dedupeItems(items).sort((left, right) => {
      const leftStage = getStageLabel(left.stage);
      const rightStage = getStageLabel(right.stage);
      if (leftStage !== rightStage) {
        return leftStage.localeCompare(rightStage);
      }
      return String(left.id).localeCompare(String(right.id));
    });
  }

  function getRelationshipInsights(item, allItems) {
    const companions = collectCompanionDocs(item, allItems);
    const specs = collectSpecs(item, allItems);
    const primaryFlowLinks = collectPrimaryFlowItems(item, allItems);
    const stageRank = getWorkflowStageRank(item && item.stage);

    let upstream = [];
    let downstream = [];
    let linkedWorkflow = [];

    if (stageRank >= 0) {
      upstream = sortWorkflowItems(primaryFlowLinks.filter((candidate) => getWorkflowStageRank(candidate.stage) < stageRank));
      downstream = sortWorkflowItems(primaryFlowLinks.filter((candidate) => getWorkflowStageRank(candidate.stage) > stageRank));
    } else {
      linkedWorkflow = sortWorkflowItems(primaryFlowLinks);
    }

    return {
      upstream,
      downstream,
      linkedWorkflow,
      companionDocs: sortManagedItems(companions.map((entry) => entry.item || entry).filter(Boolean)),
      specs: sortManagedItems(specs),
      supportingDocs: sortManagedItems([
        ...companions.map((entry) => entry.item || entry).filter(Boolean),
        ...specs
      ])
    };
  }

  function getAttentionReasons(item, allItems) {
    if (!item) {
      return [];
    }

    const insights = getRelationshipInsights(item, allItems);
    const statusValue = normalizeStatus(item && item.indicators ? item.indicators.Status : "");
    const progressValue = parseProgress(item && item.indicators ? item.indicators.Progress : "");
    const reasons = [];

    if (statusValue.includes("blocked")) {
      reasons.push({
        key: "blocked",
        label: "Blocked",
        shortLabel: "Blocked",
        description: "This item is explicitly marked as blocked in its indicators.",
        remediation: {
          label: "Update blockers in the doc",
          description: "Clarify the blocking dependency or move the item back to an actionable status."
        }
      });
    }

    if (progressValue === 100 && !statusValue.includes("done") && !statusValue.includes("complete")) {
      reasons.push({
        key: "workflow-inconsistent",
        label: "Workflow inconsistent",
        shortLabel: "Inconsistent",
        description: "Progress is at 100% but the workflow status is not marked as done or complete.",
        remediation: {
          label: "Sync status with progress",
          description: "Mark the item done or adjust progress so status and progress describe the same state."
        }
      });
    }

    if (item.stage === "request" && !isRequestProcessed(item, allItems)) {
      reasons.push({
        key: "workflow-inconsistent",
        label: "Workflow inconsistent",
        shortLabel: "No delivery child",
        description: "This request has no linked backlog or task item in a delivery-ready workflow state yet.",
        remediation: {
          label: "Promote request",
          action: "promote"
        }
      });
    }

    if (!isPrimaryFlowStage(item.stage) && insights.linkedWorkflow.length === 0) {
      reasons.push({
        key: "orphaned",
        label: "Orphaned",
        shortLabel: "Orphaned",
        description: "This supporting document is not linked back to any request, backlog item, or task.",
        remediation: {
          label: "Link to primary flow",
          action: "add-reference"
        }
      });
    }

    const priority = {
      blocked: 0,
      "workflow-inconsistent": 1,
      orphaned: 2
    };

    return reasons
      .sort((left, right) => {
        const leftPriority = Object.prototype.hasOwnProperty.call(priority, left.key) ? priority[left.key] : 99;
        const rightPriority = Object.prototype.hasOwnProperty.call(priority, right.key) ? priority[right.key] : 99;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return String(left.label).localeCompare(String(right.label));
      })
      .filter((reason, index, collection) => collection.findIndex((candidate) => candidate.key === reason.key && candidate.description === reason.description) === index);
  }

  function describeContextItem(item) {
    const status = item && item.indicators && item.indicators.Status ? ` [${item.indicators.Status}]` : "";
    return `${getStageLabel(item.stage)} • ${item.id} — ${item.title}${status} (${item.relPath})`;
  }

  function renderContextSection(title, items) {
    const safeItems = (items || []).filter(Boolean);
    if (safeItems.length === 0) {
      return [`## ${title}`, "- (none)"];
    }
    return [`## ${title}`, ...safeItems.map((item) => `- ${describeContextItem(item)}`)];
  }

  function normalizeContextMode(value) {
    const normalized = String(value || "standard").trim().toLowerCase();
    if (normalized === "summary-only" || normalized === "diff-first") {
      return normalized;
    }
    return "standard";
  }

  function normalizeContextProfile(value) {
    const normalized = String(value || "normal").trim().toLowerCase();
    if (normalized === "tiny" || normalized === "deep") {
      return normalized;
    }
    return "normal";
  }

  function normalizeResponseStyle(value) {
    const normalized = String(value || "concise").trim().toLowerCase();
    if (normalized === "balanced" || normalized === "detailed") {
      return normalized;
    }
    return "concise";
  }

  function inferTaskKind(item, mode) {
    if (mode === "diff-first") {
      return item && item.stage === "spec" ? "review" : "implementation";
    }
    if (!item || item.stage === "request") {
      return "request";
    }
    if (item.stage === "backlog" || item.stage === "task") {
      return "implementation";
    }
    if (item.stage === "spec") {
      return "spec";
    }
    return "review";
  }

  function inferDefaultProfile(item, activeAgent, mode, taskKind) {
    if (activeAgent && activeAgent.preferredContextProfile) {
      return normalizeContextProfile(activeAgent.preferredContextProfile);
    }
    if (mode === "summary-only") {
      return "tiny";
    }
    if (mode === "diff-first") {
      return "tiny";
    }
    if (taskKind === "spec") {
      return "deep";
    }
    if (item && item.stage === "request") {
      return "normal";
    }
    return "normal";
  }

  function buildProfileLimits(profile, mode) {
    if (mode === "summary-only") {
      return { upstream: 1, downstream: 1, linkedWorkflow: 2, companion: 1, specs: 1, summaryPoints: 3, acceptanceCriteria: 3, changedPaths: 6 };
    }
    if (mode === "diff-first") {
      return { upstream: 1, downstream: 2, linkedWorkflow: 2, companion: 1, specs: 1, summaryPoints: 2, acceptanceCriteria: 4, changedPaths: 12 };
    }
    if (profile === "tiny") {
      return { upstream: 1, downstream: 2, linkedWorkflow: 2, companion: 1, specs: 1, summaryPoints: 3, acceptanceCriteria: 3, changedPaths: 6 };
    }
    if (profile === "deep") {
      return { upstream: 3, downstream: 4, linkedWorkflow: 4, companion: 4, specs: 3, summaryPoints: 5, acceptanceCriteria: 6, changedPaths: 16 };
    }
    return { upstream: 2, downstream: 3, linkedWorkflow: 3, companion: 3, specs: 2, summaryPoints: 4, acceptanceCriteria: 4, changedPaths: 10 };
  }

  function isCompleteStatus(item) {
    const status = String(item && item.indicators && item.indicators.Status ? item.indicators.Status : "").trim().toLowerCase();
    return status === "done" || status === "archived" || status === "obsolete" || status === "superseded";
  }

  function isWeaklyLinked(item, currentItem) {
    if (!item || !currentItem || item.id === currentItem.id) {
      return false;
    }
    if (item.stage === "product" || item.stage === "architecture" || item.stage === "spec") {
      return true;
    }
    return false;
  }

  function allowDocStage(item, activeAgent) {
    if (!item || !activeAgent) {
      return true;
    }
    const stage = String(item.stage || "").trim().toLowerCase();
    if (Array.isArray(activeAgent.blockedDocStages) && activeAgent.blockedDocStages.includes(stage)) {
      return false;
    }
    if (Array.isArray(activeAgent.allowedDocStages) && activeAgent.allowedDocStages.length > 0) {
      return activeAgent.allowedDocStages.includes(stage);
    }
    return true;
  }

  function filterContextItems(items, currentItem, activeAgent) {
    const included = [];
    let staleExcluded = 0;
    let blockedExcluded = 0;
    (items || []).forEach((candidate) => {
      if (!candidate) {
        return;
      }
      if (!allowDocStage(candidate, activeAgent)) {
        blockedExcluded += 1;
        return;
      }
      if (candidate.id !== currentItem.id && isCompleteStatus(candidate) && isWeaklyLinked(candidate, currentItem)) {
        staleExcluded += 1;
        return;
      }
      included.push(candidate);
    });
    return { included, staleExcluded, blockedExcluded };
  }

  function sliceContextItems(items, limit) {
    return (items || []).filter(Boolean).slice(0, Math.max(0, limit || 0));
  }

  function getSummaryPoints(item, limit) {
    const summaryPoints = Array.isArray(item && item.summaryPoints) ? item.summaryPoints : [];
    return summaryPoints.filter(Boolean).slice(0, Math.max(0, limit || 0));
  }

  function getAcceptanceCriteria(item, limit) {
    const criteria = Array.isArray(item && item.acceptanceCriteria) ? item.acceptanceCriteria : [];
    return criteria.filter(Boolean).slice(0, Math.max(0, limit || 0));
  }

  function buildResponseContract(taskKind, responseStyle) {
    const style = normalizeResponseStyle(responseStyle);
    if (taskKind === "review") {
      return style === "detailed"
        ? "Review mode: findings first, then open questions, then a brief change summary."
        : "Review mode: findings first. Keep the response terse unless deeper analysis is requested.";
    }
    if (taskKind === "implementation") {
      return style === "detailed"
        ? "Implementation mode: give the smallest complete fix, then a short verification note."
        : "Implementation mode: respond concisely with the concrete change and a brief verification note.";
    }
    if (taskKind === "spec") {
      return style === "concise"
        ? "Spec mode: keep the structure clear and compact, and avoid unnecessary prose."
        : "Spec mode: stay structured and avoid repeating context already present in the Logics docs.";
    }
    return style === "detailed"
      ? "Default mode: stay grounded in the provided context and avoid repeating obvious repository history."
      : "Default mode: respond briefly unless more depth is explicitly requested.";
  }

  function estimateTokens(charCount) {
    return Math.max(1, Math.ceil(Number(charCount || 0) / 4));
  }

  function classifyBudget(tokenEstimate) {
    if (tokenEstimate <= 180) {
      return "Lean";
    }
    if (tokenEstimate <= 420) {
      return "Medium";
    }
    return "Heavy";
  }

  function normalizeChangedPaths(paths, limit) {
    return (Array.isArray(paths) ? paths : [])
      .map((entry) => String(entry || "").replace(/\\/g, "/").trim())
      .filter((entry, index, collection) => entry.length > 0 && collection.indexOf(entry) === index)
      .slice(0, Math.max(0, limit || 0));
  }

  function getRelevantChangedPaths(item, insights, changedPaths, limit) {
    const relatedPathHints = new Set([
      String(item && item.relPath ? item.relPath : "").replace(/\\/g, "/"),
      ...((insights.upstream || []).map((entry) => String(entry.relPath || "").replace(/\\/g, "/"))),
      ...((insights.downstream || []).map((entry) => String(entry.relPath || "").replace(/\\/g, "/"))),
      ...((insights.linkedWorkflow || []).map((entry) => String(entry.relPath || "").replace(/\\/g, "/"))),
      ...((insights.supportingDocs || []).map((entry) => String(entry.relPath || "").replace(/\\/g, "/")))
    ]);

    const matching = normalizeChangedPaths(changedPaths, 80).filter((entry) => {
      if (relatedPathHints.has(entry)) {
        return true;
      }
      return Array.from(relatedPathHints).some((hint) => hint && entry.endsWith(pathBasename(hint)));
    });

    const fallback = matching.length > 0 ? matching : normalizeChangedPaths(changedPaths, limit);
    return fallback.slice(0, Math.max(0, limit || 0));
  }

  function pathBasename(value) {
    const normalized = String(value || "").replace(/\\/g, "/");
    const segments = normalized.split("/");
    return segments[segments.length - 1] || normalized;
  }

  function buildSessionHint(item, mode, taskKind, currentRoot, lastInjectedContext) {
    if (!lastInjectedContext) {
      return null;
    }
    if (lastInjectedContext.root && currentRoot && lastInjectedContext.root !== currentRoot) {
      return "Fresh session recommended: the active repository root changed since the last assistant handoff.";
    }
    if (lastInjectedContext.itemId && lastInjectedContext.itemId !== item.id) {
      if (lastInjectedContext.taskKind && lastInjectedContext.taskKind !== taskKind) {
        return "Fresh session recommended: the active task type changed since the last assistant handoff.";
      }
      return "Fresh session recommended: you switched to a different Logics item since the last assistant handoff.";
    }
    if (lastInjectedContext.mode && lastInjectedContext.mode !== mode) {
      return "Fresh session recommended: the handoff mode changed materially since the last assistant handoff.";
    }
    return null;
  }

  function buildContextPack(item, allItems, options) {
    const safeOptions = options || {};
    const activeAgent = safeOptions.activeAgent || null;
    const mode = normalizeContextMode(safeOptions.mode);
    const taskKind = inferTaskKind(item, mode);
    const profile = normalizeContextProfile(safeOptions.profile || inferDefaultProfile(item, activeAgent, mode, taskKind));
    const limits = buildProfileLimits(profile, mode);
    const insights = getRelationshipInsights(item, allItems);
    const attentionReasons = getAttentionReasons(item, allItems).slice(0, 3);
    const upstreamState = filterContextItems(insights.upstream, item, activeAgent);
    const downstreamState = filterContextItems(insights.downstream, item, activeAgent);
    const linkedWorkflowState = filterContextItems(insights.linkedWorkflow, item, activeAgent);
    const companionState = filterContextItems(insights.companionDocs, item, activeAgent);
    const specsState = filterContextItems(insights.specs, item, activeAgent);
    const upstream = sliceContextItems(upstreamState.included, limits.upstream);
    const downstream = sliceContextItems(downstreamState.included, limits.downstream);
    const linkedWorkflow = sliceContextItems(linkedWorkflowState.included, limits.linkedWorkflow);
    const companionDocs = sliceContextItems(companionState.included, limits.companion);
    const specs = sliceContextItems(specsState.included, limits.specs);
    const summaryPoints = getSummaryPoints(item, limits.summaryPoints);
    const acceptanceCriteria = getAcceptanceCriteria(item, limits.acceptanceCriteria);
    const changedPaths = getRelevantChangedPaths(item, insights, safeOptions.changedPaths, limits.changedPaths);
    const responseContract = buildResponseContract(taskKind, activeAgent && activeAgent.responseStyle);
    const sessionHint = buildSessionHint(item, mode, taskKind, safeOptions.currentRoot, safeOptions.lastInjectedContext);
    const profileLabel = profile.toUpperCase();
    const modeLabel = mode === "summary-only" ? "SUMMARY" : mode === "diff-first" ? "DIFF-FIRST" : "STANDARD";
    const excludedStaleCount =
      upstreamState.staleExcluded +
      downstreamState.staleExcluded +
      linkedWorkflowState.staleExcluded +
      companionState.staleExcluded +
      specsState.staleExcluded;
    const blockedDocCount =
      upstreamState.blockedExcluded +
      downstreamState.blockedExcluded +
      linkedWorkflowState.blockedExcluded +
      companionState.blockedExcluded +
      specsState.blockedExcluded;

    const openQuestions =
      attentionReasons.length > 0
        ? attentionReasons.map((reason) => `${reason.label}: ${reason.description}`)
        : ["No explicit graph-risk question is currently detected for this item."];

    const lines = [
      "# Assistant Context Pack",
      "",
      `- Mode: ${modeLabel}`,
      `- Profile: ${profileLabel}`,
      `- Task type: ${taskKind}`,
      activeAgent ? `- Active agent: ${activeAgent.displayName} (${activeAgent.id})` : "- Active agent: (none selected)",
      "",
      "## Current item",
      `- ${describeContextItem(item)}`
    ];

    if (summaryPoints.length > 0) {
      lines.push("", "## Summary", ...summaryPoints.map((entry) => `- ${entry}`));
    }

    if (acceptanceCriteria.length > 0) {
      lines.push("", "## Acceptance criteria", ...acceptanceCriteria.map((entry) => `- ${entry}`));
    }

    if (changedPaths.length > 0) {
      lines.push("", mode === "diff-first" ? "## Changed files first" : "## Recent changed files", ...changedPaths.map((entry) => `- ${entry}`));
    }

    const contextSections =
      mode === "summary-only"
        ? []
        : getWorkflowStageRank(item.stage) >= 0
          ? [
              renderContextSection("Upstream", upstream),
              renderContextSection("Downstream", downstream)
            ]
          : [renderContextSection("Linked workflow", linkedWorkflow)];

    contextSections.forEach((section) => {
      lines.push("", ...section);
    });

    if (mode !== "summary-only") {
      lines.push("", ...renderContextSection("Companion docs", companionDocs));
      lines.push("", ...renderContextSection("Specs", specs));
    }
    lines.push("", "## Open questions", ...openQuestions.map((entry) => `- ${entry}`));
    lines.push("", "## Response contract", `- ${responseContract}`);

    if (sessionHint) {
      lines.push("", "## Session hygiene", `- ${sessionHint}`);
    }

    if (attentionReasons.length > 0) {
      lines.push(
        "",
        "## Suggested next actions",
        ...attentionReasons.map((reason) => {
          const action = reason.remediation && reason.remediation.label ? reason.remediation.label : reason.label;
          return `- ${action}`;
        })
      );
    }

    const text = lines.join("\n");
    const relatedDocCount = 1 + upstream.length + downstream.length + linkedWorkflow.length + companionDocs.length + specs.length;
    const lineCount = text.split("\n").length;
    const charCount = text.length;
    const tokenEstimate = estimateTokens(charCount);

    return {
      text,
      summary: {
        mode,
        profile,
        taskKind,
        upstreamCount: upstream.length,
        downstreamCount: downstream.length,
        linkedWorkflowCount: linkedWorkflow.length,
        companionCount: companionDocs.length,
        specCount: specs.length,
        changedPathCount: changedPaths.length,
        summaryPointCount: summaryPoints.length,
        acceptanceCriteriaCount: acceptanceCriteria.length,
        docCount: relatedDocCount,
        lineCount,
        charCount,
        tokenEstimate,
        budgetLabel: classifyBudget(tokenEstimate),
        excludedStaleCount,
        blockedDocCount,
        responseContract,
        sessionHint,
        trimmed:
          upstreamState.included.length > upstream.length ||
          downstreamState.included.length > downstream.length ||
          linkedWorkflowState.included.length > linkedWorkflow.length ||
          companionState.included.length > companionDocs.length ||
          specsState.included.length > specs.length
      },
      attentionReasons,
      sessionHygiene: sessionHint,
      relatedChangedPaths: changedPaths
    };
  }

  function buildDependencyMap(item, allItems) {
    const insights = getRelationshipInsights(item, allItems);
    const groups =
      getWorkflowStageRank(item.stage) >= 0
        ? [
            { key: "upstream", label: "Upstream", items: insights.upstream.slice(0, 2) },
            { key: "current", label: "Current", items: [item] },
            { key: "downstream", label: "Downstream", items: insights.downstream.slice(0, 3) },
            { key: "supporting", label: "Supporting docs", items: insights.supportingDocs.slice(0, 4) }
          ]
        : [
            { key: "workflow", label: "Linked workflow", items: insights.linkedWorkflow.slice(0, 3) },
            { key: "current", label: "Current", items: [item] },
            { key: "supporting", label: "Supporting docs", items: insights.supportingDocs.slice(0, 4) }
          ];

    const nodes = groups.flatMap((group) => group.items);
    const edges = dedupeItems(nodes)
      .filter((candidate) => candidate && candidate.id !== item.id)
      .map((candidate) => ({ from: item.id, to: candidate.id }));

    return {
      groups: groups.filter((group) => group.items.length > 0),
      nodes: dedupeItems(nodes),
      edges
    };
  }

  window.CdxLogicsModel = {
    buildContextPack,
    buildDependencyMap,
    collectCompanionDocs,
    collectPrimaryFlowItems,
    collectSpecs,
    findManagedItemByReference,
    getAttentionReasons,
    getRelationshipInsights,
    getStageHeading,
    getStageLabel,
    isCompanionStage,
    isPrimaryFlowStage,
    isRequestProcessed,
    normalizeManagedDocValue
  };
})();
