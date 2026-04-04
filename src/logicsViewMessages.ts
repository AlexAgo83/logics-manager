type ProjectRootMessage =
  | { type: "change-project-root" }
  | { type: "reset-project-root" };

type ItemMessage =
  | { type: "open"; id: string }
  | { type: "read"; id: string }
  | { type: "promote"; id: string }
  | { type: "add-reference"; id: string }
  | { type: "add-used-by"; id: string }
  | { type: "rename-entry"; id: string }
  | { type: "mark-done"; id: string }
  | { type: "mark-obsolete"; id: string };

type PromptMessage = {
  type: "inject-prompt";
  prompt: string;
  options?: {
    codexCopiedMessage?: string;
    fallbackCopiedMessage?: string;
  };
};

export type LogicsWebviewMessage =
  | { type: "ready" }
  | { type: "refresh" }
  | { type: "create-item"; kind: "request" | "backlog" | "task" }
  | { type: "new-request" }
  | { type: "new-request-guided" }
  | { type: "launch-codex-overlay" }
  | { type: "fix-docs" }
  | { type: "select-agent" }
  | { type: "bootstrap-logics" }
  | { type: "check-environment" }
  | { type: "check-hybrid-runtime" }
  | { type: "update-logics-kit" }
  | { type: "sync-codex-overlay" }
  | { type: "assist-commit-all" }
  | { type: "assist-next-step" }
  | { type: "assist-triage" }
  | { type: "assist-diff-risk" }
  | { type: "assist-summarize-validation" }
  | { type: "assist-validation-checklist" }
  | { type: "assist-doc-consistency" }
  | { type: "open-hybrid-insights" }
  | { type: "open-onboarding" }
  | { type: "tool-action"; action: string }
  | { type: "about" }
  | { type: "create-companion-doc"; id?: string; preferredKind?: "product" | "architecture" }
  | PromptMessage
  | ProjectRootMessage
  | ItemMessage;

export type HybridInsightsPanelMessage =
  | { type: "refresh-report" }
  | { type: "open-source-log"; source: "audit" | "measurement" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function parseLogicsWebviewMessage(value: unknown): LogicsWebviewMessage | null {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }
  const { type } = value;
  switch (type) {
    case "ready":
    case "refresh":
    case "new-request":
    case "new-request-guided":
    case "launch-codex-overlay":
    case "fix-docs":
    case "select-agent":
    case "bootstrap-logics":
    case "check-environment":
    case "check-hybrid-runtime":
    case "update-logics-kit":
    case "sync-codex-overlay":
    case "assist-commit-all":
    case "assist-next-step":
    case "assist-triage":
    case "assist-diff-risk":
    case "assist-summarize-validation":
    case "assist-validation-checklist":
    case "assist-doc-consistency":
    case "open-hybrid-insights":
    case "open-onboarding":
    case "about":
    case "change-project-root":
    case "reset-project-root":
      return { type };
    case "tool-action": {
      const action = readString(value.action);
      return action ? { type, action } : null;
    }
    case "open":
    case "read":
    case "promote":
    case "add-reference":
    case "add-used-by":
    case "rename-entry":
    case "mark-done":
    case "mark-obsolete": {
      const id = readString(value.id);
      return id ? { type, id } : null;
    }
    case "create-item":
      return value.kind === "request" || value.kind === "backlog" || value.kind === "task"
        ? { type, kind: value.kind }
        : null;
    case "create-companion-doc":
      return {
        type,
        id: readString(value.id),
        preferredKind: value.preferredKind === "product" || value.preferredKind === "architecture" ? value.preferredKind : undefined
      };
    case "inject-prompt": {
      const prompt = readString(value.prompt);
      if (!prompt) {
        return null;
      }
      return {
        type,
        prompt,
        options: isRecord(value.options)
          ? {
              codexCopiedMessage: readString(value.options.codexCopiedMessage),
              fallbackCopiedMessage: readString(value.options.fallbackCopiedMessage)
            }
          : undefined
      };
    }
    default:
      return null;
  }
}

export function parseHybridInsightsPanelMessage(value: unknown): HybridInsightsPanelMessage | null {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }
  if (value.type === "refresh-report") {
    return { type: value.type };
  }
  if (value.type === "open-source-log" && (value.source === "audit" || value.source === "measurement")) {
    return { type: value.type, source: value.source };
  }
  return null;
}

export function assertNever(_value: never): never {
  throw new Error("Unhandled Logics webview message.");
}
