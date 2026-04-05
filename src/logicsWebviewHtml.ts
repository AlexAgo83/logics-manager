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
  const renderBoardScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "renderBoard.js"));
  const renderDetailsScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "renderDetails.js"));
  const renderMarkdownScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "renderMarkdown.js"));
  const mainInteractionsScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "mainInteractions.js"));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "main.js"));
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
            id="tools-toggle"
            aria-label="Tools"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="tools-panel"
            title="Tools"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 7h16M6 12h12M8 17h8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div class="tools-panel" id="tools-panel" aria-hidden="true" role="menu">
            <div class="tools-panel__switcher" role="tablist" aria-label="Tools categories">
              <button
                class="tools-panel__switch is-active"
                type="button"
                role="tab"
                id="tools-view-tab-workflow"
                aria-selected="true"
                aria-controls="tools-view-workflow"
                tabindex="0"
                data-tools-view-toggle="workflow"
              >
                Workflow
              </button>
              <button
                class="tools-panel__switch"
                type="button"
                role="tab"
                id="tools-view-tab-system"
                aria-selected="false"
                aria-controls="tools-view-system"
                tabindex="-1"
                data-tools-view-toggle="system"
              >
                System
              </button>
            </div>
            <div class="tools-panel__section" data-tools-section="recommended">
              <div class="tools-panel__section-label">Recommended</div>
              <div class="tools-panel__section-body" data-tools-body="recommended">
                <button class="tools-panel__item" type="button" role="menuitem" data-action="new-request-guided" title="Start a guided new request">New Request</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-next-step" title="Suggest the next bounded workflow step">Suggest Next Step</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-triage" title="Classify a workflow doc through the shared runtime">Triage Item</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="bootstrap-logics" title="Bootstrap Logics">Bootstrap Logics</button>
                <button class="tools-panel__item" type="button" role="menuitem" data-action="check-environment" title="Review environment health and recommended fixes">Check Environment</button>
              </div>
            </div>
            <div class="tools-panel__view" id="tools-view-workflow" data-tools-view="workflow">
              <div class="tools-panel__section" data-tools-section="workflow">
                <div class="tools-panel__section-label">Workflow</div>
                <div class="tools-panel__section-body" data-tools-body="workflow">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="open-onboarding" title="Open the getting started guide">Getting Started</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="select-agent" title="Select active agent">Select Agent</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="create-companion-doc" title="Create a companion doc">Companion Doc</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="refresh" title="Refresh">Refresh</button>
                </div>
              </div>
              <div class="tools-panel__section" data-tools-section="assist">
                <div class="tools-panel__section-label">Assist</div>
                <div class="tools-panel__section-body" data-tools-body="assist">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-commit-all" title="Suggest or execute a bounded commit plan">Commit All Changes</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-diff-risk" title="Assess the current diff risk through the shared runtime">Assess Diff Risk</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-summarize-changelog" title="Generate bounded changelog entries through the shared runtime">Changelog Summary</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-prepare-release" title="Generate changelog via AI if missing, update README badge, and commit prep changes">Prepare Release</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-publish-release" title="Create the release tag, push, and publish the GitHub release">Publish Release</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-summarize-validation" title="Summarize validation status through the shared runtime">Validation Summary</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-validation-checklist" title="Build a bounded validation checklist through the shared runtime">Validation Checklist</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="assist-doc-consistency" title="Review workflow doc consistency through the shared runtime">Doc Consistency</button>
                </div>
              </div>
            </div>
            <div class="tools-panel__view" id="tools-view-system" data-tools-view="system" hidden>
              <div class="tools-panel__section" data-tools-section="runtime">
                <div class="tools-panel__section-label">AI Runtime</div>
                <div class="tools-panel__section-body" data-tools-body="runtime">
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="launch-codex-overlay" title="Launch Codex with the globally published Logics kit">Launch Codex</button>
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="launch-claude" title="Launch Claude with the globally published Logics kit">Launch Claude</button>
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
                  <button class="tools-panel__item" type="button" role="menuitem" data-action="fix-docs" title="Fix Logics">Fix Logics</button>
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
        <button class="btn btn--caution" data-action="mark-obsolete" disabled title="Mark selected item as obsolete">Obsolete</button>
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
  <script nonce="${nonce}" src="${mainInteractionsScriptUri}"></script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
