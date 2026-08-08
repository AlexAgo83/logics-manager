/**
 * The filter defect classes: a count that contradicts the board, and a filter that
 * returns documents it did not name.
 *
 * Same arrangement as the layout checks: one module, serialized into the page for the real
 * run and imported by its own tests. The campaign ran green through a board that rendered
 * nothing under four of its own type options, because it only ever asserted that the board
 * was not blank.
 *
 * These are async: changing a filter redraws the board, and the check has to wait for the
 * redraw before measuring it.
 */
export function filterChecks(window) {
  const document = window.document;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const countNode = () => document.getElementById("viewer-filter-count");
  /** The number the panel prints, parsed out of "N of M docs shown · ...". */
  const announced = () => {
    const match = /(\d+)\s+of\s+\d+/.exec(countNode()?.textContent || "");
    return match ? Number(match[1]) : null;
  };
  /** What the board would render, which paging keeps below the announced total. */
  const rendered = () => document.querySelectorAll("#board .card[data-id]").length;
  const groups = () =>
    Array.from(document.querySelectorAll("[data-viewer-filter-group]")).filter(
      (node) => node.tagName === "SELECT"
    );

  const select = async (control, value) => {
    control.value = value;
    control.dispatchEvent(new window.Event("change", { bubbles: true }));
    await delay(250);
  };

  const reset = async () => {
    for (const control of groups()) {
      const fallback = control.options[0]?.value;
      if (fallback !== undefined) await select(control, fallback);
    }
    const focus = groups().find((control) => control.getAttribute("data-viewer-filter-group") === "focus");
    if (focus && Array.from(focus.options).some((option) => option.value === "all")) {
      await select(focus, "all");
    }
  };

  return [
    {
      name: "the count agrees with the board",
      run: async () => {
        await reset();
        const checked = [];
        for (const control of groups()) {
          const group = control.getAttribute("data-viewer-filter-group") || "";
          for (const option of Array.from(control.options)) {
            if (option.disabled) continue;
            await select(control, option.value);
            const total = announced();
            if (total === null) throw new Error("the count printed no number");
            // Paging keeps the rendered cards at or below the announced total; a count
            // above an empty board is the defect this exists for.
            if (total > 0 && rendered() === 0) {
              throw new Error(`${group}=${option.value} announced ${total} above an empty board`);
            }
            if (total === 0 && rendered() > 0) {
              throw new Error(`${group}=${option.value} announced none while the board rendered ${rendered()}`);
            }
            checked.push(`${group}=${option.value}`);
          }
          await select(control, control.options[0].value);
        }
        await reset();
        return checked.length + " selection(s) checked";
      }
    },
    {
      name: "the count follows the search box",
      run: async () => {
        await reset();
        const input = document.getElementById("search-input");
        if (!input) return "no search box to type in";
        const before = announced();
        input.value = "zzz-no-document-matches-this";
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
        await delay(600);
        const narrowed = announced();
        input.value = "";
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
        await delay(600);
        const restored = announced();
        if (narrowed === before) {
          throw new Error(`the count stayed at ${before} while the query narrowed the board to ${rendered()} card(s)`);
        }
        if (restored !== before) {
          throw new Error(`clearing the query left the count at ${restored}, not ${before}`);
        }
        return `${before} -> ${narrowed} -> ${restored}`;
      }
    },
    {
      name: "a control that regroups the board changes what it shows",
      run: async () => {
        await reset();
        const control = document.getElementById("group-by");
        if (!control) return "no grouping control";
        // The board renders columns on a wide viewport and sections on a narrow one, and
        // both carry the group name. Reading only the columns made a phone report every
        // mode as identical, because there were no columns to compare.
        const headings = () => {
          const nodes = document.querySelectorAll("#board .column__title-label, #board .list-view__section");
          return Array.from(nodes)
            .map((node) => (node.dataset?.group ?? node.textContent ?? "").trim())
            .join("|");
        };
        const seen = new Map();
        for (const option of Array.from(control.options)) {
          control.value = option.value;
          control.dispatchEvent(new window.Event("change", { bubbles: true }));
          await delay(600);
          seen.set(option.value, headings());
        }
        if ([...seen.values()].every((layout) => !layout)) {
          return "no grouping is rendered here to compare";
        }
        const duplicates = [...seen.entries()].filter(
          ([value, layout]) => [...seen.entries()].some(([other, otherLayout]) => other !== value && otherLayout === layout)
        );
        if (duplicates.length) {
          throw new Error(`${duplicates.map(([value]) => value).join(", ")} leave the board grouped identically`);
        }
        await reset();
        return [...seen.keys()].join(", ");
      }
    },
    {
      name: "a filter returns only what it names",
      run: async () => {
        await reset();
        const stageOf = (card) => String(card.getAttribute("data-id") || "").split("_")[0];
        // Read the type group's own options rather than naming the stages here: a type
        // added to the markup later is covered without editing this check.
        const control = groups().find((node) => node.getAttribute("data-viewer-filter-group") === "type");
        if (!control) return "no type group to walk";
        const prefixes = { request: "req", backlog: "item", task: "task", product: "prod", roadmap: "road", architecture: "adr", spec: "spec" };
        const checked = [];
        for (const option of Array.from(control.options)) {
          const expected = prefixes[option.value];
          if (!expected || option.disabled) continue;
          await select(control, option.value);
          const wrong = Array.from(document.querySelectorAll("#board .card[data-id]"))
            .map(stageOf)
            .filter((prefix) => prefix !== expected);
          if (wrong.length) {
            throw new Error(`type=${option.value} rendered ${wrong.slice(0, 3).join(", ")}`);
          }
          checked.push(option.value);
        }
        await reset();
        return checked.length ? checked.join(", ") : "no typed option to walk";
      }
    }
  ];
}
