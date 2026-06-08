(() => {
  function pencilIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path
          d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  function createChevronIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("details__section-chevron");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 9l6 6 6-6");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    return svg;
  }

  window.createCdxLogicsDetailsRenderer = function createCdxLogicsDetailsRenderer(options) {
    const {
      detailsBody,
      detailsTitle,
      detailsEyebrow,
      hostApi,
      getItems,
      getSelectedId,
      getActiveWorkspaceRoot,
      getChangedPaths,
      getActiveAgent,
      getLastInjectedContext,
      getCollapsedDetailSections,
      persistState,
      getStageLabel,
      isPrimaryFlowStage,
      collectCompanionDocs,
      collectSpecs,
      collectPrimaryFlowItems,
      getAttentionReasons,
      buildContextPack,
      buildDependencyMap,
      findManagedItemByReference,
      formatDate,
      setLastInjectedContext,
      selectItem
    } = options;
    let contextPackPreview = { id: null, mode: "standard" };

    function createSectionTitle(label, key) {
      const title = document.createElement("button");
      title.className = "details__section-title";
      title.type = "button";
      title.setAttribute("aria-expanded", "true");
      title.title = `Toggle ${label}`;
      if (key) {
        title.dataset.section = key;
      }
      const text = document.createElement("span");
      text.textContent = label;
      title.appendChild(text);
      title.appendChild(createChevronIcon());
      return title;
    }

    function createSectionHeader(label, key, addLabel, onAdd) {
      const header = document.createElement("div");
      header.className = "details__section-header";
      const title = createSectionTitle(label, key);
      header.appendChild(title);
      if (addLabel && typeof onAdd === "function") {
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "details__section-add";
        addButton.textContent = "+";
        addButton.setAttribute("aria-label", addLabel);
        addButton.title = addLabel;
        addButton.addEventListener("click", (event) => {
          event.stopPropagation();
          onAdd();
        });
        header.appendChild(addButton);
      }
      return { header, title };
    }

    function createInlineCta(label, onClick, className = "") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = ["details__inline-cta", className].filter(Boolean).join(" ");
      button.textContent = label;
      button.title = label;
      button.addEventListener("click", onClick);
      return button;
    }

    function createCompanionDocCtas(item, companionDocs) {
      if (!isPrimaryFlowStage(item.stage)) {
        return [];
      }
      const existingStages = new Set(companionDocs.map((companion) => companion.stage));
      const actions = [];
      if (!existingStages.has("product")) {
        actions.push(createInlineCta("+ Product brief", () => hostApi.createCompanionDoc(item.id, "product"), "details__inline-cta--primary"));
      }
      if (!existingStages.has("architecture")) {
        actions.push(
          createInlineCta(
            "+ Architecture decision",
            () => hostApi.createCompanionDoc(item.id, "architecture"),
            "details__inline-cta--primary"
          )
        );
      }
      return actions;
    }

    function createValueContainer(value) {
      const container = document.createElement("div");
      container.className = "details__indicator-value";
      if (value !== undefined && value !== null && value !== "") {
        const text = document.createElement("div");
        text.className = "details__indicator-text";
        text.textContent = value;
        container.appendChild(text);
      }
      return container;
    }

    function createIndicatorRow(label, value) {
      const row = document.createElement("div");
      row.className = "details__indicator";
      const left = document.createElement("div");
      left.className = "details__indicator-label";
      left.textContent = label;
      const right = createValueContainer(value ?? "");
      row.appendChild(left);
      row.appendChild(right);
      return row;
    }

    function appendManagedDocActions(container, targetItem) {
      if (!targetItem) {
        return;
      }
      const actions = document.createElement("div");
      actions.className = "details__indicator-actions";
      actions.appendChild(createInlineCta("Open", () => hostApi.openItem(targetItem, "open")));
      actions.appendChild(createInlineCta("Read", () => hostApi.openItem(targetItem, "read")));
      container.appendChild(actions);
    }

    function createLinkedIndicatorRow(label, value, targetItem) {
      if (!targetItem) {
        return createIndicatorRow(label, value);
      }
      const row = document.createElement("div");
      row.className = "details__indicator";
      const left = document.createElement("div");
      left.className = "details__indicator-label";
      left.textContent = label;
      const right = createValueContainer(value ?? "");
      appendManagedDocActions(right, targetItem);
      row.appendChild(left);
      row.appendChild(right);
      return row;
    }

    function createCompanionDocRow(companion) {
      const row = document.createElement("div");
      row.className = "details__indicator";
      const info = document.createElement("div");
      info.className = "details__indicator-label";
      info.textContent = `${getStageLabel(companion.stage)} • ${companion.id}`;

      const actions = createValueContainer("");
      if (companion.title && companion.title !== companion.relPath && companion.title !== companion.id) {
        const text = document.createElement("div");
        text.className = "details__indicator-text";
        text.textContent = companion.title;
        actions.appendChild(text);
      } else if (companion.relPath) {
        const text = document.createElement("div");
        text.className = "details__indicator-text";
        text.textContent = companion.relPath;
        actions.appendChild(text);
      }
      if (companion.item) {
        actions.replaceChildren();
        const text = document.createElement("div");
        text.className = "details__indicator-text";
        text.textContent = companion.title || companion.relPath || companion.id;
        actions.appendChild(text);
        appendManagedDocActions(actions, companion.item);
      }

      row.appendChild(info);
      row.appendChild(actions);
      return row;
    }

    function handleReasonAction(item, reason) {
      const action = reason && reason.remediation ? reason.remediation.action : "";
      if (action === "promote") {
        hostApi.promote(item.id);
      } else if (action === "add-reference") {
        hostApi.addReference(item.id);
      } else if (action === "create-companion-doc") {
        hostApi.createCompanionDoc(item.id);
      }
    }

    function createReasonCard(item, reason, primary = false) {
      const card = document.createElement("div");
      card.className = `details__reason-card${primary ? " details__reason-card--primary" : ""}`;

      const badge = document.createElement("span");
      badge.className = "details__reason-badge";
      badge.textContent = primary ? `Primary • ${reason.label}` : reason.label;
      card.appendChild(badge);

      const description = document.createElement("div");
      description.className = "details__reason-description";
      description.textContent = reason.description;
      card.appendChild(description);

      if (reason.remediation && reason.remediation.description) {
        const remediation = document.createElement("div");
        remediation.className = "details__reason-remediation";
        remediation.textContent = reason.remediation.description;
        card.appendChild(remediation);
      }

      if (reason.remediation && reason.remediation.label) {
        if (reason.remediation.action) {
          card.appendChild(
            createInlineCta(reason.remediation.label, () => handleReasonAction(item, reason), "details__inline-cta--primary")
          );
        } else {
          const note = document.createElement("div");
          note.className = "details__reason-remediation";
          note.textContent = reason.remediation.label;
          card.appendChild(note);
        }
      }

      return card;
    }

    function createMapNode(targetItem, currentId) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "details__map-node";
      if (targetItem.id === currentId) {
        button.classList.add("details__map-node--current");
        button.disabled = true;
      }
      button.textContent = `${getStageLabel(targetItem.stage)} • ${targetItem.id}`;
      button.title = targetItem.title;
      if (targetItem.id !== currentId) {
        button.addEventListener("click", () => selectItem(targetItem.id));
      }
      return button;
    }

    function applySectionCollapse(section, title, content, isCollapsed) {
      section.classList.toggle("details__section--collapsed", isCollapsed);
      title.setAttribute("aria-expanded", String(!isCollapsed));
      if (content) {
        content.setAttribute("aria-hidden", String(isCollapsed));
      }
    }

    function attachSectionToggle(section, title, content, key) {
      title.addEventListener("click", () => {
        const collapsedSections = getCollapsedDetailSections();
        const isCollapsed = !section.classList.contains("details__section--collapsed");
        applySectionCollapse(section, title, content, isCollapsed);
        if (key) {
          if (isCollapsed) {
            collapsedSections.add(key);
          } else {
            collapsedSections.delete(key);
          }
          persistState();
        }
      });
    }

    function renderDetails() {
      detailsBody.innerHTML = "";
      const item = getItems().find((entry) => entry.id === getSelectedId());
      if (!item) {
        if (detailsEyebrow) detailsEyebrow.textContent = "Logics item";
        if (detailsTitle) detailsTitle.textContent = "Details";
        const empty = document.createElement("div");
        empty.className = "details__empty";
        empty.textContent = "Select a card to inspect indicators, references, and actions. Use Search or Attention to narrow the workspace first.";
        detailsBody.appendChild(empty);
        return;
      }

      if (detailsEyebrow) {
        const headerBits = [getStageLabel(item.stage)];
        const status = item.indicators && item.indicators.Status ? String(item.indicators.Status).trim() : "";
        if (status) headerBits.push(status);
        detailsEyebrow.textContent = headerBits.join(" • ");
      }
      if (detailsTitle) {
        detailsTitle.innerHTML = "";
        const titleLine = document.createElement("div");
        titleLine.className = "details__header-title-main";
        titleLine.textContent = item.title;
        detailsTitle.appendChild(titleLine);

        const filePath = String(item?.relPath || item?.path || item?.id || "").trim();
        if (filePath) {
          const fileLine = document.createElement("div");
          fileLine.className = "details__header-title-file";
          fileLine.textContent = `File: ${filePath}`;
          detailsTitle.appendChild(fileLine);
        }
      }

      const list = document.createElement("div");
      list.className = "details__list";

      const nameRow = document.createElement("div");
      nameRow.className = "details__list-row details__list-row--name";
      const nameLabel = document.createElement("span");
      nameLabel.textContent = "Name";
      nameRow.appendChild(nameLabel);

      const nameValueWrap = document.createElement("span");
      nameValueWrap.className = "details__name-value-wrap";
      const nameValue = document.createElement("span");
      nameValue.className = "details__name-value";
      nameValue.textContent = item.id;
      nameValueWrap.appendChild(nameValue);

      const renameButton = document.createElement("button");
      renameButton.type = "button";
      renameButton.className = "details__rename";
      renameButton.setAttribute("aria-label", "Rename entry");
      renameButton.title = "Rename entry";
      renameButton.innerHTML = pencilIcon();
      renameButton.addEventListener("click", () => hostApi.renameEntry(item.id));
      nameValueWrap.appendChild(renameButton);
      nameRow.appendChild(nameValueWrap);
      list.appendChild(nameRow);

      const updatedRow = document.createElement("div");
      updatedRow.className = "details__list-row";
      const updatedLabel = document.createElement("span");
      updatedLabel.textContent = "Updated:";
      updatedRow.appendChild(updatedLabel);
      const updatedValue = document.createElement("span");
      updatedValue.className = "details__list-value";
      updatedValue.textContent = formatDate(item.updatedAt);
      updatedRow.appendChild(updatedValue);
      list.appendChild(updatedRow);
      detailsBody.appendChild(list);

      const indicators = item.indicators || {};
      const indicatorKeys = Object.keys(indicators).filter((key) => key.toLowerCase() !== "reminder");
      if (indicatorKeys.length) {
        const section = document.createElement("div");
        section.className = "details__section";
        const indicatorKey = "indicators";
        const sectionHeader = createSectionHeader("Indicators", indicatorKey);
        const indicatorList = document.createElement("div");
        indicatorList.className = "details__indicators";
        indicatorKeys.forEach((key) => indicatorList.appendChild(createIndicatorRow(key, indicators[key])));
        section.appendChild(sectionHeader.header);
        section.appendChild(indicatorList);
        applySectionCollapse(section, sectionHeader.title, indicatorList, getCollapsedDetailSections().has(indicatorKey));
        attachSectionToggle(section, sectionHeader.title, indicatorList, indicatorKey);
        detailsBody.appendChild(section);
      }

      const attentionReasons = typeof getAttentionReasons === "function" ? getAttentionReasons(item) : [];
      if (attentionReasons.length) {
        const attentionSection = document.createElement("div");
        attentionSection.className = "details__section";
        const attentionKey = "attentionExplain";
        const attentionHeader = createSectionHeader("Attention explain", attentionKey);
        const attentionContent = document.createElement("div");
        attentionContent.className = "details__indicators";
        attentionContent.appendChild(createReasonCard(item, attentionReasons[0], true));
        attentionReasons.slice(1).forEach((reason) => attentionContent.appendChild(createReasonCard(item, reason)));
        attentionSection.appendChild(attentionHeader.header);
        attentionSection.appendChild(attentionContent);
        applySectionCollapse(attentionSection, attentionHeader.title, attentionContent, getCollapsedDetailSections().has(attentionKey));
        attachSectionToggle(attentionSection, attentionHeader.title, attentionContent, attentionKey);
        detailsBody.appendChild(attentionSection);
      }

        const activeWorkspaceRoot = typeof getActiveWorkspaceRoot === "function" ? getActiveWorkspaceRoot() : null;
        const previewMode = contextPackPreview.id === item.id ? contextPackPreview.mode : "standard";
        const contextPack = typeof buildContextPack === "function" ? buildContextPack(item, { mode: previewMode }) : null;
      if (contextPack) {
        const contextSection = document.createElement("div");
        contextSection.className = "details__section";
        const contextKey = "contextPack";
        const contextHeader = createSectionHeader("Context pack for AI assistants", contextKey);
        const contextContent = document.createElement("div");
        contextContent.className = "details__indicators";

        const summary = document.createElement("div");
        summary.className = "details__reason-description";
        summary.textContent = `Mode ${String(contextPack.summary.mode || "standard")} • Profile ${String(contextPack.summary.profile || "normal")} • ${contextPack.summary.docCount} docs • ~${contextPack.summary.tokenEstimate} tokens (${contextPack.summary.budgetLabel}).`;
        contextContent.appendChild(summary);

        const estimateList = document.createElement("div");
        estimateList.className = "details__indicators";
        estimateList.appendChild(createIndicatorRow("Task type", contextPack.summary.taskKind || "default"));
        estimateList.appendChild(createIndicatorRow("Response", contextPack.summary.responseContract || "Keep the answer concise."));
        estimateList.appendChild(createIndicatorRow("Docs", String(contextPack.summary.docCount || 0)));
        estimateList.appendChild(createIndicatorRow("Lines", String(contextPack.summary.lineCount || 0)));
        estimateList.appendChild(createIndicatorRow("Characters", String(contextPack.summary.charCount || 0)));
        estimateList.appendChild(createIndicatorRow("Changed paths", String(contextPack.summary.changedPathCount || 0)));
        if (contextPack.summary.excludedStaleCount) {
          estimateList.appendChild(createIndicatorRow("Stale excluded", String(contextPack.summary.excludedStaleCount)));
        }
        if (contextPack.summary.blockedDocCount) {
          estimateList.appendChild(createIndicatorRow("Agent filtered", String(contextPack.summary.blockedDocCount)));
        }
        contextContent.appendChild(estimateList);

        if (contextPack.summary.trimmed) {
          const trimmed = document.createElement("div");
          trimmed.className = "details__reason-remediation";
          trimmed.textContent = "The preview is trimmed to keep the pack compact and predictable before injection.";
          contextContent.appendChild(trimmed);
        }

        if (contextPack.sessionHygiene) {
          const hygiene = document.createElement("div");
          hygiene.className = "details__reason-remediation";
          hygiene.textContent = contextPack.sessionHygiene;
          contextContent.appendChild(hygiene);
        }

        const previewToolbar = document.createElement("div");
        previewToolbar.className = "details__pack-toolbar";
        const previewActions = [
          { label: "Preview standard", mode: "standard" },
          { label: "Preview summary-only", mode: "summary-only" }
        ];
        const changedPaths = typeof getChangedPaths === "function" ? getChangedPaths() : [];
        if (Array.isArray(changedPaths) && changedPaths.length > 0) {
          previewActions.push({ label: "Preview diff-first", mode: "diff-first" });
        }
        previewActions.forEach((action) => {
          const isActive = contextPackPreview.id === item.id && contextPackPreview.mode === action.mode;
          previewToolbar.appendChild(
            createInlineCta(
              isActive ? `Hide ${action.mode}` : action.label,
              () => {
                contextPackPreview = isActive ? { id: null, mode: "standard" } : { id: item.id, mode: action.mode };
                renderDetails();
              },
              isActive ? "details__inline-cta--primary" : ""
            )
          );
        });
        contextContent.appendChild(previewToolbar);

        if (contextPackPreview.id === item.id) {
          const preview = document.createElement("pre");
          preview.className = "details__pack-preview";
          preview.textContent = contextPack.text;
          contextContent.appendChild(preview);

          const injectToolbar = document.createElement("div");
          injectToolbar.className = "details__pack-toolbar";
          injectToolbar.appendChild(
            createInlineCta(
              "Copy for assistant",
              () => {
                if (typeof setLastInjectedContext === "function") {
                  setLastInjectedContext({
                    itemId: item.id,
                    mode: contextPack.summary.mode,
                    taskKind: contextPack.summary.taskKind,
                    root: activeWorkspaceRoot
                  });
                }
                hostApi.injectPrompt(contextPack.text);
              },
              "details__inline-cta--primary"
            )
          );
          injectToolbar.appendChild(
            createInlineCta("Copy for new assistant session", () => {
              if (typeof setLastInjectedContext === "function") {
                  setLastInjectedContext({
                    itemId: item.id,
                    mode: contextPack.summary.mode,
                    taskKind: contextPack.summary.taskKind,
                    root: activeWorkspaceRoot
                  });
                }
                hostApi.injectPrompt(contextPack.text, { preferNewThread: true });
            })
          );
          contextContent.appendChild(injectToolbar);
        }

        contextSection.appendChild(contextHeader.header);
        contextSection.appendChild(contextContent);
        applySectionCollapse(contextSection, contextHeader.title, contextContent, getCollapsedDetailSections().has(contextKey));
        attachSectionToggle(contextSection, contextHeader.title, contextContent, contextKey);
        detailsBody.appendChild(contextSection);
      }

      const dependencyMap = typeof buildDependencyMap === "function" ? buildDependencyMap(item) : null;
      if (dependencyMap && dependencyMap.groups && dependencyMap.groups.length) {
        const mapSection = document.createElement("div");
        mapSection.className = "details__section";
        const mapKey = "dependencyMap";
        const mapHeader = createSectionHeader("Dependency map", mapKey);
        const mapContent = document.createElement("div");
        mapContent.className = "details__dependency-map";
        dependencyMap.groups.forEach((group) => {
          const groupEl = document.createElement("div");
          groupEl.className = "details__map-group";
          const label = document.createElement("div");
          label.className = "details__map-group-label";
          label.textContent = group.label;
          groupEl.appendChild(label);
          const nodes = document.createElement("div");
          nodes.className = "details__map-nodes";
          group.items.forEach((targetItem) => nodes.appendChild(createMapNode(targetItem, item.id)));
          groupEl.appendChild(nodes);
          mapContent.appendChild(groupEl);
        });
        mapSection.appendChild(mapHeader.header);
        mapSection.appendChild(mapContent);
        applySectionCollapse(mapSection, mapHeader.title, mapContent, getCollapsedDetailSections().has(mapKey));
        attachSectionToggle(mapSection, mapHeader.title, mapContent, mapKey);
        detailsBody.appendChild(mapSection);
      }

      const companionDocs = collectCompanionDocs(item);
      if (isPrimaryFlowStage(item.stage) || companionDocs.length) {
        const companionSection = document.createElement("div");
        companionSection.className = "details__section";
        const companionKey = "companionDocs";
        const companionHeader = createSectionHeader("Companion docs", companionKey, "Create companion doc", () => hostApi.createCompanionDoc(item.id));
        const companionList = document.createElement("div");
        companionList.className = "details__indicators";
        if (companionDocs.length) {
          companionDocs.forEach((companion) => companionList.appendChild(createCompanionDocRow(companion)));
        } else {
          const empty = document.createElement("div");
          empty.className = "details__empty";
          empty.textContent = "No companion docs linked yet.";
          companionList.appendChild(empty);
          companionList.appendChild(createInlineCta("+ Create companion doc", () => hostApi.createCompanionDoc(item.id)));
        }
        createCompanionDocCtas(item, companionDocs).forEach((cta) => companionList.appendChild(cta));
        companionSection.appendChild(companionHeader.header);
        companionSection.appendChild(companionList);
        applySectionCollapse(companionSection, companionHeader.title, companionList, getCollapsedDetailSections().has(companionKey));
        attachSectionToggle(companionSection, companionHeader.title, companionList, companionKey);
        detailsBody.appendChild(companionSection);
      }

      const specs = collectSpecs(item);
      if (isPrimaryFlowStage(item.stage) || specs.length) {
        const specsSection = document.createElement("div");
        specsSection.className = "details__section";
        const specsKey = "specs";
        const specsHeader = createSectionHeader("Specs", specsKey);
        const specsList = document.createElement("div");
        specsList.className = "details__indicators";
        if (specs.length) {
          specs.forEach((spec) => specsList.appendChild(createLinkedIndicatorRow(`${getStageLabel(spec.stage)} • ${spec.id}`, spec.title, spec)));
        } else {
          const empty = document.createElement("div");
          empty.className = "details__empty";
          empty.textContent = "No spec linked yet.";
          specsList.appendChild(empty);
        }
        specsSection.appendChild(specsHeader.header);
        specsSection.appendChild(specsList);
        applySectionCollapse(specsSection, specsHeader.title, specsList, getCollapsedDetailSections().has(specsKey));
        attachSectionToggle(specsSection, specsHeader.title, specsList, specsKey);
        detailsBody.appendChild(specsSection);
      }

      const primaryFlowItems = collectPrimaryFlowItems(item);
      if (!isPrimaryFlowStage(item.stage)) {
        const primaryFlowSection = document.createElement("div");
        primaryFlowSection.className = "details__section";
        const primaryFlowKey = "primaryFlow";
        const primaryFlowHeader = createSectionHeader("Primary flow", primaryFlowKey);
        const primaryFlowList = document.createElement("div");
        primaryFlowList.className = "details__indicators";
        if (primaryFlowItems.length) {
          primaryFlowItems.forEach((linkedItem) => {
            primaryFlowList.appendChild(
              createLinkedIndicatorRow(`${getStageLabel(linkedItem.stage)} • ${linkedItem.id}`, linkedItem.title, linkedItem)
            );
          });
        } else {
          const empty = document.createElement("div");
          empty.className = "details__empty";
          empty.textContent = "No primary workflow item linked yet.";
          primaryFlowList.appendChild(empty);
          primaryFlowList.appendChild(
            createInlineCta("+ Link to primary flow", () => hostApi.addReference(item.id), "details__inline-cta--primary")
          );
        }
        primaryFlowSection.appendChild(primaryFlowHeader.header);
        primaryFlowSection.appendChild(primaryFlowList);
        applySectionCollapse(primaryFlowSection, primaryFlowHeader.title, primaryFlowList, getCollapsedDetailSections().has(primaryFlowKey));
        attachSectionToggle(primaryFlowSection, primaryFlowHeader.title, primaryFlowList, primaryFlowKey);
        detailsBody.appendChild(primaryFlowSection);
      }

      const refSection = document.createElement("div");
      refSection.className = "details__section";
      const refKey = "references";
      const refHeader = createSectionHeader("References", refKey, "Add reference", () => hostApi.addReference(item.id));
      const refList = document.createElement("div");
      refList.className = "details__indicators";
      if (item.references && item.references.length) {
        item.references.forEach((ref) => {
          if (typeof ref === "string") {
            refList.appendChild(createLinkedIndicatorRow(ref, "", findManagedItemByReference(ref)));
          } else {
            refList.appendChild(createLinkedIndicatorRow(ref.label, ref.path, findManagedItemByReference(ref.path)));
          }
        });
      } else {
        refList.appendChild(createInlineCta("+ Add reference", () => hostApi.addReference(item.id)));
      }
      refSection.appendChild(refHeader.header);
      refSection.appendChild(refList);
      applySectionCollapse(refSection, refHeader.title, refList, getCollapsedDetailSections().has(refKey));
      attachSectionToggle(refSection, refHeader.title, refList, refKey);
      detailsBody.appendChild(refSection);

      const usedSection = document.createElement("div");
      usedSection.className = "details__section";
      const usedKey = "usedBy";
      const usedHeader = createSectionHeader("Used by", usedKey, "Add used-by link", () => hostApi.addUsedBy(item.id));
      const usedList = document.createElement("div");
      usedList.className = "details__indicators";
      if (item.usedBy && item.usedBy.length) {
        item.usedBy.forEach((usage) => {
          const targetItem = findManagedItemByReference(usage.relPath || usage.id, usage);
          usedList.appendChild(createLinkedIndicatorRow(`${getStageLabel(usage.stage)} • ${usage.id}`, usage.title, targetItem));
        });
      } else {
        usedList.appendChild(createInlineCta("+ Add used by", () => hostApi.addUsedBy(item.id)));
      }
      usedSection.appendChild(usedHeader.header);
      usedSection.appendChild(usedList);
      applySectionCollapse(usedSection, usedHeader.title, usedList, getCollapsedDetailSections().has(usedKey));
      attachSectionToggle(usedSection, usedHeader.title, usedList, usedKey);
      detailsBody.appendChild(usedSection);
    }

    return { renderDetails };
  };
})();
