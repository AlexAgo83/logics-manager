import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { renderMarkdownToHtml } from "./workflowSupport";

type ReadPreviewItem = {
  id: string;
  title: string;
  stage: string;
  relPath: string;
  indicators?: Record<string, string>;
  references?: Array<{ path: string }>;
  usedBy?: Array<{ id?: string; relPath?: string; title?: string; stage?: string }>;
};

type ReadPreviewLinkedItem = {
  id: string;
  title: string;
  stage: string;
  relPath: string;
};

export function buildReadPreviewHtml(params: {
  item: ReadPreviewItem;
  markdown: string;
  webview: vscode.Webview;
  extensionPath: string;
  linkedItems?: ReadPreviewLinkedItem[];
}): string {
  const nonce = getNonce();
  const { item, markdown, webview, extensionPath, linkedItems = [] } = params;
  const mermaidScriptPath = path.join(extensionPath, "dist", "vendor", "mermaid.min.js");
  const mermaidScriptUri = fs.existsSync(mermaidScriptPath)
    ? webview.asWebviewUri(vscode.Uri.file(mermaidScriptPath)).toString()
    : "";
  const renderedMarkdown = renderMarkdownToHtml(stripLeadingDocumentFrontMatter(markdown, item));
  const documentPrefix = formatDocumentPrefix(item);
  const summaryChips = buildSummaryChips(item);
  const relatedSections = buildRelatedSections(item, linkedItems);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtmlForHtml(item.id || "Logics item")}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background, #1e1e1e);
      --panel: color-mix(in srgb, var(--vscode-panel-background, var(--vscode-editor-background, #1e1e1e)) 92%, transparent);
      --panel-strong: color-mix(in srgb, var(--vscode-panel-background, var(--vscode-editor-background, #1e1e1e)) 96%, transparent);
      --ink: var(--vscode-editor-foreground, #d4d4d4);
      --muted: var(--vscode-descriptionForeground, #9da5b4);
      --border: var(--vscode-panel-border, rgba(148, 163, 184, 0.22));
      --border-strong: color-mix(in srgb, var(--vscode-focusBorder, #0e639c) 35%, var(--border));
      --accent: var(--vscode-focusBorder, #0e639c);
      --accent-strong: color-mix(in srgb, var(--accent) 80%, white);
      --chip: color-mix(in srgb, var(--vscode-button-secondaryBackground, #3a3d41) 18%, transparent);
      --code-bg: color-mix(in srgb, var(--vscode-input-background, #1f1f1f) 88%, transparent);
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 16%, transparent), transparent 30%),
        linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, black) 100%);
      color: var(--ink);
    }
    .read-preview {
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px 24px 32px;
    }
    .read-preview__header {
      display: grid;
      gap: 18px;
      margin-bottom: 18px;
      padding: 20px 22px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: linear-gradient(180deg, var(--panel-strong) 0%, var(--panel) 100%);
      backdrop-filter: blur(14px);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
    }
    .read-preview__eyebrow {
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .read-preview__title {
      margin: 0 0 4px;
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 30px;
      line-height: 1.1;
    }
    .read-preview__title-prefix {
      display: inline-flex;
      align-items: center;
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .read-preview__path {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
    .read-preview__path code {
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--code-bg);
    }
    .read-preview__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .read-preview__chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--ink);
      background: var(--chip);
      font-size: 13px;
      line-height: 1;
    }
    .read-preview__chip-label {
      color: var(--muted);
      font-weight: 600;
    }
    .read-preview__footer {
      margin-top: 18px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: color-mix(in srgb, var(--panel) 88%, transparent);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
    }
    .read-preview__related-title {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .read-preview__related-group {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    .read-preview__related-group:first-of-type {
      margin-top: 0;
    }
    .read-preview__related-group-title {
      margin: 0;
      color: var(--ink);
      font-size: 13px;
      font-weight: 700;
    }
    .read-preview__link-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .read-preview__link {
      appearance: none;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      padding: 7px 10px;
      background: color-mix(in srgb, var(--vscode-button-secondaryBackground, #3a3d41) 72%, transparent);
      color: var(--ink);
      font: inherit;
      font-size: 12px;
      line-height: 1.25;
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, background-color 120ms ease;
    }
    .read-preview__link:hover,
    .read-preview__link:focus-visible {
      transform: translateY(-1px);
      border-color: var(--accent);
      background: color-mix(in srgb, var(--vscode-button-secondaryBackground, #3a3d41) 88%, transparent);
      outline: none;
    }
    .read-preview__link-prefix {
      color: var(--accent);
      font-weight: 700;
      margin-right: 4px;
    }
    .read-preview__link-muted {
      color: var(--muted);
      margin-left: 4px;
      font-size: 11px;
    }
    .markdown-preview {
      padding: 26px 28px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: var(--panel-strong);
      box-shadow: 0 22px 50px rgba(0, 0, 0, 0.18);
    }
    .markdown-preview h1,
    .markdown-preview h2,
    .markdown-preview h3,
    .markdown-preview h4,
    .markdown-preview h5,
    .markdown-preview h6 {
      line-height: 1.15;
      margin: 1.4em 0 0.6em;
    }
    .markdown-preview h1:first-child,
    .markdown-preview h2:first-child,
    .markdown-preview h3:first-child {
      margin-top: 0;
    }
    .markdown-preview p,
    .markdown-preview li {
      line-height: 1.65;
      color: var(--ink);
    }
    .markdown-preview__task-item {
      margin: 0.15em 0;
    }
    .markdown-preview__task-label {
      display: inline-flex;
      align-items: flex-start;
      gap: 0.65em;
    }
    .markdown-preview__task-checkbox {
      margin-top: 0.2em;
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
      accent-color: var(--accent);
    }
    .markdown-preview ul,
    .markdown-preview ol {
      padding-left: 1.4rem;
    }
    .markdown-preview a,
    .markdown-preview a:visited {
      color: var(--accent);
    }
    .markdown-preview a[data-logics-link],
    .markdown-preview a[data-logics-external] {
      cursor: pointer;
    }
    .markdown-preview pre {
      overflow-x: auto;
      padding: 16px;
      border-radius: 14px;
      background: var(--code-bg);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }
    .markdown-preview code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0.92em;
    }
    .markdown-preview p code,
    .markdown-preview li code,
    .markdown-preview h1 code,
    .markdown-preview h2 code,
    .markdown-preview h3 code {
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--code-bg);
    }
    .markdown-preview__diagram {
      margin: 24px 0;
    }
    .markdown-preview__diagram svg {
      max-width: 100%;
      height: auto;
    }
    .markdown-preview__mermaid-fallback {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: #fecaca;
      background: rgba(127, 29, 29, 0.35);
      border: 1px solid rgba(248, 113, 113, 0.35);
    }
  </style>
</head>
<body>
  <div class="read-preview">
    <header class="read-preview__header">
      <div>
        <p class="read-preview__eyebrow">${escapeHtmlForHtml(formatStageLabel(item.stage))}</p>
        <h1 class="read-preview__title">${
          documentPrefix ? `<span class="read-preview__title-prefix">${escapeHtmlForHtml(documentPrefix)}</span>` : ""
        }<span>${escapeHtmlForHtml(item.title || "Logics item")}</span></h1>
        <p class="read-preview__path">File: <code>${escapeHtmlForHtml(item.relPath || item.id || "unknown")}</code></p>
      </div>
      ${summaryChips ? `<div class="read-preview__meta">${summaryChips}</div>` : ""}
    </header>
    <main class="markdown-preview">${renderedMarkdown}</main>
    ${relatedSections ? `<footer class="read-preview__footer"><p class="read-preview__related-title">Related docs</p>${relatedSections}</footer>` : ""}
  </div>
  ${mermaidScriptUri ? `<script src="${mermaidScriptUri}"></script>` : ""}
  <script nonce="${nonce}">
    (() => {
      const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
      const fallbackNodes = Array.from(document.querySelectorAll(".markdown-preview__mermaid-fallback"));
      const showFallback = (message) => {
        fallbackNodes.forEach((node) => {
          node.hidden = false;
          if (message) {
            node.textContent = message;
          }
        });
      };
      const postNavigation = (type, target) => {
        if (!vscode || !target) {
          return;
        }
        vscode.postMessage({ type, target });
      };

      Array.from(document.querySelectorAll('.markdown-preview a[href]')).forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
          const href = String(anchor.getAttribute("href") || "").trim();
          if (!href) {
            return;
          }
          if (/^(https?:|mailto:)/i.test(href)) {
            event.preventDefault();
            postNavigation("open-external-link", href);
            return;
          }
          if (href.startsWith("#")) {
            return;
          }
          if (href.endsWith(".md") || href.startsWith("logics/") || href.startsWith("./") || href.startsWith("../")) {
            event.preventDefault();
            postNavigation("open-linked-doc", href);
          }
        });
      });

      Array.from(document.querySelectorAll(".read-preview__link[data-logics-target]")).forEach((button) => {
        button.addEventListener("click", () => {
          postNavigation("open-linked-doc", button.getAttribute("data-logics-target") || "");
        });
      });

      if (!window.mermaid) {
        showFallback("Mermaid preview unavailable. Raw diagram source shown below.");
        return;
      }

      try {
        window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        const nodes = Array.from(document.querySelectorAll(".mermaid"));
        if (nodes.length === 0) {
          return;
        }
        Promise.resolve(window.mermaid.run({ nodes })).catch((error) => {
          const detail = error instanceof Error ? error.message : String(error);
          showFallback("Mermaid preview unavailable. Raw diagram source shown below. (" + detail + ")");
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        showFallback("Mermaid preview unavailable. Raw diagram source shown below. (" + detail + ")");
      }
    })();
  </script>
</body>
</html>`;
}

function buildRelatedSections(item: ReadPreviewItem, linkedItems: ReadPreviewLinkedItem[]): string {
  const lookup = buildLinkedItemLookup(linkedItems);
  const sections: string[] = [];
  const references = resolveRelatedEntries(item.references || [], lookup);
  const usedBy = resolveRelatedEntries(item.usedBy || [], lookup);

  if (references.length > 0) {
    sections.push(buildRelatedGroup("References", references));
  }
  if (usedBy.length > 0) {
    sections.push(buildRelatedGroup("Used by", usedBy));
  }
  return sections.join("");
}

function buildSummaryChips(item: ReadPreviewItem): string {
  const indicators = item.indicators || {};
  const chips: string[] = [];
  const pushChip = (label: string, value: string | undefined) => {
    if (!value) {
      return;
    }
    chips.push(
      `<span class="read-preview__chip"><span class="read-preview__chip-label">${escapeHtmlForHtml(label)}</span><span>${escapeHtmlForHtml(value)}</span></span>`
    );
  };

  pushChip("Status", indicators.Status);
  pushChip("Understanding", indicators.Understanding);
  pushChip("Confidence", indicators.Confidence);
  pushChip("Progress", indicators.Progress);
  pushChip("Complexity", indicators.Complexity);
  return chips.join("");
}

function stripLeadingIndicatorBlock(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }
  if (index >= lines.length || !lines[index].trimStart().startsWith(">")) {
    return markdown;
  }

  const block: string[] = [];
  let cursor = index;
  let sawIndicatorLine = false;
  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line.trim() === "") {
      break;
    }
    if (!line.trimStart().startsWith(">")) {
      break;
    }
    sawIndicatorLine = sawIndicatorLine || />(\s+)?(From version|Schema version|Status|Understanding|Confidence|Progress|Complexity|Theme|Reminder)\s*:/.test(line);
    block.push(line);
    cursor += 1;
  }

  if (!sawIndicatorLine) {
    return markdown;
  }

  while (cursor < lines.length && lines[cursor].trim() === "") {
    cursor += 1;
  }
  return lines.slice(cursor).join("\n");
}

function stripLeadingDocumentFrontMatter(markdown: string, item: ReadPreviewItem): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }
  if (index >= lines.length) {
    return markdown;
  }

  const headingMatch = lines[index].match(/^(#{1,6})\s+(.*)$/);
  if (!headingMatch) {
    return stripLeadingIndicatorBlock(markdown);
  }

  const normalizedHeading = headingMatch[2].replace(/\s+/g, " ").trim().toLowerCase();
  const title = String(item.title || "").replace(/\s+/g, " ").trim().toLowerCase();
  const id = String(item.id || "").replace(/\s+/g, " ").trim().toLowerCase();
  const titleWithId = id && title ? `${id} - ${title}` : "";
  const headingMatches =
    (title && normalizedHeading === title) ||
    (titleWithId && normalizedHeading === titleWithId) ||
    (id && normalizedHeading.startsWith(`${id} - `));

  if (!headingMatches) {
    return stripLeadingIndicatorBlock(markdown);
  }

  const remainder = lines.slice(index + 1).join("\n");
  return stripLeadingIndicatorBlock(remainder);
}

function buildRelatedGroup(title: string, entries: Array<{ target: string; title: string; prefix: string; relPath: string }>): string {
  const links = entries
    .map((entry) => {
      const prefix = entry.prefix ? `<span class="read-preview__link-prefix">${escapeHtmlForHtml(entry.prefix)}</span>` : "";
      const titleText = escapeHtmlForHtml(entry.title);
      const meta = entry.relPath ? `<span class="read-preview__link-muted">${escapeHtmlForHtml(entry.relPath)}</span>` : "";
      return `<button type="button" class="read-preview__link" data-logics-target="${escapeHtmlForHtml(entry.target)}">${prefix}${titleText}${meta}</button>`;
    })
    .join("");
  return `<div class="read-preview__related-group"><p class="read-preview__related-group-title">${escapeHtmlForHtml(title)}</p><div class="read-preview__link-list">${links}</div></div>`;
}

function resolveRelatedEntries(
  rawEntries: Array<{ path?: string; relPath?: string; id?: string; title?: string; stage?: string }>,
  lookup: Map<string, ReadPreviewLinkedItem>
): Array<{ target: string; title: string; prefix: string; relPath: string }> {
  return rawEntries
    .map((entry) => {
      const candidate = resolveLinkedCandidate(entry, lookup);
      if (candidate) {
        return {
          target: candidate.relPath || candidate.id,
          title: formatDocumentTitle(candidate),
          prefix: formatDocumentPrefix(candidate),
          relPath: candidate.relPath
        };
      }
      const rawTarget =
        typeof entry.path === "string" && entry.path.trim()
          ? entry.path.trim()
          : typeof entry.relPath === "string" && entry.relPath.trim()
            ? entry.relPath.trim()
            : typeof entry.id === "string" && entry.id.trim()
              ? entry.id.trim()
              : "";
      if (!rawTarget) {
        return null;
      }
      return {
        target: rawTarget,
        title: rawTarget,
        prefix: "",
        relPath: ""
      };
    })
    .filter((entry): entry is { target: string; title: string; prefix: string; relPath: string } => Boolean(entry));
}

function resolveLinkedCandidate(
  entry: { path?: string; relPath?: string; id?: string },
  lookup: Map<string, ReadPreviewLinkedItem>
): ReadPreviewLinkedItem | null {
  const rawTarget =
    typeof entry.path === "string" && entry.path.trim()
      ? entry.path
      : typeof entry.relPath === "string" && entry.relPath.trim()
        ? entry.relPath
        : typeof entry.id === "string" && entry.id.trim()
          ? entry.id
          : "";
  const normalized = normalizeManagedDocValue(rawTarget);
  if (!normalized) {
    return null;
  }
  return lookup.get(normalized) || lookup.get(path.basename(normalized, ".md")) || null;
}

function buildLinkedItemLookup(linkedItems: ReadPreviewLinkedItem[]): Map<string, ReadPreviewLinkedItem> {
  const lookup = new Map<string, ReadPreviewLinkedItem>();
  (linkedItems || []).forEach((item) => {
    if (!item) {
      return;
    }
    const relPath = normalizeManagedDocValue(item.relPath);
    if (relPath) {
      lookup.set(relPath, item);
      lookup.set(path.basename(relPath, ".md"), item);
    }
    if (item.id) {
      lookup.set(String(item.id).trim(), item);
    }
  });
  return lookup;
}

function formatDocumentTitle(item: { id: string; title: string; stage?: string }): string {
  const prefix = formatDocumentPrefix(item);
  return prefix ? `${prefix} - ${item.title || item.id}` : item.title || item.id || "";
}

function formatStageLabel(stage: string): string {
  switch (String(stage || "").trim()) {
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
      return "Logics item";
  }
}

function formatDocumentPrefix(item: { id?: string; stage?: string }): string {
  const stage = String(item?.stage || "").trim();
  const prefixByStage: Record<string, string> = {
    request: "R",
    backlog: "I",
    task: "T",
    product: "P",
    architecture: "A",
    spec: "S"
  };
  const prefix = prefixByStage[stage] || (stage ? stage.slice(0, 1).toUpperCase() : "");
  const match = String(item?.id || "").match(/^[a-z]+_(\d+)/i) || String(item?.id || "").match(/(\d+)/);
  if (!prefix || !match) {
    return "";
  }
  return `${prefix}${String(match[1] || "").padStart(3, "0")}`;
}

function normalizeManagedDocValue(value: string): string {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function escapeHtmlForHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
