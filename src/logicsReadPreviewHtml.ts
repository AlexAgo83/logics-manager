import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { renderMarkdownToHtml } from "./workflowSupport";

export function buildReadPreviewHtml(params: {
  title: string;
  itemId: string;
  relPath: string;
  markdown: string;
  webview: vscode.Webview;
  extensionPath: string;
}): string {
  const nonce = getNonce();
  const { title, itemId, relPath, markdown, webview, extensionPath } = params;
  const mermaidScriptPath = path.join(extensionPath, "dist", "vendor", "mermaid.min.js");
  const mermaidScriptUri = fs.existsSync(mermaidScriptPath)
    ? webview.asWebviewUri(vscode.Uri.file(mermaidScriptPath)).toString()
    : "";
  const renderedMarkdown = renderMarkdownToHtml(markdown);
  const escapedTitle = escapeHtmlForHtml(title);
  const escapedItemId = escapeHtmlForHtml(itemId);
  const escapedRelPath = escapeHtmlForHtml(relPath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedItemId}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --ink: #e5e7eb;
      --muted: #94a3b8;
      --border: rgba(148, 163, 184, 0.28);
      --accent: #38bdf8;
      --code-bg: rgba(148, 163, 184, 0.14);
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #0b1220 0%, #111827 100%);
      color: var(--ink);
    }
    .read-preview {
      max-width: 980px;
      margin: 0 auto;
      padding: 24px 24px 48px;
    }
    .read-preview__header {
      margin-bottom: 24px;
      padding: 18px 20px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(10px);
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
      font-size: 32px;
      line-height: 1.1;
    }
    .read-preview__path {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
    .markdown-preview {
      padding: 26px 28px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.9);
      box-shadow: 0 22px 50px rgba(0, 0, 0, 0.28);
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
    .markdown-preview ul,
    .markdown-preview ol {
      padding-left: 1.4rem;
    }
    .markdown-preview a {
      color: #7dd3fc;
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
      <p class="read-preview__eyebrow">${escapedItemId}</p>
      <h1 class="read-preview__title">${escapedTitle}</h1>
      <p class="read-preview__path">${escapedRelPath}</p>
    </header>
    <main class="markdown-preview">${renderedMarkdown}</main>
  </div>
  ${mermaidScriptUri ? `<script src="${mermaidScriptUri}"></script>` : ""}
  <script nonce="${nonce}">
    (() => {
      const fallbackNodes = Array.from(document.querySelectorAll(".markdown-preview__mermaid-fallback"));
      const showFallback = (message) => {
        fallbackNodes.forEach((node) => {
          node.hidden = false;
          if (message) {
            node.textContent = message;
          }
        });
      };

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


function escapeHtmlForHtml(value: string): string {
  return value
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
