/**
 * The board's filter predicate and the option counts derived from it.
 *
 * Lifted out of the browser host by req_311: the filters are 276 lines in a file that also
 * holds three applications, and reading them meant opening all of it. Nothing here reaches
 * for module state -- the state is an argument -- which is also what lets an option say
 * what it would return: the count for `status: draft` is this same predicate asked about
 * that state.
 */
import { hasLinks, statusValue, updatedWithin } from "./util.js";
import { isClosed, isStale, needsPromotion } from "./render.js";

// Taking the state as an argument is what lets an option say what it would return:
// the count for `status: draft` is this same predicate asked about that state.
export function matchesFilterState(item, viewerFilterState) {
  if (!item) {
    return false;
  }
  const status = statusValue(item);
  if (viewerFilterState.focus === "active" && isClosed(item)) {
    return false;
  }
  if (viewerFilterState.focus === "blocked" && !status.includes("blocked")) {
    return false;
  }
  if (viewerFilterState.focus === "needs-promotion" && !needsPromotion(item)) {
    return false;
  }
  if (viewerFilterState.focus === "recent" && !updatedWithin(item, 14)) {
    return false;
  }

  if (viewerFilterState.type === "workflow" && !["request", "backlog", "task"].includes(item.stage)) {
    return false;
  }
  // item_817: `runbook` joins the companions. The guard that used to drop runbooks here
  // reasoned that "the board has no column for them" -- it has one now, they are documents
  // like the rest, and a filter that silently returned false was why they were invisible
  // even after the board learned about them.
  if (viewerFilterState.type === "companion" && !["product", "roadmap", "architecture", "spec", "runbook"].includes(item.stage)) {
    return false;
  }
  if (!["all", "workflow", "companion"].includes(viewerFilterState.type) && item.stage !== viewerFilterState.type) {
    return false;
  }

  if (viewerFilterState.status === "ready" && !status.includes("ready")) {
    return false;
  }
  if (viewerFilterState.status === "in-progress" && !status.includes("in progress")) {
    return false;
  }
  if (viewerFilterState.status === "blocked" && !status.includes("blocked")) {
    return false;
  }
  // Done is a status, not a synonym for closed. Asking `isClosed` here made every
  // terminal status answer yes, so the Done option counted the Settled documents too.
  if (viewerFilterState.status === "done" && status !== "done") {
    return false;
  }
  if (!["any", "ready", "in-progress", "blocked", "done"].includes(viewerFilterState.status)) {
    const expected = String(viewerFilterState.status || "").replace(/-/g, " ");
    if (status !== expected) {
      return false;
    }
  }

  if (viewerFilterState.relation === "unlinked" && hasLinks(item)) {
    return false;
  }
  if (viewerFilterState.relation === "linked" && !hasLinks(item)) {
    return false;
  }
  if (viewerFilterState.relation === "needs-promotion" && !needsPromotion(item)) {
    return false;
  }

  if (viewerFilterState.activity === "recent" && !updatedWithin(item, 14)) {
    return false;
  }
  if (viewerFilterState.activity === "stale" && !isStale(item)) {
    return false;
  }

  return true;
}

// An option that returns nothing is indistinguishable from a broken filter until it says
// so. Every group's options are walked from the control itself, so an option added to the
// markup later is covered without touching this.
export function updateFilterOptionCounts({ items, filterState }) {
  document.querySelectorAll("[data-viewer-filter-group]").forEach((control) => {
    if (!(control instanceof HTMLSelectElement)) {
      return;
    }
    const group = control.getAttribute("data-viewer-filter-group") || "";
    Array.from(control.options).forEach((option) => {
      if (!option.dataset.baseLabel) {
        option.dataset.baseLabel = option.textContent || "";
      }
      const candidate = { ...filterState, [group]: option.value };
      const count = items.filter((item) => matchesFilterState(item, candidate)).length;
      option.textContent = `${option.dataset.baseLabel} (${count})`;
      option.dataset.matchCount = String(count);
      // Never disable the option currently chosen: an operator has to be able to see
      // what they picked, and to pick their way back out of it.
      const selected = option.value === control.value;
      option.disabled = count === 0 && !selected;
      option.title = count === 0 ? "No document matches this here" : `${count} document(s)`;
    });
    // item_764: the four filters all sat on their neutral option, whose count is the
    // corpus size by definition -- so the collapsed controls read `All (1574)` and
    // `Any (1574)` three times over, four statements of one number, none of them about
    // the dimension they belong to. The neutral option says what it is neutral about,
    // and how many narrowing choices below it would actually match something.
    const neutral = control.options[0];
    if (neutral) {
      const narrowing = Array.from(control.options)
        .slice(1)
        .filter((option) => Number(option.dataset.matchCount || 0) > 0).length;
      neutral.textContent = `${neutral.dataset.baseLabel} ${NEUTRAL_DIMENSION[group] || ""}`.trim()
        + (narrowing ? ` — ${narrowing} to narrow by` : " — nothing to narrow by");
    }
  });
}

/** What each filter's neutral option is neutral about, named on the option itself. */
const NEUTRAL_DIMENSION = {
  type: "types",
  status: "status",
  relation: "relation",
  activity: "activity"
};

export function focusFilterLabel(value) {
  return {
    active: "Active work",
    all: "All docs",
    blocked: "Blocked",
    "needs-promotion": "Needs promotion",
    recent: "Recently changed"
  }[value] || "All docs";
}
