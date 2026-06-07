import * as vscode from "vscode";
import { getNonce } from "./logicsReadPreviewHtml";
import {
  ONBOARDING_DOC_GUIDE,
  ONBOARDING_DOC_GUIDE_INTRO,
  ONBOARDING_DOC_GUIDE_TITLE,
  ONBOARDING_FOOTER,
  ONBOARDING_FOOTER_ACTIONS,
  ONBOARDING_HEADLINE,
  ONBOARDING_INTRO,
  ONBOARDING_STAGES,
  type OnboardingStage
} from "./logicsOnboardingModel";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStage(stage: OnboardingStage, index: number): string {
  const actionsHtml = stage.primaryActions
    .map(
      (action) => `
        <button
          class="onboarding__action"
          type="button"
          data-action="${escapeHtml(action.toolAction)}"
          title="${escapeHtml(action.description)}"
        >${escapeHtml(action.label)}</button>`
    )
    .join("");
  const promptsHtml = stage.promptExamples
    .map(
      (prompt) => `
        <div class="onboarding__prompt">
          <div class="onboarding__prompt-label">Example prompt</div>
          <div class="onboarding__prompt-text">${escapeHtml(prompt)}</div>
        </div>`
    )
    .join("");

  return `
    <div class="onboarding__stage">
      <div class="onboarding__stage-number" aria-hidden="true">${index + 1}</div>
      <div class="onboarding__stage-body">
        <h2 class="onboarding__stage-label">${escapeHtml(stage.label)}</h2>
        <p class="onboarding__stage-tagline">${escapeHtml(stage.tagline)}</p>
        <p class="onboarding__stage-description">${escapeHtml(stage.description)}</p>
        ${promptsHtml ? `<div class="onboarding__prompts">${promptsHtml}</div>` : ""}
        <p class="onboarding__stage-mapping">${escapeHtml(stage.workflowMapping)}</p>
        ${actionsHtml.trim() ? `<div class="onboarding__actions">${actionsHtml}</div>` : ""}
      </div>
    </div>`;
}

function renderFooterActions(): string {
  return ONBOARDING_FOOTER_ACTIONS.map(
    (action) => `
      <button
        class="onboarding__footer-action"
        type="button"
        data-action="${escapeHtml(action.toolAction)}"
        title="${escapeHtml(action.description)}"
      >${escapeHtml(action.label)}</button>`
  ).join("");
}

function renderDocGuide(): string {
  const guideCards = ONBOARDING_DOC_GUIDE.map(
    (item) => `
      <div class="onboarding__doc-card">
        <div class="onboarding__doc-cue">${escapeHtml(item.cue)}</div>
        <div class="onboarding__doc-destination">${escapeHtml(item.destination)}</div>
      </div>`
  ).join("");

  return `
    <section class="onboarding__doc-guide" aria-labelledby="onboarding-doc-guide-title">
      <div class="onboarding__doc-guide-header">
        <h2 id="onboarding-doc-guide-title" class="onboarding__doc-guide-title">${escapeHtml(ONBOARDING_DOC_GUIDE_TITLE)}</h2>
        <p class="onboarding__doc-guide-intro">${escapeHtml(ONBOARDING_DOC_GUIDE_INTRO)}</p>
      </div>
      <div class="onboarding__doc-grid">
        ${guideCards}
      </div>
    </section>`;
}

export function buildOnboardingHtml(webview: vscode.Webview): string {
  const nonce = getNonce();
  const csp = `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';`;

  const stagesHtml = ONBOARDING_STAGES.map((stage, i) => renderStage(stage, i)).join("\n");
  const docGuideHtml = renderDocGuide();
  const footerActionsHtml = renderFooterActions();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ONBOARDING_HEADLINE)}</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px 28px;
      max-width: 680px;
    }
    .onboarding__header { margin-bottom: 28px; }
    .onboarding__headline {
      font-size: 1.4em;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 10px;
    }
    .onboarding__intro {
      color: var(--vscode-descriptionForeground);
      line-height: 1.55;
    }
    .onboarding__stages { display: flex; flex-direction: column; gap: 24px; margin-bottom: 28px; }
    .onboarding__stage {
      display: flex;
      gap: 16px;
      padding: 16px;
      border-radius: 6px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border, #454545));
      background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    }
    .onboarding__stage-number {
      font-size: 1.6em;
      font-weight: 700;
      color: var(--vscode-focusBorder);
      min-width: 28px;
      line-height: 1;
      padding-top: 2px;
    }
    .onboarding__stage-body { flex: 1; }
    .onboarding__stage-label {
      font-size: 1.05em;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .onboarding__stage-tagline {
      font-size: 0.9em;
      color: var(--vscode-focusBorder);
      font-weight: 500;
      margin-bottom: 8px;
    }
    .onboarding__stage-description {
      color: var(--vscode-foreground);
      line-height: 1.5;
      margin-bottom: 6px;
    }
    .onboarding__prompts {
      display: grid;
      gap: 10px;
      margin: 14px 0 10px;
    }
    .onboarding__prompt {
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border, #454545));
      background: color-mix(in srgb, var(--vscode-editorWidget-background, var(--vscode-editor-background)) 88%, var(--vscode-button-background) 12%);
    }
    .onboarding__prompt-label {
      font-size: 0.78em;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }
    .onboarding__prompt-text {
      line-height: 1.5;
      color: var(--vscode-foreground);
    }
    .onboarding__stage-mapping {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
      font-style: italic;
    }
    .onboarding__actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .onboarding__doc-guide {
      margin-bottom: 28px;
      padding: 18px 16px;
      border-radius: 8px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border, #454545));
      background: color-mix(in srgb, var(--vscode-editorWidget-background, var(--vscode-editor-background)) 92%, var(--vscode-button-background) 8%);
    }
    .onboarding__doc-guide-header { margin-bottom: 14px; }
    .onboarding__doc-guide-title {
      font-size: 1.02em;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .onboarding__doc-guide-intro {
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }
    .onboarding__doc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    .onboarding__doc-card {
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border, #454545));
      background: var(--vscode-editor-background);
    }
    .onboarding__doc-cue {
      line-height: 1.45;
      margin-bottom: 8px;
    }
    .onboarding__doc-destination {
      font-size: 0.85em;
      font-weight: 700;
      color: var(--vscode-focusBorder);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .onboarding__action {
      padding: 5px 12px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 3px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      font-size: 0.9em;
      cursor: pointer;
      font-family: inherit;
    }
    .onboarding__action:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .onboarding__footer {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      border-top: 1px solid var(--vscode-widget-border, #454545);
      padding-top: 16px;
    }
    .onboarding__footer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .onboarding__footer-action {
      padding: 6px 12px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 3px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      font-size: 0.9em;
      cursor: pointer;
      font-family: inherit;
    }
    .onboarding__footer-action:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <header class="onboarding__header">
    <h1 class="onboarding__headline">${escapeHtml(ONBOARDING_HEADLINE)}</h1>
    <p class="onboarding__intro">${escapeHtml(ONBOARDING_INTRO)}</p>
  </header>
  <div class="onboarding__stages">
    ${stagesHtml}
  </div>
  ${docGuideHtml}
  <footer class="onboarding__footer">
    <div class="onboarding__footer-actions">
      ${footerActionsHtml}
    </div>
    <p>${escapeHtml(ONBOARDING_FOOTER)}</p>
  </footer>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('.onboarding__action[data-action], .onboarding__footer-action[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        vscode.postMessage({ type: 'tool-action', action: btn.dataset.action });
      });
    });
  </script>
</body>
</html>`;
}
