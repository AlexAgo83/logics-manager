/* eslint-disable @typescript-eslint/no-explicit-any -- this file installs dynamic method bindings onto the provider instance at construction time. */
import * as viewProviderSupport from "./logicsViewProviderSupport";
import { inspectKitUpdateNeed } from "./logicsKitVersionSupport";

export function installLogicsViewProviderBindings(provider: any): void {
  Object.assign(provider, {
    assessDiffRiskFromTools: () => viewProviderSupport.assessDiffRiskFromTools.call(provider),
    buildLogicsYamlBlocksQuickPickItem: (root: string) =>
      viewProviderSupport.buildLogicsYamlBlocksQuickPickItem.call(provider, root),
    buildValidationChecklistFromTools: () => viewProviderSupport.buildValidationChecklistFromTools.call(provider),
    buildMissingEnvLocalQuickPickItem: (root: string) =>
      viewProviderSupport.buildMissingEnvLocalQuickPickItem.call(provider, root),
    canResetProjectRoot: () => viewProviderSupport.canResetProjectRoot.call(provider),
    checkHybridRuntimeFromTools: () => viewProviderSupport.checkHybridRuntimeFromTools.call(provider),
    clearAgentRegistry: () => viewProviderSupport.clearAgentRegistry.call(provider),
    clearStartupKitUpdatePromptState: (root: string) =>
      viewProviderSupport.clearStartupKitUpdatePromptState.call(provider, root),
    commitAllChangesFromTools: () => viewProviderSupport.commitAllChangesFromTools.call(provider),
    bootstrapLogics: (root: string) => viewProviderSupport.bootstrapLogics.call(provider, root),
    changeItemStatus: (id: string) => viewProviderSupport.changeItemStatus.call(provider, id),
    getActionRoot: () => viewProviderSupport.getActionRoot.call(provider),
    getActiveAgentPayload: () => viewProviderSupport.getActiveAgentPayload.call(provider),
    getRepositoryEnvFiles: (root: string) => viewProviderSupport.getRepositoryEnvFiles.call(provider, root),
    getStartupKitUpdatePromptStateKey: (root: string) =>
      viewProviderSupport.getStartupKitUpdatePromptStateKey.call(provider, root),
    getValidStatusesForItem: (item: any) => viewProviderSupport.getValidStatusesForItem.call(provider, item),
    inspectKitUpdateNeed: (root: string) => inspectKitUpdateNeed(root),
    injectPromptIntoCodexChat: (prompt: string, options?: { preferNewThread?: boolean }) =>
      viewProviderSupport.injectPromptIntoCodexChat.call(provider, prompt, options),
    injectAgentPromptIntoCodexChat: (agent: any) =>
      viewProviderSupport.injectAgentPromptIntoCodexChat.call(provider, agent),
    maybeOfferBootstrap: (root: string) => viewProviderSupport.maybeOfferBootstrap.call(provider, root),
    maybeOfferCodexStartupRemediation: (root: string) =>
      viewProviderSupport.maybeOfferCodexStartupRemediation.call(provider, root),
    maybeOfferStartupKitUpdate: (root: string, bootstrapState: any) =>
      viewProviderSupport.maybeOfferStartupKitUpdate.call(provider, root, bootstrapState),
    maybeShowOnboarding: (root: string) => viewProviderSupport.maybeShowOnboarding.call(provider, root),
    maybeShowCodexOverlayHandoff: (root: string, trigger: string) =>
      viewProviderSupport.maybeShowCodexOverlayHandoff.call(provider, root, trigger),
    notifyInvalidRootOverride: (invalidOverridePath: string | undefined, hasValidRoot: boolean) =>
      viewProviderSupport.notifyInvalidRootOverride.call(provider, invalidOverridePath, hasValidRoot),
    openOnboardingPanel: () => viewProviderSupport.openOnboardingPanel.call(provider),
    openHybridInsightsFromTools: () => viewProviderSupport.openHybridInsightsFromTools.call(provider),
    openLogicsInsightsFromTools: () => viewProviderSupport.openLogicsInsightsFromTools.call(provider),
    notifyBootstrapCompletion: (
      root: string,
      globalKitOutcome?: {
        attempted: boolean;
        published: boolean;
        failed: boolean;
        failureMessage?: string;
      }
    ) => viewProviderSupport.notifyBootstrapCompletion.call(provider, root, globalKitOutcome),
    postData: (payload: Parameters<typeof viewProviderSupport.postData>[0]) =>
      viewProviderSupport.postData.call(provider, payload),
    prepareReleaseFromTools: () => viewProviderSupport.prepareReleaseFromTools.call(provider),
    publishReleaseFromTools: () => viewProviderSupport.publishReleaseFromTools.call(provider),
    refreshAgents: (mode: "silent" | "notify", root: string) =>
      viewProviderSupport.refreshAgents.call(provider, mode, root),
    resolveProjectRoot: () => viewProviderSupport.resolveProjectRoot.call(provider),
    repairLogicsKitFromTools: () => viewProviderSupport.repairLogicsKitFromTools.call(provider),
    reviewDocConsistencyFromTools: () => viewProviderSupport.reviewDocConsistencyFromTools.call(provider),
    shouldRecommendCheckEnvironment: (root: string, snapshot: any, bootstrapState: any) =>
      viewProviderSupport.shouldRecommendCheckEnvironment.call(provider, root, snapshot, bootstrapState),
    summarizeChangelogFromTools: () => viewProviderSupport.summarizeChangelogFromTools.call(provider),
    summarizeValidationFromTools: () => viewProviderSupport.summarizeValidationFromTools.call(provider),
    syncCodexOverlayFromTools: () => viewProviderSupport.syncCodexOverlayFromTools.call(provider),
    suggestNextStepFromTools: () => viewProviderSupport.suggestNextStepFromTools.call(provider),
    triageWorkflowDocFromTools: (preferredId?: string) =>
      viewProviderSupport.triageWorkflowDocFromTools.call(provider, preferredId),
    updateLogicsKitFromTools: () => viewProviderSupport.updateLogicsKitFromTools.call(provider),
    updateItemLifecycle: (id: string, title: string, progress: string) =>
      viewProviderSupport.updateItemLifecycle.call(provider, id, title, progress),
    writeAgentScanOutput: (snapshot: any, root: string, shouldShowOutput: boolean) =>
      viewProviderSupport.writeAgentScanOutput.call(provider, snapshot, root, shouldShowOutput)
  });
}
