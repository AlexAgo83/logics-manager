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

  function isProcessedWorkflowStatus(value) {
    const normalized = normalizeStatus(value);
    return (
      normalized === "ready" ||
      normalized === "in progress" ||
      normalized === "blocked" ||
      normalized === "done" ||
      normalized === "archived"
    );
  }

  function parseProgress(value) {
    if (!value) {
      return null;
    }
    const match = String(value).match(/(\d{1,3})/);
    if (!match) {
      return null;
    }
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return Math.max(0, Math.min(100, parsed));
  }

  function isProcessedWorkflowItem(item) {
    if (!item || (item.stage !== "backlog" && item.stage !== "task")) {
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
    return collectLinkedWorkflowItems(item, allItems).some((linkedItem) => isProcessedWorkflowItem(linkedItem));
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

    if ((item.stage === "request" || item.stage === "backlog") && insights.supportingDocs.length === 0) {
      reasons.push({
        key: "missing-supporting-doc",
        label: "Missing supporting doc",
        shortLabel: "Missing docs",
        description: "This workflow item has no linked companion docs or specs yet.",
        remediation: {
          label: "Create companion doc",
          action: "create-companion-doc"
        }
      });
    }

    const priority = {
      blocked: 0,
      "workflow-inconsistent": 1,
      "missing-supporting-doc": 2,
      orphaned: 3
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

  function buildContextPack(item, allItems) {
    const insights = getRelationshipInsights(item, allItems);
    const attentionReasons = getAttentionReasons(item, allItems).slice(0, 3);
    const upstream = insights.upstream.slice(0, 2);
    const downstream = insights.downstream.slice(0, 3);
    const linkedWorkflow = insights.linkedWorkflow.slice(0, 3);
    const companionDocs = insights.companionDocs.slice(0, 3);
    const specs = insights.specs.slice(0, 3);

    const openQuestions =
      attentionReasons.length > 0
        ? attentionReasons.map((reason) => `${reason.label}: ${reason.description}`)
        : ["No explicit graph-risk question is currently detected for this item."];

    const lines = [
      "# Codex Context Pack",
      "",
      "## Current item",
      `- ${describeContextItem(item)}`
    ];

    const contextSections = getWorkflowStageRank(item.stage) >= 0
      ? [
          renderContextSection("Upstream", upstream),
          renderContextSection("Downstream", downstream)
        ]
      : [renderContextSection("Linked workflow", linkedWorkflow)];

    contextSections.forEach((section) => {
      lines.push("", ...section);
    });
    lines.push("", ...renderContextSection("Companion docs", companionDocs));
    lines.push("", ...renderContextSection("Specs", specs));
    lines.push("", "## Open questions", ...openQuestions.map((entry) => `- ${entry}`));

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

    return {
      text: lines.join("\n"),
      summary: {
        upstreamCount: upstream.length,
        downstreamCount: downstream.length,
        linkedWorkflowCount: linkedWorkflow.length,
        companionCount: companionDocs.length,
        specCount: specs.length,
        trimmed:
          insights.upstream.length > upstream.length ||
          insights.downstream.length > downstream.length ||
          insights.linkedWorkflow.length > linkedWorkflow.length ||
          insights.companionDocs.length > companionDocs.length ||
          insights.specs.length > specs.length
      },
      attentionReasons
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
