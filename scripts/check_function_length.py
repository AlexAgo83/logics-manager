#!/usr/bin/env python3
"""Fail on a new over-long function; leave the existing ones alone.

Nothing prevented the next 500-line function: the largest here is a request
handler at 493 lines, and a reviewer cannot hold that while checking an
authorization rule. Rewriting the existing ones is its own decision, so they are
grandfathered explicitly in `long_functions_baseline.json` rather than
suppressed silently -- the file is the debt ledger, and it should only shrink.

    python3 scripts/check_function_length.py           # check
    python3 scripts/check_function_length.py --update  # re-freeze after a split
"""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BASELINE_PATH = REPO_ROOT / "scripts" / "long_functions_baseline.json"
SOURCE_ROOTS = ("logics_manager",)


def measure(repo_root: Path) -> dict[str, int]:
    found: dict[str, int] = {}
    for root in SOURCE_ROOTS:
        for path in sorted((repo_root / root).rglob("*.py")):
            try:
                tree = ast.parse(path.read_text(encoding="utf-8"))
            except SyntaxError as exc:  # a syntax error is the linter's job, not ours
                print(f"skipping {path}: {exc}", file=sys.stderr)
                continue
            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                span = (node.end_lineno or node.lineno) - node.lineno + 1
                found[f"{path.relative_to(repo_root).as_posix()}::{node.name}"] = span
    return found


def main(argv: list[str]) -> int:
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    ceiling = int(baseline["ceiling"])
    grandfathered: dict[str, int] = baseline["grandfathered"]
    measured = measure(REPO_ROOT)
    over = {name: span for name, span in measured.items() if span > ceiling}

    if "--update" in argv:
        BASELINE_PATH.write_text(
            json.dumps({"ceiling": ceiling, "grandfathered": dict(sorted(over.items()))}, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Baseline updated: {len(over)} function(s) over {ceiling} lines.")
        return 0

    new = {name: span for name, span in over.items() if name not in grandfathered}
    grown = {
        name: (span, grandfathered[name])
        for name, span in over.items()
        if name in grandfathered and span > grandfathered[name]
    }
    fixed = [name for name in grandfathered if name not in over]

    for name, span in sorted(new.items(), key=lambda item: -item[1]):
        print(f"NEW    {span:>5} lines (ceiling {ceiling})  {name}")
    for name, (span, was) in sorted(grown.items(), key=lambda item: -item[1][0]):
        print(f"GREW   {span:>5} lines (was {was})           {name}")

    if new or grown:
        print(
            f"\n{len(new)} new and {len(grown)} grown over-long function(s). "
            "Split them, or run --update if a split legitimately moved code around.",
            file=sys.stderr,
        )
        return 1

    if fixed:
        print(
            f"{len(fixed)} grandfathered function(s) are now under the ceiling. "
            "Run --update to shrink the ledger:\n  " + "\n  ".join(sorted(fixed))
        )
    print(f"OK: {len(over)} function(s) over {ceiling} lines, all known.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
