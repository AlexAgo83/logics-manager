(() => {
  const HOST_API_METHODS = [
    "post",
    "ready",
    "refresh",
    "createItem",
    "newRequest",
    "createCompanionDoc",
    "renameEntry",
    "addReference",
    "addUsedBy",
    "fixDocs",
    "newGuidedRequest",
    "launchCodexOverlay",
    "launchClaude",
    "bootstrapLogics",
    "updateLogicsKit",
    "syncCodexOverlay",
    "repairLogicsKit",
    "checkEnvironment",
    "checkHybridRuntime",
    "openHybridInsights",
    "openLogicsInsights",
    "assistCommitAll",
    "assistNextStep",
    "assistTriage",
    "assistDiffRisk",
    "assistSummarizeValidation",
    "assistSummarizeChangelog",
    "assistPrepareRelease",
    "assistPublishRelease",
    "assistValidationChecklist",
    "assistDocConsistency",
    "openOnboarding",
    "selectAgent",
    "injectPrompt",
    "promote",
    "markDone",
    "markObsolete",
    "changeStatus",
    "changeProjectRoot",
    "resetProjectRoot",
    "about",
    "openItem"
  ];

  window.CDX_LOGICS_HOST_API_METHODS = HOST_API_METHODS;
  window.assertCdxLogicsHostApiContract = function assertCdxLogicsHostApiContract(api) {
    const missing = HOST_API_METHODS.filter((method) => typeof api?.[method] !== "function");
    if (missing.length > 0) {
      throw new Error(`Logics host API is missing required method(s): ${missing.join(", ")}`);
    }
    return api;
  };
})();
