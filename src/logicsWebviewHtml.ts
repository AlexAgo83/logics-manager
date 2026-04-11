import * as vscode from "vscode";
import { getNonce } from "./logicsReadPreviewHtml";

function activityIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 12h4l2.2-5 3.6 10 2.2-5H20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

function infoIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" /><path d="M12 10.5v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><circle cx="12" cy="7.5" r="1" fill="currentColor" /></svg>`;
}

function attentionIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 4l8 14H4z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M12 9v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  `;
}

function boardViewIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="14" y="5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="4" y="13" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="14" y="13" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
    </svg>
  `;
}

function workflowIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="6" cy="7" r="1.6" fill="currentColor" />
      <circle cx="18" cy="7" r="1.6" fill="currentColor" />
      <circle cx="12" cy="17" r="1.6" fill="currentColor" />
      <path d="M6 7h12M12 17V9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  `;
}

function assistIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 4.8l1.7 4.2 4.5 1.1-4.5 1.1-1.7 4.2-1.7-4.2-4.5-1.1 4.5-1.1z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

function systemIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
      <path
        d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  `;
}

export function buildLogicsWebviewHtml(extensionUri: vscode.Uri, webview: vscode.Webview): string {
  const modelScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "logicsModel.js"));
  const uiStatusScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "uiStatus.js"));
  const harnessApiScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "harnessApi.js"));
  const layoutControllerScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "layoutController.js"));
  const hostApiScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "hostApi.js"));
  const toolsPanelLayoutScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "toolsPanelLayout.js"));
  const webviewSelectorsScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "webviewSelectors.js"));
  const webviewPersistenceScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "webviewPersistence.js"));
  const webviewChromeScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "webviewChrome.js"));
  const renderBoardScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "renderBoardApp.js"));
  const renderDetailsScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "renderDetails.js"));
  const renderMarkdownScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "renderMarkdown.js"));
  const mainCoreScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "mainCore.js"));
  const mainInteractionHandlersScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "mainInteractionHandlers.js"));
  const mainInteractionsScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "mainInteractions.js"));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "mainApp.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "main.css"));
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Logics Orchestrator</title>
</head>
<body>
  <div class="toolbar">
      <div class="toolbar__row toolbar__row--primary">
      <div class="toolbar__filters">
        <button class="toolbar__filter" id="filter-toggle" aria-label="Show view controls" aria-expanded="false" aria-controls="filter-panel" title="Show view controls">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 6h16l-6 7v5l-4 2v-7z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <div class="toolbar__tools">
          <button
            class="toolbar__filter"
            id="workflow-toggle"
            aria-label="Open workflow menu"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="tools-panel"
            title="Open workflow menu"
          >
            ${workflowIcon()}
          </button>
          <button
            class="toolbar__filter"
            id="assist-toggle"
            aria-label="Open assist menu"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="tools-panel"
            title="Open assist menu"
          >
            ${assistIcon()}
          </button>
          <button
            class="toolbar__filter"
            id="system-toggle"
            aria-label="Open system menu"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="tools-panel"
            title="Open system menu"
          >
            ${systemIcon()}
          </button>
          <div class="tools-panel" id="tools-panel" aria-hidden="true" role="menu">
            <div class="tools-panel__section" data-tools-section="recommended">
              <div class="tools-panel__section-label">Recommended</div>
              <div class="tools-panel__section-body" data-tools-body="recommended">
                <button class="tools-panel__item" type="button" role="menuitem" data-action="new-request" title="Create a new request document">New Request</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-next-step" title="Suggest the next bounded workflow step for the current Logics wave">Suggest Next Step</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-triage" title="Classify a workflow doc into a request, backlog item, or task with the shared runtime">Triage Item</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="bootstrap-logics" title="Bootstrap Logics">Bootstrap Logics</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="check-environment" title="Review environment health and recommended fixes">Check Environment</button>
              </div>
            </div>
            <div class="tools-panel__view" id="tools-view-workflow" data-tools-view="workflow">
              <div class="tools-panel__section" data-tools-section="workflow">
                <div class="tools-panel__section-label">Workflow</div>
                <div class="tools-panel__section-body" data-tools-body="workflow">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="open-onboarding" title="Open the getting started guide">Getting Started</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="select-agent" title="Select the active assistant persona used for workflow actions">Select Agent</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="create-companion-doc" title="Create a companion doc for the selected Logics item">Companion Doc</button>
                </div>
              </div>
            </div>
            <div class="tools-panel__view" id="tools-view-assist" data-tools-view="assist" hidden>
              <div class="tools-panel__section" data-tools-section="assist">
                <div class="tools-panel__section-label">Assist</div>
                <div class="tools-panel__section-body" data-tools-body="assist">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-commit-all" title="Suggest a bounded commit plan for the current workspace changes">Commit All Changes</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-diff-risk" title="Assess the current diff risk before you commit or hand off changes">Assess Diff Risk</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-summarize-changelog" title="Draft a changelog summary from the current Logics delivery wave">Changelog Summary</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-prepare-release" title="Prepare a release by generating missing changelog material and staging the release prep changes">Prepare Release</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-publish-release" title="Create the release tag, push it, and publish the GitHub release">Publish Release</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-summarize-validation" title="Summarize the latest validation outcome and what still needs attention">Validation Summary</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-validation-checklist" title="Build a concise validation checklist for the current delivery wave">Validation Checklist</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-doc-consistency" title="Review the workflow docs for consistency, stale indicators, and broken references">Doc Consistency</button>
                </div>
              </div>
            </div>
            <div class="tools-panel__view" id="tools-view-system" data-tools-view="system" hidden>
              <div class="tools-panel__section" data-tools-section="runtime">
                <div class="tools-panel__section-label">AI Runtime</div>
                <div class="tools-panel__section-body" data-tools-body="runtime">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="check-hybrid-runtime" title="Check provider availability, cooldown state, and hybrid assist health">AI Runtime Status</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="open-hybrid-insights" title="Open multi-provider Hybrid Insights with dispatch and fallback breakdowns">AI Provider Insights</button>
                </div>
              </div>
              <div class="tools-panel__section" data-tools-section="kit">
                <div class="tools-panel__section-label">Kit</div>
                <div class="tools-panel__section-body" data-tools-body="kit">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="update-logics-kit" title="Update the Logics kit submodule when the canonical setup is present">Update Logics Kit</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="repair-logics-kit" title="Check current Logics runtime state and repair the shared kit publication or bridge files.">Repair Logics Kit</button>
                </div>
              </div>
              <div class="tools-panel__section" data-tools-section="workspace">
                <div class="tools-panel__section-label">Workspace</div>
                <div class="tools-panel__section-body" data-tools-body="workspace">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="change-project-root" title="Change project root">Change Project Root</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="reset-project-root" title="Use workspace root">Reset Project Root</button>
                </div>
              </div>
              <div class="tools-panel__section" data-tools-section="maintenance">
                <div class="tools-panel__section-label">Maintenance</div>
                <div class="tools-panel__section-body" data-tools-body="maintenance">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="open-logics-insights" title="Open corpus stats and relationship signals">Logics Insights</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="about" title="About this extension">About</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="toolbar__buttons">
        <button
          class="btn btn--secondary btn--icon"
          id="header-logics-insights"
          type="button"
          aria-label="Open Logics insights"
          title="Open Logics insights"
        >
          ${infoIcon()}
        </button>
        <button
          class="btn btn--secondary btn--icon"
          id="activity-toggle"
          type="button"
          aria-label="Show recent activity"
          title="Show recent activity"
        >
          ${activityIcon()}
        </button>
        <button
          class="btn btn--secondary btn--icon"
          id="attention-toggle"
          type="button"
          aria-label="Show blocked, orphaned, unprocessed, or inconsistent items"
          title="Show blocked, orphaned, unprocessed, or inconsistent items"
        >
          ${attentionIcon()}
        </button>
        <button
          class="btn btn--icon"
          data-action="toggle-view-mode"
          aria-label="Switch display mode"
          title="Switch display mode"
        >
          ${boardViewIcon()}
        </button>
      </div>
    </div>
    <div class="toolbar__row toolbar__row--secondary" id="filter-panel" aria-hidden="true" role="group" aria-label="View controls" hidden>
      <div class="toolbar__search">
        <input
          class="toolbar__search-input"
          id="search-input"
          type="search"
          placeholder="Search items"
          aria-label="Search items"
        />
      </div>
      <div class="toolbar__ordering">
        <label class="toolbar__select">
          <span>Group</span>
          <select id="group-by" aria-label="Group items">
            <option value="stage">Stage</option>
            <option value="status">Status</option>
          </select>
        </label>
        <label class="toolbar__select">
          <span>Sort</span>
          <select id="sort-by" aria-label="Sort items">
            <option value="default">Default</option>
            <option value="updated-desc">Updated</option>
            <option value="progress-desc">Progress</option>
            <option value="status-asc">Status</option>
          </select>
        </label>
      </div>
      <div class="toolbar__toggles">
        <label class="toggle">
          <input type="checkbox" id="hide-processed-requests" />
          <span>Hide processed requests</span>
        </label>
        <label class="toggle">
          <input type="checkbox" id="hide-complete" />
          <span>Hide completed</span>
        </label>
        <label class="toggle">
          <input type="checkbox" id="hide-spec" />
          <span>Hide SPEC</span>
        </label>
        <label class="toggle">
          <input type="checkbox" id="show-companion-docs" />
          <span>Show companion docs</span>
        </label>
        <label class="toggle">
          <input type="checkbox" id="hide-empty-columns" />
          <span>Hide empty columns</span>
        </label>
      </div>
      <button class="filter-panel__reset toolbar__reset" type="button" id="filter-reset">Reset</button>
    </div>
  </div>
  <div class="help-banner" id="help-banner" hidden>
    <div class="help-banner__copy" id="help-banner-copy"></div>
    <button class="help-banner__dismiss" id="help-banner-dismiss" type="button" title="Dismiss help">Dismiss</button>
  </div>
  <div class="layout" id="layout">
    <div class="layout__main" id="layout-main">
      <div class="board" id="board"></div>
      <div class="activity-panel" id="activity-panel" hidden></div>
    </div>
    <div class="splitter" id="splitter" role="separator" aria-orientation="horizontal" aria-label="Resize details panel" tabindex="0"></div>
    <aside class="details" id="details">
      <div class="details__header">
        <div class="details__header-copy">
          <div class="details__header-eyebrow" id="details-eyebrow">Logics item</div>
          <div class="details__header-title" id="details-title">Details</div>
        </div>
        <button class="details__toggle" id="details-toggle" aria-label="Collapse details" aria-expanded="true" title="Collapse details">
          <svg class="details__toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
      <div class="details__body" id="details-body">
        <div class="details__empty">Select a card to see details.</div>
      </div>
      <div class="details__actions">
        <button class="btn btn--primary" data-action="open" disabled title="Edit selected item">Edit</button>
        <button class="btn btn--primary" data-action="read" disabled title="Read selected item">Read</button>
        <button class="btn btn--contextual" data-action="promote" disabled title="Promote selected item">Promote</button>
        <button class="btn btn--secondary" data-action="mark-done" disabled title="Mark selected item as done">Done</button>
        <button class="btn btn--caution" data-action="change-status" disabled title="Change the selected item status">Change Status</button>
      </div>
    </aside>
  </div>
  <script nonce="${nonce}" src="${modelScriptUri}"></script>
  <script nonce="${nonce}" src="${uiStatusScriptUri}"></script>
  <script nonce="${nonce}" src="${harnessApiScriptUri}"></script>
  <script nonce="${nonce}" src="${layoutControllerScriptUri}"></script>
  <script nonce="${nonce}" src="${hostApiScriptUri}"></script>
  <script nonce="${nonce}" src="${toolsPanelLayoutScriptUri}"></script>
  <script nonce="${nonce}" src="${webviewSelectorsScriptUri}"></script>
  <script nonce="${nonce}" src="${webviewPersistenceScriptUri}"></script>
  <script nonce="${nonce}" src="${webviewChromeScriptUri}"></script>
  <script nonce="${nonce}" src="${renderBoardScriptUri}"></script>
  <script nonce="${nonce}" src="${renderDetailsScriptUri}"></script>
  <script nonce="${nonce}" src="${renderMarkdownScriptUri}"></script>
  <script nonce="${nonce}" src="${mainCoreScriptUri}"></script>
  <script nonce="${nonce}" src="${mainInteractionHandlersScriptUri}"></script>
  <script nonce="${nonce}" src="${mainInteractionsScriptUri}"></script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
