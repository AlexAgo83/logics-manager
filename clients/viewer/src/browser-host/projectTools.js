function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderTranslations(payload) {
  if (payload?.state !== "ready") return `<div class="viewer-project-tool__empty"><h2>Translations</h2><p>${escapeHtml(payload?.capability?.message || "Translation source is read-only.")}</p></div>`;
  const locales = Array.isArray(payload.locales) ? payload.locales : [];
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const heads = locales.map((locale) => `<th>${escapeHtml(locale.id)}</th>`).join("");
  const body = rows.map((row) => {
    const cells = locales.map((locale) => {
      const value = row.values?.[locale.id];
      const missing = value === null || value === undefined;
      const editable = payload.capability?.detail?.editable === true && !missing;
      return `<td class="${missing ? "is-missing" : value === "" ? "is-empty" : ""}"><span>${escapeHtml(missing ? "Missing" : value)}</span>${editable ? `<button class="viewer-project-tool__edit" type="button" data-project-i18n-edit data-locale="${escapeHtml(locale.id)}" data-key="${escapeHtml(row.key)}" data-value="${escapeHtml(value)}" data-revision="${escapeHtml(locale.revision)}">Edit</button>` : ""}</td>`;
    }).join("");
    return `<tr><th class="viewer-project-tool__key">${escapeHtml(row.key)}</th>${cells}</tr>`;
  }).join("");
  const missingCount = Object.values(payload.diagnostics || {}).reduce((sum, entry) => sum + (entry?.missing?.length || 0), 0);
  return `<div class="viewer-project-tool"><div class="viewer-project-tool__summary"><strong>${escapeHtml(rows.length)} keys</strong><span>${escapeHtml(locales.length)} locales</span><span>${escapeHtml(missingCount)} missing</span>${payload.readOnly ? "<span>Read-only source dictionary</span>" : ""}</div><label class="viewer-project-tool__search">Search <input type="search" data-project-i18n-search placeholder="Key or translation"></label><div class="viewer-project-tool__table-wrap"><table><thead><tr><th>Key</th>${heads}</tr></thead><tbody data-project-i18n-rows>${body}</tbody></table></div></div>`;
}

function themeTokenPreview(token) {
  const value = String(token.value || "").trim();
  const safeColor = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s/-]+\)|[a-z]+)$/i.test(value);
  const safeRadius = /^-?[0-9.]+(?:px|rem|em|%)$/.test(value);
  if (token.group === "colors" && safeColor) return `<span class="viewer-project-tool__swatch" style="background:${escapeHtml(value)}"></span>`;
  if (token.group === "radii" && safeRadius) return `<span class="viewer-project-tool__shape" style="border-radius:${escapeHtml(value)}"></span>`;
  return "";
}

export function renderProjectTheme(payload) {
  if (payload?.state !== "ready") return `<div class="viewer-project-tool__empty"><h2>Theme</h2><p>${escapeHtml(payload?.capability?.message || "Theme source is read-only.")}</p></div>`;
  const editable = payload.capability?.detail?.editable === true;
  const groups = new Map();
  (payload.selectors || []).forEach((entry) => (entry.tokens || []).forEach((token) => {
    const group = token.group || "other";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ ...token, selector: entry.selector });
  }));
  const sections = Array.from(groups.entries()).map(([group, tokens]) => `<section class="viewer-project-tool__group"><h2>${escapeHtml(group)}</h2><div class="viewer-project-tool__tokens">${tokens.map((token) => `<div class="viewer-project-tool__token">${themeTokenPreview(token)}<div><strong>${escapeHtml(token.name)}</strong><small>${escapeHtml(token.selector)}</small><code>${escapeHtml(token.value)}</code></div>${editable ? `<button class="viewer-project-tool__edit" type="button" data-project-theme-edit data-selector="${escapeHtml(token.selector)}" data-name="${escapeHtml(token.name)}" data-value="${escapeHtml(token.value)}" data-revision="${escapeHtml(payload.revision)}">Edit</button>` : ""}</div>`).join("")}</div></section>`).join("");
  return `<div class="viewer-project-tool"><div class="viewer-project-tool__summary"><strong>${escapeHtml(payload.path)}</strong><span>${escapeHtml(groups.size)} groups</span></div>${sections}</div>`;
}

export async function openProjectTool(kind, { beginView, isViewStale, setDocument, setMeta }, options = {}) {
  const i18n = kind === "i18n";
  const view = options.view || beginView();
  const response = await fetch(i18n ? "/api/project-i18n" : "/api/project-theme", { signal: view.signal });
  const data = await response.json();
  if (isViewStale(view)) return;
  if (!response.ok || !data.ok) throw new Error(data.error || `Unable to load project ${kind}.`);
  setDocument(i18n ? "Translations" : "Theme", i18n ? renderTranslations(data.payload) : renderProjectTheme(data.payload), { eyebrow: data.payload?.capability?.message || `Project ${kind}` });
  setMeta(`Project ${i18n ? "translations" : "theme"} loaded.`);
}

export async function handleProjectToolEdit(target, setDocument, setMeta) {
  const i18n = target.hasAttribute("data-project-i18n-edit");
  const current = target.getAttribute("data-value") || "";
  const label = target.getAttribute(i18n ? "data-key" : "data-name") || "";
  const value = window.prompt(`${i18n ? "Translation" : "Theme token"}: ${label}`, current);
  if (value === null || value === current) return;
  const body = i18n
    ? { locale: target.getAttribute("data-locale") || "", key: label, value, revision: target.getAttribute("data-revision") || "" }
    : { selector: target.getAttribute("data-selector") || "", name: label, value, revision: target.getAttribute("data-revision") || "" };
  const response = await fetch(i18n ? "/api/project-i18n-value" : "/api/project-theme-value", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Unable to save project value.");
  setDocument(i18n ? "Translations" : "Theme", i18n ? renderTranslations(data.payload) : renderProjectTheme(data.payload));
  setMeta("Project value saved.");
}

export function filterTranslationRows(search) {
  const query = search.value.trim().toLowerCase();
  document.querySelectorAll("[data-project-i18n-rows] tr").forEach((row) => {
    if (row instanceof HTMLTableRowElement) row.hidden = Boolean(query) && !(row.textContent || "").toLowerCase().includes(query);
  });
}

export function updateProjectToolControls(isAvailable, navMenuItem) {
  const nav = document.getElementById("viewer-project-tools-nav");
  const translations = navMenuItem("project:translations");
  const theme = navMenuItem("project:theme");
  const hasI18n = isAvailable("i18n");
  const hasTheme = isAvailable("theme");
  if (nav instanceof HTMLElement) nav.hidden = !(hasI18n || hasTheme);
  if (translations instanceof HTMLButtonElement) translations.hidden = !hasI18n;
  if (theme instanceof HTMLButtonElement) theme.hidden = !hasTheme;
}

export function setupProjectToolInteractions(setDocument, setMeta) {
  document.addEventListener("input", (event) => {
    const search = event.target instanceof Element ? event.target.closest("[data-project-i18n-search]") : null;
    if (search instanceof HTMLInputElement) filterTranslationRows(search);
  });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-project-i18n-edit], [data-project-theme-edit]") : null;
    if (!(target instanceof HTMLButtonElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleProjectToolEdit(target, setDocument, setMeta).catch((error) => setMeta(error?.message || String(error)));
  });
}
