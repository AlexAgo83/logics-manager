import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseDocument, stringify } from "yaml";
import { buildHybridInsightsHtml } from "./logicsHybridInsightsHtml";
import {
  parseHybridChangelogSummaryResult,
  parseHybridPrepareReleaseResult,
  parseHybridPublishReleaseResult,
  describeHybridAssistOutcome,
  parseHybridAssistPayload,
  parseHybridCommitPlanSteps,
  parseHybridDiffRiskResult,
  parseHybridDocConsistencyResult,
  parseHybridInsightsSources,
  parseHybridNextStepResult,
  parseHybridRuntimeProviders,
  parseHybridTriageResult,
  parseHybridValidationChecklistResult,
  parseHybridValidationSummaryResult,
  type HybridAssistPayload,
  type HybridPublishReleaseResult
} from "./logicsHybridAssistTypes";
import { LogicsItem } from "./logicsIndexer";
import { runPythonWithOutput } from "./logicsProviderUtils";
import { assertNever, parseHybridInsightsPanelMessage } from "./logicsViewMessages";
import { inspectGitHubReleaseCapability } from "./releasePublishSupport";
import {
  grantReleaseBranchFastForwardConsent,
  inspectReleaseBranchFastForwardConsent
} from "./releaseBranchConsent";
import { runGitCommand } from "./gitRuntime";

type HybridAssistControllerOptions = {
  context: vscode.ExtensionContext;
  getActionRoot: () => Promise<string | null>;
  getItems: () => LogicsItem[];
  pickItem: (items: LogicsItem[], placeHolder: string) => Promise<LogicsItem | undefined>;
  refresh: () => Promise<void>;
};

type KnownProviderConfig = { envKey: string; model: string; baseUrl: string };

type ActivatableProvider = KnownProviderConfig & { name: string };

type ProviderRemediationPlan = {
  providers: ActivatableProvider[];
  mode: "append-block" | "insert-provider";
  yamlContent: string;
  logicsYamlPath: string;
  envFile: string;
};

export class LogicsHybridAssistController {
  private hybridInsightsPanel?: vscode.WebviewPanel;

  constructor(private readonly options: HybridAssistControllerOptions) {}

  private static readonly KNOWN_PROVIDERS: Record<string, { envKey: string; model: string; baseUrl: string }> = {
    openai: { envKey: "OPENAI_API_KEY", model: "gpt-4.1-mini", baseUrl: "https://api.openai.com/v1" },
    gemini: { envKey: "GEMINI_API_KEY", model: "gemini-2.0-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta" }
  };

