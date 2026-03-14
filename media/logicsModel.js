(() => {
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
    return normalized === "ready" || normalized === "in progress" || normalized === "blocked" || normalized === "done";
  }

  function collectLinkedWorkflowItems(item, allItems) {
    if (!item || item.stage !== "request") {
      return [];
    }
    const linkedPaths = new Set();
    if (Array.isArray(item.references)) {
      item.references.forEach((ref) => {
        if (ref && typeof ref.path === "string") {
          linkedPaths.add(ref.path.replace(/\\/g, "/"));
        }
      });
    }
    if (Array.isArray(item.usedBy)) {
      item.usedBy.forEach((usage) => {
        if (usage && typeof usage.relPath === "string") {
          linkedPaths.add(usage.relPath.replace(/\\/g, "/"));
        }
      });
    }
    return allItems.filter(
      (candidate) =>
        linkedPaths.has(String(candidate.relPath || "").replace(/\\/g, "/")) &&
        (candidate.stage === "backlog" || candidate.stage === "task")
    );
  }

  function isRequestProcessed(item, allItems) {
    return collectLinkedWorkflowItems(item, allItems).some((linkedItem) =>
      isProcessedWorkflowStatus(linkedItem && linkedItem.indicators ? linkedItem.indicators.Status : "")
    );
  }

  window.CdxLogicsModel = {
    collectCompanionDocs,
    collectPrimaryFlowItems,
    collectSpecs,
    findManagedItemByReference,
    getStageHeading,
    getStageLabel,
    isCompanionStage,
    isPrimaryFlowStage,
    isRequestProcessed,
    normalizeManagedDocValue
  };
})();
