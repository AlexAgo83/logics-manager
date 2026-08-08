/**
 * The layout defect classes a passing unit suite cannot see.
 *
 * This is a module so the campaign and its own regression tests run the same code: it is
 * serialized into the page with `.toString()` for the real run, and imported directly by
 * the tests that introduce each defect class. A second copy written for testability would
 * be the very drift the campaign exists to catch.
 *
 * Every list below is read from the interface, never enumerated by hand: a surface or
 * control added later is covered without editing a check.
 */
export function layoutChecks(window) {
  const document = window.document;
  const describe = (node) => {
    const id = node.id ? "#" + node.id : "";
    const action = node.dataset && node.dataset.action ? "[data-action=" + node.dataset.action + "]" : "";
    return (node.tagName.toLowerCase() + id + action).slice(0, 60);
  };
  const visible = (node) => {
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return false;
    const style = window.getComputedStyle(node);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  };
  const interactive = () =>
    Array.from(
      document.querySelectorAll("button, a[href], select, input, textarea, [role='button'], [data-action]")
    ).filter(visible);
  const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

  return [
    {
      name: "no sibling controls are drawn over each other",
      run: () => {
        // Siblings only. Controls on different layers -- an open document panel over the
        // board, a menu over its trigger -- overlap by design, and comparing across layers
        // reports the design as a defect. Two controls under the same parent drawn on top
        // of each other is the collapse this check exists for: it is what a sibling
        // project's settings form did while its campaign reported zero findings.
        const groups = new Map();
        for (const node of interactive()) {
          const parent = node.parentElement;
          if (!parent) continue;
          if (!groups.has(parent)) groups.set(parent, []);
          groups.get(parent).push(node);
        }
        const collisions = [];
        let compared = 0;
        for (const siblings of groups.values()) {
          const boxes = siblings.map((node) => ({ node, box: node.getBoundingClientRect() }));
          for (let i = 0; i < boxes.length; i += 1) {
            for (let j = i + 1; j < boxes.length; j += 1) {
              compared += 1;
              if (overlap(boxes[i].box, boxes[j].box)) {
                collisions.push(describe(boxes[i].node) + " over " + describe(boxes[j].node));
              }
            }
          }
        }
        if (collisions.length) throw new Error(collisions.slice(0, 5).join("; "));
        return compared + " sibling pair(s) checked";
      }
    },
    {
      name: "nothing is clipped outside the viewport",
      run: () => {
        // A control inside a horizontally scrollable ancestor is off-screen but still
        // reachable: the toolbar scrolls at tablet width, and reporting that as clipped is
        // the check being naive, not the interface being broken.
        const scrollable = (node) => {
          for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const overflowX = window.getComputedStyle(parent).overflowX;
            if ((overflowX === "auto" || overflowX === "scroll") && parent.scrollWidth > parent.clientWidth + 1) {
              return true;
            }
          }
          return false;
        };
        const clipped = interactive()
          .filter((node) => !scrollable(node))
          .map((node) => ({ node, box: node.getBoundingClientRect() }))
          .filter(({ box }) => box.left < -1 || box.right > window.innerWidth + 1);
        if (clipped.length) {
          throw new Error(
            clipped
              .slice(0, 5)
              .map(
                ({ node, box }) =>
                  describe(node) + " spans " + Math.round(box.left) + "-" + Math.round(box.right) + " in " + window.innerWidth
              )
              .join("; ")
          );
        }
        return window.innerWidth + "px wide, nothing outside";
      }
    },
    {
      name: "the page does not scroll sideways",
      run: () => {
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        if (overflow > 1) throw new Error(overflow + "px of horizontal overflow");
        return overflow + "px overflow";
      }
    },
    {
      name: "an empty surface explains itself",
      run: () => {
        const empty = Array.from(
          document.querySelectorAll("[data-empty-when-blank], #board, #details, #activity-panel")
        ).filter((node) => visible(node) && node.children.length === 0 && !node.textContent.trim());
        if (empty.length) throw new Error(empty.map(describe).join("; ") + " rendered empty with no explanation");
        return "no unexplained empty surface";
      }
    },
    {
      name: "the screen exposes a heading structure",
      run: () => {
        // The interface carried no h1-h6 at all: landmarks let a screen reader move between
        // regions, and nothing let it move inside one.
        const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(visible);
        if (!headings.length) throw new Error("no heading element anywhere on this screen");
        const levels = headings.map((node) => Number(node.tagName.slice(1)));
        if (!levels.includes(1)) throw new Error("no top-level heading names the page");
        const sorted = [...new Set(levels)].sort((a, b) => a - b);
        for (let index = 1; index < sorted.length; index += 1) {
          if (sorted[index] - sorted[index - 1] > 1) {
            throw new Error(`heading levels skip from h${sorted[index - 1]} to h${sorted[index]}`);
          }
        }
        return headings.length + " heading(s), levels " + sorted.map((level) => "h" + level).join(", ");
      }
    },
    {
      name: "a disabled action says why",
      run: () => {
        const disabled = interactive().filter(
          (node) => node.disabled || node.getAttribute("aria-disabled") === "true"
        );
        const silent = disabled.filter(
          (node) => !(node.title || node.getAttribute("aria-label") || (node.dataset && node.dataset.reason) || "").trim()
        );
        if (silent.length) {
          throw new Error(silent.slice(0, 5).map(describe).join("; ") + " unavailable without stating why");
        }
        return disabled.length + " disabled control(s)";
      }
    }
  ];
}
