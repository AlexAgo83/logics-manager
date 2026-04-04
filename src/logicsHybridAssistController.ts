import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { buildHybridInsightsHtml } from "./logicsHybridInsightsHtml";
import {
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
  type HybridAssistPayload
} from "./logicsHybridAssistTypes";
import { LogicsItem } from "./logicsIndexer";
import { runPythonWithOutput } from "./logicsProviderUtils";
import { assertNever, parseHybridInsightsPanelMessage } from "./logicsViewMessages";

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
      label: `Run: ${verb} ${names} provider(s) in logics.yaml`,
      description: `API key(s) found for ${names} but not configured in logics.yaml.`,
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
    const providerLines = plan.providers
      .map(
        (p) =>
          `    ${p.name}:\n` +
          `      enabled: true\n` +
          `      base_url: ${p.baseUrl}\n` +
          `      model: ${p.model}`
      )
      .join("\n");

    let newContent: string;
    if (plan.mode === "append-block") {
      const separator = plan.yamlContent.endsWith("\n") ? "" : "\n";
      newContent =
        plan.yamlContent +
        separator +
        `hybrid_assist:\n` +
        `  env_file: ${plan.envFile}\n` +
        `  provider_health_path: logics/.cache/provider_health.json\n` +
        `  providers:\n` +
        `    readiness_cooldown_seconds: 300\n` +
        providerLines +
        "\n";
    } else {
      const insertMarker = "    readiness_cooldown_seconds:";
      const markerIndex = plan.yamlContent.indexOf(insertMarker);
      if (markerIndex >= 0) {
        const lineEnd = plan.yamlContent.indexOf("\n", markerIndex);
        if (lineEnd >= 0) {
          newContent =
            plan.yamlContent.slice(0, lineEnd + 1) +
            providerLines +
            "\n" +
            plan.yamlContent.slice(lineEnd + 1);
        } else {
          newContent = plan.yamlContent + "\n" + providerLines + "\n";
        }
      } else {
        const separator = plan.yamlContent.endsWith("\n") ? "" : "\n";
        newContent = plan.yamlContent + separator + providerLines + "\n";
      }
    }

    fs.writeFileSync(plan.logicsYamlPath, newContent, "utf-8");
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
    const backendLabel = outcome.backendUsed
      ? outcome.backendRequested === "auto" && outcome.backendUsed === "codex"
        ? ` via ${outcome.backendUsed} (fallback)`
        : ` via ${outcome.backendUsed}`
      : "";
    const degradedDetail = outcome.degradedReasons.length > 0
      ? ` Degraded reasons: ${outcome.degradedReasons.join(", ")}.`
      : "";
    const message = `${actionLabel} completed${backendLabel}. ${detail}${degradedDetail}`.trim();
    if (outcome.degraded) {
      void vscode.window.showWarningMessage(message);
      return;
    }
    void vscode.window.showInformationMessage(message);
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
