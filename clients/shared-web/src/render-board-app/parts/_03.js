          complexityValue ? `Complexity: ${complexityValue}` : null
        ]
          .filter(Boolean)
          .join(" • ");
      } else {
        pill.appendChild(createMetricSegment("P", primaryText));
        const separator = document.createElement("span");
        separator.className = "card__badge-metric-separator";
        separator.textContent = "/";
        pill.appendChild(separator);
        const complexitySegment = document.createElement("span");
        complexitySegment.className = "card__badge-metric-value card__badge-metric-value--complexity";
        complexitySegment.textContent = complexityText;
        pill.appendChild(complexitySegment);
        const titleParts = [];
        if (typeof progressValue === "number") {
          titleParts.push(`Progress: ${Math.max(0, Math.min(100, Math.round(progressValue)))}%`);
        }
        if (complexityValue) {
          titleParts.push(`Complexity: ${complexityValue}`);
        }
        pill.title = titleParts.join(" • ");
      }

      badge.appendChild(pill);
      return badge;
    }

    function createCardTitle(item) {
      const titleEl = document.createElement("div");
      titleEl.className = "card__title";

      const prefix = getDocumentPrefix(item);
      if (prefix) {
        const prefixEl = document.createElement("span");
        prefixEl.className = "card__title-prefix";
        prefixEl.textContent = prefix;
        // Make the compact id prefix (e.g. "P001") self-explanatory: expose the
        // full stage name via tooltip / accessible label and a per-stage colour.
        const stage = String(item?.stage || "").trim();
        const stageLabel = stageLabelByStage[stage] || (stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : "");
        if (stageLabel) {
          prefixEl.title = `${stageLabel} · ${prefix}`;
          prefixEl.setAttribute("aria-label", `${stageLabel} (${prefix})`);
        }
        if (stage) {
          prefixEl.dataset.stage = stage;
        }
        titleEl.appendChild(prefixEl);
      }

      const textEl = document.createElement("span");
      textEl.className = "card__title-text";
      textEl.textContent = item.title;
      titleEl.appendChild(textEl);
      return titleEl;
    }

    function createCardPreview(item) {
      const preview = document.createElement("div");
      preview.className = "card__preview";
      preview.hidden = true;
      const theme = String(item?.indicators?.Theme || "").trim();
      if (theme) {
        preview.appendChild(createPreviewRow("Theme", theme));
      }
      preview.appendChild(createPreviewRow("Status", item?.indicators?.Status || "No status"));
      preview.appendChild(createPreviewRow("Updated", formatPreviewDate(item.updatedAt)));

      const linkage = ["spec", "product", "architecture"].includes(String(item?.stage || "").trim()) ? "" : createPrimaryFlowSummary(item);
      if (linkage) {
        preview.appendChild(createPreviewRow("Flow", linkage));
      }
      return preview;
    }

    function normalizeLinkLookupValue(value) {
      return String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.?\//, "");
    }

    function resolveTaskItem(usage) {
      const items = getItems();
      const normalizedId = String(usage?.id || "").trim();
      const normalizedRelPath = normalizeLinkLookupValue(usage?.relPath || usage?.path);
      const normalizedBase = normalizedRelPath ? normalizedRelPath.split("/").pop()?.replace(/\.md$/i, "") || "" : "";
      return (
        items.find((candidate) => {
          const candidateRelPath = normalizeLinkLookupValue(candidate?.relPath || candidate?.path);
          const candidateBase = candidateRelPath ? candidateRelPath.split("/").pop()?.replace(/\.md$/i, "") || "" : "";
          return (
            candidate?.id === normalizedId ||
            candidateRelPath === normalizedRelPath ||
            candidate?.id === normalizedBase ||
            candidateBase === normalizedBase
          );
        }) || null
      );
    }

    function getResolvedRequestItem(item) {
      if (!item) {
        return null;
      }
      if (String(item.stage || "").trim() === "request") {
        return item;
      }
      const linkedRequests = typeof collectPrimaryFlowItems === "function" ? collectPrimaryFlowItems(item).filter((candidate) => candidate && String(candidate.stage || "").trim() === "request") : [];
      return linkedRequests.length > 0 ? linkedRequests[0] : null;
    }

    function getActiveTaskUsages(item) {
      const activeTasks = [];
      const seen = new Set();
      for (const usage of item?.usedBy || []) {
        const taskItem = resolveTaskItem(usage);
        if (!isActiveTaskCandidate(taskItem) || !taskItem?.id || seen.has(taskItem.id)) {
          continue;
        }
        seen.add(taskItem.id);
        activeTasks.push(taskItem);
      }
      return activeTasks;
    }

    function createLinkageBadges(item, activeTasks) {
      const requestItem = getResolvedRequestItem(item);
      if (!requestItem && activeTasks.length === 0) {
        return null;
      }

      const badges = document.createElement("div");
      badges.className = "card__linkage-indicators";
      badges.setAttribute("aria-hidden", "true");

      if (requestItem) {
        const requestBadge = document.createElement("span");
        requestBadge.className = "card__request-badge";
        requestBadge.style.background = activeRequestColorMap.get(requestItem.id) || getRequestColor(requestItem.id);
        requestBadge.title = `Request ${requestItem.id}`;
        badges.appendChild(requestBadge);
      }

      if (activeTasks.length > 0) {
        const taskDotContainer = document.createElement("div");
        taskDotContainer.className = "card__task-dot-container";

        const visibleTaskCount = activeTasks.length > 2 ? 1 : activeTasks.length;
        for (let index = 0; index < visibleTaskCount; index += 1) {
          const task = activeTasks[index];
          const taskDot = document.createElement("span");
          taskDot.className = "card__task-dot";
          taskDot.style.background = activeTaskColorMap.get(task.id) || getTaskColor(task.id);
          taskDot.title = `Task ${task.id}`;
          taskDotContainer.appendChild(taskDot);
        }

        if (activeTasks.length > 2) {
          const overflow = document.createElement("span");
          overflow.className = "card__task-dot-overflow";
          overflow.textContent = `+${activeTasks.length - 1}`;
          taskDotContainer.appendChild(overflow);
        }

        badges.appendChild(taskDotContainer);
      }

      return badges;
    }

    function createItemCard(item, compact = false) {
      const card = document.createElement("div");
      const doneClass = isComplete(item) ? " card--done" : "";
      const progressClass = progressState(item);
      const usedClass = isRequestProcessed(item) ? " card--used" : "";
      const progressValue = getProgressValue(item);
      const hasProgressBar = typeof progressValue === "number" && progressValue > 0 && progressValue < 100;
      card.className =
        "card" +
        (compact ? " card--compact" : "") +
        (item.id === getSelectedId() ? " card--selected" : "") +
        doneClass +
        (progressClass ? ` ${progressClass}` : "") +
        usedClass +
        (hasProgressBar ? " card--progress-bar" : "");
      if (hasProgressBar) {
        const clamped = Math.max(0, Math.min(100, progressValue));
        card.style.setProperty("--progress", `${clamped}%`);
      }
      card.dataset.id = item.id;
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.setAttribute("aria-label", `${getStageLabel(item.stage)} item ${item.id}: ${item.title}`);
      card.title = item.title;
      const healthSignals = typeof getHealthSignals === "function" ? getHealthSignals(item) : [];
      if (healthSignals.length > 0) {
        card.classList.add("card--health-alert");
      }
      const preview = createCardPreview(item);
      const activeTasks = item.stage === "task" ? (isActiveTaskCandidate(item) ? [item] : []) : getActiveTaskUsages(item);

      function setPreviewOpen(isOpen) {
        preview.hidden = !isOpen;
        card.classList.toggle("card--preview-open", isOpen);
      }

      card.appendChild(createCardTitle(item));

      const badgeStrip = createCardBadgeStrip(item, activeTasks);
      if (badgeStrip) {
        card.appendChild(badgeStrip);
      }

      const linkageBadges = createLinkageBadges(item, activeTasks);
      if (linkageBadges) {
        card.appendChild(linkageBadges);
      }

      const primaryFlowSummary = String(item?.stage || "").trim() === "spec" ? "" : createPrimaryFlowSummary(item);
      if (primaryFlowSummary) {
        const linkage = document.createElement("div");
        linkage.className =
          "card__meta card__meta--linkage" +
          (primaryFlowSummary === "Unlinked to primary flow" ? " card__meta--orphan" : "");
        linkage.textContent = primaryFlowSummary;
        card.appendChild(linkage);
      }

      card.appendChild(preview);

      card.addEventListener("click", () => {
        setSelectedId(item.id);
        render();
      });
      card.addEventListener("dblclick", () => {
        setSelectedId(item.id);
        render();
        openSelectedItem("read");
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !preview.hidden) {
          event.preventDefault();
          setPreviewOpen(false);
          return;
        }
        handleCardKeydown(event, item);
      });
      card.addEventListener("mouseenter", () => setPreviewOpen(true));
      card.addEventListener("mouseleave", () => setPreviewOpen(false));
      card.addEventListener("focus", () => setPreviewOpen(true));
      card.addEventListener("blur", () => setPreviewOpen(false));
      return card;
    }

    function renderBoardColumns(grouped, totalVisibleItems) {
      getVisibleStages().forEach((stage) => {
        const stageItems = grouped[stage] || [];
        if (getHideEmptyColumns() && stageItems.length === 0) {
          return;
        }
        const totalCount = Math.max(0, stageItems.length || 0);
        const visibleSlice = visibleSliceForGroup(stage, stageItems);
        const column = document.createElement("div");
        column.className = "column";
        column.dataset.stage = stage;

        const header = document.createElement("div");
        header.className = "column__header";

        const title = document.createElement("div");
        title.className = "column__title";
        const titleLabel = document.createElement("span");
        titleLabel.className = "column__title-label";
        titleLabel.textContent = getStageHeading(stage);
        title.appendChild(titleLabel);

        const titleCount = document.createElement("span");
        titleCount.className = "column__title-count";
        titleCount.textContent = formatRenderedCount(visibleSlice.items.length, totalCount);
        title.appendChild(titleCount);
        header.appendChild(title);

        const actions = document.createElement("div");
        actions.className = "column__actions";

        header.appendChild(actions);
        column.appendChild(header);

        const body = document.createElement("div");
        body.className = "column__body";
        if (!stageItems.length) {
          const empty = document.createElement("div");
          empty.className = "column__empty";
          empty.textContent = isPrimaryFlowStage(stage) ? "No items" : "No linked docs";
          body.appendChild(empty);
        } else {
          visibleSlice.items.forEach((item) => body.appendChild(createItemCard(item)));
          if (visibleSlice.truncated) {
            body.appendChild(createShowMoreControl(stage, visibleSlice.remaining, visibleSlice.total));
          }
        }

        column.appendChild(body);
        board.appendChild(column);
      });
    }

    function renderListView(groups) {
      disconnectSentinels();
      const listView = document.createElement("div");
      listView.className = "list-view";
      const wrapper = document.createElement("div");
      wrapper.className = "list-view__wrapper";
      sentinelTop = createSentinelElement("top");
      sentinelBottom = createSentinelElement("bottom");
      wrapper.appendChild(sentinelTop);
      wrapper.appendChild(listView);
      wrapper.appendChild(sentinelBottom);
      groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "list-view__section";
        section.dataset.group = group.key;
        if (group.stage) {
          section.dataset.stage = group.stage;
        }

        const stageItems = group.items || [];
        const visibleSlice = visibleSliceForGroup(group.key, stageItems);
        const isCollapsed = getCollapsedListStages().has(group.key);

        const header = document.createElement("button");
        header.type = "button";
        header.className = "list-view__header";
        header.setAttribute("aria-expanded", String(!isCollapsed));
        header.setAttribute("aria-controls", `list-section-${group.key}`);

        const chevron = document.createElement("span");
        chevron.className = "list-view__header-icon";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = chevronIcon(isCollapsed);
        header.appendChild(chevron);

        const label = document.createElement("span");
        label.className = "list-view__header-label";
        label.textContent = group.heading;
        header.appendChild(label);

        const count = document.createElement("span");
        count.className = "list-view__header-count";
        count.textContent = formatRenderedCount(visibleSlice.items.length, Math.max(0, group.totalCount || 0));
        header.appendChild(count);
        header.addEventListener("click", () => {
          toggleListStageCollapsed(group.key, !getCollapsedListStages().has(group.key));
          focusListHeader(group.key);
        });
        header.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft" && !getCollapsedListStages().has(group.key)) {
            event.preventDefault();
            toggleListStageCollapsed(group.key, true);
            focusListHeader(group.key);
            return;
          }
          if (event.key === "ArrowRight" && getCollapsedListStages().has(group.key)) {
            event.preventDefault();
            toggleListStageCollapsed(group.key, false);
            focusListHeader(group.key);
            return;
          }
          if (event.key === "ArrowDown" && !getCollapsedListStages().has(group.key) && visibleSlice.items.length > 0) {
            event.preventDefault();
            selectItemAndFocus(visibleSlice.items[0].id);
          }
        });
        section.appendChild(header);

        const body = document.createElement("div");
        body.className = "list-view__body";
        body.id = `list-section-${group.key}`;
        body.hidden = isCollapsed;
        if (!stageItems.length) {
          const empty = document.createElement("div");
          empty.className = "list-view__empty";
          empty.textContent = group.emptyLabel || "No items";
          body.appendChild(empty);
        } else {
          visibleSlice.items.forEach((item) => body.appendChild(createItemCard(item, true)));
          if (visibleSlice.truncated) {
            body.appendChild(createShowMoreControl(group.key, visibleSlice.remaining, visibleSlice.total));
          }
        }
        section.appendChild(body);
        listView.appendChild(section);
      });

      board.appendChild(wrapper);
      sentinelWrapper = wrapper;
      attachSentinelObserver(wrapper, board, sentinelTop, sentinelBottom);
    }

    function renderBoard() {
      const scrollState = captureBoardScroll();
      if (typeof closeColumnMenu === "function") {
        closeColumnMenu();
      }
      disconnectSentinels();
      reconcileGroupRenderLimits();
      board.innerHTML = "";
      const visibleItems = getItems().filter((item) => isVisible(item));
      activeTaskColorMap = buildTaskColorMap(visibleItems);
      activeRequestColorMap = buildRequestColorMap(visibleItems);
      if (!visibleItems.length) {
        const empty = document.createElement("div");
        empty.className = "state-message";
        empty.textContent = getEmptyBoardMessage();
        board.appendChild(empty);
        return;
      }
      const grouped = groupByStage(visibleItems);
      if (isListMode()) {
        renderListView(typeof getListGroups === "function" ? getListGroups() : []);
      } else {
        renderBoardColumns(grouped, visibleItems.length);
      }
      restoreBoardScroll(scrollState);
    }

    return {
      renderBoard
    };
  };
})();