  async checkHybridRuntimeFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["runtime-status"], {
      actionLabel: "Check Hybrid Runtime"
    });
    if (!payload) {
      return;
    }
    const providers = parseHybridRuntimeProviders(payload);
    const readyProviders = Object.entries(providers)
      .filter(([, provider]) => provider.enabled !== false && provider.healthy)
      .map(([providerName]) => providerName);
    const flaggedProviders = Object.entries(providers)
      .filter(([, provider]) => provider.enabled !== false && provider.healthy !== true)
      .map(([providerName, provider]) => {
        const reasons = provider.reasons ?? [];
        const detail = reasons.length > 0 ? reasons[0] : "not-ready";
        return `${providerName} (${detail})`;
      });
    const statusLabel = [
      payload.degraded ? "Runtime is degraded." : "Runtime is ready.",
      readyProviders.length > 0 ? `Ready providers: ${readyProviders.join(", ")}.` : "",
      flaggedProviders.length > 0 ? `Attention: ${flaggedProviders.slice(0, 3).join(" | ")}.` : ""
    ]
      .filter((value) => value.length > 0)
      .join(" ");
    this.notifyHybridAssistCompletion("Check Hybrid Runtime", payload, statusLabel);
    const plan = this.detectRemediationPlan(root);
    if (plan) {
      await this.executeRemediationWithPrompt(plan);
    }
  }

  async buildProviderRemediationQuickPickItem(
    root: string
  ): Promise<(vscode.QuickPickItem & { action: () => Promise<void> }) | null> {
    const plan = this.detectRemediationPlan(root);
    if (!plan) {
      return null;
    }
    const names = plan.providers.map((p) => p.name).join(", ");
    const verb = plan.mode === "append-block" ? "Enable" : "Add";
    return {
      label: `Fix now: ${verb} ${names} provider(s) in logics.yaml`,
      description: `API key(s) found for ${names}, but hybrid assist cannot use them until logics.yaml is updated.`,
      action: async () => {
        try {
          this.applyRemediation(plan);
          void vscode.window.showInformationMessage(`logics.yaml updated: ${names} provider(s) enabled.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Failed to update logics.yaml: ${message}`);
        }
      }
    };
  }

  private readEnvKeys(root: string): Set<string> {
    const keys = new Set<string>();
    for (const file of [".env.local", ".env"]) {
      const filePath = path.join(root, file);
      if (!fs.existsSync(filePath)) {
        continue;
      }
      try {
        const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            continue;
          }
          const eqIndex = trimmed.indexOf("=");
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            if (key && value) {
              keys.add(key);
            }
          }
        }
      } catch {
        // skip unreadable file
      }
    }
    return keys;
  }

  private detectEnvFile(root: string): string {
    const localPath = path.join(root, ".env.local");
    if (fs.existsSync(localPath)) {
      try {
        const localContent = fs.readFileSync(localPath, "utf-8");
        const hasKey = Object.values(LogicsHybridAssistController.KNOWN_PROVIDERS).some((cfg) =>
          localContent.includes(cfg.envKey)
        );
        if (hasKey) {
          return ".env.local";
        }
      } catch {
        // fall through
      }
    }
    return ".env";
  }

  private detectRemediationPlan(root: string): ProviderRemediationPlan | null {
    const logicsYamlPath = path.join(root, "logics.yaml");
    if (!fs.existsSync(logicsYamlPath)) {
      return null;
    }
    let yamlContent: string;
    try {
      yamlContent = fs.readFileSync(logicsYamlPath, "utf-8");
    } catch {
      return null;
    }

    const envKeys = this.readEnvKeys(root);
    const hasHybridBlock = yamlContent.includes("hybrid_assist:");

    const providers = Object.entries(LogicsHybridAssistController.KNOWN_PROVIDERS)
      .filter(([name, cfg]) => {
        if (!envKeys.has(cfg.envKey)) {
          return false;
        }
        if (hasHybridBlock) {
          const blockStart = yamlContent.indexOf("hybrid_assist:");
          const hybridSection = yamlContent.slice(blockStart);
          return !hybridSection.includes(`\n    ${name}:`);
        }
        return true;
      })
      .map(([name, cfg]) => ({ name, ...cfg }));

    if (providers.length === 0) {
      return null;
    }

    return {
      providers,
      mode: hasHybridBlock ? "insert-provider" : "append-block",
      yamlContent,
      logicsYamlPath,
      envFile: this.detectEnvFile(root)
    };
  }

  private applyRemediation(plan: ProviderRemediationPlan): void {
    const document = parseDocument(plan.yamlContent);
    const root = document.toJS();
    if (!root || typeof root !== "object" || Array.isArray(root)) {
      throw new Error("logics.yaml must contain a mapping at the document root.");
    }

    const content = root as Record<string, unknown>;
    const hybridAssist =
      content.hybrid_assist && typeof content.hybrid_assist === "object" && !Array.isArray(content.hybrid_assist)
        ? (content.hybrid_assist as Record<string, unknown>)
        : {};
    const providers =
      hybridAssist.providers && typeof hybridAssist.providers === "object" && !Array.isArray(hybridAssist.providers)
        ? (hybridAssist.providers as Record<string, unknown>)
        : {};

    if (typeof hybridAssist.env_file !== "string" || !hybridAssist.env_file.trim()) {
      hybridAssist.env_file = plan.envFile;
    }
    if (typeof hybridAssist.provider_health_path !== "string" || !hybridAssist.provider_health_path.trim()) {
      hybridAssist.provider_health_path = "logics/.cache/provider_health.json";
    }
    if (typeof providers.readiness_cooldown_seconds !== "number") {
      providers.readiness_cooldown_seconds = 300;
    }

    for (const provider of plan.providers) {
      providers[provider.name] = {
        enabled: true,
        base_url: provider.baseUrl,
        model: provider.model
      };
    }

    hybridAssist.providers = providers;
    content.hybrid_assist = hybridAssist;

    fs.writeFileSync(plan.logicsYamlPath, stringify(content), "utf-8");
  }

  private async executeRemediationWithPrompt(plan: ProviderRemediationPlan): Promise<void> {
    const names = plan.providers.map((p) => p.name).join(", ");
    const verb = plan.mode === "append-block" ? "Enable in logics.yaml" : `Add ${names} to logics.yaml`;
    const choice = await vscode.window.showInformationMessage(
      `API key(s) found for ${names} but provider(s) not configured in logics.yaml.`,
      verb,
      "Dismiss"
    );
    if (choice !== verb) {
      return;
    }
    try {
      this.applyRemediation(plan);
      void vscode.window.showInformationMessage(`logics.yaml updated: ${names} provider(s) enabled.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to update logics.yaml: ${message}`);
    }
  }

  async commitAllChangesFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["commit-all"], {
      actionLabel: "Build Commit Plan"
    });
    if (!payload) {
      return;
    }
    const steps = parseHybridCommitPlanSteps(payload);
    const summary =
      steps.length > 0
        ? steps.map((step) => `${step.scope ?? "unknown"}: ${step.summary ?? "No summary."}`).join(" | ")
        : "No commit steps suggested.";
    const outcome = describeHybridAssistOutcome(payload);
    const backendLabel = outcome.backendUsed
      ? outcome.backendRequested === "auto" && outcome.backendUsed === "codex"
        ? ` via ${outcome.backendUsed} (fallback)`
        : ` via ${outcome.backendUsed}`
      : "";
    const choice = await vscode.window.showInformationMessage(
      `Build Commit Plan completed${backendLabel}. ${summary}`,
      "Execute Commit Plan"
    );
    if (choice === "Execute Commit Plan") {
      const executed = await this.runHybridAssistCommandWithOptions(root, ["commit-all", "--execution-mode", "execute"], {
        actionLabel: "Execute Commit Plan"
      });
      if (!executed) {
        return;
      }
      this.notifyHybridAssistCompletion("Execute Commit Plan", executed, "Commit plan executed.");
      await this.options.refresh();
    }
  }

  async suggestNextStepFromTools(): Promise<void> {
    const pick = await this.pickWorkflowItem("Suggest next workflow step");
    if (!pick) {
      return;
    }
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["next-step", pick.id], {
      actionLabel: "Suggest Next Step"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridNextStepResult(payload);
    const detail = `${result?.decision?.action || "unknown"} on ${result?.decision?.target_ref || "no target"}. ${result?.mapped_command?.summary || ""}`.trim();
    this.notifyHybridAssistCompletion("Suggest Next Step", payload, detail);
  }

  async triageWorkflowDocFromTools(): Promise<void> {
    const pick = await this.pickWorkflowItem("Triage workflow doc");
    if (!pick) {
      return;
    }
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["triage", pick.id], {
      actionLabel: "Triage Item"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridTriageResult(payload);
    const nextActions = result?.next_actions ?? [];
    const detail = [
      result?.classification ? `Classification: ${result.classification}.` : "",
      result?.summary || "",
      nextActions.length > 0 ? `Next actions: ${nextActions.slice(0, 2).join(" | ")}` : ""
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
      .trim();
    this.notifyHybridAssistCompletion("Triage Item", payload, detail || "Triage completed.");
  }

  async assessDiffRiskFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["diff-risk"], {
      actionLabel: "Assess Diff Risk"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridDiffRiskResult(payload);
    const drivers = result?.drivers ?? [];
    const detail = [
      result?.risk ? `Risk: ${result.risk}.` : "",
      result?.summary || "",
      drivers.length > 0 ? `Drivers: ${drivers.slice(0, 2).join(" | ")}` : ""
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
      .trim();
    this.notifyHybridAssistCompletion("Assess Diff Risk", payload, detail || "Diff risk assessed.");
  }

  async summarizeValidationFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["summarize-validation"], {
      actionLabel: "Summarize Validation"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridValidationSummaryResult(payload);
    const detail = `Validation summary (${result?.overall || "unknown"}): ${result?.summary || ""}`.trim();
    this.notifyHybridAssistCompletion("Summarize Validation", payload, detail);
  }

  async summarizeChangelogFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["summarize-changelog"], {
      actionLabel: "Generate Changelog Summary"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridChangelogSummaryResult(payload);
    const title = result?.title || "Changelog summary";
    const entries = result?.entries ?? [];
    const detail = entries.length > 0 ? `${title}: ${entries.slice(0, 3).join(" | ")}` : `${title}.`;
    const clipboardText = [title, "", ...entries.map((entry) => `- ${entry}`)].join("\n").trim();
    const message = this.buildHybridAssistCompletionMessage("Generate Changelog Summary", payload, detail);
    const choice = payload.degraded
      ? await vscode.window.showWarningMessage(message, "Copy Changelog")
      : await vscode.window.showInformationMessage(message, "Copy Changelog");
    if (choice !== "Copy Changelog") {
      return;
    }
    await vscode.env.clipboard.writeText(clipboardText);
    void vscode.window.showInformationMessage("Changelog summary copied to clipboard.");
  }

  async prepareReleaseFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["prepare-release"], {
      actionLabel: "Prepare Release"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridPrepareReleaseResult(payload);
    const tag = result?.changelog_status?.tag ?? "release";
    const summary = result?.changelog_status?.summary ?? "";
    const ready = result?.ready ?? false;
    if (ready) {
      this.notifyPrepareReleaseCompletion(payload, `${tag} is ready to publish.`, { readinessOnly: true });
      return;
    }
    const choice = await vscode.window.showInformationMessage(
      `${tag} is not ready: ${summary}`,
      "Auto-Prepare"
    );
    if (choice === "Auto-Prepare") {
      const executed = await this.runHybridAssistCommandWithOptions(
        root,
        ["prepare-release", "--execution-mode", "execute"],
        { actionLabel: "Prepare Release" }
      );
      if (!executed) {
        return;
      }
      const execResult = parseHybridPrepareReleaseResult(executed);
      const nowReady = execResult?.ready ?? false;
      this.notifyPrepareReleaseCompletion(
        executed,
        nowReady ? `${tag} is now ready to publish.` : "Preparation incomplete — check the output log."
      );
      await this.options.refresh();
    }
  }

  private notifyPrepareReleaseCompletion(
    payload: HybridAssistPayload,
    detail: string,
    options: { readinessOnly?: boolean } = {}
  ): void {
    const outcome = describeHybridAssistOutcome(payload);
    if (outcome.backendUsed === "deterministic") {
      const degradedDetail = outcome.degradedReasons.length > 0
        ? ` Degraded reasons: ${outcome.degradedReasons.join(", ")}.`
        : "";
      const prefix = options.readinessOnly
        ? "Prepare Release checked release readiness."
        : "Prepare Release completed.";
      const message = `${prefix} ${detail}${degradedDetail}`.trim();
      if (outcome.degraded) {
        void vscode.window.showWarningMessage(message);
        return;
      }
      void vscode.window.showInformationMessage(message);
      return;
    }
    this.notifyHybridAssistCompletion("Prepare Release", payload, detail);
  }

  async publishReleaseFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const capability = await inspectGitHubReleaseCapability(root);
    if (!capability.available) {
      void vscode.window.showWarningMessage(capability.title);
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["publish-release"], {
      actionLabel: "Publish Release"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridPublishReleaseResult(payload);
    const tag = result?.changelog_status?.tag ?? "release";
    const ready = result?.ready ?? false;
    if (!ready) {
      const blocking = result?.publish_result?.blocking?.join(", ") ?? "Release prerequisites not met.";
      this.notifyHybridAssistCompletion("Publish Release", payload, `Not ready: ${blocking}`);
      return;
    }
    const releaseBranchSuggestion =
      result?.release_branch?.exists && result.release_branch.needs_update
        ? result.release_branch.suggestion ??
          (result.release_branch.name && result.release_branch.current_branch
            ? `Branch '${result.release_branch.name}' is behind '${result.release_branch.current_branch}'. Consider updating it before publishing.`
            : "The release branch is not up to date. Consider updating it before publishing.")
        : undefined;
    const canFastForwardReleaseBranch =
      result?.release_branch?.exists &&
      result.release_branch.needs_update &&
      result.release_branch.can_fast_forward &&
      typeof result.release_branch.name === "string" &&
      typeof result.release_branch.current_branch === "string";
    const releaseConsent = canFastForwardReleaseBranch
      ? inspectReleaseBranchFastForwardConsent(root)
      : null;
    const updateAndPublishLabel =
      canFastForwardReleaseBranch && releaseConsent?.allowed
        ? "Update release branch and publish"
        : canFastForwardReleaseBranch
          ? "Allow and update release branch"
          : undefined;
    const choice = await vscode.window.showInformationMessage(
      releaseBranchSuggestion
        ? canFastForwardReleaseBranch && !releaseConsent?.allowed
          ? `${tag} is ready. ${releaseBranchSuggestion} Automatic release-branch update stays disabled until repo-local consent is granted in logics.yaml. You can still publish now or allow the non-destructive fast-forward helper for this repository.`
          : `${tag} is ready. ${releaseBranchSuggestion} Create tag, push, and publish the GitHub release anyway?`
        : `${tag} is ready. Create tag, push, and publish the GitHub release?`,
      ...(updateAndPublishLabel ? [updateAndPublishLabel] : []),
      "Publish"
    );
    let shouldPublish = choice === "Publish";
    if (choice === updateAndPublishLabel && canFastForwardReleaseBranch && result?.release_branch) {
      if (!releaseConsent?.allowed) {
        try {
          grantReleaseBranchFastForwardConsent(root);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Failed to persist release-branch consent in logics.yaml: ${message}`);
          return;
        }
      }
      const fastForwarded = await this.fastForwardReleaseBranch(root, result.release_branch);
      if (!fastForwarded) {
        return;
      }
      shouldPublish = true;
    }
    if (shouldPublish) {
      const executed = await this.runHybridAssistCommandWithOptions(
        root,
        ["publish-release", "--execution-mode", "execute", "--push"],
        { actionLabel: "Publish Release" }
      );
      if (!executed) {
        return;
      }
      const publishedResult = parseHybridPublishReleaseResult(executed);
      const publishOk = publishedResult?.publish_result?.ok ?? false;
      this.notifyHybridAssistCompletion(
        "Publish Release",
        executed,
        publishOk ? `${tag} published successfully.` : "Publish failed — check the output log."
      );
      await this.options.refresh();
    }
  }

  private async fastForwardReleaseBranch(
    root: string,
    releaseBranch: NonNullable<HybridPublishReleaseResult["release_branch"]>
  ): Promise<boolean> {
    const releaseName = releaseBranch.name?.trim();
    const sourceBranch = releaseBranch.current_branch?.trim();
    if (!releaseName || !sourceBranch) {
      void vscode.window.showWarningMessage(
        "Release branch fast-forward could not start because the release or source branch is missing from the runtime payload."
      );
      return false;
    }

    const switchToRelease = await runGitCommand(root, ["switch", releaseName]);
    if (switchToRelease.error) {
      void vscode.window.showErrorMessage(
        `Failed to switch to '${releaseName}' before publish: ${switchToRelease.stderr || switchToRelease.error.message}`
      );
      return false;
    }

    const mergeResult = await runGitCommand(root, ["merge", "--ff-only", sourceBranch]);
    if (mergeResult.error) {
      await runGitCommand(root, ["switch", sourceBranch]);
      void vscode.window.showErrorMessage(
        `Failed to fast-forward '${releaseName}' from '${sourceBranch}': ${mergeResult.stderr || mergeResult.error.message}`
      );
      return false;
    }

    const switchBack = await runGitCommand(root, ["switch", sourceBranch]);
    if (switchBack.error) {
      void vscode.window.showErrorMessage(
        `Release branch updated, but switching back to '${sourceBranch}' failed: ${switchBack.stderr || switchBack.error.message}`
      );
      return false;
    }

    const pushResult = await runGitCommand(root, ["push", "origin", releaseName]);
    if (pushResult.error) {
      void vscode.window.showErrorMessage(
        `Release branch fast-forward succeeded locally, but push failed: ${pushResult.stderr || pushResult.error.message}`
      );
      return false;
    }

    return true;
  }

  async buildValidationChecklistFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["validation-checklist"], {
      actionLabel: "Build Validation Checklist"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridValidationChecklistResult(payload);
    const checks = result?.checks ?? [];
    this.notifyHybridAssistCompletion(
      "Build Validation Checklist",
      payload,
      `Checklist profile ${result?.profile || "unknown"} with ${checks.length} check(s).`
    );
  }

  async reviewDocConsistencyFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["doc-consistency"], {
      actionLabel: "Review Doc Consistency"
    });
    if (!payload) {
      return;
    }
    const result = parseHybridDocConsistencyResult(payload);
    const issues = result?.issues ?? [];
    const detail = [
      result?.overall ? `Overall: ${result.overall}.` : "",
      result?.summary || "",
      issues.length > 0 ? `Issues: ${issues.slice(0, 2).join(" | ")}` : ""
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
      .trim();
    this.notifyHybridAssistCompletion("Review Doc Consistency", payload, detail || "Doc consistency review completed.");
  }

  async openHybridInsightsFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    const panel = this.getHybridInsightsPanel();
    panel.reveal(vscode.ViewColumn.Beside, true);
    await this.refreshHybridInsightsPanel(root);
  }

  private async pickWorkflowItem(placeHolder: string): Promise<LogicsItem | undefined> {
    let items = this.options.getItems();
    if (!items.length) {
      await this.options.refresh();
      items = this.options.getItems();
    }
    return this.options.pickItem(items.filter((item) => ["request", "backlog", "task"].includes(item.stage)), placeHolder);
  }

  private async runHybridAssistCommand(root: string, args: string[]): Promise<HybridAssistPayload | null> {
    return this.runHybridAssistCommandWithOptions(root, args, {
      actionLabel: "Hybrid assist"
    });
  }

  private async runHybridAssistCommandWithOptions(
    root: string,
    args: string[],
    options: {
      actionLabel: string;
    }
  ): Promise<HybridAssistPayload | null> {
    const runtimeEntry = path.join(root, "logics", "skills", "logics.py");
    if (!fs.existsSync(runtimeEntry)) {
      void vscode.window.showErrorMessage(
        `${options.actionLabel} is unavailable because logics/skills/logics.py is missing.`
      );
      return null;
    }

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${options.actionLabel}: waiting on hybrid assist backend...`,
        cancellable: false
      },
      async () => runPythonWithOutput(root, runtimeEntry, ["flow", "assist", ...args, "--format", "json"])
    );
    if (result.error) {
      void vscode.window.showErrorMessage(
        `${options.actionLabel} failed: ${result.stderr || result.error.message}`
      );
      return null;
    }

    try {
      const payload = parseHybridAssistPayload(JSON.parse(result.stdout));
      if (!payload) {
        void vscode.window.showErrorMessage(`${options.actionLabel} returned invalid JSON.`);
        return null;
      }
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`${options.actionLabel} returned invalid JSON: ${message}`);
      return null;
    }
  }

  private notifyHybridAssistCompletion(
    actionLabel: string,
    payload: HybridAssistPayload,
    detail: string
  ): void {
    const outcome = describeHybridAssistOutcome(payload);
    const message = this.buildHybridAssistCompletionMessage(actionLabel, payload, detail);
    if (outcome.degraded) {
      void vscode.window.showWarningMessage(message);
      return;
    }
    void vscode.window.showInformationMessage(message);
  }

  private buildHybridAssistCompletionMessage(
    actionLabel: string,
    payload: HybridAssistPayload,
    detail: string
  ): string {
    const outcome = describeHybridAssistOutcome(payload);
    const backendLabel = outcome.backendUsed
      ? outcome.backendRequested === "auto" && outcome.backendUsed === "codex"
        ? ` via ${outcome.backendUsed} (fallback)`
        : ` via ${outcome.backendUsed}`
      : "";
    const degradedDetail = outcome.degradedReasons.length > 0
      ? ` Degraded reasons: ${outcome.degradedReasons.join(", ")}.`
      : "";
    return `${actionLabel} completed${backendLabel}. ${detail}${degradedDetail}`.trim();
  }

  private async refreshHybridInsightsPanel(root: string): Promise<void> {
    const panel = this.getHybridInsightsPanel();
    const payload = await this.runHybridAssistCommandWithOptions(root, ["roi-report"], {
      actionLabel: "Refresh Hybrid Insights"
    });
    if (!payload) {
      return;
    }
    panel.title = `Hybrid Insights: ${path.basename(root)}`;
    panel.webview.html = buildHybridInsightsHtml({
      webview: panel.webview,
      report: payload,
      rootLabel: path.basename(root) || root
    });
  }

  private async openHybridInsightsSourceLog(root: string, source: "audit" | "measurement"): Promise<void> {
    const payload = await this.runHybridAssistCommand(root, ["roi-report", "--recent-limit", "1"]);
    if (!payload) {
      return;
    }
    const sources = parseHybridInsightsSources(payload);
    const relPath = source === "audit" ? sources?.audit_log : sources?.measurement_log;
    if (!relPath) {
      void vscode.window.showWarningMessage("Hybrid insights source log path is unavailable.");
      return;
    }
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
      void vscode.window.showWarningMessage(`Hybrid insights source log not found: ${relPath}`);
      return;
    }
    const document = await vscode.workspace.openTextDocument(fullPath);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private getHybridInsightsPanel(): vscode.WebviewPanel {
    if (this.hybridInsightsPanel) {
      return this.hybridInsightsPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "logics.hybridInsights",
      "Hybrid Assist Insights",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.options.context.extensionUri]
      }
    );

    panel.webview.onDidReceiveMessage(async (rawMessage) => {
      const message = parseHybridInsightsPanelMessage(rawMessage);
      if (!message) {
        return;
      }
      const root = await this.options.getActionRoot();
      if (!root) {
        return;
      }
      switch (message.type) {
        case "refresh-report":
          await this.refreshHybridInsightsPanel(root);
          return;
        case "open-source-log":
          await this.openHybridInsightsSourceLog(root, message.source);
          return;
        default:
          assertNever(message);
      }
    });

    panel.onDidDispose(() => {
      if (this.hybridInsightsPanel === panel) {
        this.hybridInsightsPanel = undefined;
      }
    });

    this.hybridInsightsPanel = panel;
    return panel;
  }
}
